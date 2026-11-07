import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from "bun:test";
import { STORAGE_KEYS, resolveConfig } from "@indeks/shared";
import type { IndeksEvent } from "@indeks/shared";
import { IndeksTracker } from "../src";
import { IndeksAnalytics } from "../src/analytics";
import { API_KEY, click, createTracker, eventsOfType, html, resetBrowser, sleep } from "./helpers";

const nativePushState = history.pushState;
const nativeReplaceState = history.replaceState;
const trackers: IndeksTracker[] = [];
const cleanups: Array<() => void> = [];

async function start(overrides = {}) {
  const tracker = await createTracker(overrides);
  trackers.push(tracker);
  return tracker;
}

function make(overrides = {}) {
  const tracker = new IndeksTracker({
    apiKey: API_KEY,
    localOnly: true,
    debounceMs: 1,
    ...overrides,
  });
  trackers.push(tracker);
  return tracker;
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => resetBrowser());

afterEach(async () => {
  setSystemTime();
  for (const tracker of trackers.splice(0)) await tracker.destroy();
  while (cleanups.length) cleanups.pop()!();
  setVisibility("visible");
  history.pushState = nativePushState;
  history.replaceState = nativeReplaceState;
});

describe("overlapping tracker lifetimes (React StrictMode, config changes)", () => {
  test("destroying one tracker without awaiting never removes the next tracker's history hooks", async () => {
    const first = await start();
    void first.destroy();
    const second = await start();
    expect(history.pushState).not.toBe(nativePushState);
    history.pushState({}, "", "/next");
    await sleep(80);
    expect(eventsOfType(second, "pageview")).toHaveLength(2);
  });

  test("a destroyed tracker stops emitting and restores the native history methods", async () => {
    const tracker = await start();
    await tracker.destroy();
    expect(history.pushState).toBe(nativePushState);
    expect(history.replaceState).toBe(nativeReplaceState);
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(0);
  });

  test("a router wrapping history after the tracker started is not clobbered on destroy", async () => {
    const tracker = await start();
    const routerPush = history.pushState;
    const wrapped = function (this: History, ...args: Parameters<History["pushState"]>) {
      return routerPush.apply(this, args);
    } as History["pushState"];
    history.pushState = wrapped;
    await tracker.destroy();
    expect(history.pushState).toBe(wrapped);
    expect(() => history.pushState({}, "", "/after")).not.toThrow();
    expect(tracker.getEvents()).toHaveLength(0);
  });

  test("destroying during an in-flight init cancels the start", async () => {
    mock.module("@thumbmarkjs/thumbmarkjs", () => ({
      Thumbmark: class {
        async get() {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { thumbmark: "slow-fp" };
        }
      },
    }));
    const tracker = make({ privacy: { fingerprint: true } });
    const started = tracker.init();
    await tracker.destroy();
    await started;
    expect(history.pushState).toBe(nativePushState);
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(0);
  });

  test("opting out during an in-flight init leaves nothing running", async () => {
    mock.module("@thumbmarkjs/thumbmarkjs", () => ({
      Thumbmark: class {
        async get() {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { thumbmark: "slow-fp" };
        }
      },
    }));
    const tracker = make({ privacy: { fingerprint: true } });
    const started = tracker.init();
    await tracker.optOut();
    await started;
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(0);
    expect(history.pushState).toBe(nativePushState);
  });
});

