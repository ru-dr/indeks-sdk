import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { COLLECTOR_NAMES } from "@indeks/shared";
import type { IndeksTracker } from "../src";
import { COLLECTORS } from "../src/collectors";
import { click, createTracker, eventsOfType, html, resetBrowser, sleep } from "./helpers";

let tracker: IndeksTracker | null = null;
const extraCleanup: Array<() => void> = [];

beforeEach(() => resetBrowser());
afterEach(async () => {
  await tracker?.destroy();
  tracker = null;
  while (extraCleanup.length) extraCleanup.pop()!();
});

const start = async (overrides = {}) => (tracker = await createTracker(overrides));

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("registry", () => {
  test("every collector name has an implementation", () => {
    for (const name of COLLECTOR_NAMES) expect(typeof COLLECTORS[name]).toBe("function");
    expect(Object.keys(COLLECTORS).sort()).toEqual([...COLLECTOR_NAMES].sort());
  });

  test("disabled collectors do not emit and enabled opt-in ones do", async () => {
    const t = await start({ collectors: { click: false, hover: true } });
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    document.getElementById("b")!.dispatchEvent(new MouseEvent("mouseenter"));
    expect(eventsOfType(t, "click")).toHaveLength(0);
    expect(eventsOfType(t, "mouseenter")).toHaveLength(1);
  });

  test("the minimal preset only starts a small set of collectors", async () => {
    const t = await start({ preset: "minimal" });
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    document.getElementById("b")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(eventsOfType(t, "click")).toHaveLength(1);
    expect(eventsOfType(t, "dblclick")).toHaveLength(0);
  });

  test("a collector that throws does not stop the others", async () => {
    const original = COLLECTORS.hover;
    COLLECTORS.hover = () => {
      throw new Error("boom");
    };
    extraCleanup.push(() => {
      COLLECTORS.hover = original;
    });
    const t = await start({ collectors: { hover: true } });
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "click")).toHaveLength(1);
  });
});

