import { scrubHash, scrubUrl } from "@indeks/shared";
import type {
  IndeksBeforeUnloadEvent,
  IndeksHashChangeEvent,
  IndeksPageLeaveEvent,
  IndeksPageLifecycleEvent,
  IndeksPageLoadEvent,
  IndeksPageViewEvent,
  IndeksPopStateEvent,
  IndeksTabFocusEvent,
  IndeksVisibilityChangeEvent,
  IndeksWindowFocusEvent,
} from "@indeks/shared";
import type { Collector, CollectorContext } from "../context";

const NAVIGATION_SETTLE_MS = 50;

export function emitPageView(
  ctx: CollectorContext,
  extra: { name?: string; properties?: Record<string, unknown> } = {},
): void {
  const { page } = ctx;
  ctx.emit<IndeksPageViewEvent>({
    type: "pageview",
    title: document.title,
    referrer: (page.previousUrl ? scrubUrl(page.previousUrl) : "") || scrubUrl(document.referrer),
    ...extra,
  });
  page.previousUrl = window.location.href;
}

export const pageview: Collector = (ctx) => {
  emitPageView(ctx);
  ctx.lifecycle.onNavigation(() => {
    ctx.later(() => emitPageView(ctx), NAVIGATION_SETTLE_MS);
  });
};

function timing(): PerformanceNavigationTiming | undefined {
  return performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
}

export function whenLoaded(ctx: CollectorContext, handler: () => void): void {
  if (document.readyState === "complete") handler();
  else ctx.on(window, "load", handler);
}

export const pageLoad: Collector = (ctx) => {
  whenLoaded(ctx, () => {
    const navigation = timing();
    ctx.emit<IndeksPageLoadEvent>({
      type: "load",
      loadTime: Math.round(performance.now()),
      domInteractive: navigation?.domInteractive,
      domComplete: navigation?.domComplete,
    });
  });
  const domReady = () =>
    ctx.emit<IndeksPageLoadEvent>({
      type: "DOMContentLoaded",
      loadTime: Math.round(timing()?.domContentLoadedEventEnd || performance.now()),
    });
  if (document.readyState !== "loading") domReady();
  else ctx.on(document, "DOMContentLoaded", domReady);
};

export const pageLeave: Collector = (ctx) => {
  ctx.lifecycle.onExit(() => {
    const timeOnPage = Date.now() - ctx.page.startTime;
    ctx.emit<IndeksPageLeaveEvent>({
      type: "pageleave",
      timeOnPage,
      scrollDepth: ctx.page.maxScrollDepth,
      clickCount: ctx.page.clicks,
      engaged: timeOnPage > 10000 && ctx.page.clicks > 2,
    });
  });
};

export const pageLifecycle: Collector = (ctx) => {
  if (!("onfreeze" in document)) return;
  const track = (type: "page_freeze" | "page_resume") => () =>
    ctx.emit<IndeksPageLifecycleEvent>({ type });
  ctx.on(document, "freeze", track("page_freeze"));
  ctx.on(document, "resume", track("page_resume"));
};

export const beforeUnload: Collector = (ctx) => {
  ctx.on(window, "beforeunload", () => {
    ctx.emit<IndeksBeforeUnloadEvent>({
      type: "beforeunload",
      timeOnPage: Date.now() - ctx.page.startTime,
    });
  });
};

export const hashChange: Collector = (ctx) => {
  const hashOf = (url: string) => {
    try {
      return scrubHash(new URL(url).hash);
    } catch {
      return "";
    }
  };
  ctx.on(window, "hashchange", (e) => {
    ctx.emit<IndeksHashChangeEvent>({
      type: "hashchange",
      oldURL: scrubUrl(e.oldURL),
      newURL: scrubUrl(e.newURL),
      oldHash: hashOf(e.oldURL),
      newHash: hashOf(e.newURL),
    });
  });
};

export const popState: Collector = (ctx) => {
  ctx.on(window, "popstate", (e) => {
    ctx.emit<IndeksPopStateEvent>({
      type: "popstate",
      hasState: e.state !== null && e.state !== undefined,
    });
  });
};

export const visibility: Collector = (ctx) => {
  ctx.lifecycle.onVisibility((state) => {
    ctx.emit<IndeksVisibilityChangeEvent>({
      type: "visibilitychange",
      visibilityState: state === "hidden" ? "hidden" : "visible",
      hidden: state === "hidden",
    });
  });
};

export const windowFocus: Collector = (ctx) => {
  const track = (type: "focus" | "blur") => () =>
    ctx.emit<IndeksWindowFocusEvent>({ type, hasFocus: type === "focus" });
  ctx.on(window, "focus", track("focus"));
  ctx.on(window, "blur", track("blur"));
};

export const tabFocus: Collector = (ctx) => {
  let blurredAt: number | null = null;
  ctx.lifecycle.onVisibility((state) => {
    if (state === "hidden") {
      blurredAt = Date.now();
      ctx.emit<IndeksTabFocusEvent>({ type: "tab_blur" });
    } else {
      ctx.emit<IndeksTabFocusEvent>({
        type: "tab_focus",
        timeAway: blurredAt ? Date.now() - blurredAt : 0,
      });
      blurredAt = null;
    }
  });
};
