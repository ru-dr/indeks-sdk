import { STORAGE_KEYS, safeJsonParse } from "@indeks/shared";
import type { IndeksEvent, StorageInterface } from "@/types";

export class LocalStorageAdapter implements StorageInterface {
  private readonly key = STORAGE_KEYS.EVENTS;

  async store(events: IndeksEvent[]): Promise<void> {
    try {
      const existingEvents = await this.retrieve();
      const allEvents = [...existingEvents, ...events];
      localStorage.setItem(this.key, JSON.stringify(allEvents));
    } catch (error) {
      console.warn("Indeks: Failed to store events in localStorage:", error);
    }
  }

  async retrieve(): Promise<IndeksEvent[]> {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? safeJsonParse<IndeksEvent[]>(stored, []) : [];
    } catch (error) {
      console.warn(
        "Indeks: Failed to retrieve events from localStorage:",
        error,
      );
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.warn("Indeks: Failed to clear events from localStorage:", error);
    }
  }

  async size(): Promise<number> {
    const events = await this.retrieve();
    return events.length;
  }
}

export class SessionStorageAdapter implements StorageInterface {
  private readonly key = STORAGE_KEYS.SESSION_EVENTS;

  async store(events: IndeksEvent[]): Promise<void> {
    try {
      const existingEvents = await this.retrieve();
      const allEvents = [...existingEvents, ...events];
      sessionStorage.setItem(this.key, JSON.stringify(allEvents));
    } catch (error) {
      console.warn("Indeks: Failed to store events in sessionStorage:", error);
    }
  }

  async retrieve(): Promise<IndeksEvent[]> {
    try {
      const stored = sessionStorage.getItem(this.key);
      return stored ? safeJsonParse<IndeksEvent[]>(stored, []) : [];
    } catch (error) {
      console.warn(
        "Indeks: Failed to retrieve events from sessionStorage:",
        error,
      );
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      sessionStorage.removeItem(this.key);
    } catch (error) {
      console.warn(
        "Indeks: Failed to clear events from sessionStorage:",
        error,
      );
    }
  }

  async size(): Promise<number> {
    const events = await this.retrieve();
    return events.length;
  }
}

export class InMemoryStorageAdapter implements StorageInterface {
  private events: IndeksEvent[] = [];

  async store(events: IndeksEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async retrieve(): Promise<IndeksEvent[]> {
    return [...this.events];
  }

  async clear(): Promise<void> {
    this.events = [];
  }

  async size(): Promise<number> {
    return this.events.length;
  }
}
