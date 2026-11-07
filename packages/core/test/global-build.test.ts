import { beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resetBrowser } from "./helpers";

const bundle = resolve(import.meta.dir, "../dist/indeks.global.js");

describe.skipIf(!existsSync(bundle))("IIFE global build", () => {
  beforeEach(() => resetBrowser());

  test("exposes window.indeks when the script tag opts in", () => {
    delete (window as unknown as Record<string, unknown>).indeks;
    const script = document.createElement("script");
    script.setAttribute("data-indeks-global", "");
    Object.defineProperty(document, "currentScript", { value: script, configurable: true });
    try {
      new Function(readFileSync(bundle, "utf8"))();
    } finally {
      delete (document as unknown as Record<string, unknown>).currentScript;
    }
    const api = window as unknown as { indeks?: unknown; IndeksTracker?: unknown };
    expect(typeof api.indeks).toBe("function");
    expect(typeof api.IndeksTracker).toBe("function");
  });

  test("does not leak globals without the opt-in attribute", () => {
    delete (window as unknown as Record<string, unknown>).indeks;
    new Function(readFileSync(bundle, "utf8"))();
    expect((window as unknown as Record<string, unknown>).indeks).toBeUndefined();
  });
});
