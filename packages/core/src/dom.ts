import {
  REDACTED,
  filterElementAttributes,
  isSensitiveFieldName,
  redactText,
  scrubUrl,
} from "@indeks/shared";

export const MAX_TEXT_LENGTH = 100;
const MAX_SCANNED_TEXT_LENGTH = 2000;

const SENSITIVE_INPUT_TYPES = ["password", "hidden", "email", "tel", "number"];
const SENSITIVE_AUTOCOMPLETE = ["cc-", "password", "one-time-code"];
const MASK_SELECTOR = "[data-indeks-mask], [data-indeks-ignore]";

export const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, summary, details, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"], [onclick], [data-action], [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [ng-click], [data-bs-toggle], [data-toggle]';

export interface ElementRef {
  tagName: string;
  className: string;
  id: string;
}

export function toElement(target: EventTarget | null): Element | null {
  if (!target) return null;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

export function getClassName(element: Element): string {
  if (typeof element.className === "string") return element.className;
  return (element.className as unknown as SVGAnimatedString)?.baseVal || "";
}

export function describeElement(element: Element): ElementRef {
  return {
    tagName: element.tagName.toLowerCase(),
    className: getClassName(element),
    id: element.id || "",
  };
}

export function isSensitiveField(el: Element): boolean {
  const type = ((el as HTMLInputElement).type || "").toLowerCase();
  if (SENSITIVE_INPUT_TYPES.includes(type)) return true;
  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  if (SENSITIVE_AUTOCOMPLETE.some((token) => autocomplete.includes(token))) {
    return true;
  }
  const name = (el as HTMLInputElement).name || "";
  return isSensitiveFieldName(name) || (!!el.id && isSensitiveFieldName(el.id));
}

export function safeFieldName(name: string): string {
  return isSensitiveFieldName(name) ? REDACTED : name;
}

export function fieldLabel(el: Element): string {
  const input = el as HTMLInputElement;
  return safeFieldName(input.name || input.id || "");
}

export function valueIndicator(value: string): string {
  return value.length ? `[len:${value.length}]` : "[empty]";
}

export function categorizeKey(key: string): "printable" | "navigation" | "modifier" | "whitespace" {
  if (key === " " || key === "Tab" || key === "Enter") return "whitespace";
  if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(key)) {
    return "modifier";
  }
  return key.length === 1 ? "printable" : "navigation";
}

export function isMasked(element: Element): boolean {
  return element.closest(MASK_SELECTOR) !== null;
}

export function normalizeText(
  text: string | null | undefined,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (!text) return "";
  return redactText(
    text
      .slice(0, maxLength * 4)
      .replace(/\s+/g, " ")
      .trim(),
  ).substring(0, maxLength);
}

function ownText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .join(" ");
}

function boundedInnerText(element: Element): string {
  const textContent = element.textContent ?? "";
  if (textContent.length > MAX_SCANNED_TEXT_LENGTH) return ownText(element);
  return (element as HTMLElement).innerText || ownText(element);
}

export function readText(element: Element, captureText: boolean): string {
  if (!captureText || isMasked(element)) return "";
  const aria = element.getAttribute("aria-label");
  if (aria) return normalizeText(aria);
  return normalizeText(boundedInnerText(element));
}

export function selectionTouchesMasked(selection: Selection | null | undefined): boolean {
  if (!selection || !selection.rangeCount) return false;
  for (const mask of Array.from(document.querySelectorAll(MASK_SELECTOR))) {
    if (selection.containsNode(mask, true)) return true;
  }
  return false;
}

export function getElementInfo(element: Element, captureText = true) {
  if (isMasked(element)) {
    return { ...describeElement(element), textContent: "", attributes: {} };
  }
  const attributes: Record<string, string> = filterElementAttributes(
    Array.from(element.attributes).map((attr) => ({
      name: attr.name,
      value: attr.value,
    })),
    { includeText: captureText },
  );
  const text = captureText;

  const link = element.closest("a");
  if (link?.href) {
    attributes["__href"] = scrubUrl(link.href);
    if (text) attributes["__linkText"] = normalizeText(link.textContent);
  }

  const form = element.closest("form");
  if (form) {
    attributes["__formAction"] = scrubUrl(form.action);
    attributes["__formMethod"] = form.method || "";
    attributes["__formId"] = form.id || "";
  }

  const isButtonInput =
    element.tagName === "INPUT" &&
    ["button", "submit", "reset"].includes((element as HTMLInputElement).type);
  if (element.tagName === "BUTTON" || isButtonInput) {
    attributes["__buttonType"] = (element as HTMLButtonElement).type || "";
  }

  if (element.tagName === "IMG") {
    const img = element as HTMLImageElement;
    attributes["__imgSrc"] = scrubUrl(img.src);
    attributes["__imgAlt"] = text ? normalizeText(img.alt) : "";
  }

  const clickable = element.closest('button, a, [role="button"], [onclick]');
  if (clickable && clickable !== element) {
    attributes["__parentTagName"] = clickable.tagName.toLowerCase();
    attributes["__parentId"] = clickable.id || "";
    attributes["__parentClassName"] = getClassName(clickable);
  }

  const ariaLabel =
    element.getAttribute("aria-label") ||
    element.closest("[aria-label]")?.getAttribute("aria-label");
  if (ariaLabel && text) attributes["__ariaLabel"] = normalizeText(ariaLabel);

  const testId =
    element.getAttribute("data-testid") ||
    element.getAttribute("data-cy") ||
    element.getAttribute("data-test");
  if (testId) attributes["__testId"] = testId;

  const textContent = readText(element, captureText);

  if (text && textContent.length < 3) {
    const parent = element.closest(
      "p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, div, button, a",
    );
    if (parent && parent !== element && !isMasked(parent)) {
      const parentText = normalizeText(boundedInnerText(parent));
      if (parentText) attributes["__parentText"] = parentText;
    }
  }

  return { ...describeElement(element), textContent, attributes };
}

export interface ScrollMetrics {
  scrollTop: number;
  scrollLeft: number;
  documentHeight: number;
  viewportHeight: number;
  percentage: number;
}

export function getScrollMetrics(): ScrollMetrics {
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.pageYOffset || doc.scrollTop || 0;
  const scrollLeft = window.pageXOffset || doc.scrollLeft || 0;
  const documentHeight = Math.max(
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    doc.clientHeight,
    doc.scrollHeight,
    doc.offsetHeight,
  );
  const viewportHeight = window.innerHeight;
  const scrollable = documentHeight - viewportHeight;
  const percentage =
    scrollable > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / scrollable) * 100))) : 0;
  return { scrollTop, scrollLeft, documentHeight, viewportHeight, percentage };
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function stripWww(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

const SECOND_LEVEL_LABELS = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

export function registrableDomain(hostname: string): string {
  const labels = stripWww(hostname).split(".");
  if (labels.length <= 2 || /^[\d.]+$/.test(hostname) || hostname.includes(":")) {
    return labels.join(".");
  }
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  const keep = tld.length === 2 && SECOND_LEVEL_LABELS.has(second) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

export function isSameSite(hostA: string, hostB: string): boolean {
  return registrableDomain(hostA) === registrableDomain(hostB);
}

export function storageGet(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(
  storage: "localStorage" | "sessionStorage",
  key: string,
  value: string,
): void {
  try {
    window[storage].setItem(key, value);
  } catch {
    return;
  }
}

export interface NetworkInformationLike extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export function getConnection(): NetworkInformationLike | null {
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}
