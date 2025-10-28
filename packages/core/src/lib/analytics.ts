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

    try {
      const endpoint = this.config.endpoint || API_ENDPOINTS.DEFAULT;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "User-Agent": "indeks-core/1.0.0",
        },
        body: JSON.stringify({
          events,
          timestamp: Date.now(),
          version: "1.0.0",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
