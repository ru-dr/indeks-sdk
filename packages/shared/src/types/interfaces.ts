import type { IndeksEvent } from "./events";

export interface StorageInterface {
  store(events: IndeksEvent[]): Promise<void>;
  retrieve(): Promise<IndeksEvent[]>;
  clear(): Promise<void>;
}

export interface AnalyticsInterface {
  send(events: IndeksEvent[]): Promise<void>;
  batch(events: IndeksEvent[]): Promise<void>;
  flush(): Promise<void>;
}

export interface ManualTrackingSchema {
  selectors: string[];
  eventType?: string;
  eventName?: string;
  properties?: Record<string, unknown>;
  category?: string;
  value?: number;
  label?: string;
}