describe("opt-out and opt-in", () => {
  test("optIn works when the page loaded already opted out", async () => {
    localStorage.setItem(STORAGE_KEYS.OPT_OUT, "1");
    const tracker = make();
    await tracker.init();
    expect(tracker.getEvents()).toHaveLength(0);
    await tracker.optIn();
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(tracker, "click")).toHaveLength(1);
  });

  test("calls made while opted out are dropped, not replayed after optIn", async () => {
    const tracker = await start();
    await tracker.optOut();
    tracker.track("during_opt_out");
    tracker.page("hidden");
    await tracker.optIn();
    expect(eventsOfType(tracker, "custom")).toHaveLength(0);
    expect(eventsOfType(tracker, "pageview").every((e) => !("name" in e && e.name))).toBe(true);
  });

  test("calls buffered before an opted-out init are discarded", async () => {
    localStorage.setItem(STORAGE_KEYS.OPT_OUT, "1");
    const tracker = make();
    tracker.track("early");
    await tracker.init();
    localStorage.removeItem(STORAGE_KEYS.OPT_OUT);
    await tracker.optIn();
    expect(eventsOfType(tracker, "custom")).toHaveLength(0);
  });

  test("identify is ignored while opted out and stores nothing", async () => {
    const tracker = await start();
    await tracker.optOut();
    tracker.identify("user-1");
    expect(localStorage.getItem(STORAGE_KEYS.EXTERNAL_ID)).toBeNull();
    expect(tracker.getExternalUserId()).toBeNull();
  });

  test("opting out removes every stored identifier", async () => {
    const tracker = await start();
    tracker.identify("user-1");
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    await tracker.optOut();
    for (const key of [
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.EXTERNAL_ID,
      STORAGE_KEYS.EVENTS,
      STORAGE_KEYS.LAST_VISIT,
    ]) {
      expect([key, localStorage.getItem(key)]).toEqual([key, null]);
    }
    expect(sessionStorage.getItem(STORAGE_KEYS.SESSION_ID)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.OPT_OUT)).toBe("1");
  });

  test("an opt-out made in another tab stops this tracker", async () => {
    const tracker = await start();
    html(`<button id="b">Go</button>`);
    localStorage.setItem(STORAGE_KEYS.OPT_OUT, "1");
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.OPT_OUT, newValue: "1" }));
    await sleep(5);
    const before = tracker.getEvents().length;
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(before);
    expect(history.pushState).toBe(nativePushState);
  });

  test("a Do Not Track change after load is honored when the tab becomes visible", async () => {
    const tracker = await start();
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    cleanups.push(() => {
      delete (navigator as unknown as Record<string, unknown>).doNotTrack;
    });
    setVisibility("hidden");
    setVisibility("visible");
    await sleep(5);
    html(`<button id="b">Go</button>`);
    const before = tracker.getEvents().length;
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(before);
  });
});

describe("transport during opt-out and offline", () => {
  const events = (count: number): IndeksEvent[] =>
    Array.from({ length: count }, (_, i) => ({
      type: "custom",
      eventName: `e${i}`,
      properties: {},
      timestamp: 1000 + i,
      url: "https://app.example.com/",
      userAgent: "ua",
      sessionId: "s",
      userId: "u",
    })) as unknown as IndeksEvent[];

  const config = resolveConfig({ apiKey: API_KEY, endpoint: "https://c.example.com/collect" });
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("a failing in-flight flush is dropped, not retried, after discard", async () => {
    globalThis.fetch = mock(async () => {
      await sleep(20);
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;
    const analytics = new IndeksAnalytics(config);
    await analytics.batch(events(2));
    const flushing = analytics.flush().catch(() => undefined);
    analytics.discard();
    await flushing;
    expect(analytics.getBatchSize()).toBe(0);
    expect((analytics as unknown as { flushTimer: unknown }).flushTimer).toBeNull();
    await analytics.batch(events(1));
    expect(analytics.getBatchSize()).toBe(0);
  });

  test("events that fail to persist offline are appended, not overwritten", async () => {
    const analytics = new IndeksAnalytics(config);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    cleanups.push(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    });
    await analytics.batch(events(2));
    analytics.flushSync();
    await analytics.batch(events(3));
    analytics.flushSync();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS)!);
    expect(stored).toHaveLength(5);
  });

  test("queued events are sent when the browser comes back online", async () => {
    const fetchMock = mock(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const analytics = new IndeksAnalytics(config);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await analytics.batch(events(2));
    await analytics.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    window.dispatchEvent(new Event("online"));
    await sleep(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    analytics.discard();
  });

  test("without an endpoint both flush paths discard the queue", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const analytics = new IndeksAnalytics(resolveConfig({ apiKey: API_KEY }));
      await analytics.batch(events(2));
      analytics.flushSync();
      expect(analytics.getBatchSize()).toBe(0);
    } finally {
      console.error = original;
    }
  });

  test("an event that cannot be serialized does not block later events", async () => {
    const fetchMock = mock(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const analytics = new IndeksAnalytics(config);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const poison = {
      ...events(1)[0],
      get userAgent(): string {
        throw new Error("boom");
      },
    } as unknown as IndeksEvent;
    await analytics.batch([poison, ...events(2)]);
    await analytics.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.events).toHaveLength(2);
    analytics.discard();
  });

  test("track with a bigint property reaches the collector", async () => {
    const fetchMock = mock(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const tracker = new IndeksTracker({
      apiKey: API_KEY,
      endpoint: "https://c.example.com/collect",
      debounceMs: 1,
    });
    trackers.push(tracker);
    await tracker.init();
    tracker.track("big", { amount: 12n });
    await tracker.flush();
    const sent = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>).flatMap(
      (call) => JSON.parse(call[1].body as string).events,
    );
    const custom = sent.find(
      (e: { type: string; properties: { eventName?: string } }) =>
        e.type === "custom" && e.properties.eventName === "big",
    );
    expect(custom.properties.properties.amount).toBe("12");
  });
});

