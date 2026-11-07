import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { BATCH_CONFIG, resolveConfig } from "@useindeks/shared";
import type { IndeksConfig } from "@useindeks/shared";
import type { IndeksEvent } from "@useindeks/shared";
import { IndeksAnalytics } from "../src/analytics";
import { API_KEY, resetBrowser } from "./helpers";

const ENDPOINT = "https://collect.example.com/api/v1/collect";

function makeEvent(i = 0): IndeksEvent {
  return {
    type: "custom",
    eventName: `e${i}`,
    properties: { password: "hunter2", note: "ok" },
    timestamp: 1000 + i,
    url: "https://app.example.com/",
    userAgent: "ua",
    sessionId: "s1",
    userId: "u1",
    device: {} as never,
  } as IndeksEvent;
}

interface Timer {
  fn: () => void;
  delay: number;
}

describe("IndeksAnalytics", () => {
  const realFetch = globalThis.fetch;
  const realSetTimeout = globalThis.setTimeout;
  let timers: Timer[];
  let fetchMock: ReturnType<typeof mock>;
  let status: number;

  beforeEach(() => {
    resetBrowser();
    timers = [];
    status = 200;
    fetchMock = mock(async () => new Response("{}", { status }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    globalThis.setTimeout = ((fn: () => void, delay: number) => {
      timers.push({ fn, delay });
      return timers.length as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    globalThis.setTimeout = realSetTimeout;
  });

  const create = (config: Partial<IndeksConfig> = {}) =>
    new IndeksAnalytics(resolveConfig({ apiKey: API_KEY, endpoint: ENDPOINT, ...config }));

  test("sends sanitized events with the API key header", async () => {
    const analytics = create();
    await analytics.batch([makeEvent()]);
    await analytics.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init.headers).toBeUndefined();
    const body = JSON.parse(init.body as string);
    expect(body.apiKey).toBe(API_KEY);
    expect(body.events[0].properties.properties.password).toBe("[redacted]");
    expect(body.events[0].properties.properties.note).toBe("ok");
    expect(analytics.getBatchSize()).toBe(0);
  });

  test("does not send anywhere when no endpoint is configured, even on localhost", async () => {
    resetBrowser("http://localhost:3000/");
    const errors = mock(() => {});
    const original = console.error;
    console.error = errors;
    try {
      const analytics = new IndeksAnalytics(resolveConfig({ apiKey: API_KEY }));
      await analytics.batch([makeEvent()]);
      await analytics.flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(errors).toHaveBeenCalledTimes(1);
    } finally {
      console.error = original;
    }
  });

  test("localOnly never hits the network", async () => {
    const analytics = create({ localOnly: true });
    await analytics.batch([makeEvent()]);
    await analytics.flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("splits large flushes into MAX_BATCH_SIZE requests", async () => {
    const analytics = create();
    const total = BATCH_CONFIG.MAX_BATCH_SIZE + 20;
    await analytics.batch(Array.from({ length: total }, (_, i) => makeEvent(i)));
    await analytics.flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sizes = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).events.length,
    );
    expect(sizes).toEqual([BATCH_CONFIG.MAX_BATCH_SIZE, 20]);
  });

  test("schedules a retry with backoff after a retryable failure and keeps the events", async () => {
    const analytics = create();
    await analytics.batch([makeEvent()]);
    timers.length = 0;
    status = 500;

    await expect(analytics.flush()).rejects.toThrow("HTTP 500");
    expect(analytics.getBatchSize()).toBe(1);
    const retry = timers.at(-1)!;
    expect(retry.delay).toBeGreaterThan(0);
    expect(retry.delay).toBeLessThanOrEqual(BATCH_CONFIG.RETRY_BASE_MS);

    status = 200;
    fetchMock.mockClear();
    const flushed = retry.fn;
    (analytics as unknown as { nextRetryAt: number }).nextRetryAt = 0;
    flushed();
    await Promise.resolve();
    await Promise.resolve();
    await realSetTimeout(() => {}, 0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(analytics.getBatchSize()).toBe(0);
  });

  test("drops events on non-retryable client errors instead of retrying forever", async () => {
    const analytics = create();
    await analytics.batch([makeEvent()]);
    status = 401;
    await analytics.flush();
    expect(analytics.getBatchSize()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("batch() does not reject when the size-triggered flush fails", async () => {
    status = 500;
    const analytics = create();
    const events = Array.from({ length: BATCH_CONFIG.DEFAULT_BATCH_SIZE }, (_, i) => makeEvent(i));
    await expect(analytics.batch(events)).resolves.toBeUndefined();
    expect(analytics.getBatchSize()).toBe(BATCH_CONFIG.DEFAULT_BATCH_SIZE);
  });

  test("caps the in-memory queue", async () => {
    status = 500;
    const analytics = create();
    const total = BATCH_CONFIG.MAX_QUEUE_SIZE + 50;
    await analytics.batch(Array.from({ length: total }, (_, i) => makeEvent(i)));
    expect(analytics.getBatchSize()).toBeLessThanOrEqual(BATCH_CONFIG.MAX_QUEUE_SIZE);
  });

  test("flushSync uses sendBeacon and puts the API key in the body", async () => {
    const analytics = create();
    await analytics.batch([makeEvent()]);
    let beaconBlob: Blob | null = null;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: (_url: string, blob: Blob) => {
        beaconBlob = blob;
        return true;
      },
    });
    analytics.flushSync();
    const payload = JSON.parse(await (beaconBlob as unknown as Blob).text());
    expect(payload.apiKey).toBe(API_KEY);
    expect(payload.events).toHaveLength(1);
    expect(analytics.getBatchSize()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("persists events when the flushSync fetch fallback fails and restores them", async () => {
    const analytics = create();
    await analytics.batch([makeEvent(1), makeEvent(2)]);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: () => false });
    fetchMock = mock(async () => {
      throw new Error("offline");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    analytics.flushSync();
    await realSetTimeout(() => {}, 5);
    expect(localStorage.getItem("indeks_events")).not.toBeNull();

    const fresh = create();
    expect(await fresh.restorePersisted()).toBe(2);
    expect(fresh.getBatchSize()).toBe(2);
    expect(localStorage.getItem("indeks_events")).toBeNull();
  });
});
