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

describe("review findings: URL scrubbing", () => {
  test("non-http schemes never expose their payload", () => {
    for (const url of [
      "mailto:john@x.com?subject=secret",
      "tel:+15551234567",
      "javascript:login('u','p4ss')",
      "data:text/csv,ssn,123-45-6789",
      "blob:https://a.com/1234",
    ]) {
      const out = scrubUrl(url);
      expect(out.endsWith(REDACTED)).toBe(true);
      expect(out).not.toMatch(/john|5551234567|p4ss|123-45|secret/);
    }
  });

  test("emails and token-like segments in the path are redacted", () => {
    const out = scrubUrl(
      "https://a.com/reset/AbC123dEf456GhI789jKl012MnO345pQ/john%40x.com/profile",
    );
    expect(out).toContain("/reset/");
    expect(out).toContain("/profile");
    expect(out).not.toContain("AbC123");
    expect(out).not.toContain("john");
  });

  test("ordinary paths and slugs are untouched", () => {
    expect(scrubUrl("https://a.com/blog/how-to-write-a-very-long-descriptive-article-title")).toBe(
      "https://a.com/blog/how-to-write-a-very-long-descriptive-article-title",
    );
    expect(scrubUrl("https://a.com/products/123")).toBe("https://a.com/products/123");
  });

  test("search terms, session ids and email-valued parameters are redacted", () => {
    const url = new URL(
      scrubUrl(
        "https://a.com/p?q=my+secret+search&session_id=abc&auth_key=zzz&sessionid=1&jwt=eyJ&u=a@b.com&ticket=T&page=2",
      ),
    );
    for (const key of ["q", "session_id", "auth_key", "sessionid", "jwt", "u", "ticket"]) {
      expect(url.searchParams.get(key)).toBe(REDACTED);
    }
    expect(url.searchParams.get("page")).toBe("2");
  });
});

describe("review findings: field names", () => {
  test("common sensitive names are detected", () => {
    for (const name of [
      "ccnumber",
      "cardNo",
      "card_no",
      "securitycode",
      "security_code",
      "expDate",
      "sessionid",
      "session_id",
      "authKey",
      "jwt",
      "credential",
      "birthday",
      "pass",
      "passcode",
      "taxNumber",
      "mobile",
      "address",
      "fullName",
      "username",
      "mail",
    ]) {
      expect([name, isSensitiveFieldName(name)]).toEqual([name, true]);
    }
  });

  test("ordinary names are not flagged", () => {
    for (const name of ["city", "plan", "quantity", "color", "title", "compass", "bypass"]) {
      expect([name, isSensitiveFieldName(name)]).toEqual([name, false]);
    }
  });
});

describe("review findings: serialization safety", () => {
  test("values JSON cannot represent never reach the serializer", () => {
    const data = {
      big: 10n,
      fn: () => 1,
      sym: Symbol("x"),
      when: new Date("2024-01-02T03:04:05Z"),
      bad: new Date("nope"),
      error: new Error("failed for jo@example.com"),
      list: [1n, undefined, "a@b.com"],
      note: "mail jo@example.com",
    };
    const out = sanitizeEventData(data);
    expect(() => JSON.stringify(out)).not.toThrow();
    expect(out.big).toBe("10");
    expect("fn" in out).toBe(false);
    expect(out.when).toBe("2024-01-02T03:04:05.000Z");
    expect(out.bad).toBeNull();
    expect(JSON.stringify(out)).not.toContain("jo@example.com");
    expect(JSON.stringify(out)).not.toContain("a@b.com");
    expect(out.list).toEqual(["1", null, REDACTED]);
  });

  test("throwing getters and huge arrays are contained", () => {
    const hostile = {
      get boom() {
        throw new Error("nope");
      },
    };
    expect(() => sanitizeEventData({ hostile })).not.toThrow();
    const out = sanitizeEventData({ items: Array.from({ length: 1000 }, (_, i) => i) });
    expect((out.items as unknown[]).length).toBe(100);
  });

  test("long strings are bounded", () => {
    expect((sanitizeEventData({ text: "x".repeat(100_000) }).text as string).length).toBe(4000);
  });
});

describe("review findings: element attributes", () => {
  const attrs = [
    { name: "aria-label", value: "Pay for john's order" },
    { name: "title", value: "Account 1234 of Jane" },
    { name: "alt", value: "Photo of Jane" },
    { name: "id", value: "pay" },
    { name: "data-testid", value: "pay-button" },
  ];

  test("text-bearing attributes are dropped when text capture is off", () => {
    const out = filterElementAttributes(attrs, { includeText: false });
    expect(Object.keys(out).sort()).toEqual(["data-testid", "id"]);
  });

  test("they are kept by default", () => {
    expect(Object.keys(filterElementAttributes(attrs))).toContain("aria-label");
  });
});
