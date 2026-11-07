import { describe, expect, test } from "bun:test";
import {
  debounce,
  generateId,
  generateUuid,
  safeJsonParse,
  resolveConfig,
  validateConfig,
  validateEventData,
} from "../src";

const apiKey = "test_api_key_123";

describe("validateConfig", () => {
  test("accepts a minimal valid config", () => {
    expect(validateConfig({ apiKey })).toEqual([]);
  });

  test("requires a sufficiently long API key", () => {
    expect(validateConfig({})).toContain("API key is required");
    expect(validateConfig({ apiKey: "short" })[0]).toContain("too short");
  });

  test("validates numeric options", () => {
    expect(validateConfig({ apiKey, debounceMs: -1 })).toContain("debounceMs must be non-negative");
    expect(validateConfig({ apiKey, idleTimeoutMs: 99_999_999 }).length).toBe(1);
    expect(validateConfig({ apiKey, idleTimeoutMs: "x" as unknown as number }).length).toBe(1);
  });

  test("validates scroll depth thresholds", () => {
    expect(validateConfig({ apiKey, scrollDepthThresholds: [25, 50] })).toEqual([]);
    expect(validateConfig({ apiKey, scrollDepthThresholds: [0, 200] }).length).toBe(1);
    expect(
      validateConfig({ apiKey, scrollDepthThresholds: "x" as unknown as number[] }).length,
    ).toBe(1);
  });

  test("validates presets, collector names and privacy flags", () => {
    expect(validateConfig({ apiKey, preset: "huge" as never }).length).toBe(1);
    expect(validateConfig({ apiKey, collectors: { nope: true } as never })[0]).toContain(
      "unknown collector",
    );
    expect(validateConfig({ apiKey, collectors: { click: "yes" as never } }).length).toBe(1);
    expect(validateConfig({ apiKey, privacy: { formValues: 1 as never } }).length).toBe(1);
    expect(
      validateConfig({ apiKey, collectors: { click: false }, privacy: { elementText: false } }),
    ).toEqual([]);
  });

  test("validates the endpoint", () => {
    expect(validateConfig({ apiKey, endpoint: "not a url" })).toContain(
      "endpoint must be an absolute URL or a path starting with /",
    );
    expect(validateConfig({ apiKey, endpoint: "collect" }).length).toBe(1);
    expect(validateConfig({ apiKey, endpoint: "//cdn.example.com/collect" }).length).toBe(1);
    expect(validateConfig({ apiKey, endpoint: "https://a.com/collect" })).toEqual([]);
    expect(validateConfig({ apiKey, endpoint: "/api/collect" })).toEqual([]);
  });
});

describe("resolveConfig", () => {
  test("standard preset enables common collectors and keeps sensitive ones off", () => {
    const config = resolveConfig({ apiKey });
    expect(config.collectors.click).toBe(true);
    expect(config.collectors.keystroke).toBe(false);
    expect(config.collectors.mouseMove).toBe(false);
    expect(config.privacy.respectDoNotTrack).toBe(true);
    expect(config.privacy.formValues).toBe(false);
    expect(config.debounceMs).toBe(100);
  });

  test("minimal and full presets", () => {
    const minimal = resolveConfig({ apiKey, preset: "minimal" });
    expect(minimal.collectors.click).toBe(true);
    expect(minimal.collectors.mouseMove).toBe(false);
    expect(minimal.collectors.formSubmit).toBe(false);
    const full = resolveConfig({ apiKey, preset: "full" });
    expect(Object.values(full.collectors).every(Boolean)).toBe(true);
  });

  test("explicit collector overrides win and undefined values are ignored", () => {
    const config = resolveConfig({
      apiKey,
      preset: "minimal",
      collectors: { hover: true, click: undefined },
      privacy: { elementText: false, formValues: undefined },
      debounceMs: 5,
    });
    expect(config.collectors.hover).toBe(true);
    expect(config.collectors.click).toBe(true);
    expect(config.privacy.elementText).toBe(false);
    expect(config.privacy.formValues).toBe(false);
    expect(config.debounceMs).toBe(5);
  });
});

describe("validateEventData", () => {
  const valid = { type: "click", timestamp: 1, sessionId: "s", userId: "u", url: "/" };

  test("accepts complete events", () => {
    expect(validateEventData(valid)).toBe(true);
  });

  test("rejects missing or empty required fields", () => {
    expect(validateEventData(null)).toBe(false);
    expect(validateEventData({ ...valid, type: "" })).toBe(false);
    expect(validateEventData({ ...valid, sessionId: undefined })).toBe(false);
    expect(validateEventData({ ...valid, timestamp: "1" })).toBe(false);
  });
});

describe("ids and timing", () => {
  test("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId("x")));
    expect(ids.size).toBe(50);
    expect(generateUuid()).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("debounce coalesces calls and can be cancelled", async () => {
    let calls = 0;
    const fn = debounce(() => calls++, 10);
    fn();
    fn();
    fn();
    await Bun.sleep(30);
    expect(calls).toBe(1);
    fn();
    fn.cancel();
    await Bun.sleep(30);
    expect(calls).toBe(1);
  });
});

describe("collectorOptions", () => {
  test("defaults are filled in and overrides merge per group", () => {
    const config = resolveConfig({
      apiKey,
      collectorOptions: { frustration: { rageClickCount: 5, deadClickWindowMs: undefined } },
    });
    expect(config.collectorOptions.frustration.rageClickCount).toBe(5);
    expect(config.collectorOptions.frustration.deadClickWindowMs).toBe(500);
    expect(config.collectorOptions.search.inputSelector).toContain('input[name="q"]');
  });

  test("validation rejects unknown groups and wrong value types", () => {
    expect(validateConfig({ apiKey, collectorOptions: { nope: {} } as never })[0]).toContain(
      "unknown collectorOptions group",
    );
    expect(
      validateConfig({ apiKey, collectorOptions: { search: { inputSelector: 5 as never } } })
        .length,
    ).toBe(1);
    expect(
      validateConfig({
        apiKey,
        collectorOptions: { frustration: { rageClickCount: "3" as never } },
      }).length,
    ).toBe(1);
    expect(
      validateConfig({
        apiKey,
        collectorOptions: { search: { inputSelector: "#q" }, frustration: { rageClickCount: 4 } },
      }),
    ).toEqual([]);
  });
});

describe("fallbacks", () => {
  test("ids still work without the Web Crypto API", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      const id = generateId("x");
      expect(id).toMatch(/^x_\d+_[a-z0-9]+$/);
      expect(generateUuid()).toMatch(/^indeks_\d+_[a-z0-9]+$/);
    } finally {
      if (original) Object.defineProperty(globalThis, "crypto", original);
    }
  });

  test("ids use getRandomValues when randomUUID is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) },
      configurable: true,
    });
    try {
      expect(generateId()).toMatch(/^\d+_[a-z0-9]+$/);
    } finally {
      if (original) Object.defineProperty(globalThis, "crypto", original);
    }
  });

  test("safeJsonParse returns the fallback for invalid JSON", () => {
    expect(safeJsonParse("{oops", { ok: false })).toEqual({ ok: false });
    expect(safeJsonParse('{"ok":true}', { ok: false })).toEqual({ ok: true });
  });
});
