import type { IndeksEvent } from "@/types/events";

/**
 * Interface for storage adapters that persist events
 */
export interface StorageInterface {
  store(events: IndeksEvent[]): Promise<void>;
  retrieve(): Promise<IndeksEvent[]>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

/**
 * Interface for analytics adapters that send events to backend
 */
export interface AnalyticsInterface {
  send(events: IndeksEvent[]): Promise<void>;
  batch(events: IndeksEvent[]): Promise<void>;
  flush(): Promise<void>;
}

export interface ManualTrackingSchema {
  selectors: string[]; // CSS selectors for elements to track
  eventType?: string; // Event type to listen for (click, hover, submit, etc.)
  eventName?: string; // Name for the custom event
  properties?: Record<string, any>; // Additional properties to include
  category?: string; // Optional category
  value?: number; // Optional numeric value
  label?: string; // Optional label
}
