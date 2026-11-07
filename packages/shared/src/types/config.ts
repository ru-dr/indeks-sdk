export const COLLECTOR_NAMES = [
  "click",
  "doubleClick",
  "contextMenu",
  "mousePress",
  "hover",
  "mouseMove",
  "wheel",
  "touch",
  "dragDrop",
  "keystroke",
  "scroll",
  "scrollDepth",
  "resize",
  "fullscreen",
  "orientation",
  "idle",
  "pageview",
  "pageLoad",
  "pageLeave",
  "pageLifecycle",
  "beforeUnload",
  "hashChange",
  "popState",
  "visibility",
  "windowFocus",
  "tabFocus",
  "session",
  "formSubmit",
  "inputChange",
  "fieldFocus",
  "formAbandon",
  "formError",
  "clipboard",
  "textSelection",
  "search",
  "frustration",
  "download",
  "outboundLink",
  "print",
  "share",
  "media",
  "mediaProgress",
  "error",
  "resourceError",
  "networkStatus",
  "networkChange",
  "performance",
] as const;

export type CollectorName = (typeof COLLECTOR_NAMES)[number];

export type CapturePreset = "minimal" | "standard" | "full";

export interface PrivacyConfig {
  respectDoNotTrack?: boolean;
  elementText?: boolean;
  formValues?: boolean;
  clipboardText?: boolean;
  searchTerms?: boolean;
  fingerprint?: boolean;
}

export interface SearchOptions {
  inputSelector?: string;
  resultsCountSelector?: string;
  resultItemSelector?: string;
}

export interface FrustrationOptions {
  rageClickCount?: number;
  rageClickWindowMs?: number;
  deadClickWindowMs?: number;
  clickableSelector?: string;
}

export interface CollectorOptions {
  search?: SearchOptions;
  frustration?: FrustrationOptions;
}

export interface IndeksConfig {
  apiKey: string;
  endpoint?: string;
  localOnly?: boolean;
  debug?: boolean;
  preset?: CapturePreset;
  collectors?: Partial<Record<CollectorName, boolean>>;
  privacy?: PrivacyConfig;
  collectorOptions?: CollectorOptions;
  debounceMs?: number;
  idleTimeoutMs?: number;
  scrollDepthThresholds?: readonly number[];
}

export interface ResolvedCollectorOptions {
  search: Required<SearchOptions>;
  frustration: Required<FrustrationOptions>;
}

export interface ResolvedConfig {
  apiKey: string;
  endpoint?: string;
  localOnly: boolean;
  debug: boolean;
  collectors: Record<CollectorName, boolean>;
  privacy: Required<PrivacyConfig>;
  collectorOptions: ResolvedCollectorOptions;
  debounceMs: number;
  idleTimeoutMs: number;
  scrollDepthThresholds: readonly number[];
}
