import { redactText } from "@useindeks/shared";
import type {
  IndeksDeadClickEvent,
  IndeksErrorClickEvent,
  IndeksRageClickEvent,
} from "@useindeks/shared";
import type { Collector, CollectorContext } from "../context";
import { INTERACTIVE_SELECTOR, getClassName, toElement } from "../dom";

const MAX_CLICK_ENTRIES = 50;
const MAX_SELECTOR_LENGTH = 200;
const MAX_PENDING_DEAD_CLICKS = 5;

export function getElementSelector(element: Element): string {
  return redactText(buildSelector(element)).slice(0, MAX_SELECTOR_LENGTH);
}

function buildSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  const tag = element.tagName.toLowerCase();
  const classes = getClassName(element).split(" ").filter(Boolean);
  const base = classes.length ? `${tag}.${classes.join(".")}` : tag;
  const siblings = Array.from(element.parentElement?.children || []);
  const index = siblings.indexOf(element);
  return index > 0 ? `${base}:nth-child(${index + 1})` : base;
}

function rageReason(element: HTMLElement): IndeksRageClickEvent["whyRage"] {
  if ((element as HTMLButtonElement).disabled || element.getAttribute("aria-disabled") === "true") {
    return "button_disabled";
  }
  if (
    element.matches(".loading, [data-loading], .spinner") ||
    element.querySelector(".loading, .spinner, [data-loading]")
  ) {
    return "loading";
  }
  return element.closest('[aria-invalid="true"]') ? "error" : "no_response";
}

function expectedBehavior(element: HTMLElement): IndeksDeadClickEvent["expectedBehavior"] {
  if (element.matches('a, [role="link"]')) return "navigate";
  if (element.matches('button[type="submit"], input[type="submit"], [data-action="submit"]')) {
    return "submit";
  }
  if (element.matches(".accordion, .collapse, [data-toggle], [aria-expanded]")) return "expand";
  if (element.matches('.close, [data-dismiss], [aria-label*="close"]')) return "close";
  return "other";
}

function categorizeError(message: string): IndeksErrorClickEvent["errorType"] {
  const text = message.toLowerCase();
  if (/validation|required|invalid/.test(text)) return "validation";
  if (/network|fetch|404|500/.test(text)) return "network";
  if (text.includes("timeout")) return "timeout";
  if (/undefined|null|typeerror/.test(text)) return "javascript";
  return "other";
}

function trackRage(
  ctx: CollectorContext,
  clicks: Map<string, { count: number; timestamp: number }>,
) {
  const { rageClickCount, rageClickWindowMs } = ctx.config.collectorOptions.frustration;
  ctx.on(document, "click", (e) => {
    const target = toElement(e.target) as HTMLElement | null;
    if (!target) return;
    const now = Date.now();
    const selector = getElementSelector(target);
    const existing = clicks.get(selector);
    if (existing && now - existing.timestamp < rageClickWindowMs) {
      existing.count++;
      if (existing.count >= rageClickCount) {
        ctx.emit<IndeksRageClickEvent>({
          type: "rage_click",
          element: selector,
          clicksInTimeframe: existing.count,
          timeframe: rageClickWindowMs / 1000,
          whyRage: rageReason(target),
          timeOnPage: now - ctx.page.startTime,
        });
        existing.count = 0;
      }
    } else {
      clicks.set(selector, { count: 1, timestamp: now });
    }
    if (clicks.size > MAX_CLICK_ENTRIES) {
      for (const [key, value] of clicks) {
        if (now - value.timestamp > 2 * rageClickWindowMs) clicks.delete(key);
      }
    }
  });
}

function trackDead(
  ctx: CollectorContext,
  clicks: Map<string, { count: number; timestamp: number }>,
) {
  let pending = 0;
  const { deadClickWindowMs, clickableSelector } = ctx.config.collectorOptions.frustration;
  ctx.on(
    document,
    "click",
    (e) => {
      const target = toElement(e.target) as HTMLElement | null;
      if (!target || target.closest(INTERACTIVE_SELECTOR) || pending >= MAX_PENDING_DEAD_CLICKS) {
        return;
      }
      const looksClickable =
        window.getComputedStyle(target).cursor === "pointer" ||
        target.closest(clickableSelector) !== null;
      if (!looksClickable) return;

      pending++;
      const startUrl = ctx.lifecycle.routeKey();
      let responded = false;
      const observer = ctx.hub.observe(
        new MutationObserver(() => {
          responded = true;
        }),
      );
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      ctx.later(() => {
        ctx.hub.release(observer);
        pending--;
        if (responded || ctx.lifecycle.routeKey() !== startUrl) return;
        if (document.visibilityState !== "visible") return;
        const selector = getElementSelector(target);
        ctx.emit<IndeksDeadClickEvent>({
          type: "dead_click",
          element: selector,
          expectedBehavior: expectedBehavior(target),
          actualBehavior: "none",
          previousClicksOnElement: clicks.get(selector)?.count ?? 0,
        });
      }, deadClickWindowMs);
    },
    true,
  );
}

function trackErrorClicks(ctx: CollectorContext) {
  ctx.on(document, "click", (e) => {
    const target = toElement(e.target) as HTMLElement | null;
    if (!target) return;
    const clickedAt = Date.now();
    ctx.later(() => {
      const error = ctx.state.lastError;
      if (!error || error.at < clickedAt || Date.now() - error.at >= 1000) return;
      ctx.state.lastError = null;
      ctx.emit<IndeksErrorClickEvent>({
        type: "error_click",
        element: getElementSelector(target),
        errorMessage: error.message,
        errorType: categorizeError(error.message),
        userContinued: ctx.lifecycle.lastActivityTime > Date.now() - 5000,
        timeToError: Date.now() - ctx.page.startTime,
      });
    }, 100);
  });
}

export const frustration: Collector = (ctx) => {
  const clicks = new Map<string, { count: number; timestamp: number }>();
  trackRage(ctx, clicks);
  trackDead(ctx, clicks);
  trackErrorClicks(ctx);
};
