import { BATCH_CONFIG, STORAGE_KEYS, safeJsonParse } from "@indeks/shared";
import type { IndeksEvent, StorageInterface } from "@indeks/shared";

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export class LocalStorageAdapter implements StorageInterface {
  private readonly key = STORAGE_KEYS.EVENTS;

  async store(events: IndeksEvent[]): Promise<void> {
    this.replace([...(await this.retrieve()), ...events]);
  }

  replace(events: IndeksEvent[]): void {
    let payload = events.slice(-BATCH_CONFIG.MAX_PERSISTED_EVENTS);
    while (payload.length) {
      try {
        localStorage.setItem(this.key, JSON.stringify(payload));
        return;
      } catch (error) {
        if (!isQuotaExceeded(error)) return;
        payload = payload.slice(Math.ceil(payload.length / 2));
      }
    }
    this.removeKey();
  }

  async retrieve(): Promise<IndeksEvent[]> {
    try {
      const stored = localStorage.getItem(this.key);
      const parsed = stored ? safeJsonParse<unknown>(stored, []) : [];
      return Array.isArray(parsed) ? (parsed as IndeksEvent[]) : [];
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    this.removeKey();
  }

  private removeKey(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      return;
    }
  }
}
