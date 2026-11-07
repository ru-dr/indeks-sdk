import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import type {
  IndeksEvent,
  IndeksClickEvent as ClickEvent,
  IndeksCustomEvent as CustomEvent,
  IndeksOutboundLinkEvent as OutboundLinkEvent,
  IndeksPageLeaveEvent as PageLeaveEvent,
  IndeksPageViewEvent as PageViewEvent,
  IndeksPrintEvent as PrintEvent,
  IndeksSessionEndEvent as SessionEndEvent,
  IndeksSessionStartEvent as SessionStartEvent,
  IndeksShareEvent as ShareEvent,
} from "@useindeks/shared";
import { IndeksTracker } from "../src";
import { API_KEY, click, createTracker, eventsOfType, html, resetBrowser, sleep } from "./helpers";

let tracker: IndeksTracker | null = null;

async function start(overrides = {}) {
  tracker = await createTracker(overrides);
  return tracker;
}

beforeEach(() => {
  resetBrowser();
});

afterEach(async () => {
  setSystemTime();
  await tracker?.destroy();
  tracker = null;
});

describe("construction", () => {
  test("rejects an invalid configuration", () => {
    expect(() => new IndeksTracker({ apiKey: "short" })).toThrow(/invalid configuration/);
    expect(() => new IndeksTracker({ apiKey: API_KEY, endpoint: "nope" })).toThrow();
  });

  test("explicitly undefined options fall back to defaults", async () => {
    const t = await start({ collectors: { click: undefined } });
    html(`<button id="b">Buy</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "click")).toHaveLength(1);
  });
});

describe("sessions", () => {
  test("emits session_start once per session, not once per page load", async () => {
    const first = await start();
    expect(eventsOfType<SessionStartEvent>(first, "session_start")).toHaveLength(1);
    const sessionId = first.getSessionId();
    await first.destroy();

    tracker = await createTracker();
    expect(tracker.getSessionId()).toBe(sessionId);
    expect(eventsOfType(tracker, "session_start")).toHaveLength(0);
  });

  test("counts clicks and scrolls instead of reporting zero", async () => {
    const t = await start({ collectors: { click: false } });
    html(`<button id="b">Buy</button>`);
    for (let i = 0; i < 4; i++) click(document.getElementById("b")!);
    window.dispatchEvent(new Event("scroll"));
    await sleep(10);
    window.dispatchEvent(new Event("pagehide"));

    const [end] = eventsOfType<SessionEndEvent>(t, "session_end");
    expect(end.totalClicks).toBe(4);
    expect(end.totalScrolls).toBe(1);
    const [leave] = eventsOfType<PageLeaveEvent>(t, "pageleave");
    expect(leave.clickCount).toBe(4);
    expect(leave.engaged).toBe(false);
  });

  test("tracks real active time instead of wall-clock time", async () => {
    const start0 = Date.now();
    setSystemTime(new Date(start0));
    const t = await start({ collectors: { idle: false } });
    setSystemTime(new Date(start0 + 5_000));
    document.dispatchEvent(new MouseEvent("mousemove"));
    setSystemTime(new Date(start0 + 600_000));
    window.dispatchEvent(new Event("pagehide"));

    const [end] = eventsOfType<SessionEndEvent>(t, "session_end");
    expect(end.sessionDuration).toBeGreaterThanOrEqual(600_000);
    expect(end.activeTime).toBeLessThan(10_000);
    expect(end.idleTime).toBeGreaterThan(590_000);
  });

  test("rotates the session after the inactivity timeout", async () => {
    const t0 = Date.now();
    setSystemTime(new Date(t0));
    const t = await start({ collectors: { idle: false } });
    const original = t.getSessionId();

    setSystemTime(new Date(t0 + 31 * 60 * 1000));
    html(`<button id="b">Buy</button>`);
    click(document.getElementById("b")!);

    expect(t.getSessionId()).not.toBe(original);
    const ends = eventsOfType<SessionEndEvent>(t, "session_end");
    expect(ends.at(-1)?.exitType).toBe("timeout");
    expect(ends.at(-1)?.sessionId).toBe(original);
    expect(eventsOfType(t, "session_start")).toHaveLength(2);
    const clickEvent = eventsOfType<ClickEvent>(t, "click")[0];
    expect(clickEvent.sessionId).toBe(t.getSessionId());
  });

  test("can end a session again after the tab returns from hidden", async () => {
    const t = await start();
    const hide = (state: "hidden" | "visible") => {
      Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
      Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    hide("hidden");
    hide("hidden");
    expect(eventsOfType(t, "session_end")).toHaveLength(1);
    hide("visible");
    hide("hidden");
    expect(eventsOfType(t, "session_end")).toHaveLength(2);
    hide("visible");
  });

  test("classifies traffic sources from UTM data and referrers", async () => {
    const cases: Array<[string, SessionStartEvent["trafficSource"]]> = [
      ["?utm_source=google&utm_medium=cpc", "paid"],
      ["?utm_source=newsletter&utm_medium=email", "email"],
      ["?utm_source=facebook", "social"],
      ["?utm_source=partner", "other"],
      ["", "direct"],
    ];
    for (const [query, expected] of cases) {
      resetBrowser(`https://app.example.com/${query}`);
      const t = await createTracker();
      const [event] = eventsOfType<SessionStartEvent>(t, "session_start");
      expect(event.trafficSource).toBe(expected);
      await t.destroy();
    }
  });

  test("session_start never leaks sensitive query values", async () => {
    resetBrowser("https://app.example.com/landing?token=SECRET&page=2#access_token=HASH");
    const t = await start();
    const [event] = eventsOfType<SessionStartEvent>(t, "session_start");
    expect(event.landingPage).not.toContain("SECRET");
    expect(event.landingPage).toContain("page=2");
    expect(event.url).not.toContain("SECRET");
    expect(event.url).not.toContain("HASH");
  });
});

