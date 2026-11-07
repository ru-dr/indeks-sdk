import { DEFAULTS, DEFAULT_COLLECTOR_OPTIONS } from "../constants";
import { COLLECTOR_NAMES } from "../types";
import type { CapturePreset, CollectorName, IndeksConfig, ResolvedConfig } from "../types";

const MINIMAL: readonly CollectorName[] = [
  "click",
  "pageview",
  "session",
  "error",
  "pageLeave",
  "scrollDepth",
  "outboundLink",
  "download",
  "performance",
];

const OPT_IN: readonly CollectorName[] = [
  "keystroke",
  "mouseMove",
  "hover",
  "mousePress",
  "textSelection",
];

export function presetCollectors(preset: CapturePreset): Record<CollectorName, boolean> {
  const enabled = (name: CollectorName): boolean => {
    if (preset === "minimal") return MINIMAL.includes(name);
    if (preset === "full") return true;
    return !OPT_IN.includes(name);
  };
  return Object.fromEntries(COLLECTOR_NAMES.map((name) => [name, enabled(name)])) as Record<
    CollectorName,
    boolean
  >;
}

function definedEntries<T extends object>(value: T | undefined): Partial<T> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export function resolveConfig(config: IndeksConfig): ResolvedConfig {
  return {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    localOnly: config.localOnly === true,
    debug: config.debug === true,
    collectors: {
      ...presetCollectors(config.preset ?? DEFAULTS.preset),
      ...definedEntries(config.collectors),
    },
    privacy: { ...DEFAULTS.privacy, ...definedEntries(config.privacy) },
    collectorOptions: {
      search: {
        ...DEFAULT_COLLECTOR_OPTIONS.search,
        ...definedEntries(config.collectorOptions?.search),
      },
      frustration: {
        ...DEFAULT_COLLECTOR_OPTIONS.frustration,
        ...definedEntries(config.collectorOptions?.frustration),
      },
    },
    debounceMs: config.debounceMs ?? DEFAULTS.debounceMs,
    idleTimeoutMs: config.idleTimeoutMs ?? DEFAULTS.idleTimeoutMs,
    scrollDepthThresholds: config.scrollDepthThresholds ?? DEFAULTS.scrollDepthThresholds,
  };
}
