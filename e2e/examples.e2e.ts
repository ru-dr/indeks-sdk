import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { startExamples } from "../examples/server";

let server: Awaited<ReturnType<typeof startExamples>>;

test.beforeAll(async () => {
  execFileSync("bun", ["run", "examples:build"], { stdio: "ignore" });
  server = await startExamples({ port: 0, onEvents: () => undefined });
});

test.afterAll(async () => {
  await server.close();
});

test.beforeEach(() => {
  server.received.length = 0;
});

test("the script-tag example tracks clicks and custom events", async ({ page }) => {
  await page.goto(`${server.url}/vanilla/`);
  await page.waitForFunction(() => Boolean((window as any).tracker?.getSessionId));
  await page.click("#signup");
  await page.evaluate(() => (window as any).tracker.flush());
  await expect
    .poll(() => server.received.some((e: any) => e.properties?.eventName === "signup_clicked"))
    .toBe(true);
  expect(server.received.some((e: any) => e.type === "session_start")).toBe(true);
  expect(server.received.some((e: any) => e.type === "identify")).toBe(true);
});

test("the React example tracks custom events and renders the debugger", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.url}/react/`);
  await page.waitForSelector("text=Session: indeks_");
  await page.click("text=Add to cart");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect
    .poll(() => server.received.some((e: any) => e.properties?.eventName === "add_to_cart"), {
      timeout: 8000,
    })
    .toBe(true);
  await expect(page.locator('button[aria-label="Open Indeks debugger"]')).toBeVisible();
  expect(errors).toEqual([]);
});