describe("simple DOM collectors", () => {
  const cases: Array<[string, string, (el: Element) => void, Record<string, unknown>?]> = [
    [
      "dblclick",
      "dblclick",
      (el) => el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })),
    ],
    [
      "contextmenu",
      "contextmenu",
      (el) => el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true })),
    ],
    [
      "wheel",
      "wheel",
      (el) => el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 10 })),
    ],
    [
      "mouseenter",
      "mouseenter",
      (el) => el.dispatchEvent(new MouseEvent("mouseenter")),
      { collectors: { hover: true } },
    ],
    [
      "mousedown",
      "mousedown",
      (el) => el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
      { collectors: { mousePress: true } },
    ],
    [
      "mouseup",
      "mouseup",
      (el) => el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })),
      { collectors: { mousePress: true } },
    ],
    ["drop", "drop", (el) => el.dispatchEvent(new Event("drop", { bubbles: true }))],
    ["copy", "copy", (el) => el.dispatchEvent(new Event("copy", { bubbles: true }))],
    ["paste", "paste", (el) => el.dispatchEvent(new Event("paste", { bubbles: true }))],
    ["field_focus", "field_focus", (el) => el.dispatchEvent(new FocusEvent("focus"))],
    ["change", "change", (el) => el.dispatchEvent(new Event("change", { bubbles: true }))],
    [
      "fullscreenchange",
      "fullscreenchange",
      () => document.dispatchEvent(new Event("fullscreenchange")),
    ],
    ["online", "online", () => window.dispatchEvent(new Event("online"))],
    ["offline", "offline", () => window.dispatchEvent(new Event("offline"))],
    ["focus", "focus", () => window.dispatchEvent(new Event("focus"))],
    ["blur", "blur", () => window.dispatchEvent(new Event("blur"))],
    ["resize", "resize", () => window.dispatchEvent(new Event("resize"))],
    ["beforeunload", "beforeunload", () => window.dispatchEvent(new Event("beforeunload"))],
  ];

  for (const [name, type, trigger, config] of cases) {
    test(`${name} emits a ${type} event`, async () => {
      const t = await start(config);
      html(`<input id="i" name="city">`);
      trigger(document.getElementById("i")!);
      await sleep(10);
      expect(eventsOfType(t, type).length).toBeGreaterThanOrEqual(1);
    });
  }

  test("keystrokes never include printable characters or sensitive fields", async () => {
    const t = await start({ collectors: { keystroke: true } });
    html(`<input id="a" name="city"><input id="p" type="password" name="pw">`);
    const key = (el: string, k: string) =>
      document
        .getElementById(el)!
        .dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "x", bubbles: true }));
    key("a", "q");
    key("a", "Enter");
    key("p", "z");
    const events = eventsOfType<Record<string, unknown>>(t, "keystroke");
    expect(events).toHaveLength(2);
    expect(events[0].key).toBeUndefined();
    expect(events[1].key).toBe("Enter");
  });

  test("clipboard and selected text are only captured with explicit consent", async () => {
    let t = await start();
    html(`<input id="i" name="city">`);
    document.getElementById("i")!.dispatchEvent(new Event("copy", { bubbles: true }));
    expect(eventsOfType<Record<string, unknown>>(t, "copy")[0].text).toBeUndefined();
    await t.destroy();
    t = tracker = await createTracker({ privacy: { clipboardText: true } });
    html(`<p id="p">hello world</p>`);
    document.getElementById("p")!.dispatchEvent(new Event("copy", { bubbles: true }));
    expect(eventsOfType(t, "copy")).toHaveLength(1);
  });

  test("form errors report redacted field names and messages", async () => {
    const t = await start();
    html(`<form id="f"><input id="x" name="password" required></form>`);
    document.getElementById("x")!.dispatchEvent(new Event("invalid"));
    const [error] = eventsOfType<Record<string, string>>(t, "form_error");
    expect(error.field).toBe("[redacted]");
  });

  test("form submit never records sensitive values and honours formValues", async () => {
    let t = await start();
    html(
      `<form id="f"><input name="city" value="Paris"><input name="password" value="hunter2"></form>`,
    );
    document
      .getElementById("f")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    let [submit] = eventsOfType<{ formData: Record<string, string> }>(t, "form_submit");
    expect(submit.formData.city).toBe("[len:5]");
    await t.destroy();

    t = tracker = await createTracker({ privacy: { formValues: true } });
    html(
      `<form id="f"><input name="city" value="Paris"><input name="password" value="hunter2"></form>`,
    );
    document
      .getElementById("f")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    [submit] = eventsOfType<{ formData: Record<string, string> }>(t, "form_submit");
    expect(submit.formData.city).toBe("Paris");
    expect(JSON.stringify(submit)).not.toContain("hunter2");
  });
});

describe("scroll depth", () => {
  test("emits each threshold once using real scroll metrics", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    extraCleanup.push(() => {
      delete (document.documentElement as unknown as Record<string, unknown>).scrollHeight;
      document.documentElement.scrollTop = 0;
    });
    const t = await start();
    document.documentElement.scrollTop = 616;
    window.dispatchEvent(new Event("scroll"));
    await sleep(15);
    window.dispatchEvent(new Event("scroll"));
    await sleep(15);
    const depths = eventsOfType<{ depth: number }>(t, "scroll_depth").map((e) => e.depth);
    expect(depths).toEqual([25, 50]);

    const [scroll] = eventsOfType<{ scrollPercentage: number }>(t, "scroll");
    expect(scroll.scrollPercentage).toBe(50);
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType<{ scrollDepth: number }>(t, "pageleave")[0].scrollDepth).toBe(50);
  });

  test("navigating resets reached thresholds", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    extraCleanup.push(() => {
      delete (document.documentElement as unknown as Record<string, unknown>).scrollHeight;
      document.documentElement.scrollTop = 0;
    });
    const t = await start();
    document.documentElement.scrollTop = 1232;
    window.dispatchEvent(new Event("scroll"));
    await sleep(15);
    expect(eventsOfType(t, "scroll_depth")).toHaveLength(4);
    history.pushState({}, "", "/other");
    window.dispatchEvent(new Event("scroll"));
    await sleep(15);
    expect(eventsOfType(t, "scroll_depth")).toHaveLength(8);
  });
});

describe("visibility collectors", () => {
  test("visibility and tab focus report hide/show with time away", async () => {
    const t = await start();
    setVisibility("hidden");
    await sleep(15);
    setVisibility("visible");
    expect(eventsOfType(t, "tab_blur")).toHaveLength(1);
    const [focus] = eventsOfType<{ timeAway: number }>(t, "tab_focus");
    expect(focus.timeAway).toBeGreaterThanOrEqual(10);
    expect(eventsOfType(t, "visibilitychange")).toHaveLength(2);
  });
});

