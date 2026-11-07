import { describe, expect, test } from "bun:test";
import {
  REDACTED,
  filterElementAttributes,
  isSensitiveFieldName,
  pathAndSearch,
  redactText,
  sanitizeEventData,
  scrubHash,
  scrubUrl,
} from "../src";

describe("scrubUrl", () => {
  test("drops opaque fragments such as OAuth tokens", () => {
    const url = scrubUrl("https://a.com/cb#access_token=abc&state=1");
    expect(url).toBe("https://a.com/cb");
  });

  test("drops plain anchor fragments", () => {
    expect(scrubUrl("https://a.com/page#section")).toBe("https://a.com/page");
  });

  test("keeps hash-router routes and scrubs their query", () => {
    const url = scrubUrl("https://a.com/#/dash?token=secret&tab=1");
    expect(url).toContain("#/dash");
    expect(url).toContain(`token=${encodeURIComponent(REDACTED)}`);
    expect(url).toContain("tab=1");
    expect(url).not.toContain("secret");
  });

  test("removes credentials from the URL", () => {
    expect(scrubUrl("https://user:pass@a.com/x")).toBe("https://a.com/x");
  });

  test("redacts sensitive query params but keeps utm and safe params", () => {
    const url = new URL(
      scrubUrl("https://a.com/?token=t&email=a@b.com&utm_source=news&ref=x&page=2"),
    );
    expect(url.searchParams.get("token")).toBe(REDACTED);
    expect(url.searchParams.get("email")).toBe(REDACTED);
    expect(url.searchParams.get("utm_source")).toBe("news");
    expect(url.searchParams.get("ref")).toBe("x");
    expect(url.searchParams.get("page")).toBe("2");
  });

  test("returns empty string for empty or invalid input", () => {
    expect(scrubUrl("")).toBe("");
    expect(scrubUrl(null)).toBe("");
    expect(scrubUrl("http://[bad")).toBe("");
  });

  test("scrubHash only keeps route-like fragments", () => {
    expect(scrubHash("#/route")).toBe("#/route");
    expect(scrubHash("#!/route")).toBe("#!/route");
    expect(scrubHash("#access_token=abc")).toBe("");
    expect(scrubHash("")).toBe("");
  });

  test("pathAndSearch never includes sensitive values", () => {
    const value = pathAndSearch("https://a.com/p?code=abc&q=hi#frag");
    expect(value).not.toContain("abc");
    expect(value.startsWith("/p?")).toBe(true);
  });
});

describe("redactText", () => {
  test("redacts emails, card numbers, JWTs and bearer tokens", () => {
    const text =
      "mail me at jo.doe@example.com card 4111 1111 1111 1111 jwt eyJhbGciOi.eyJzdWIiOi.sig123 Bearer abc.def";
    const out = redactText(text);
    expect(out).not.toContain("jo.doe@example.com");
    expect(out).not.toContain("4111");
    expect(out).not.toContain("eyJhbGciOi");
    expect(out).not.toContain("abc.def");
  });

  test("scrubs URLs embedded in text", () => {
    expect(redactText("see https://a.com/x?token=zzz now")).not.toContain("zzz");
  });

  test("leaves ordinary text untouched", () => {
    expect(redactText("Add to cart")).toBe("Add to cart");
  });
});

describe("filterElementAttributes", () => {
  test("scrubs href and src, skips value, drops unknown attributes", () => {
    const out = filterElementAttributes([
      { name: "href", value: "https://a.com/x?token=abc#access_token=1" },
      { name: "value", value: "secret" },
      { name: "onclick", value: "evil()" },
      { name: "id", value: "buy" },
      { name: "data-indeks-label", value: "cta" },
    ]);
    expect(out.href).not.toContain("abc");
    expect(out.href).not.toContain("#");
    expect(out.value).toBeUndefined();
    expect(out.onclick).toBeUndefined();
    expect(out.id).toBe("buy");
    expect(out["data-indeks-label"]).toBe("cta");
  });
});

describe("sanitizeEventData / field names", () => {
  test("redacts sensitive keys deeply and handles cycles", () => {
    const cyclic: Record<string, unknown> = { nested: { password: "x", ok: 1 } };
    cyclic.self = cyclic;
    const out = sanitizeEventData(cyclic) as {
      nested: { password: string; ok: number };
      self: unknown;
    };
    expect(out.nested.password).toBe(REDACTED);
    expect(out.nested.ok).toBe(1);
    expect(out.self).toBe("[circular]");
  });

  test("detects sensitive field names across casing styles", () => {
    expect(isSensitiveFieldName("userPassword")).toBe(true);
    expect(isSensitiveFieldName("credit_card")).toBe(true);
    expect(isSensitiveFieldName("zip")).toBe(true);
    expect(isSensitiveFieldName("firstName")).toBe(false);
  });
});

describe("hostile input", () => {
  test("redactText stays fast on very large inputs", () => {
    for (const input of [
      "a".repeat(1_000_000),
      "a.".repeat(500_000),
      "1 ".repeat(500_000),
      "x@".repeat(200_000),
    ]) {
      const start = performance.now();
      redactText(input);
      expect(performance.now() - start).toBeLessThan(500);
    }
  });

  test("redactText still redacts at the start of long text and bounds its output", () => {
    const out = redactText(`jo@example.com ${"filler ".repeat(10_000)}`);
    expect(out.startsWith(REDACTED)).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20_000);
  });

  test("emails with long local parts or subdomains are still caught", () => {
    expect(redactText("write to first.last+tag@mail.sub.example.co.uk today")).toBe(
      `write to ${REDACTED} today`,
    );
  });

  test("sanitizeEventData ignores prototype-related keys and never replaces prototypes", () => {
    const evil = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}},"prototype":1,"ok":1}',
    );
    const out = sanitizeEventData(evil) as Record<string, unknown>;
    expect(Object.keys(out)).toEqual(["ok"]);
    expect(out.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
  });
});
