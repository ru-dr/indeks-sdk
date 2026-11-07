import { scrubUrl } from "@indeks/shared";
import { getScrollMetrics } from "./dom";
import type { Hub } from "./hub";
import type { SessionManager } from "./session";

export type ExitTrigger = "pagehide" | "hidden";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "wheel"] as const;

function documentIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

export class PageState {
  startTime = Date.now();
  clicks = 0;
  maxScrollDepth = 0;
  previousUrl: string | null = null;
  scrollDepthReached = new Set<number>();
  private visibleMs = 0;
  private visibleSince: number | null = documentIsVisible() ? Date.now() : null;

  reset(): void {
    this.startTime = Date.now();
    this.clicks = 0;
    this.maxScrollDepth = 0;
    this.scrollDepthReached.clear();
    this.visibleMs = 0;
    this.visibleSince = documentIsVisible() ? this.startTime : null;
  }

  setVisible(visible: boolean, now = Date.now()): void {
    if (!visible && this.visibleSince !== null) {
      this.visibleMs += now - this.visibleSince;
      this.visibleSince = null;
    } else if (visible && this.visibleSince === null) {
      this.visibleSince = now;
    }
  }

  timeOnPage(now = Date.now()): number {
    return this.visibleMs + (this.visibleSince === null ? 0 : now - this.visibleSince);
  }
}

type HistoryMethod = "pushState" | "replaceState";

export class Lifecycle {
  lastActivityTime = Date.now();
  private active = false;
  private exiting = false;
  private exitHandlers: Array<(trigger: ExitTrigger) => void> = [];
  private beforeNavigationHandlers: Array<() => void> = [];
  private navigationHandlers: Array<() => void> = [];
  private activityHandlers: Array<(previousActivity: number) => void> = [];
  private visibilityHandlers: Array<(state: DocumentVisibilityState) => void> = [];
  private lastKnownUrl = "";
  private patched: Partial<
    Record<HistoryMethod, { original: History[HistoryMethod]; wrapper: History[HistoryMethod] }>
  > = {};

  constructor(
    private hub: Hub,
    private session: SessionManager,
    private page: PageState,
    private idleTimeoutMs: () => number,
    private debounceMs: () => number,
  ) {}

  onExit(handler: (trigger: ExitTrigger) => void): void {
    this.exitHandlers.push(handler);
  }

  onBeforeNavigation(handler: () => void): void {
    this.beforeNavigationHandlers.push(handler);
  }

  onNavigation(handler: () => void): void {
    this.navigationHandlers.push(handler);
  }

  onActivity(handler: (previousActivity: number) => void): void {
    this.activityHandlers.push(handler);
  }

  onVisibility(handler: (state: DocumentVisibilityState) => void): void {
    this.visibilityHandlers.push(handler);
  }

  routeKey(): string {
    return scrubUrl(window.location.href);
  }

  start(): void {
    this.active = true;
    this.lastKnownUrl = this.routeKey();
    this.page.reset();
    this.patchHistory();
    this.listenForActivity();
    this.listenForExit();
  }

  stop(): void {
    this.active = false;
    for (const method of ["pushState", "replaceState"] as const) {
      const patch = this.patched[method];
      if (patch && history[method] === patch.wrapper) history[method] = patch.original;
    }
    this.patched = {};
    this.exitHandlers = [];
    this.beforeNavigationHandlers = [];
    this.navigationHandlers = [];
    this.activityHandlers = [];
    this.visibilityHandlers = [];
    this.exiting = false;
    this.lastActivityTime = Date.now();
  }

  private run(handlers: Array<() => void>): void {
    for (const handler of handlers) {
      try {
        handler();
      } catch {
        continue;
      }
    }
  }

  private recordActivity(): void {
    const now = Date.now();
    const previous = this.lastActivityTime;
    const delta = now - previous;
    if (delta < this.idleTimeoutMs()) this.session.addActive(delta);
    this.lastActivityTime = now;
    if (!this.session.isExpired()) this.session.touch();
    for (const handler of this.activityHandlers) handler(previous);
  }

  private handleUrlChange(): void {
    if (!this.active) return;
    const key = this.routeKey();
    if (key === this.lastKnownUrl) return;
    this.lastKnownUrl = key;
    this.page.reset();
    this.run(this.navigationHandlers);
  }

  private willChangeRoute(target: unknown): boolean {
    if (target === undefined || target === null) return false;
    try {
      const next = scrubUrl(new URL(String(target), window.location.href).href);
      return next !== this.lastKnownUrl;
    } catch {
      return false;
    }
  }

  private patchHistory(): void {
    for (const method of ["pushState", "replaceState"] as const) {
      const original = history[method];
      const before = (target: unknown) => {
        if (this.active && this.willChangeRoute(target)) this.run(this.beforeNavigationHandlers);
      };
      const after = () => this.handleUrlChange();
      const wrapper = function (this: History, ...args: Parameters<History[HistoryMethod]>) {
        before(args[2]);
        const result = (original as (...a: unknown[]) => unknown).apply(this, args);
        after();
        return result;
      } as History[HistoryMethod];
      history[method] = wrapper;
      this.patched[method] = { original, wrapper };
    }
    const notify = () => this.handleUrlChange();
    this.hub.on(window, "popstate", notify);
    this.hub.on(window, "hashchange", notify);
  }

  private listenForActivity(): void {
    for (const type of ACTIVITY_EVENTS) {
      this.hub.on(document, type, () => this.recordActivity(), {
        passive: true,
        capture: true,
      });
    }
    this.hub.on(
      document,
      "click",
      () => {
        this.recordActivity();
        this.session.addClick();
        this.page.clicks++;
      },
      true,
    );
    const countScroll = this.hub.debounced(() => {
      this.session.addScroll();
      this.page.maxScrollDepth = Math.max(this.page.maxScrollDepth, getScrollMetrics().percentage);
    }, this.debounceMs());
    this.hub.on(
      window,
      "scroll",
      () => {
        this.recordActivity();
        countScroll();
      },
      { passive: true },
    );
  }

  private listenForExit(): void {
    const exit = (trigger: ExitTrigger) => {
      if (this.exiting) return;
      this.exiting = true;
      for (const handler of this.exitHandlers) {
        try {
          handler(trigger);
        } catch {
          continue;
        }
      }
      this.session.touch(true);
    };
    this.hub.on(window, "pagehide", () => {
      this.page.setVisible(false);
      exit("pagehide");
    });
    this.hub.on(window, "pageshow", () => {
      this.exiting = false;
      this.page.setVisible(documentIsVisible());
    });
    this.hub.on(document, "visibilitychange", () => {
      const state = document.visibilityState;
      this.page.setVisible(state !== "hidden");
      for (const handler of this.visibilityHandlers) {
        try {
          handler(state);
        } catch {
          continue;
        }
      }
      if (state === "hidden") exit("hidden");
      else this.exiting = false;
    });
  }
}