describe("error collectors", () => {
  test("unhandled rejections are redacted and set the error-click context", async () => {
    const t = await start();
    const rejection = new Event("unhandledrejection") as Event & { reason?: unknown };
    rejection.reason = new Error("bad request for jo@example.com");
    window.dispatchEvent(rejection);
    const [event] = eventsOfType<{ error: { message: string } }>(t, "error");
    expect(event.error.message).toContain("Unhandled Promise Rejection");
    expect(event.error.message).not.toContain("jo@example.com");
  });

  test("an error right after a click produces an error_click", async () => {
    const t = await start();
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    window.dispatchEvent(new ErrorEvent("error", { message: "TypeError: x is undefined" }));
    await sleep(150);
    const [errorClick] = eventsOfType<{ errorType: string }>(t, "error_click");
    expect(errorClick.errorType).toBe("javascript");
  });

  test("resource errors report scrubbed URLs", async () => {
    const t = await start();
    const img = document.createElement("img");
    img.setAttribute("src", "https://cdn.example.com/a.png?token=SECRET");
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error"));
    const [event] = eventsOfType<{ resourceType: string; resourceUrl: string }>(
      t,
      "resource_error",
    );
    expect(event.resourceType).toBe("img");
    expect(event.resourceUrl).not.toContain("SECRET");
  });
});

describe("browser API collectors", () => {
  test("native share is wrapped, scrubbed and restored on destroy", async () => {
    const original = async () => undefined;
    Object.defineProperty(navigator, "share", {
      value: original,
      configurable: true,
      writable: true,
    });
    extraCleanup.push(() => {
      delete (navigator as unknown as Record<string, unknown>).share;
    });
    const t = await start();
    expect(navigator.share).not.toBe(original);
    await navigator.share({ url: "https://a.com/x?token=SECRET", text: "mail jo@example.com" });
    const [event] = eventsOfType<{ shareMethod: string; shareUrl: string; shareText: string }>(
      t,
      "share",
    );
    expect(event.shareMethod).toBe("native_share");
    expect(event.shareUrl).not.toContain("SECRET");
    expect(event.shareText).not.toContain("jo@example.com");
    await t.destroy();
    expect(navigator.share).toBe(original);
  });

  test("a rejected native share (user cancel) emits no event", async () => {
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new Error("AbortError");
      },
      configurable: true,
      writable: true,
    });
    extraCleanup.push(() => {
      delete (navigator as unknown as Record<string, unknown>).share;
    });
    const t = await start();
    await navigator.share({ url: "https://a.com" }).catch(() => undefined);
    expect(eventsOfType(t, "share")).toHaveLength(0);
  });

  test("network information changes are reported", async () => {
    const connection = Object.assign(new EventTarget(), {
      effectiveType: "3g",
      downlink: 1.5,
      rtt: 200,
    });
    Object.defineProperty(navigator, "connection", { value: connection, configurable: true });
    extraCleanup.push(() => {
      delete (navigator as unknown as Record<string, unknown>).connection;
    });
    const t = await start();
    connection.dispatchEvent(new Event("change"));
    const [event] = eventsOfType<{ effectiveType: string; rtt: number }>(t, "network_change");
    expect(event.effectiveType).toBe("3g");
    expect(event.rtt).toBe(200);
  });

  test("orientation changes fall back to the viewport when the API is missing", async () => {
    const t = await start();
    window.dispatchEvent(new Event("orientationchange"));
    const [event] = eventsOfType<{ orientation: string }>(t, "orientation_change");
    expect(["portrait", "landscape"]).toContain(event.orientation);
  });

  test("media progress emits each quartile once with a scrubbed URL", async () => {
    const t = await start();
    html(`<video id="v"></video>`);
    const video = document.getElementById("v") as HTMLVideoElement;
    Object.defineProperty(video, "currentSrc", {
      value: "https://cdn.example.com/v.mp4?token=SECRET",
      configurable: true,
    });
    Object.defineProperty(video, "duration", { value: 100, configurable: true });
    const seek = (time: number) => {
      Object.defineProperty(video, "currentTime", { value: time, configurable: true });
      video.dispatchEvent(new Event("timeupdate"));
    };
    seek(10);
    seek(30);
    seek(31);
    seek(80);
    const progress = eventsOfType<{ progress: number; mediaUrl: string }>(t, "video_progress");
    expect(progress.map((p) => p.progress)).toEqual([25, 50, 75]);
    expect(progress[0].mediaUrl).not.toContain("SECRET");
  });
});