describe("sessions and pages", () => {
  test("user activity without tracked events keeps the session alive", async () => {
    const t0 = Date.now();
    setSystemTime(new Date(t0));
    const tracker = await start({ collectors: { mouseMove: false, idle: false } });
    const sessionId = tracker.getSessionId();
    for (const minutes of [20, 40]) {
      setSystemTime(new Date(t0 + minutes * 60_000));
      document.dispatchEvent(new MouseEvent("mousemove"));
    }
    setSystemTime(new Date(t0 + 45 * 60_000));
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getSessionId()).toBe(sessionId);
    expect(eventsOfType(tracker, "session_end")).toHaveLength(0);
  });

  test("an idle session still expires", async () => {
    const t0 = Date.now();
    setSystemTime(new Date(t0));
    const tracker = await start({ collectors: { idle: false } });
    const sessionId = tracker.getSessionId();
    setSystemTime(new Date(t0 + 31 * 60_000));
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getSessionId()).not.toBe(sessionId);
  });

  test("reset ends the old session and starts a counted new one", async () => {
    const tracker = await start();
    const old = tracker.getSessionId();
    tracker.reset();
    const ends = eventsOfType<{ sessionId: string; exitType: string }>(tracker, "session_end");
    expect(ends.at(-1)).toMatchObject({ sessionId: old, exitType: "reset" });
    const starts = eventsOfType<{ sessionId: string }>(tracker, "session_start");
    expect(starts).toHaveLength(2);
    expect(starts[1].sessionId).toBe(tracker.getSessionId());
    window.dispatchEvent(new Event("pagehide"));
    const lastEnd = eventsOfType<{ pagesViewed: number; bounce: boolean }>(
      tracker,
      "session_end",
    ).at(-1)!;
    expect(lastEnd.pagesViewed).toBe(1);
  });

  test("time on page excludes the time the tab was hidden", async () => {
    const t0 = Date.now();
    setSystemTime(new Date(t0));
    const tracker = await start();
    setSystemTime(new Date(t0 + 5_000));
    setVisibility("hidden");
    setSystemTime(new Date(t0 + 65_000));
    setVisibility("visible");
    setSystemTime(new Date(t0 + 67_000));
    window.dispatchEvent(new Event("pagehide"));
    const leave = eventsOfType<{ timeOnPage: number }>(tracker, "pageleave").at(-1)!;
    expect(leave.timeOnPage).toBeGreaterThanOrEqual(6_900);
    expect(leave.timeOnPage).toBeLessThan(8_000);
  });

  test("a route change reports the page that was left, with its own URL", async () => {
    resetBrowser("https://app.example.com/first");
    const tracker = await start();
    history.pushState({}, "", "/second");
    await sleep(80);
    const types = tracker.getEvents().map((e) => e.type);
    const leaveIndex = types.indexOf("pageleave");
    const secondViewIndex = types.lastIndexOf("pageview");
    expect(leaveIndex).toBeGreaterThan(-1);
    expect(leaveIndex).toBeLessThan(secondViewIndex);
    expect(tracker.getEvents()[leaveIndex].url).toContain("/first");
  });

  test("hiding the tab mid-form does not report an abandoned form", async () => {
    const tracker = await start();
    html(`<form id="f"><input id="a" name="city"></form>`);
    const input = document.getElementById("a") as HTMLInputElement;
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.value = "Paris";
    setVisibility("hidden");
    expect(eventsOfType(tracker, "form_abandon")).toHaveLength(0);
    setVisibility("visible");
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType(tracker, "form_abandon")).toHaveLength(1);
  });

  test("events emitted by visibility handlers are flushed with the exit send", async () => {
    const sent: string[] = [];
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: (_url: string, blob: Blob) => {
        sent.push(String(blob.size));
        return true;
      },
    });
    cleanups.push(() => {
      delete (navigator as unknown as Record<string, unknown>).sendBeacon;
    });
    const tracker = new IndeksTracker({
      apiKey: API_KEY,
      endpoint: "https://c.example.com/collect",
      debounceMs: 1,
    });
    trackers.push(tracker);
    await tracker.init();
    setVisibility("hidden");
    expect(sent.length).toBeGreaterThan(0);
    expect(tracker.getBatchSize()).toBe(0);
  });

  test("buffered calls keep the time they were made", async () => {
    const t0 = Date.now();
    setSystemTime(new Date(t0));
    const tracker = make();
    tracker.track("early");
    setSystemTime(new Date(t0 + 5_000));
    await tracker.init();
    const [custom] = eventsOfType<{ timestamp: number }>(tracker, "custom");
    expect(custom.timestamp).toBe(t0);
  });

  test("calls made while init is finishing stay in order behind earlier buffered calls", async () => {
    const tracker = make();
    tracker.track("first");
    const started = tracker.init();
    tracker.track("second");
    await started;
    tracker.track("third");
    const names = eventsOfType<{ eventName: string }>(tracker, "custom").map((e) => e.eventName);
    expect(names).toEqual(["first", "second", "third"]);
  });

  test("manual page views are not double counted when the pageview collector runs", async () => {
    const tracker = await start();
    tracker.page("Manual");
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType<{ pagesViewed: number }>(tracker, "session_end")[0].pagesViewed).toBe(1);
  });

  test("custom event names, labels and categories are redacted and bounded", async () => {
    const tracker = await start();
    tracker.track(
      "signup jo@example.com " + "x".repeat(500),
      {},
      { label: "mail jo@example.com", category: "c".repeat(500) },
    );
    const [event] = eventsOfType<{ eventName: string; label: string; category: string }>(
      tracker,
      "custom",
    );
    expect(event.eventName).not.toContain("jo@example.com");
    expect(event.eventName.length).toBeLessThanOrEqual(200);
    expect(event.label).not.toContain("jo@example.com");
    expect(event.category.length).toBe(200);
  });

  test("identify caps very long ids", async () => {
    const tracker = await start();
    tracker.identify("u".repeat(1000));
    expect(tracker.getExternalUserId()!.length).toBe(256);
  });
});

describe("high-volume collectors", () => {
  test("wheel and touchmove events are throttled", async () => {
    const tracker = await start();
    html(`<div id="d"></div>`);
    for (let i = 0; i < 10; i++) {
      document
        .getElementById("d")!
        .dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: i }));
      const move = new Event("touchmove", { bubbles: true });
      Object.defineProperty(move, "touches", { value: [] });
      document.getElementById("d")!.dispatchEvent(move);
    }
    expect(eventsOfType(tracker, "wheel")).toHaveLength(1);
    expect(eventsOfType(tracker, "touchmove")).toHaveLength(1);
    await sleep(110);
    document.getElementById("d")!.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    expect(eventsOfType(tracker, "wheel")).toHaveLength(2);
  });
});
