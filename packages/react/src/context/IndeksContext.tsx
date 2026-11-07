import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IndeksTracker } from "@indeks/core";
import type { TrackOptions } from "@indeks/core";
import type { IndeksConfig } from "@indeks/shared";

export interface IndeksContextValue {
  tracker: IndeksTracker | null;
  isInitialized: boolean;
  sessionId: string | null;
  userId: string | null;
  config: Partial<IndeksConfig> | null;
  track: (name: string, properties?: Record<string, unknown>, options?: TrackOptions) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  page: (name?: string, properties?: Record<string, unknown>) => void;
}

interface ActiveTracker {
  tracker: IndeksTracker;
  sessionId: string;
  userId: string | null;
}

const MAX_BUFFERED_CALLS = 100;

const CONTEXT_KEY = Symbol.for("@indeks/react/context");

type ContextStore = typeof globalThis & {
  [CONTEXT_KEY]?: React.Context<IndeksContextValue | undefined>;
};

const store = globalThis as ContextStore;
const IndeksContext = (store[CONTEXT_KEY] ??= createContext<IndeksContextValue | undefined>(
  undefined,
));

export interface IndeksProviderProps {
  apiKey: string;
  config?: Omit<Partial<IndeksConfig>, "apiKey">;
  debug?: boolean;
  children: React.ReactNode;
}

export const Indeks: React.FC<IndeksProviderProps> = ({
  apiKey,
  config,
  debug = false,
  children,
}) => {
  const [active, setActive] = useState<ActiveTracker | null>(null);
  const trackerRef = useRef<IndeksTracker | null>(null);
  const buffered = useRef<Array<(tracker: IndeksTracker) => void>>([]);
  const configKey = JSON.stringify(config ?? {});

  const call = useCallback((action: (tracker: IndeksTracker) => void) => {
    if (trackerRef.current) {
      action(trackerRef.current);
    } else if (buffered.current.length < MAX_BUFFERED_CALLS) {
      buffered.current.push(action);
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("Indeks: API key is required");
      return;
    }

    let cancelled = false;
    let tracker: IndeksTracker;
    try {
      tracker = new IndeksTracker({
        debug,
        ...(JSON.parse(configKey) as Partial<IndeksConfig>),
        apiKey,
      });
    } catch (error) {
      console.error("Failed to create Indeks tracker:", error);
      return;
    }

    trackerRef.current = tracker;
    const queued = buffered.current;
    buffered.current = [];
    for (const action of queued) action(tracker);

    tracker
      .init()
      .then(() => {
        if (cancelled) return;
        setActive({
          tracker,
          sessionId: tracker.getSessionId(),
          userId: tracker.getUserId(),
        });
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize Indeks tracker:", error);
      });

    return () => {
      cancelled = true;
      trackerRef.current = null;
      setActive(null);
      tracker.destroy().catch((error: unknown) => {
        console.error("Failed to destroy Indeks tracker:", error);
      });
    };
  }, [apiKey, debug, configKey]);

  const value = useMemo<IndeksContextValue>(
    () => ({
      tracker: active?.tracker ?? null,
      isInitialized: active !== null,
      sessionId: active?.sessionId ?? null,
      userId: active?.userId ?? null,
      config: { apiKey, debug, ...(config ?? {}) },
      track: (name, properties, options) => call((t) => t.track(name, properties, options)),
      identify: (id, traits) => call((t) => t.identify(id, traits)),
      page: (name, properties) => call((t) => t.page(name, properties)),
    }),
    [active, apiKey, debug, configKey, call],
  );

  return <IndeksContext.Provider value={value}>{children}</IndeksContext.Provider>;
};

export const useIndeksContext = (): IndeksContextValue => {
  const context = useContext(IndeksContext);
  if (!context) {
    throw new Error("useIndeksContext must be used within an Indeks provider");
  }
  return context;
};