class FakePerformanceObserver {
  static instances: FakePerformanceObserver[] = [];
  options: { type?: string } = {};
  constructor(public callback: (list: { getEntries(): unknown[] }) => void) {
    FakePerformanceObserver.instances.push(this);
  }
  observe(options: { type?: string }) {
    this.options = options;
  }
  disconnect() {}
  push(entries: unknown[]) {
    this.callback({ getEntries: () => entries });
  }
  static of(type: string) {
    return FakePerformanceObserver.instances.find((o) => o.options.type === type)!;
  }
}

describe("performance metrics", () => {
  const original = globalThis.PerformanceObserver;
  beforeEach(() => {
    FakePerformanceObserver.instances = [];
    (globalThis as unknown as Record<string, unknown>).PerformanceObserver =
      FakePerformanceObserver;
  });
  afterEach(() => {
    (globalThis as unknown as Record<string, unknown>).PerformanceObserver = original;
  });

  test("reports FCP immediately and LCP, CLS and INP once at page exit", async () => {
    const t = await start();
    FakePerformanceObserver.of("paint").push([{ name: "first-contentful-paint", startTime: 900 }]);
    FakePerformanceObserver.of("largest-contentful-paint").push([
      { startTime: 1000 },
      { startTime: 2600 },
    ]);
    FakePerformanceObserver.of("layout-shift").push([
      { hadRecentInput: false, value: 0.05 },
      { hadRecentInput: true, value: 0.5 },
      { hadRecentInput: false, value: 0.07 },
    ]);
    FakePerformanceObserver.of("event").push([
      { interactionId: 1, duration: 120 },
      { interactionId: 2, duration: 320 },
      { interactionId: 0, duration: 900 },
    ]);
    expect(eventsOfType(t, "first_contentful_paint")).toHaveLength(1);
    expect(eventsOfType(t, "largest_contentful_paint")).toHaveLength(0);

    window.dispatchEvent(new Event("pagehide"));
    const lcp = eventsOfType<{ value: number; rating: string }>(t, "largest_contentful_paint");
    expect(lcp).toHaveLength(1);
    expect(lcp[0].value).toBe(2600);
    expect(lcp[0].rating).toBe("needs-improvement");
    const [cls] = eventsOfType<{ value: number; rating: string }>(t, "cumulative_layout_shift");
    expect(cls.value).toBeCloseTo(0.12);
    expect(cls.rating).toBe("needs-improvement");
    const [inp] = eventsOfType<{ value: number; rating: string }>(t, "interaction_to_next_paint");
    expect(inp.value).toBe(320);
    expect(inp.rating).toBe("needs-improvement");

    setVisibility("visible");
    setVisibility("hidden");
    expect(eventsOfType(t, "largest_contentful_paint")).toHaveLength(1);
    expect(eventsOfType(t, "cumulative_layout_shift")).toHaveLength(1);
    setVisibility("visible");
  });

  test("an unsupported entry type does not break the other observers", async () => {
    const Throwing = class extends FakePerformanceObserver {
      observe(options: { type?: string }) {
        if (options.type === "event") throw new Error("unsupported");
        super.observe(options);
      }
    };
    (globalThis as unknown as Record<string, unknown>).PerformanceObserver = Throwing;
    const t = await start();
    FakePerformanceObserver.of("paint").push([{ name: "first-contentful-paint", startTime: 500 }]);
    expect(eventsOfType(t, "first_contentful_paint")).toHaveLength(1);
  });
});

