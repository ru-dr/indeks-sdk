import IndeksTracker from "./tracker";
import type { IndeksConfig } from "@indeks/shared";

export function indeks(apiKey: string, config: Partial<IndeksConfig> = {}): IndeksTracker {
  const tracker = new IndeksTracker({ ...config, apiKey });
  if (typeof window !== "undefined") {
    const start = () => tracker.init().catch(console.error);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      void start();
    }
  }
  return tracker;
}

export { IndeksTracker };
export type { TrackOptions } from "./tracker";
export type {
  CapturePreset,
  CollectorName,
  DeviceData,
  IndeksConfig,
  IndeksEvent,
  ManualTrackingSchema,
  PrivacyConfig,
} from "@indeks/shared";
export default indeks;

declare global {
  interface Window {
    indeks?: typeof indeks;
    IndeksTracker?: typeof IndeksTracker;
  }
}

export function exposeGlobals(): void {
  if (typeof window === "undefined") return;
  window.indeks = indeks;
  window.IndeksTracker = IndeksTracker;
}

if (typeof document !== "undefined") {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.hasAttribute("data-indeks-global")) {
    exposeGlobals();
  }
}
