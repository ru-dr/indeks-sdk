import { BATCH_CONFIG, Logger, LogLevel, sanitizeEventData, scrubUrl } from "@indeks/shared";
import type {
  IndeksEvent,
  ResolvedConfig,
  AnalyticsInterface,
  StorageInterface,
} from "@indeks/shared";
import { LocalStorageAdapter } from "./storage";

const PLAIN_TEXT = "text/plain;charset=UTF-8";

interface ApiEvent {
  type: string;
  url: string;
  sessionId: string;
  userId: string;
  userAgent: string;
  referrer?: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

type PersistentStorage = StorageInterface & {
  replace(events: IndeksEvent[]): void;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }

  get retryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

export class IndeksAnalytics implements AnalyticsInterface {
  private batchQueue: IndeksEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private logger: Logger;
  private flushing = false;
  private consecutiveFailures = 0;
  private nextRetryAt = 0;
  private endpointErrorLogged = false;
  private droppedEvents = 0;

  constructor(
    private config: ResolvedConfig,
    private storage: PersistentStorage = new LocalStorageAdapter(),
  ) {
    this.logger = new Logger({
      enableConsole: config.debug,
      level: LogLevel.INFO,
    });
  }

  private resolveEndpoint(): string | null {
    if (this.config.endpoint) return this.config.endpoint;
    if (!this.endpointErrorLogged) {
      this.endpointErrorLogged = true;
      console.error(
        "[Indeks] No `endpoint` configured. Indeks is self-hosted, so there is no " +
          "default ingestion server: set `endpoint` to your own Indeks " +
          "collect URL (e.g. https://analytics.example.com/api/v1/collect). " +
          "No events will be sent until it is set.",
      );
    }
    return null;
  }

  private toApiEvents(events: IndeksEvent[]): ApiEvent[] {
    return events.map((event) => {
      const { type, timestamp, url, userAgent, sessionId, userId, referrer, ...properties } = event;
      return {
        type,
        url,
        sessionId,
        userId,
        userAgent,
        referrer: referrer || scrubUrl(document.referrer) || undefined,
        properties: sanitizeEventData(properties as Record<string, unknown>),
        timestamp,
      };
    });
  }

  private serialize(events: IndeksEvent[]): string {
    return JSON.stringify({
      apiKey: this.config.apiKey,
      events: this.toApiEvents(events),
    });
  }

  private byteLength(body: string): number {
    return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(body).length : body.length;
  }

  private enqueue(events: IndeksEvent[], toFront = false): void {
    if (toFront) {
      this.batchQueue.unshift(...events);
    } else {
      this.batchQueue.push(...events);
    }
    const overflow = this.batchQueue.length - BATCH_CONFIG.MAX_QUEUE_SIZE;
    if (overflow > 0) {
      this.batchQueue.splice(0, overflow);
      this.droppedEvents += overflow;
      this.logger.warn(
        `Send queue exceeded ${BATCH_CONFIG.MAX_QUEUE_SIZE} events; dropped ${this.droppedEvents} oldest events in total`,
      );
    }
  }

  private backoffMs(): number {
    const exponential = BATCH_CONFIG.RETRY_BASE_MS * 2 ** (this.consecutiveFailures - 1);
    const capped = Math.min(exponential, BATCH_CONFIG.RETRY_MAX_MS);
    return Math.round(capped * (0.5 + Math.random() * 0.5));
  }

  private scheduleFlush(delay: number): void {
    this.cancelTimer();
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch((error) => this.logger.warn("Scheduled flush failed:", error));
    }, delay);
  }

  private cancelTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async send(events: IndeksEvent[]): Promise<void> {
    if (!events.length) return;
    if (this.config.localOnly) {
      this.logger.info(`Local only: skipped sending ${events.length} events`);
      return;
    }
    const endpoint = this.resolveEndpoint();
    if (!endpoint) return;

    const body = this.serialize(events);
    const response = await fetch(endpoint, {
      method: "POST",
      body,
      keepalive: this.byteLength(body) <= BATCH_CONFIG.KEEPALIVE_MAX_BODY_BYTES,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new HttpError(
        response.status,
        `HTTP ${response.status}: ${errorData.message || response.statusText}`,
      );
    }
    this.logger.info(`Sent ${events.length} events`);
  }

  async batch(events: IndeksEvent[]): Promise<void> {
    this.enqueue(events);
    if (this.batchQueue.length >= BATCH_CONFIG.DEFAULT_BATCH_SIZE) {
      await this.flush().catch((error) => this.logger.warn("Flush failed:", error));
      return;
    }
    if (!this.flushTimer) {
      this.scheduleFlush(BATCH_CONFIG.AUTO_FLUSH_INTERVAL);
    }
  }

  async flush(): Promise<void> {
    if (!this.batchQueue.length || this.flushing) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const wait = this.nextRetryAt - Date.now();
    if (wait > 0) {
      this.scheduleFlush(wait);
      return;
    }

    this.flushing = true;
    this.cancelTimer();
    try {
      while (this.batchQueue.length) {
        const chunk = this.batchQueue.splice(0, BATCH_CONFIG.MAX_BATCH_SIZE);
        try {
          await this.send(chunk);
        } catch (error) {
          if (error instanceof HttpError && !error.retryable) {
            this.logger.error(`Dropped ${chunk.length} events:`, error.message);
            continue;
          }
          this.enqueue(chunk, true);
          this.consecutiveFailures++;
          this.nextRetryAt = Date.now() + this.backoffMs();
          this.scheduleFlush(this.nextRetryAt - Date.now());
          throw error;
        }
      }
      this.consecutiveFailures = 0;
      this.nextRetryAt = 0;
    } finally {
      this.flushing = false;
    }
  }

  flushSync(): void {
    if (!this.batchQueue.length || this.config.localOnly) return;
    const endpoint = this.resolveEndpoint();
    if (!endpoint) return;

    this.cancelTimer();
    const events = this.batchQueue.splice(0, this.batchQueue.length);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.storage.replace(events);
      return;
    }

    const body = this.serialize(events);
    const withinKeepalive = this.byteLength(body) <= BATCH_CONFIG.KEEPALIVE_MAX_BODY_BYTES;

    if (withinKeepalive && typeof navigator?.sendBeacon === "function") {
      try {
        const blob = new Blob([body], { type: PLAIN_TEXT });
        if (navigator.sendBeacon(endpoint, blob)) return;
      } catch {
        this.logger.debug("sendBeacon failed, falling back to fetch");
      }
    }

    fetch(endpoint, {
      method: "POST",
      body,
      keepalive: withinKeepalive,
    }).catch(() => this.storage.replace(events));
  }

  async restorePersisted(): Promise<number> {
    const stored = await this.storage.retrieve();
    if (!stored.length) return 0;
    await this.storage.clear();
    this.enqueue(stored, true);
    this.logger.info(`Restored ${stored.length} events from offline buffer`);
    return stored.length;
  }

  async shutdown(): Promise<void> {
    this.cancelTimer();
    this.flushSync();
  }

  getBatchSize(): number {
    return this.batchQueue.length;
  }

  clearBatch(): void {
    this.batchQueue = [];
    this.cancelTimer();
  }
}
