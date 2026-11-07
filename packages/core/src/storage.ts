import { BATCH_CONFIG, STORAGE_KEYS, safeJsonParse } from "@useindeks/shared";
import type { IndeksEvent, StorageInterface } from "@useindeks/shared";

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
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
    return this.read();
  }

  append(events: IndeksEvent[]): void {
    this.replace([...this.read(), ...events]);
  }

  private read(): IndeksEvent[] {
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
