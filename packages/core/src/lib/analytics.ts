import { API_ENDPOINTS, BATCH_CONFIG } from "@indeks/shared";
import type {
  IndeksEvent,
  IndeksConfig,
  AnalyticsInterface,
} from "@indeks/shared";

export class IndeksAnalytics implements AnalyticsInterface {
  private config: IndeksConfig;
  private batchQueue: IndeksEvent[] = [];
  private flushTimer: number | null = null;

  constructor(config: IndeksConfig) {
    this.config = config;
  }

  async send(events: IndeksEvent[]): Promise<void> {
    if (!events.length) return;

    // Transform SDK events to API format
    const apiEvents = events.map(event => {
      const { 
        type, 
        timestamp, 
        url, 
        userAgent, 
        sessionId, 
        userId, 
        referrer,
        ...properties
      } = event;
      
      return {
        type,
        url,
        sessionId,
        userId,
        userAgent,
        referrer: referrer || document.referrer || undefined,
        properties,
        timestamp,
      };
    });

    try {
      // Use LOCAL for localhost, otherwise PRODUCTION
      const defaultEndpoint = window.location.hostname === 'localhost' 
        ? API_ENDPOINTS.LOCAL 
        : API_ENDPOINTS.PRODUCTION;
      const endpoint = this.config.endpoint || defaultEndpoint;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "User-Agent": "indeks-core/1.0.0",
        },
        body: JSON.stringify({
          events: apiEvents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP ${response.status}: ${errorData.message || response.statusText}`
        );
      }

      if (this.config.enableConsoleLogging) {
        console.log(`📡 Indeks: Successfully sent ${events.length} events`);
      }
    } catch (error) {
      console.error("Indeks: Failed to send events:", error);
      throw error;
    }
  }

  async batch(events: IndeksEvent[]): Promise<void> {
    this.batchQueue.push(...events);

    // Auto-flush when batch size reaches threshold
    if (this.batchQueue.length >= BATCH_CONFIG.DEFAULT_BATCH_SIZE) {
      await this.flush();
    }

    // Set timer for auto-flush
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = window.setTimeout(() => {
      this.flush().catch(console.error);
    }, BATCH_CONFIG.AUTO_FLUSH_INTERVAL);
  }

  async flush(): Promise<void> {
    if (!this.batchQueue.length) return;

    const eventsToSend = [...this.batchQueue];
    this.batchQueue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      await this.send(eventsToSend);
    } catch (error) {
      // Re-queue events if send fails
      this.batchQueue.unshift(...eventsToSend);
      throw error;
    }
  }

  getBatchSize(): number {
    return this.batchQueue.length;
  }

  clearBatch(): void {
    this.batchQueue = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
