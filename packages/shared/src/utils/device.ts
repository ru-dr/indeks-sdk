/**
 * Device and Browser Information Utility
 * Extracts comprehensive device, browser, and environment data
 */

export interface DeviceInfo {
  // Browser
  browserName: string;
  browserVersion: string;
  browserEngine: string;
  browserEngineVersion: string;

  // OS
  osName: string;
  osVersion: string;

  // Device
  deviceType: "mobile" | "tablet" | "desktop";
  deviceVendor: string;
  deviceModel: string;

  // Screen
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;

  // Locale & Time
  timezone: string;
  timezoneOffset: number;
  language: string;
  languages: string[];

  // Hardware
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number;
  touchSupport: boolean;

  // Connection
  connectionType: string | null;
  connectionEffectiveType: string | null;
  connectionDownlink: number | null;
  connectionRtt: number | null;

  // Platform
  platform: string;
  vendor: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  online: boolean;

  // Bot detection
  isBot: boolean;
}

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

/**
 * Parse user agent string to extract browser, OS, and device info
 */
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

  // Bot detection
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
    "embedly",
    "quora",
    "pinterest",
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

  // Browser detection (order matters - more specific first)
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

  // Browser engine detection
  if (ua.includes("AppleWebKit")) {
    result.browserEngine = "WebKit";
    const match = ua.match(/applewebkit\/(\d+[\d.]*)/i);
    result.browserEngineVersion = match?.[1] || "";

    // Blink is WebKit fork used by Chrome/Edge/Opera
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

  // OS detection
  const osPatterns: [RegExp, string, number?][] = [
    [/windows nt 10\.0/i, "Windows", 10],
    [/windows nt 11\.0/i, "Windows", 11],
    [/windows nt 6\.3/i, "Windows", 8.1],
    [/windows nt 6\.2/i, "Windows", 8],
    [/windows nt 6\.1/i, "Windows", 7],
    [/windows nt 6\.0/i, "Windows", undefined],
    [/windows nt 5\.1/i, "Windows", undefined],
    [/windows phone (\d+[\d.]*)/i, "Windows Phone"],
    [/mac os x (\d+[._\d]*)/i, "macOS"],
    [/iphone os (\d+[._\d]*)/i, "iOS"],
    [/ipad.*os (\d+[._\d]*)/i, "iPadOS"],
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

  // Device type detection
  const mobilePatterns =
    /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile|phone/i;
  const tabletPatterns = /ipad|tablet|playbook|silk|kindle|android(?!.*mobile)/i;

  if (tabletPatterns.test(ua)) {
    result.deviceType = "tablet";
  } else if (mobilePatterns.test(ua)) {
    result.deviceType = "mobile";
  } else {
    result.deviceType = "desktop";
  }

  // Device vendor and model detection
  const vendorPatterns: [RegExp, string, string?][] = [
    [/iphone/i, "Apple", "iPhone"],
    [/ipad/i, "Apple", "iPad"],
    [/ipod/i, "Apple", "iPod"],
    [/macintosh/i, "Apple", "Mac"],
    [/samsung[- ]?(gt|sm|sgh|sch|sph)-?([a-z0-9]+)/i, "Samsung"],
    [/samsung/i, "Samsung"],
    [/huawei[- ]?([a-z0-9]+)/i, "Huawei"],
    [/xiaomi[- ]?([a-z0-9]+)/i, "Xiaomi"],
    [/redmi[- ]?([a-z0-9]+)/i, "Xiaomi", "Redmi"],
    [/oppo[- ]?([a-z0-9]+)/i, "OPPO"],
    [/vivo[- ]?([a-z0-9]+)/i, "Vivo"],
    [/oneplus[- ]?([a-z0-9]+)/i, "OnePlus"],
    [/pixel[- ]?(\d+)/i, "Google", "Pixel"],
    [/nexus[- ]?([a-z0-9]+)/i, "Google", "Nexus"],
    [/motorola|moto[- ]?([a-z0-9]+)/i, "Motorola"],
    [/lg[- ]?([a-z0-9]+)/i, "LG"],
    [/sony[- ]?([a-z0-9]+)/i, "Sony"],
    [/htc[- ]?([a-z0-9]+)/i, "HTC"],
    [/nokia[- ]?([a-z0-9]+)/i, "Nokia"],
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

/**
 * Get comprehensive device information
 * Call this in browser environment only
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("getDeviceInfo must be called in browser environment");
  }

  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);

  // Get connection info if available
  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection || null;

  // Get timezone
  let timezone = "Unknown";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Fallback if Intl is not available
  }

  // Get languages
  let languages: string[] = [];
  try {
    languages = Array.from(navigator.languages || [navigator.language]);
  } catch {
    languages = [navigator.language || "en"];
  }

  return {
    // Browser
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    browserEngine: parsed.browserEngine,
    browserEngineVersion: parsed.browserEngineVersion,

    // OS
    osName: parsed.osName,
    osVersion: parsed.osVersion,

    // Device
    deviceType: parsed.deviceType,
    deviceVendor: parsed.deviceVendor,
    deviceModel: parsed.deviceModel,

    // Screen
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    screenColorDepth: window.screen?.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,

    // Locale & Time
    timezone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language || "en",
    languages,

    // Hardware
    deviceMemory: (navigator as any).deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    touchSupport:
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0,

    // Connection
    connectionType: connection?.type || null,
    connectionEffectiveType: connection?.effectiveType || null,
    connectionDownlink: connection?.downlink || null,
    connectionRtt: connection?.rtt || null,

    // Platform
    platform: navigator.platform || "",
    vendor: navigator.vendor || "",
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack:
      navigator.doNotTrack === "1" ||
      (window as any).doNotTrack === "1",
    online: navigator.onLine,

    // Bot detection
    isBot: parsed.isBot,
  };
}

/**
 * Get a simplified device info object for inclusion in events
 * This is a lighter version for frequent event tracking
 */
export function getDeviceInfoLight(): Pick<
  DeviceInfo,
  | "browserName"
  | "browserVersion"
  | "osName"
  | "osVersion"
  | "deviceType"
  | "screenWidth"
  | "screenHeight"
  | "timezone"
  | "language"
> {
  const full = getDeviceInfo();
  return {
    browserName: full.browserName,
    browserVersion: full.browserVersion,
    osName: full.osName,
    osVersion: full.osVersion,
    deviceType: full.deviceType,
    screenWidth: full.screenWidth,
    screenHeight: full.screenHeight,
    timezone: full.timezone,
    language: full.language,
  };
}