describe("configurable heuristics", () => {
  test("search uses custom selectors for the input and result counts", async () => {
    const t = await start({
      collectorOptions: {
        search: {
          inputSelector: "#site-find",
          resultsCountSelector: "#hits",
          resultItemSelector: ".hit",
        },
      },
    });
    html(`
      <span id="hits">42 results</span>
      <form id="f"><input id="site-find" name="what" value="shoes"><input name="q" value="ignored"></form>`);
    document
      .getElementById("f")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const [search] = eventsOfType<{ queryLength: number; resultsCount: number }>(t, "search");
    expect(search.queryLength).toBe(5);
    expect(search.resultsCount).toBe(42);
  });

  test("search falls back to counting result items when there is no count element", async () => {
    const t = await start();
    html(`<div class="search-result"></div><div class="search-result"></div>
      <form id="f"><input name="q" value="hats"></form>`);
    document
      .getElementById("f")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(eventsOfType<{ resultsCount: number }>(t, "search")[0].resultsCount).toBe(2);
  });

  test("a repeated different search is a refinement and previous terms stay private by default", async () => {
    const t = await start();
    html(`<form id="f"><input name="q" id="q" value="hats"></form>`);
    const submit = () =>
      document
        .getElementById("f")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    submit();
    (document.getElementById("q") as HTMLInputElement).value = "caps";
    submit();
    const searches = eventsOfType<{
      isRefinement: boolean;
      previousQuery?: string;
      query?: string;
    }>(t, "search");
    expect(searches).toHaveLength(2);
    expect(searches[0].isRefinement).toBe(false);
    expect(searches[1].isRefinement).toBe(true);
    expect(searches[1].previousQuery).toBeUndefined();
    expect(searches[1].query).toBeUndefined();
  });

  test("search terms are only included with privacy.searchTerms", async () => {
    const t = await start({ privacy: { searchTerms: true } });
    html(`<form id="f"><input name="q" id="q" value="hats"></form>`);
    document
      .getElementById("f")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(eventsOfType<{ query?: string }>(t, "search")[0].query).toBe("hats");
  });

  test("a search button outside any form triggers a search from its scope", async () => {
    const t = await start();
    html(
      `<div data-search-scope><input type="search" value="boots"><button id="go" data-action="search">Go</button></div>`,
    );
    click(document.getElementById("go")!);
    expect(eventsOfType<{ queryLength: number }>(t, "search")[0].queryLength).toBe(5);
  });

  test("rage click thresholds are configurable", async () => {
    const t = await start({ collectorOptions: { frustration: { rageClickCount: 2 } } });
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "rage_click")).toHaveLength(1);
  });

  test("a custom clickable selector controls which elements can be dead clicks", async () => {
    const t = await start({
      collectorOptions: { frustration: { clickableSelector: ".my-card", deadClickWindowMs: 60 } },
    });
    html(`<div id="card" class="my-card">card</div><div id="plain" class="clickable">plain</div>`);
    click(document.getElementById("card")!);
    click(document.getElementById("plain")!);
    await sleep(150);
    const dead = eventsOfType<{ element: string }>(t, "dead_click");
    expect(dead.map((e) => e.element)).toEqual(["#card"]);
  });
});

describe("remaining collectors", () => {
  test("page lifecycle events are reported when the Page Lifecycle API exists", async () => {
    expect("onfreeze" in document).toBe(true);
    const t = await start();
    document.dispatchEvent(new Event("freeze"));
    document.dispatchEvent(new Event("resume"));
    expect(eventsOfType(t, "page_freeze")).toHaveLength(1);
    expect(eventsOfType(t, "page_resume")).toHaveLength(1);
  });

  test("text selection reports length but not text unless clipboardText is enabled", async () => {
    const selection = {
      toString: () => "hello world",
      anchorNode: null,
      anchorOffset: 2,
      focusOffset: 7,
    };
    const original = window.getSelection;
    window.getSelection = (() => selection) as unknown as typeof window.getSelection;
    extraCleanup.push(() => {
      window.getSelection = original;
    });
    let t = await start({ collectors: { textSelection: true } });
    document.dispatchEvent(new Event("selectionchange"));
    await sleep(20);
    let [event] = eventsOfType<{ selectedText?: string; selectedTextLength: number }>(
      t,
      "selectionchange",
    );
    expect(event.selectedText).toBeUndefined();
    expect(event.selectedTextLength).toBe(11);
    await t.destroy();

    t = tracker = await createTracker({
      collectors: { textSelection: true },
      privacy: { clipboardText: true },
    });
    document.dispatchEvent(new Event("selectionchange"));
    await sleep(20);
    [event] = eventsOfType<{ selectedText?: string; selectedTextLength: number }>(
      t,
      "selectionchange",
    );
    expect(event.selectedText).toBe("hello world");
  });

  test("touch events report touch points", async () => {
    const t = await start();
    html(`<div id="d"></div>`);
    const touch = new Event("touchstart", { bubbles: true });
    Object.defineProperty(touch, "touches", {
      value: [{ identifier: 1, clientX: 10, clientY: 20, force: 0.5 }],
    });
    document.getElementById("d")!.dispatchEvent(touch);
    const [event] = eventsOfType<{ touches: Array<{ clientX: number }> }>(t, "touchstart");
    expect(event.touches[0].clientX).toBe(10);
  });

  test("drag events include the data transfer summary", async () => {
    const t = await start();
    html(`<div id="d" draggable="true"></div>`);
    const drag = new Event("dragstart", { bubbles: true });
    Object.defineProperty(drag, "dataTransfer", {
      value: { dropEffect: "copy", effectAllowed: "all", types: ["text/plain"] },
    });
    document.getElementById("d")!.dispatchEvent(drag);
    const [event] = eventsOfType<{ dataTransfer: { types: string[] } }>(t, "dragstart");
    expect(event.dataTransfer.types).toEqual(["text/plain"]);
  });

  test("mouse movement events are debounced", async () => {
    const t = await start({ collectors: { mouseMove: true } });
    for (let i = 0; i < 5; i++) document.dispatchEvent(new MouseEvent("mousemove", { clientX: i }));
    await sleep(20);
    expect(eventsOfType(t, "mousemove")).toHaveLength(1);
  });
});

