import { scrubUrl } from "@indeks/shared";
import { getScrollMetrics } from "./dom";
import type { Hub } from "./hub";
import type { SessionManager } from "./session";

export type ExitTrigger = "pagehide" | "hidden";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "wheel"] as const;

export class PageState {
  startTime = Date.now();
  clicks = 0;
  maxScrollDepth = 0;
  previousUrl: string | null = null;
  scrollDepthReached = new Set<number>();

  reset(): void {
    this.startTime = Date.now();
    this.clicks = 0;
    this.maxScrollDepth = 0;
    this.scrollDepthReached.clear();
  }
}

export class Lifecycle {
  lastActivityTime = Date.now();
  private exiting = false;
  private exitHandlers: Array<(trigger: ExitTrigger) => void> = [];
  private navigationHandlers: Array<() => void> = [];
  private activityHandlers: Array<(previousActivity: number) => void> = [];
  private visibilityHandlers: Array<(state: DocumentVisibilityState) => void> = [];
  private lastKnownUrl = "";
  private originalHistory: {
    pushState: History["pushState"];
    replaceState: History["replaceState"];
  } | null = null;

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
    this.lastKnownUrl = this.routeKey();
    this.patchHistory();
    this.listenForActivity();
    this.listenForExit();
  }

  stop(): void {
    if (this.originalHistory) {
      history.pushState = this.originalHistory.pushState;
      history.replaceState = this.originalHistory.replaceState;
      this.originalHistory = null;
    }
    this.exitHandlers = [];
    this.navigationHandlers = [];
    this.activityHandlers = [];
    this.visibilityHandlers = [];
    this.exiting = false;
    this.lastActivityTime = Date.now();
  }

  private recordActivity(): void {
    const now = Date.now();
    const previous = this.lastActivityTime;
    const delta = now - previous;
    if (delta < this.idleTimeoutMs()) this.session.addActive(delta);
    this.lastActivityTime = now;
    for (const handler of this.activityHandlers) handler(previous);
  }

  private handleUrlChange(): void {
    const key = this.routeKey();
    if (key === this.lastKnownUrl) return;
    this.lastKnownUrl = key;
    this.page.reset();
    for (const handler of this.navigationHandlers) handler();
  }

  private patchHistory(): void {
    const original = {
      pushState: history.pushState,
      replaceState: history.replaceState,
    };
    this.originalHistory = original;
    const notify = () => this.handleUrlChange();
    const patch = (name: "pushState" | "replaceState") => {
      history[name] = function (this: History, ...args: never[]) {
        const result = (original[name] as (...a: never[]) => unknown).apply(this, args);
        notify();
        return result;
      } as History[typeof name];
    };
    patch("pushState");
    patch("replaceState");
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
    this.hub.on(window, "pagehide", () => exit("pagehide"));
    this.hub.on(window, "pageshow", () => {
      this.exiting = false;
    });
    this.hub.on(document, "visibilitychange", () => {
      const state = document.visibilityState;
      if (state === "hidden") exit("hidden");
      else this.exiting = false;
      for (const handler of this.visibilityHandlers) handler(state);
    });
  }
}
