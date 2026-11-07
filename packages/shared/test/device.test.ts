import { describe, expect, test } from "bun:test";
import { getDeviceInfo } from "../src";

function withUserAgent<T>(ua: string, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  try {
    return run();
  } finally {
    delete (navigator as unknown as Record<string, unknown>).userAgent;
    if (original) Object.defineProperty(Navigator.prototype, "userAgent", original);
  }
}

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";
const WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const PINTEREST_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [Pinterest/iOS]";

describe("getDeviceInfo user agent parsing", () => {
  test("detects iOS and iPadOS instead of macOS", () => {
    const iphone = withUserAgent(IPHONE, getDeviceInfo);
    expect(iphone.osName).toBe("iOS");
    expect(iphone.osVersion).toBe("17.2");
    expect(iphone.deviceType).toBe("mobile");
    expect(iphone.deviceVendor).toBe("Apple");

    const ipad = withUserAgent(IPAD, getDeviceInfo);
    expect(ipad.osName).toBe("iPadOS");
    expect(ipad.deviceType).toBe("tablet");
  });

  test("detects macOS, Windows and Android", () => {
    expect(withUserAgent(MAC, getDeviceInfo).osName).toBe("macOS");
    const win = withUserAgent(WIN, getDeviceInfo);
    expect(win.osName).toBe("Windows");
    expect(win.browserName).toBe("Chrome");
    const android = withUserAgent(ANDROID, getDeviceInfo);
    expect(android.osName).toBe("Android");
    expect(android.deviceVendor).toBe("Samsung");
    expect(android.deviceModel).toBe("SM-G991B");
  });

  test("flags crawlers as bots but not in-app browsers", () => {
    expect(withUserAgent(GOOGLEBOT, getDeviceInfo).isBot).toBe(true);
    expect(withUserAgent(PINTEREST_APP, getDeviceInfo).isBot).toBe(false);
    expect(withUserAgent(WIN, getDeviceInfo).isBot).toBe(false);
  });
});

describe("device info without deprecated APIs", () => {
  test("has no vendor field and takes the platform from the user agent when client hints are missing", () => {
    const info = withUserAgent(WIN, getDeviceInfo) as unknown as Record<string, unknown>;
    expect("vendor" in info).toBe(false);
    expect(info.platform).toBe("Windows");
  });

  test("prefers User-Agent Client Hints for the platform", () => {
    Object.defineProperty(navigator, "userAgentData", {
      value: { platform: "Chrome OS" },
      configurable: true,
    });
    try {
      expect(withUserAgent(WIN, getDeviceInfo).platform).toBe("Chrome OS");
    } finally {
      delete (navigator as unknown as Record<string, unknown>).userAgentData;
    }
  });

  test("only the standard connection API is read", () => {
    Object.defineProperty(navigator, "mozConnection", {
      value: { effectiveType: "2g" },
      configurable: true,
    });
    try {
      expect(withUserAgent(WIN, getDeviceInfo).connectionEffectiveType).toBeNull();
    } finally {
      delete (navigator as unknown as Record<string, unknown>).mozConnection;
    }
  });
});