describe("review findings: privacy in collectors", () => {
  test("printable keystrokes never include the key code", async () => {
    const t = await start({ collectors: { keystroke: true } });
    html(`<input id="a" name="city">`);
    const press = (key: string, code: string) =>
      document
        .getElementById("a")!
        .dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
    press("s", "KeyS");
    press("7", "Digit7");
    press("Enter", "Enter");
    const events = eventsOfType<{ key?: string; code?: string }>(t, "keystroke");
    expect(events.map((e) => e.code)).toEqual([undefined, undefined, "Enter"]);
    expect(JSON.stringify(events)).not.toContain("KeyS");
  });

  test("masked and text-off elements expose no text-bearing attributes", async () => {
    let t = await start({ privacy: { elementText: false } });
    html(
      `<button id="b" aria-label="Pay for john's order" title="Account 1234" data-testid="pay">x</button>`,
    );
    click(document.getElementById("b")!);
    let [event] = eventsOfType<{ element: { attributes: Record<string, string> } }>(t, "click");
    const keys = Object.keys(event.element.attributes);
    expect(keys).toEqual(expect.arrayContaining(["id", "data-testid"]));
    for (const textKey of ["aria-label", "title", "__ariaLabel"])
      expect(keys).not.toContain(textKey);
    expect(JSON.stringify(event)).not.toMatch(/john|Account 1234/);
    await t.destroy();

    t = tracker = await createTracker();
    html(
      `<div data-indeks-mask><a id="m" href="https://a.com/x" aria-label="Jane" title="Secret">link</a></div>`,
    );
    document.getElementById("m")!.addEventListener("click", (e) => e.preventDefault());
    click(document.getElementById("m")!);
    [event] = eventsOfType<{ element: { attributes: Record<string, string> } }>(t, "click");
    expect(event.element.attributes).toEqual({});
    expect(JSON.stringify(event)).not.toMatch(/Jane|Secret|a\.com/);
  });

  test("form submit redacts sensitive and masked fields entirely, even their length", async () => {
    const t = await start();
    html(
      `<form id="f"><input name="city" value="Paris"><input type="password" name="pw" value="hunter22"><div data-indeks-mask><input name="note" value="private"></div></form>`,
    );
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true }));
    const [submit] = eventsOfType<{ formData: Record<string, string> }>(t, "form_submit");
    expect(submit.formData).toEqual({
      city: "[len:5]",
      pw: "[redacted]",
      note: "[redacted]",
    });
  });

  test("selected text that spans masked content is not sent", async () => {
    html(`<p id="p">public</p><div data-indeks-mask id="m">secret</div>`);
    const mask = document.getElementById("m")!;
    const selection = {
      toString: () => "public secret",
      anchorNode: document.getElementById("p")!.firstChild,
      anchorOffset: 0,
      focusOffset: 6,
      rangeCount: 1,
      containsNode: (node: Node) => node === mask,
    };
    const original = window.getSelection;
    window.getSelection = (() => selection) as unknown as typeof window.getSelection;
    extraCleanup.push(() => {
      window.getSelection = original;
    });
    const t = await start({ privacy: { clipboardText: true } });
    document.getElementById("p")!.dispatchEvent(new Event("copy", { bubbles: true }));
    const [copy] = eventsOfType<{ text?: string; textLength?: number }>(t, "copy");
    expect(copy.text).toBeUndefined();
    expect(copy.textLength).toBe(13);
  });

  test("page titles and campaign parameters are redacted and bounded", async () => {
    resetBrowser("https://app.example.com/?utm_source=john@x.com&utm_medium=" + "m".repeat(500));
    document.title = "Inbox - john@x.com";
    const t = await start();
    const [view] = eventsOfType<{ title: string }>(t, "pageview");
    const [start0] = eventsOfType<{ utmSource?: string; utmMedium?: string }>(t, "session_start");
    expect(view.title).not.toContain("john@x.com");
    expect(start0.utmSource).not.toContain("john@x.com");
    expect(start0.utmMedium!.length).toBe(100);
    document.title = "";
  });

  test("search filters and sort order respect elementText and masks", async () => {
    html(`
      <div class="filter active" data-filter="size">XL for john</div>
      <select name="sort"><option value="price" selected>price</option></select>
      <form id="f"><input name="q" value="hats"></form>`);
    let t = await start({ privacy: { elementText: false } });
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true }));
    let [search] = eventsOfType<{ filtersApplied?: unknown; sortBy?: string }>(t, "search");
    expect(search.filtersApplied).toBeUndefined();
    expect(search.sortBy).toBeUndefined();
    await t.destroy();

    t = tracker = await createTracker();
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true }));
    [search] = eventsOfType<{ filtersApplied?: Record<string, string>; sortBy?: string }>(
      t,
      "search",
    );
    expect(search.filtersApplied).toEqual({ size: "XL for john" });
    expect(search.sortBy).toBe("price");
  });

  test("click selectors never contain emails", async () => {
    const t = await start({ collectorOptions: { frustration: { rageClickCount: 2 } } });
    html(`<button id="jo@example.com">Go</button>`);
    const button = document.getElementById("jo@example.com")!;
    click(button);
    click(button);
    expect(JSON.stringify(eventsOfType(t, "rage_click"))).not.toContain("jo@example.com");
  });

  test("one error produces one error_click, and only for clicks before it", async () => {
    const t = await start();
    html(`<button id="a">A</button><button id="b">B</button>`);
    window.dispatchEvent(new ErrorEvent("error", { message: "TypeError: before click" }));
    await sleep(8);
    click(document.getElementById("a")!);
    await sleep(2);
    window.dispatchEvent(new ErrorEvent("error", { message: "TypeError: after first click" }));
    click(document.getElementById("b")!);
    await sleep(160);
    const errorClicks = eventsOfType<{ errorMessage: string }>(t, "error_click");
    expect(errorClicks.map((e) => e.errorMessage)).toEqual(["TypeError: after first click"]);
  });

  test("media progress ignores unknown or zero durations", async () => {
    const t = await start();
    html(`<video id="v"></video>`);
    const video = document.getElementById("v") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: NaN, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 5, configurable: true });
    video.dispatchEvent(new Event("timeupdate"));
    expect(eventsOfType(t, "video_progress")).toHaveLength(0);
  });

  test("native share is wrapped once even with two trackers", async () => {
    const original = async () => undefined;
    Object.defineProperty(navigator, "share", {
      value: original,
      configurable: true,
      writable: true,
    });
    extraCleanup.push(() => {
      delete (navigator as unknown as Record<string, unknown>).share;
    });
    const first = await start();
    const wrapped = navigator.share;
    const second = await createTracker();
    expect(navigator.share).toBe(wrapped);
    await navigator.share({ url: "https://a.com" });
    expect(eventsOfType(first, "share")).toHaveLength(1);
    expect(eventsOfType(second, "share")).toHaveLength(0);
    await second.destroy();
    expect(navigator.share).toBe(wrapped);
    await first.destroy();
    expect(navigator.share).toBe(original);
  });
});
