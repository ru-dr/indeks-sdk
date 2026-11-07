import type { DeviceData } from "../types/events";

interface UAParseResult {
  browserName: string;
  browserVersion: string;
  browserEngine: string;
  browserEngineVersion: string;
  osName: string;
  osVersion: string;
  deviceType: "mobile" | "tablet" | "desktop";
  deviceVendor: string;
  deviceModel: string;
  isBot: boolean;
}

function parseUserAgent(ua: string): UAParseResult {
  const result: UAParseResult = {
    browserName: "Unknown",
    browserVersion: "",
    browserEngine: "Unknown",
    browserEngineVersion: "",
    osName: "Unknown",
    osVersion: "",
    deviceType: "desktop",
    deviceVendor: "",
    deviceModel: "",
    isBot: false,
  };

  if (!ua) return result;

  const uaLower = ua.toLowerCase();

  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "headless",
    "phantom",
    "selenium",
    "puppeteer",
    "playwright",
    "googlebot",
    "bingbot",
    "yandexbot",
    "duckduckbot",
    "slurp",
    "baiduspider",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "discordbot",
    "telegrambot",
    "whatsapp",
    "applebot",
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "dotbot",
    "petalbot",
    "bytespider",
  ];

  result.isBot = botPatterns.some((pattern) => uaLower.includes(pattern));

  const browsers: [RegExp, string][] = [
    [/edg(?:e|a|ios)?\/(\d+[\d.]*)/i, "Edge"],
    [/opr\/(\d+[\d.]*)/i, "Opera"],
    [/opera.*version\/(\d+[\d.]*)/i, "Opera"],
    [/samsungbrowser\/(\d+[\d.]*)/i, "Samsung Browser"],
    [/ucbrowser\/(\d+[\d.]*)/i, "UC Browser"],
    [/brave\/(\d+[\d.]*)/i, "Brave"],
    [/vivaldi\/(\d+[\d.]*)/i, "Vivaldi"],
    [/yabrowser\/(\d+[\d.]*)/i, "Yandex"],
    [/firefox\/(\d+[\d.]*)/i, "Firefox"],
    [/fxios\/(\d+[\d.]*)/i, "Firefox"],
    [/crios\/(\d+[\d.]*)/i, "Chrome"],
    [/chrome\/(\d+[\d.]*)/i, "Chrome"],
    [/chromium\/(\d+[\d.]*)/i, "Chromium"],
    [/version\/(\d+[\d.]*).*safari/i, "Safari"],
    [/safari\/(\d+[\d.]*)/i, "Safari"],
    [/msie\s(\d+[\d.]*)/i, "Internet Explorer"],
    [/trident.*rv:(\d+[\d.]*)/i, "Internet Explorer"],
  ];

  for (const [regex, name] of browsers) {
    const match = ua.match(regex);
    if (match) {
      result.browserName = name;
      result.browserVersion = match[1] || "";
      break;
    }
  }

  if (ua.includes("AppleWebKit")) {
    result.browserEngine = "WebKit";
    const match = ua.match(/applewebkit\/(\d+[\d.]*)/i);
    result.browserEngineVersion = match?.[1] || "";

    if (ua.includes("Chrome") && !ua.includes("Edge")) {
      result.browserEngine = "Blink";
    }
  } else if (ua.includes("Gecko")) {
    result.browserEngine = "Gecko";
    const match = ua.match(/gecko\/(\d+[\d.]*)/i);
    result.browserEngineVersion = match?.[1] || "";
  } else if (ua.includes("Trident")) {
    result.browserEngine = "Trident";
    const match = ua.match(/trident\/(\d+[\d.]*)/i);
    result.browserEngineVersion = match?.[1] || "";
  } else if (ua.includes("Presto")) {
    result.browserEngine = "Presto";
    const match = ua.match(/presto\/(\d+[\d.]*)/i);
    result.browserEngineVersion = match?.[1] || "";
  }

  const osPatterns: [RegExp, string, number?][] = [
    [/windows phone (\d+[\d.]*)/i, "Windows Phone"],
    [/windows nt 10\.0/i, "Windows", 10],
    [/windows nt 6\.3/i, "Windows", 8.1],
    [/windows nt 6\.2/i, "Windows", 8],
    [/windows nt 6\.1/i, "Windows", 7],
    [/windows nt 6\.0/i, "Windows", 6],
    [/windows nt 5\.1/i, "Windows", 5.1],
    [/iphone os (\d+[._\d]*)/i, "iOS"],
    [/ipad.*os (\d+[._\d]*)/i, "iPadOS"],
    [/mac os x (\d+[._\d]*)/i, "macOS"],
    [/android (\d+[\d.]*)/i, "Android"],
    [/cros/i, "Chrome OS"],
    [/linux/i, "Linux"],
    [/ubuntu/i, "Ubuntu"],
    [/fedora/i, "Fedora"],
    [/debian/i, "Debian"],
    [/freebsd/i, "FreeBSD"],
  ];

  for (const [regex, name, version] of osPatterns) {
    const match = ua.match(regex);
    if (match) {
      result.osName = name;
      if (version !== undefined) {
        result.osVersion = String(version);
      } else if (match[1]) {
        result.osVersion = match[1].replace(/_/g, ".");
      }
      break;
    }
  }

  const mobilePatterns = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile|phone/i;
  const tabletPatterns = /ipad|tablet|playbook|silk|kindle|android(?!.*mobile)/i;

  if (tabletPatterns.test(ua)) {
    result.deviceType = "tablet";
  } else if (mobilePatterns.test(ua)) {
    result.deviceType = "mobile";
  } else {
    result.deviceType = "desktop";
  }

  const vendorPatterns: [RegExp, string, string?][] = [
    [/iphone/i, "Apple", "iPhone"],
    [/ipad/i, "Apple", "iPad"],
    [/ipod/i, "Apple", "iPod"],
    [/macintosh/i, "Apple", "Mac"],
    [/samsung[- ]?(gt|sm|sgh|sch|sph)-?([a-z0-9]+)/i, "Samsung"],
    [/samsung/i, "Samsung"],
    [/\b(sm-[a-z0-9]+)/i, "Samsung"],
    [/\bhuawei[- ]?([a-z0-9]+)/i, "Huawei"],
    [/\bxiaomi[- ]?([a-z0-9]+)/i, "Xiaomi"],
    [/\bredmi[- ]?([a-z0-9]+)/i, "Xiaomi", "Redmi"],
    [/\boppo[- ]?([a-z0-9]+)/i, "OPPO"],
    [/\bvivo[- ]?([a-z0-9]+)/i, "Vivo"],
    [/\boneplus[- ]?([a-z0-9]+)/i, "OnePlus"],
    [/\bpixel[- ]?(\d+)/i, "Google", "Pixel"],
    [/\bnexus[- ]?([a-z0-9]+)/i, "Google", "Nexus"],
    [/\b(?:motorola|moto)[- ]?([a-z0-9]+)/i, "Motorola"],
    [/\blg[- ]?([a-z0-9]+)/i, "LG"],
    [/\bsony[- ]?([a-z0-9]+)/i, "Sony"],
    [/\bhtc[- ]?([a-z0-9]+)/i, "HTC"],
    [/\bnokia[- ]?([a-z0-9]+)/i, "Nokia"],
    [/surface/i, "Microsoft", "Surface"],
    [/xbox/i, "Microsoft", "Xbox"],
    [/playstation/i, "Sony", "PlayStation"],
    [/kindle/i, "Amazon", "Kindle"],
  ];

  for (const [regex, vendor, model] of vendorPatterns) {
    const match = ua.match(regex);
    if (match) {
      result.deviceVendor = vendor;
      if (model) {
        result.deviceModel = model;
      } else if (match[1]) {
        result.deviceModel = match[1].toUpperCase();
      }
      break;
    }
  }

  return result;
}

