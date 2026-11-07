import { SESSION_TIMEOUT_MS, STORAGE_KEYS, generateId } from "@indeks/shared";
import { storageGet, storageSet } from "./dom";

const PERSIST_INTERVAL_MS = 1000;

export interface SessionRecord {
  id: string;
  startedAt: number;
  lastSeen: number;
  pageViews: number;
  clicks: number;
  scrolls: number;
  activeMs: number;
  converted: boolean;
}

export class SessionManager {
  private record: SessionRecord;
  private lastPersist = 0;
  private fresh: boolean;

  constructor() {
    const restored = this.read();
    this.fresh = !restored;
    this.record = restored ?? this.create();
  }

  get id(): string {
    return this.record.id;
  }

  get data(): Readonly<SessionRecord> {
    return this.record;
  }

  consumeNew(): boolean {
    const isNew = this.fresh;
    this.fresh = false;
    return isNew;
  }

  isExpired(now = Date.now()): boolean {
    return now - this.record.lastSeen > SESSION_TIMEOUT_MS;
  }

  restart(): void {
    this.record = this.create();
    this.fresh = true;
    this.write();
  }

  touch(force = false): void {
    this.record.lastSeen = Date.now();
    if (force || this.record.lastSeen - this.lastPersist >= PERSIST_INTERVAL_MS) {
      this.write();
    }
  }

  addActive(ms: number): void {
    this.record.activeMs += ms;
  }

  addClick(): void {
    this.record.clicks++;
  }

  addScroll(): void {
    this.record.scrolls++;
  }

  addPageView(): void {
    this.record.pageViews++;
  }

  markConverted(): void {
    this.record.converted = true;
  }

  private read(): SessionRecord | null {
    const raw = storageGet("sessionStorage", STORAGE_KEYS.SESSION_ID);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SessionRecord>;
      if (
        !parsed?.id ||
        typeof parsed.lastSeen !== "number" ||
        Date.now() - parsed.lastSeen >= SESSION_TIMEOUT_MS
      ) {
        return null;
      }
      return {
        id: parsed.id,
        startedAt: parsed.startedAt ?? Date.now(),
        lastSeen: Date.now(),
        pageViews: parsed.pageViews ?? 0,
        clicks: parsed.clicks ?? 0,
        scrolls: parsed.scrolls ?? 0,
        activeMs: parsed.activeMs ?? 0,
        converted: parsed.converted === true,
      };
    } catch {
      return null;
    }
  }

  private create(): SessionRecord {
    const now = Date.now();
    this.lastPersist = 0;
    return {
      id: generateId("indeks"),
      startedAt: now,
      lastSeen: now,
      pageViews: 0,
      clicks: 0,
      scrolls: 0,
      activeMs: 0,
      converted: false,
    };
  }

  private write(record: SessionRecord = this.record): void {
    this.lastPersist = Date.now();
    storageSet("sessionStorage", STORAGE_KEYS.SESSION_ID, JSON.stringify(record));
  }
}
