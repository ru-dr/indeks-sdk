import { describe, expect, test } from "bun:test";
import {
  getElementInfo,
  getScrollMetrics,
  isSameSite,
  normalizeText,
  readText,
  registrableDomain,
} from "../src/dom";

describe("registrableDomain / isSameSite", () => {
  test("handles www, subdomains and multi-part public suffixes", () => {
    expect(registrableDomain("www.example.com")).toBe("example.com");
    expect(registrableDomain("a.b.example.com")).toBe("example.com");
    expect(registrableDomain("shop.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("localhost")).toBe("localhost");
    expect(registrableDomain("127.0.0.1")).toBe("127.0.0.1");
  });

  test("compares sites", () => {
    expect(isSameSite("docs.example.com", "app.example.com")).toBe(true);
    expect(isSameSite("example.org", "example.com")).toBe(false);
    expect(isSameSite("example.co.uk", "other.co.uk")).toBe(false);
  });
});

describe("getScrollMetrics", () => {
  test("never divides by zero for non-scrollable pages", () => {
    const metrics = getScrollMetrics();
    expect(metrics.percentage).toBe(0);
    expect(Number.isFinite(metrics.percentage)).toBe(true);
  });
});

describe("normalizeText", () => {
  test("is fast and bounded for huge text blocks", () => {
    const start = performance.now();
    const out = normalizeText("a".repeat(2_000_000));
    expect(performance.now() - start).toBeLessThan(200);
    expect(out.length).toBe(100);
  });

  test("collapses whitespace and redacts before truncating", () => {
    expect(normalizeText("  Hello \n   world  ")).toBe("Hello world");
    expect(normalizeText("mail jo@example.com now")).not.toContain("jo@example.com");
  });
});

describe("readText on large containers", () => {
  test("never reads innerText of huge elements and keeps only direct text", () => {
    document.body.innerHTML = `<section id="big">Heading ${"x".repeat(5000)}<p>${"y".repeat(5000)}</p></section>`;
    const big = document.getElementById("big")!;
    let innerTextReads = 0;
    Object.defineProperty(big, "innerText", {
      get() {
        innerTextReads++;
        return "never";
      },
      configurable: true,
    });
    const text = readText(big, true);
    expect(innerTextReads).toBe(0);
    expect(text.startsWith("Heading")).toBe(true);
    expect(text).not.toContain("y");
  });

  test("small elements still use rendered text", () => {
    document.body.innerHTML = `<button id="b">Buy <b>now</b></button>`;
    const info = getElementInfo(document.getElementById("b")!);
    expect(info.textContent).toBe("Buy now");
  });

  test("respects masking and the captureText switch", () => {
    document.body.innerHTML = `<div data-indeks-mask><button id="b">Secret</button></div>`;
    expect(readText(document.getElementById("b")!, true)).toBe("");
    expect(readText(document.getElementById("b")!, false)).toBe("");
  });
});
