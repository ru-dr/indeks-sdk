import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { startHarness } from "./harness";
import type { Harness } from "./harness";

let harness: Harness;

test.beforeAll(async () => {
  harness = await startHarness();
});

test.afterAll(async () => {
  await harness.close();
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await new Promise((resolve) => setTimeout(resolve, 250));
  harness.reset();
});

async function open(page: Page, path = "/?token=SECRET#access_token=abc") {
  await page.goto(`${harness.appUrl}${path}`);
  await page.waitForFunction(() => Boolean((window as any).tracker?.getSessionId));
  await page.waitForTimeout(150);
}

test("delivers events cross-origin as simple requests (no preflight) with the key in the body", async ({
  page,
}) => {
  await open(page);
  await page.click("#buy");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(150);
  await page.evaluate(() => (window as any).tracker.flush());

  const click = await harness.waitForEvent("click");
  expect(harness.preflights).toBe(0);
  expect(harness.requests.length).toBeGreaterThan(0);
  for (const request of harness.requests) {
    expect(request.contentType).toContain("text/plain");
    expect(request.body.apiKey).toBe("e2e_api_key_12345");
    expect(request.headers["x-api-key"]).toBeUndefined();
  }

  const start = await harness.waitForEvent("session_start");
  expect(start.properties.device.browserName).toBeTruthy();
  expect(click.properties.device).toBeUndefined();
  expect(click.userAgent).toBeTruthy();

  const depths = harness
    .eventsOfType("scroll_depth")
    .map((e) => e.properties.depth)
    .sort((a, b) => a - b);
  expect(depths).toEqual([25, 50, 75, 100]);
  const scroll = harness.eventsOfType("scroll").at(-1)!;
  expect(scroll.properties.scrollPercentage).toBeGreaterThan(90);
  expect(scroll.properties.scrollPercentage).toBeLessThanOrEqual(100);
});

test("never sends tokens, fragments or masked text", async ({ page }) => {
  await open(page);
  await page.click("#buy");
  await page.click("#masked");
  await page.evaluate(() => (window as any).tracker.flush());
  await harness.waitForEvent("click");
  const everything = JSON.stringify(harness.events());
  expect(everything).not.toContain("SECRET");
  expect(everything).not.toContain("access_token");
  expect(everything).not.toContain('12345"');
  expect(everything).not.toContain("Secret account");
  const view = await harness.waitForEvent("pageview");
  expect(view.url).not.toContain("#");
});

test("real navigation delivers exit events through sendBeacon, including real performance metrics", async ({
  page,
}) => {
  await open(page, "/");
  await page.click("#buy");
  await page.waitForTimeout(300);
  await page.click("#next");
  await page.waitForURL("**/other");

  const leave = await harness.waitForEvent("pageleave");
  expect(leave.properties.timeOnPage).toBeGreaterThan(0);
  const end = await harness.waitForEvent("session_end");
  expect(end.properties.totalClicks).toBeGreaterThanOrEqual(1);
  expect(end.properties.pagesViewed).toBeGreaterThanOrEqual(1);

  const types = new Set(harness.events().map((event) => event.type));
  expect(types.has("first_contentful_paint")).toBe(true);
  expect(types.has("load")).toBe(true);
  expect(harness.preflights).toBe(0);
});

test("a second page in the same tab continues the session without a new session_start", async ({
  page,
}) => {
  await open(page, "/");
  await page.click("#next");
  await page.waitForURL("**/other");
  await page.waitForFunction(() => Boolean((window as any).tracker?.getSessionId));
  await page.waitForTimeout(200);
  await page.evaluate(() => (window as any).tracker.flush());
  await harness.waitForEvent("pageview");
  expect(harness.eventsOfType("session_start")).toHaveLength(1);
  const sessions = new Set(harness.events().map((event) => event.sessionId));
  expect(sessions.size).toBe(1);
});

test("single-page navigation emits a pageview and ignores anchor-only changes", async ({
  page,
}) => {
  await open(page, "/");
  await page.evaluate(() => history.pushState({}, "", "/spa-route"));
  await page.waitForTimeout(200);
  await page.evaluate(() => history.pushState({}, "", "/spa-route#section"));
  await page.waitForTimeout(200);
  await page.evaluate(() => (window as any).tracker.flush());
  await harness.waitForEvent("pageview");
  const views = harness.eventsOfType("pageview");
  expect(views).toHaveLength(2);
  expect(views[1].url).toContain("/spa-route");
});

test("reports outbound links and dead clicks, but not clicks that do something", async ({
  page,
}) => {
  await open(page, "/");
  await page.evaluate(() => {
    document.getElementById("outbound")!.addEventListener("click", (e) => e.preventDefault());
    document.getElementById("buy")!.addEventListener("click", () => {
      document.body.appendChild(document.createElement("span"));
    });
  });
  await page.click("#outbound");
  await page.click("#dead");
  await page.waitForTimeout(700);
  await page.evaluate(() => (window as any).tracker.flush());
  const outbound = await harness.waitForEvent("outbound_link");
  expect(outbound.properties.domain).toBe("127.0.0.1");
  expect(outbound.properties.targetUrl).not.toContain("SECRET");
  const dead = await harness.waitForEvent("dead_click");
  expect(dead.properties.element).toBe("#dead");
});

test("honours Do Not Track: nothing is sent", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "doNotTrack", { get: () => "1" });
  });
  await page.goto(`${harness.appUrl}/`);
  await page.waitForTimeout(500);
  await page.click("#buy");
  await page.evaluate(() => (window as any).tracker.flush());
  await page.waitForTimeout(300);
  expect(harness.requests).toHaveLength(0);
});

test("opt-out persists across reloads", async ({ page }) => {
  await open(page, "/");
  await page.evaluate(() => (window as any).tracker.optOut());
  harness.reset();
  await page.reload();
  await page.waitForTimeout(500);
  await page.click("#buy");
  await page.waitForTimeout(300);
  expect(harness.requests).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("indeks_opt_out"))).toBe("1");
});

test("events recorded offline are buffered and delivered after reconnecting", async ({
  page,
  context,
}) => {
  await open(page, "/");
  await page.evaluate(() => (window as any).tracker.flush());
  await harness.waitForEvent("session_start");
  harness.reset();

  await context.setOffline(true);
  await page.click("#buy");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => localStorage.getItem("indeks_events"))).not.toBeNull();
  expect(harness.requests).toHaveLength(0);

  await context.setOffline(false);
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).tracker?.getSessionId));
  await page.evaluate(() => (window as any).tracker.flush());
  const click = await harness.waitForEvent("click", 10_000);
  expect(click.type).toBe("click");
  expect(await page.evaluate(() => localStorage.getItem("indeks_events"))).toBeNull();
});

test("tracker API works from the global build: track, identify, page", async ({ page }) => {
  await open(page, "/");
  await page.evaluate(() => {
    const t = (window as any).tracker;
    t.track("signup", { plan: "pro", password: "hunter2" });
    t.identify("user-42", { email: "a@b.com" });
    t.page("Pricing");
    return t.flush();
  });
  const custom = await harness.waitForEvent("custom");
  expect(custom.properties.eventName ?? custom.properties.eventName).toBe("signup");
  expect(JSON.stringify(harness.events())).not.toContain("hunter2");
  expect(JSON.stringify(harness.events())).not.toContain("a@b.com");
  const identify = await harness.waitForEvent("identify");
  expect(identify.properties.externalUserId).toBe("user-42");
});
