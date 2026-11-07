import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type {
  IndeksClickEvent,
  IndeksCustomEvent,
  IndeksIdentifyEvent,
  IndeksPageViewEvent,
  IndeksSessionEndEvent,
  IndeksSessionStartEvent,
} from "@useindeks/shared";
import { IndeksTracker } from "../src";
import { API_KEY, click, createTracker, eventsOfType, html, resetBrowser } from "./helpers";

let tracker: IndeksTracker | null = null;

beforeEach(() => resetBrowser());
afterEach(async () => {
  await tracker?.destroy();
  tracker = null;
});

const fresh = (overrides = {}) =>
  new IndeksTracker({ apiKey: API_KEY, localOnly: true, debounceMs: 1, ...overrides });

describe("track()", () => {
  test("emits a sanitized custom event with options", async () => {
    tracker = await createTracker();
    tracker.track(
      "signup",
      { plan: "pro", password: "hunter2" },
      { category: "growth", value: 9, label: "cta" },
    );
    const [event] = eventsOfType<IndeksCustomEvent>(tracker, "custom");
    expect(event.eventName).toBe("signup");
    expect(event.properties.plan).toBe("pro");
    expect(event.properties.password).toBe("[redacted]");
    expect(event.category).toBe("growth");
    expect(event.value).toBe(9);
    expect(event.label).toBe("cta");
  });

  test("buffers calls made before init and replays them in order", async () => {
    tracker = fresh();
    tracker.track("first");
    tracker.track("second", { n: 2 });
    expect(tracker.getEvents()).toHaveLength(0);
    await tracker.init();
    const names = eventsOfType<IndeksCustomEvent>(tracker, "custom").map((e) => e.eventName);
    expect(names).toEqual(["first", "second"]);
  });

  test("drops buffered calls when the tracker is destroyed before init completes", async () => {
    tracker = fresh();
    tracker.track("never");
    await tracker.destroy();
    await tracker.init();
    expect(eventsOfType(tracker, "custom")).toHaveLength(0);
  });
});

describe("page()", () => {
  test("emits a named pageview with properties and counts it for the session", async () => {
    tracker = await createTracker({ collectors: { pageview: false } });
    tracker.page("Pricing", { plan: "pro", token: "SECRET" });
    const [view] = eventsOfType<IndeksPageViewEvent>(tracker, "pageview");
    expect(view.name).toBe("Pricing");
    expect(view.properties?.plan).toBe("pro");
    expect(JSON.stringify(view)).not.toContain("SECRET");
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType<IndeksSessionEndEvent>(tracker, "session_end")[0].pagesViewed).toBe(2);
  });
});

describe("identify() / reset()", () => {
  test("attaches the external id to later events and emits an identify event", async () => {
    tracker = await createTracker();
    tracker.identify("user-42", { plan: "pro", email: "a@b.com" });
    const [identify] = eventsOfType<IndeksIdentifyEvent>(tracker, "identify");
    expect(identify.externalUserId).toBe("user-42");
    expect(identify.traits.plan).toBe("pro");
    expect(identify.traits.email).toBe("[redacted]");

    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType<IndeksClickEvent>(tracker, "click")[0].externalUserId).toBe("user-42");
    expect(tracker.getExternalUserId()).toBe("user-42");
  });

  test("persists across tracker instances and rejects empty ids", async () => {
    tracker = await createTracker();
    tracker.identify("user-42");
    tracker.identify("");
    expect(tracker.getExternalUserId()).toBe("user-42");
    await tracker.destroy();

    tracker = await createTracker();
    expect(tracker.getExternalUserId()).toBe("user-42");
  });

  test("reset() clears identity and starts a new anonymous user and session", async () => {
    tracker = await createTracker();
    tracker.identify("user-42");
    const user = tracker.getUserId();
    const session = tracker.getSessionId();
    tracker.reset();
    expect(tracker.getExternalUserId()).toBeNull();
    expect(tracker.getUserId()).not.toBe(user);
    expect(tracker.getSessionId()).not.toBe(session);
    expect(localStorage.getItem("indeks_external_id")).toBeNull();
  });
});