interface ConnectionInfo {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface NavigatorExtras {
  deviceMemory?: number;
  connection?: ConnectionInfo;
  userAgentData?: { platform?: string };
}

export function getDeviceInfo(): DeviceData {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("getDeviceInfo must be called in browser environment");
  }

  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);

  const extras = navigator as Navigator & NavigatorExtras;
  const connection = extras.connection ?? null;

  let timezone: string;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = "Unknown";
  }

  let languages: string[];
  try {
    languages = Array.from(navigator.languages || [navigator.language]);
  } catch {
    languages = [navigator.language || "en"];
  }

  return {
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    browserEngine: parsed.browserEngine,
    browserEngineVersion: parsed.browserEngineVersion,

    osName: parsed.osName,
    osVersion: parsed.osVersion,

    deviceType: parsed.deviceType,
    deviceVendor: parsed.deviceVendor,
    deviceModel: parsed.deviceModel,

    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    screenColorDepth: window.screen?.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,

    timezone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language || "en",
    languages,

    deviceMemory: extras.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,

    connectionType: connection?.type || null,
    connectionEffectiveType: connection?.effectiveType || null,
    connectionDownlink: connection?.downlink || null,
    connectionRtt: connection?.rtt || null,

    platform: extras.userAgentData?.platform || parsed.osName,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === "1",
    online: navigator.onLine,

    isBot: parsed.isBot,
  };
}
