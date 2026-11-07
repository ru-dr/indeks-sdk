import { STORAGE_KEYS, pathAndSearch, scrubUrl } from "@indeks/shared";
import type { IndeksSessionEndEvent, IndeksSessionStartEvent } from "@indeks/shared";
import type { Collector, CollectorContext, SessionEndTrigger } from "../context";
import { isSameSite, normalizeText, safeHostname, storageGet, storageSet } from "../dom";

type TrafficSource = IndeksSessionStartEvent["trafficSource"];

const SEARCH_ENGINES = [
  "google.",
  "bing.",
  "yahoo.",
  "duckduckgo.",
  "baidu.",
  "yandex.",
  "ecosia.",
];
const SOCIAL_HOSTS = [
  "facebook.",
  "twitter.",
  "t.co",
  "x.com",
  "linkedin.",
  "instagram.",
  "reddit.",
  "pinterest.",
  "tiktok.",
];
const SOCIAL_SOURCES = [
  "facebook",
  "twitter",
  "linkedin",
  "instagram",
  "reddit",
  "pinterest",
  "tiktok",
  "youtube",
];
const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paidsearch", "display", "retargeting"];

function includesAny(value: string, list: readonly string[]): boolean {
  return list.some((entry) => value.includes(entry));
}

export function determineTrafficSource(params: URLSearchParams): TrafficSource {
  const source = params.get("utm_source")?.toLowerCase();
  const medium = params.get("utm_medium")?.toLowerCase();
  const referrerHost = safeHostname(document.referrer).toLowerCase();

  if (medium && PAID_MEDIUMS.includes(medium)) return "paid";
  if (medium === "email" || source?.includes("email") || source?.includes("newsletter")) {
    return "email";
  }
  if (medium === "social" || (source && includesAny(source, SOCIAL_SOURCES))) return "social";
  if (medium === "organic") return "organic";
  if (source) return "other";

  if (!referrerHost || isSameSite(referrerHost, window.location.hostname)) return "direct";
  if (includesAny(referrerHost, SEARCH_ENGINES)) return "organic";
  if (includesAny(referrerHost, SOCIAL_HOSTS)) return "social";
  return "referral";
}

function emitSessionStart(ctx: CollectorContext): void {
  const lastVisit = storageGet("localStorage", STORAGE_KEYS.LAST_VISIT);
  const lastVisitTime = lastVisit ? parseInt(lastVisit, 10) : NaN;
  const returning = !Number.isNaN(lastVisitTime);
  const params = new URLSearchParams(window.location.search);
  ctx.emit<IndeksSessionStartEvent>({
    type: "session_start",
    device: ctx.device,
    referrer: scrubUrl(document.referrer),
    referrerDomain: safeHostname(document.referrer),
    utmSource: normalizeText(params.get("utm_source"), 100) || undefined,
    utmMedium: normalizeText(params.get("utm_medium"), 100) || undefined,
    utmCampaign: normalizeText(params.get("utm_campaign"), 100) || undefined,
    trafficSource: determineTrafficSource(params),
    landingPage: pathAndSearch(window.location.href),
    isMobile: ctx.device.deviceType === "mobile",
    isTablet: ctx.device.deviceType === "tablet",
    isDesktop: ctx.device.deviceType === "desktop",
    isNewUser: !returning,
    isReturningUser: returning,
    daysSinceLastVisit: returning
      ? Math.floor((Date.now() - lastVisitTime) / 86_400_000)
      : undefined,
  });
  storageSet("localStorage", STORAGE_KEYS.LAST_VISIT, Date.now().toString());
}

function emitSessionEnd(ctx: CollectorContext, trigger: SessionEndTrigger): void {
  const data = ctx.session.data;
  const sessionDuration = Date.now() - data.startedAt;
  const activeTime = Math.min(data.activeMs, sessionDuration);
  ctx.emit<IndeksSessionEndEvent>({
    type: "session_end",
    sessionDuration,
    activeTime,
    idleTime: sessionDuration - activeTime,
    pagesViewed: data.pageViews,
    totalClicks: data.clicks,
    totalScrolls: data.scrolls,
    exitPage: pathAndSearch(window.location.href),
    exitType: trigger === "timeout" ? "timeout" : trigger === "hidden" ? "tab_close" : "navigation",
    converted: data.converted,
    bounce: data.pageViews <= 1,
  });
}

export const session: Collector = (ctx) => {
  ctx.sessionHooks.start = () => emitSessionStart(ctx);
  ctx.sessionHooks.end = (trigger) => emitSessionEnd(ctx, trigger);
  if (ctx.session.consumeNew()) emitSessionStart(ctx);
  ctx.lifecycle.onExit((trigger) => emitSessionEnd(ctx, trigger));
};