describe("opt out", () => {
  test("optOut() stops tracking, clears stored events and survives a new instance", async () => {
    tracker = await createTracker();
    localStorage.setItem("indeks_events", "[]");
    await tracker.optOut();
    expect(tracker.isOptedOut()).toBe(true);
    expect(localStorage.getItem("indeks_events")).toBeNull();

    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getEvents()).toHaveLength(0);

    tracker = await createTracker();
    expect(tracker.getEvents()).toHaveLength(0);
  });

  test("optIn() resumes tracking", async () => {
    tracker = await createTracker();
    await tracker.optOut();
    await tracker.optIn();
    expect(tracker.isOptedOut()).toBe(false);
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(tracker, "click")).toHaveLength(1);
  });
});

describe("event payload", () => {
  test("device info is sent once with session_start, not on every event", async () => {
    tracker = await createTracker();
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    const [start] = eventsOfType<IndeksSessionStartEvent>(tracker, "session_start");
    expect(start.device.browserName).toBeTruthy();
    const clickEvent = eventsOfType(tracker, "click")[0] as unknown as Record<string, unknown>;
    expect(clickEvent.device).toBeUndefined();
    expect(clickEvent.userAgent).toBeTruthy();
    expect(JSON.stringify(clickEvent).length).toBeLessThan(900);
  });
});

describe("referrer", () => {
  test("non-pageview events never use the current page as their referrer", async () => {
    tracker = await createTracker();
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    const clickEvent = eventsOfType<IndeksClickEvent>(tracker, "click")[0];
    expect(clickEvent.referrer).toBeUndefined();
    history.pushState({}, "", "/next");
    await new Promise((resolve) => setTimeout(resolve, 80));
    const views = eventsOfType<IndeksPageViewEvent>(tracker, "pageview");
    expect(views[0].referrer).toBe("");
    expect(views[1].referrer).toContain("app.example.com/");
  });
});

describe("fingerprint", () => {
  const thumbmarkOptions: unknown[] = [];

  beforeEach(async () => {
    thumbmarkOptions.length = 0;
    const { mock } = await import("bun:test");
    mock.module("@thumbmarkjs/thumbmarkjs", () => ({
      Thumbmark: class {
        constructor(options: unknown) {
          thumbmarkOptions.push(options);
        }
        async get() {
          return { thumbmark: "tm-123" };
        }
      },
    }));
  });

  test("privacy.fingerprint swaps the anonymous id for the Thumbmark hash", async () => {
    tracker = await createTracker({ privacy: { fingerprint: true } });
    expect(tracker.getUserId()).toBe("tm-123");
  });

  test("Thumbmark is always created with telemetry and remote scripts disabled", async () => {
    tracker = await createTracker({ privacy: { fingerprint: true } });
    expect(thumbmarkOptions).toHaveLength(1);
    const options = thumbmarkOptions[0] as Record<string, unknown>;
    expect(options.logging).toBe(false);
    expect(options.api_key).toBeUndefined();
    expect(options.simple_request).toBeUndefined();
  });

  test("falls back to the first-party id when fingerprinting fails", async () => {
    const { mock } = await import("bun:test");
    mock.module("@thumbmarkjs/thumbmarkjs", () => ({
      Thumbmark: class {
        async get() {
          throw new Error("blocked");
        }
      },
    }));
    tracker = await createTracker({ privacy: { fingerprint: true } });
    expect(tracker.getUserId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("never loads the fingerprint library unless enabled", async () => {
    tracker = await createTracker();
    expect(thumbmarkOptions).toHaveLength(0);
    expect(tracker.getUserId()).not.toBe("tm-123");
  });
});
