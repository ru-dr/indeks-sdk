import type {
  IndeksFullscreenChangeEvent,
  IndeksIdleEvent,
  IndeksOrientationChangeEvent,
  IndeksResizeEvent,
  IndeksScrollDepthEvent,
  IndeksScrollEvent,
} from "@indeks/shared";
import type { Collector } from "../context";
import { describeElement, getScrollMetrics } from "../dom";

export const scroll: Collector = (ctx) => {
  const track = ctx.debounced(() => {
    const metrics = getScrollMetrics();
    ctx.emit<IndeksScrollEvent>({
      type: "scroll",
      scrollPosition: { x: metrics.scrollLeft, y: metrics.scrollTop },
      documentHeight: metrics.documentHeight,
      viewportHeight: metrics.viewportHeight,
      scrollPercentage: metrics.percentage,
    });
  });
  ctx.on(window, "scroll", track, { passive: true });
};

export const scrollDepth: Collector = (ctx) => {
  const check = ctx.debounced(() => {
    const { percentage } = getScrollMetrics();
    for (const threshold of ctx.config.scrollDepthThresholds) {
      if (percentage < threshold || ctx.page.scrollDepthReached.has(threshold)) continue;
      ctx.page.scrollDepthReached.add(threshold);
      ctx.emit<IndeksScrollDepthEvent>({
        type: "scroll_depth",
        depth: threshold as IndeksScrollDepthEvent["depth"],
        timeToDepth: Date.now() - ctx.page.startTime,
      });
    }
  });
  ctx.on(window, "scroll", check, { passive: true });
};

export const resize: Collector = (ctx) => {
  const track = ctx.debounced(() => {
    ctx.emit<IndeksResizeEvent>({
      type: "resize",
      dimensions: {
        width: window.outerWidth,
        height: window.outerHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      },
    });
  });
  ctx.on(window, "resize", track);
};

export const fullscreen: Collector = (ctx) => {
  ctx.on(document, "fullscreenchange", () => {
    const element = document.fullscreenElement;
    ctx.emit<IndeksFullscreenChangeEvent>({
      type: "fullscreenchange",
      isFullscreen: !!element,
      element: element ? describeElement(element) : undefined,
    });
  });
};

export const orientation: Collector = (ctx) => {
  ctx.on(window, "orientationchange", () => {
    const screenOrientation = window.screen?.orientation;
    const landscape = screenOrientation
      ? screenOrientation.type.startsWith("landscape")
      : window.innerWidth > window.innerHeight;
    ctx.emit<IndeksOrientationChangeEvent>({
      type: "orientation_change",
      orientation: landscape ? "landscape" : "portrait",
      angle: screenOrientation?.angle ?? 0,
    });
  });
};

export const idle: Collector = (ctx) => {
  const timeout = ctx.config.idleTimeoutMs;
  let isIdle = false;
  let timer: number | null = null;

  const arm = (delay: number) => {
    ctx.hub.cancel(timer);
    timer = ctx.later(check, delay);
  };
  const check = () => {
    timer = null;
    const remaining = timeout - (Date.now() - ctx.lifecycle.lastActivityTime);
    if (remaining > 0) {
      arm(remaining);
      return;
    }
    if (isIdle) return;
    isIdle = true;
    ctx.emit<IndeksIdleEvent>({ type: "idle_start" });
  };

  ctx.lifecycle.onActivity((previousActivity) => {
    if (!isIdle) return;
    isIdle = false;
    ctx.emit<IndeksIdleEvent>({
      type: "idle_end",
      idleDuration: Date.now() - previousActivity,
    });
    arm(timeout);
  });
  arm(timeout);
};
