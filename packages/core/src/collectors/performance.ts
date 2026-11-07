import type { IndeksPerformanceEvent } from "@useindeks/shared";
import type { Collector, CollectorContext } from "../context";
import { whenLoaded } from "./navigation";

type Rating = NonNullable<IndeksPerformanceEvent["rating"]>;

function rate(value: number, good: number, poor: number): Rating {
  if (value < good) return "good";
  return value < poor ? "needs-improvement" : "poor";
}

function report(
  ctx: CollectorContext,
  type: IndeksPerformanceEvent["type"],
  value: number,
  good: number,
  poor: number,
): void {
  ctx.emit<IndeksPerformanceEvent>({ type, value, rating: rate(value, good, poor) });
}

function observe(
  ctx: CollectorContext,
  options: PerformanceObserverInit & { durationThreshold?: number },
  callback: (entries: PerformanceEntryList) => void,
): void {
  try {
    const observer = ctx.hub.observe(
      new PerformanceObserver((list) => callback(list.getEntries())),
    );
    observer.observe(options);
  } catch (error) {
    ctx.logger.debug(`Performance entry type unsupported: ${options.type}`, error);
  }
}

export const performanceMetrics: Collector = (ctx) => {
  if (typeof PerformanceObserver === "undefined") return;

  let fcpReported = false;
  observe(ctx, { type: "paint", buffered: true }, (entries) => {
    const fcp = entries.find((entry) => entry.name === "first-contentful-paint");
    if (fcp && !fcpReported) {
      fcpReported = true;
      report(ctx, "first_contentful_paint", fcp.startTime, 1800, 3000);
    }
  });

  let lcp = 0;
  let lcpReported = false;
  observe(ctx, { type: "largest-contentful-paint", buffered: true }, (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcp = last.startTime;
  });

  let cls = 0;
  let reportedCls = -1;
  observe(ctx, { type: "layout-shift", buffered: true }, (entries) => {
    for (const entry of entries as Array<
      PerformanceEntry & { hadRecentInput: boolean; value: number }
    >) {
      if (!entry.hadRecentInput) cls += entry.value;
    }
  });

  let inp = 0;
  let reportedInp = 0;
  observe(ctx, { type: "event", buffered: true, durationThreshold: 40 }, (entries) => {
    for (const entry of entries as Array<PerformanceEntry & { interactionId?: number }>) {
      if (entry.interactionId) inp = Math.max(inp, entry.duration);
    }
  });

  ctx.lifecycle.onExit(() => {
    if (lcp > 0 && !lcpReported) {
      lcpReported = true;
      report(ctx, "largest_contentful_paint", lcp, 2500, 4000);
    }
    if (cls !== reportedCls && (cls > 0 || reportedCls >= 0)) {
      reportedCls = cls;
      report(ctx, "cumulative_layout_shift", cls, 0.1, 0.25);
    }
    if (inp > 0 && inp !== reportedInp) {
      reportedInp = inp;
      report(ctx, "interaction_to_next_paint", inp, 200, 500);
    }
  });

  whenLoaded(ctx, () => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    if (navigation) {
      report(
        ctx,
        "time_to_first_byte",
        navigation.responseStart - navigation.requestStart,
        800,
        1800,
      );
    }
  });
};