describe("privacy", () => {
  test("scrubs fragments and tokens from the event URL", async () => {
    resetBrowser("https://app.example.com/cb?code=abc#access_token=zzz");
    const t = await start();
    const [view] = eventsOfType<PageViewEvent>(t, "pageview");
    expect(view.url).not.toContain("abc");
    expect(view.url).not.toContain("zzz");
  });

  test("redacts emails in clicked element text and scrubs link hrefs", async () => {
    const t = await start();
    html(`<a id="l" href="https://a.com/x?token=SECRET#frag">Mail jo@example.com now</a>`);
    click(document.getElementById("l")!);
    const [event] = eventsOfType<ClickEvent>(t, "click");
    expect(event.element.textContent).not.toContain("jo@example.com");
    expect(event.element.attributes.href).not.toContain("SECRET");
    expect(event.element.attributes["__href"]).not.toContain("SECRET");
  });

  test("honours data-indeks-mask and captureElementText:false", async () => {
    let t = await start();
    html(`<div data-indeks-mask><button id="b">Account 12345</button></div>`);
    click(document.getElementById("b")!);
    expect(eventsOfType<ClickEvent>(t, "click")[0].element.textContent).toBe("");
    await t.destroy();

    t = tracker = await createTracker({ privacy: { elementText: false } });
    html(`<button id="b2">Hello there</button>`);
    click(document.getElementById("b2")!);
    expect(eventsOfType<ClickEvent>(t, "click")[0].element.textContent).toBe("");
  });

  test("redacts and scrubs error events", async () => {
    const t = await start();
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "failed for jo@example.com",
        filename: "https://a.com/app.js?token=SECRET",
        lineno: 3,
        colno: 4,
      }),
    );
    const [event] = eventsOfType<Extract<IndeksEvent, { type: "error" }>>(t, "error");
    expect(event.error.message).not.toContain("jo@example.com");
    expect(event.error.filename).not.toContain("SECRET");
  });

  test("popstate reports only whether state exists", async () => {
    const t = await start();
    window.dispatchEvent(new PopStateEvent("popstate", { state: { secret: "x" } }));
    const [event] = eventsOfType<Record<string, unknown>>(t, "popstate");
    expect(event.hasState).toBe(true);
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  test("hashchange drops opaque fragments", async () => {
    const t = await start();
    window.dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL: "https://app.example.com/#a",
        newURL: "https://app.example.com/#access_token=SECRET",
      }),
    );
    const [event] = eventsOfType<Record<string, string>>(t, "hashchange");
    expect(event.newHash).toBe("");
    expect(JSON.stringify(event)).not.toContain("SECRET");
  });

  test("never enables a privacy-sensitive flag at runtime", async () => {
    const t = await start();
    t.updateConfig({
      privacy: { formValues: true },
      collectors: { keystroke: true, click: false },
    });
    html(`<button id="b">Buy</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "click")).toHaveLength(1);
    const internal = t as unknown as { config: Record<string, unknown> };
    const config = internal.config as {
      privacy: { formValues: boolean };
      collectors: Record<string, boolean>;
    };
    expect(config.privacy.formValues).toBe(false);
    expect(config.collectors.keystroke).toBe(false);
    expect(config.collectors.click).toBe(true);
  });

  test("respects Do Not Track", async () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    try {
      const t = await start();
      html(`<button id="b">Buy</button>`);
      click(document.getElementById("b")!);
      expect(t.getEvents()).toHaveLength(0);
    } finally {
      delete (navigator as unknown as Record<string, unknown>).doNotTrack;
    }
  });

  test("never reports input events for sensitive fields, not even their length", async () => {
    const t = await start();
    html(
      `<input id="pw" type="password" name="pw"><input id="named" type="text" name="password"><input id="mail" type="text" name="email"><input id="city" type="text" name="city">`,
    );
    for (const id of ["pw", "named", "mail", "city"]) {
      const input = document.getElementById(id) as HTMLInputElement;
      input.value = "some value";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const inputs = eventsOfType<{ element: { name: string; value?: string; valueLength: number } }>(
      t,
      "input",
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0].element.name).toBe("city");
    expect(inputs[0].element.value).toBeUndefined();
  });
});

describe("navigation", () => {
  test("pushState triggers a pageview and resets page timing; opaque hashes do not", async () => {
    const t = await start();
    expect(eventsOfType(t, "pageview")).toHaveLength(1);

    history.pushState({}, "", "/next");
    await sleep(80);
    expect(eventsOfType(t, "pageview")).toHaveLength(2);

    history.pushState({}, "", "/next#section");
    await sleep(80);
    expect(eventsOfType(t, "pageview")).toHaveLength(2);

    history.pushState({}, "", "/third");
    await sleep(80);
    expect(eventsOfType(t, "pageview")).toHaveLength(3);
    const [, , third] = eventsOfType<PageViewEvent>(t, "pageview");
    expect(third.url).toContain("/third");
  });

  test("counts pageviews for the session and treats single-page sessions as bounces", async () => {
    const t = await start();
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType<SessionEndEvent>(t, "session_end")[0].bounce).toBe(true);
    window.dispatchEvent(new Event("pageshow"));
    history.pushState({}, "", "/two");
    await sleep(80);
    window.dispatchEvent(new Event("pagehide"));
    const ends = eventsOfType<SessionEndEvent>(t, "session_end");
    expect(ends.at(-1)?.pagesViewed).toBe(2);
    expect(ends.at(-1)?.bounce).toBe(false);
  });

  test("a page exit emits pageleave and session_end exactly once across hide + pagehide", async () => {
    const t = await start();
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(eventsOfType(t, "pageleave")).toHaveLength(1);
    expect(eventsOfType(t, "session_end")).toHaveLength(1);
  });

  test("restores history methods and removes listeners on destroy", async () => {
    const originalPush = history.pushState;
    const t = await start();
    expect(history.pushState).not.toBe(originalPush);
    await t.destroy();
    expect(history.pushState).toBe(originalPush);

    html(`<button id="b">Buy</button>`);
    click(document.getElementById("b")!);
    expect(t.getEvents()).toHaveLength(0);
  });

  test("init is idempotent and does not register listeners twice", async () => {
    const t = await start();
    await t.init();
    html(`<button id="b">Buy</button>`);
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "click")).toHaveLength(1);
  });

  test("emits page load events even when init runs after the load event", async () => {
    expect(document.readyState).not.toBe("loading");
    const t = await start();
    expect(eventsOfType(t, "load")).toHaveLength(1);
    expect(eventsOfType(t, "DOMContentLoaded")).toHaveLength(1);
  });
});

describe("scroll", () => {
  test("scroll events report a finite, bounded percentage", async () => {
    const t = await start();
    window.dispatchEvent(new Event("scroll"));
    await sleep(15);
    const [event] = eventsOfType<Record<string, number>>(t, "scroll");
    expect(Number.isFinite(event.scrollPercentage)).toBe(true);
    expect(event.scrollPercentage).toBeGreaterThanOrEqual(0);
    expect(event.scrollPercentage).toBeLessThanOrEqual(100);
  });
});

describe("heuristic collectors", () => {
  test("does not report outbound links for mailto/tel or same-site subdomains", async () => {
    const t = await start();
    html(`
      <a id="m" href="mailto:a@b.com">mail</a>
      <a id="t" href="tel:+123">call</a>
      <a id="s" href="https://docs.example.com/x">docs</a>
      <a id="w" href="https://www.app.example.com/x">www</a>
      <a id="o" href="https://other.org/x?token=SECRET">other</a>`);
    for (const id of ["m", "t", "s", "w", "o"]) {
      document.getElementById(id)!.addEventListener("click", (e) => e.preventDefault());
      click(document.getElementById(id)!);
    }
    const outbound = eventsOfType<OutboundLinkEvent>(t, "outbound_link");
    expect(outbound).toHaveLength(1);
    expect(outbound[0].domain).toBe("other.org");
    expect(outbound[0].targetUrl).not.toContain("SECRET");
  });

  test("print: single event, trigger reflects the button, no false positives from containers", async () => {
    const t = await start();
    html(`<div id="wrap">Click to print the invoice <button id="p">Print</button></div>`);

    click(document.getElementById("wrap")!);
    window.dispatchEvent(new Event("beforeprint"));
    expect(eventsOfType<PrintEvent>(t, "print")[0].printTrigger).toBe("menu");

    click(document.getElementById("p")!);
    window.dispatchEvent(new Event("beforeprint"));
    const prints = eventsOfType<PrintEvent>(t, "print");
    expect(prints).toHaveLength(2);
    expect(prints[1].printTrigger).toBe("button");
  });

  test("share: copy-link only fires for a real control and never leaks the URL query", async () => {
    resetBrowser("https://app.example.com/post/1?token=SECRET");
    const t = await start();
    html(`<div id="wrap">You can copy link below <button id="c">Copy link</button></div>`);
    click(document.getElementById("wrap")!);
    expect(eventsOfType(t, "share")).toHaveLength(0);
    click(document.getElementById("c")!);
    const shares = eventsOfType<ShareEvent>(t, "share");
    expect(shares).toHaveLength(1);
    expect(shares[0].shareMethod).toBe("copy_link");
    expect(shares[0].contentShared).not.toContain("SECRET");
  });

  test("dead clicks are only reported when the page does not respond", async () => {
    const t = await start();
    html(
      `<div id="dead" class="clickable">nothing</div><div id="alive" class="clickable">works</div>`,
    );
    document.getElementById("alive")!.addEventListener("click", () => {
      const span = document.createElement("span");
      document.body.appendChild(span);
    });

    click(document.getElementById("alive")!);
    click(document.getElementById("dead")!);
    await sleep(650);

    const dead = eventsOfType<Record<string, string>>(t, "dead_click");
    expect(dead).toHaveLength(1);
    expect(dead[0].element).toBe("#dead");
  });

  test("rage clicks fire after three quick clicks on the same element", async () => {
    const t = await start();
    html(`<button id="b" aria-disabled="true">Go</button>`);
    const button = document.getElementById("b")!;
    for (let i = 0; i < 3; i++) click(button);
    const [rage] = eventsOfType<Record<string, unknown>>(t, "rage_click");
    expect(rage.whyRage).toBe("button_disabled");
    expect(rage.userGaveUp).toBeUndefined();
  });

  test("one search event per submission (click + submit are deduplicated)", async () => {
    const t = await start();
    html(
      `<form id="f"><input type="search" name="q" value="shoes"><button type="submit" id="s">Go</button></form>`,
    );
    document.getElementById("f")!.addEventListener("submit", (e) => e.preventDefault());
    click(document.getElementById("s")!);
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true }));
    const searches = eventsOfType<Record<string, unknown>>(t, "search");
    expect(searches).toHaveLength(1);
    expect(searches[0].query).toBeUndefined();
    expect(searches[0].queryLength).toBe(5);
  });

  test("downloads are detected with query strings and without false positives", async () => {
    const t = await start();
    html(`
      <a id="d" href="https://app.example.com/report.pdf?v=2">report</a>
      <a id="n" href="https://app.example.com/files-overview">overview</a>`);
    for (const id of ["d", "n"]) {
      document.getElementById(id)!.addEventListener("click", (e) => e.preventDefault());
      click(document.getElementById(id)!);
    }
    const downloads = eventsOfType<Record<string, string>>(t, "file_download");
    expect(downloads).toHaveLength(1);
    expect(downloads[0].fileType).toBe("pdf");
    expect(downloads[0].fileName).toBe("report.pdf");
  });

  test("form abandon counts completed fields and redacts sensitive names", async () => {
    const t = await start();
    html(
      `<form id="f"><input name="city" id="city"><input name="password" id="pw" type="password"></form>`,
    );
    const city = document.getElementById("city") as HTMLInputElement;
    const pw = document.getElementById("pw") as HTMLInputElement;
    city.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    city.value = "Paris";
    pw.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    window.dispatchEvent(new Event("pagehide"));
    const [abandon] = eventsOfType<Record<string, unknown>>(t, "form_abandon");
    expect(abandon.fieldsCompleted).toBe(1);
    expect(abandon.totalFields).toBe(2);
    expect(abandon.lastField).toBe("[redacted]");
  });

  test("idle start/end use a single timer and report duration", async () => {
    const t = await start({ idleTimeoutMs: 80 });
    await sleep(160);
    expect(eventsOfType(t, "idle_start")).toHaveLength(1);
    document.dispatchEvent(new MouseEvent("mousemove"));
    const [end] = eventsOfType<Record<string, number>>(t, "idle_end");
    expect(end.idleDuration).toBeGreaterThanOrEqual(80);
  });
});

describe("manual tracking", () => {
  test("trackElements() registers one listener, reports matches once and can be disposed", async () => {
    const t = await start();
    html(`<button class="cta primary" id="b">Buy</button>`);
    const dispose = t.trackElements({
      selectors: [".cta", ".primary"],
      eventName: "cta_click",
      properties: { plan: "pro" },
    });
    click(document.getElementById("b")!);
    const events = eventsOfType<CustomEvent>(t, "custom");
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe("cta_click");
    expect(events[0].properties.plan).toBe("pro");

    dispose();
    click(document.getElementById("b")!);
    expect(eventsOfType(t, "custom")).toHaveLength(1);
  });

  test("trackElements() before init returns a disposer", () => {
    const uninitialized = new IndeksTracker({ apiKey: API_KEY, localOnly: true });
    expect(uninitialized.trackElements({ selectors: ["a"] })).toBeInstanceOf(Function);
  });

  test("conversion events mark the session as converted", async () => {
    const t = await start();
    html(`<button id="b">Buy</button>`);
    t.trackElements({ selectors: ["#b"], eventName: "checkout_convert" });
    click(document.getElementById("b")!);
    window.dispatchEvent(new Event("pagehide"));
    expect(eventsOfType<SessionEndEvent>(t, "session_end")[0].converted).toBe(true);
  });
});
