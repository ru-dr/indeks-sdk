import type {
  DeviceData,
  Debounced,
  IndeksBaseEvent,
  IndeksEvent,
  Logger,
  ResolvedConfig,
} from "@useindeks/shared";
import type { Hub } from "./hub";
import type { Lifecycle, PageState } from "./lifecycle";
import type { SessionManager } from "./session";

export type EventFields<E extends IndeksEvent> = Omit<
  E,
  Exclude<keyof IndeksBaseEvent, "type" | "referrer">
>;

export type SessionEndTrigger = "pagehide" | "hidden" | "timeout" | "reset";

export interface CollectorState {
  lastError: { message: string; at: number } | null;
  printHint: { trigger: "button" | "keyboard"; at: number } | null;
}

export interface SessionHooks {
  start?: () => void;
  end?: (trigger: SessionEndTrigger) => void;
}

export interface CollectorContext {
  readonly config: ResolvedConfig;
  readonly logger: Logger;
  readonly hub: Hub;
  readonly lifecycle: Lifecycle;
  readonly page: PageState;
  readonly session: SessionManager;
  readonly device: DeviceData;
  readonly state: CollectorState;
  readonly sessionHooks: SessionHooks;
  on: Hub["on"];
  later: Hub["later"];
  debounced<T extends (...args: never[]) => void>(handler: T): Debounced<T>;
  throttled<T extends (...args: never[]) => void>(handler: T, interval: number): T;
  emit<E extends IndeksEvent>(fields: EventFields<E>): void;
  captureText(): boolean;
}

export type Collector = (ctx: CollectorContext) => void;
