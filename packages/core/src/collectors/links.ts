import { scrubUrl } from "@indeks/shared";
import type {
  IndeksFileDownloadEvent,
  IndeksOutboundLinkEvent,
  IndeksPrintEvent,
  IndeksShareEvent,
} from "@indeks/shared";
import type { Collector, CollectorContext } from "../context";
import { getClassName, isMasked, isSameSite, normalizeText, toElement } from "../dom";

const FILE_EXTENSION_PATTERN = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|exe|dmg|pkg)$/i;
const FILE_TYPES: Record<string, string> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
  ppt: "powerpoint",
  pptx: "powerpoint",
  zip: "archive",
  rar: "archive",
  exe: "executable",
  dmg: "disk_image",
  pkg: "installer",
};
const SHARE_SELECTOR =
  '[data-share], .share-button, .social-share, [href*="facebook.com/sharer"], [href*="twitter.com/share"], [href*="x.com/intent"], [href*="linkedin.com/sharing"], [href*="wa.me"], [href*="whatsapp.com"]';
const BUTTON_LIKE_SELECTOR = 'button, a, [role="button"]';
const PRINT_HINT_WINDOW_MS = 1000;

export const download: Collector = (ctx) => {
  ctx.on(document, "click", (e) => {
    const link = toElement(e.target)?.closest("a");
    if (!link?.href) return;
    let pathname: string;
    try {
      pathname = new URL(link.href).pathname;
    } catch {
      return;
    }
    const isDownload =
      link.hasAttribute("download") ||
      FILE_EXTENSION_PATTERN.test(pathname) ||
      pathname.includes("/download");
    if (!isDownload) return;

    let fileName = link.download || pathname.split("/").pop() || "unknown";
    try {
      fileName = decodeURIComponent(fileName);
    } catch {
      fileName = link.download || "unknown";
    }
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const source: IndeksFileDownloadEvent["downloadSource"] = link.closest("button")
      ? "button"
      : link.hasAttribute("download")
        ? "link"
        : link.href.startsWith("blob:") || link.href.startsWith("data:")
          ? "programmatic"
          : "auto";
    ctx.emit<IndeksFileDownloadEvent>({
      type: "file_download",
      fileName: normalizeText(fileName, 200),
      fileType: FILE_TYPES[extension] || "other",
      fileSize: 0,
      downloadSource: source,
      downloadUrl: scrubUrl(link.href),
      timeOnPageBeforeDownload: Date.now() - ctx.page.startTime,
    });
  });
};

export const outboundLink: Collector = (ctx) => {
  ctx.on(
    document,
    "click",
    (e) => {
      const link = toElement(e.target)?.closest("a");
      if (!link?.href) return;
      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;
      if (isSameSite(url.hostname, window.location.hostname)) return;
      ctx.emit<IndeksOutboundLinkEvent>({
        type: "outbound_link",
        targetUrl: scrubUrl(link.href),
        domain: url.hostname,
        linkText: ctx.captureText() && !isMasked(link) ? normalizeText(link.textContent) : "",
        openInNewTab: link.target === "_blank",
      });
    },
    true,
  );
};

export const print: Collector = (ctx) => {
  const hint = (trigger: "button" | "keyboard") => {
    ctx.state.printHint = { trigger, at: Date.now() };
  };
  ctx.on(
    document,
    "click",
    (e) => {
      const control = toElement(e.target)?.closest(
        `${BUTTON_LIKE_SELECTOR}, [data-action="print"]`,
      );
      if (
        control?.matches('[data-action="print"], [onclick*="print"]') ||
        (control && /^print\b/i.test(control.textContent?.trim() || ""))
      ) {
        hint("button");
      }
    },
    true,
  );
  ctx.on(document, "keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") hint("keyboard");
  });
  ctx.on(window, "beforeprint", () => {
    const active = ctx.state.printHint;
    const recent = active && Date.now() - active.at < PRINT_HINT_WINDOW_MS;
    ctx.state.printHint = null;
    ctx.emit<IndeksPrintEvent>({
      type: "print",
      pagePrinted: window.location.pathname,
      timeOnPageBeforePrint: Date.now() - ctx.page.startTime,
      printTrigger: recent ? active.trigger : "menu",
    });
  });
};

function shareLocation(): IndeksShareEvent["shareLocation"] {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/product") || path.includes("/item")) return "product_page";
  if (/\/(article|blog|post)/.test(path)) return "article";
  if (path.includes("/cart") || path.includes("/basket")) return "cart";
  return path.includes("/checkout") ? "checkout" : "other";
}

function shareMethod(element: HTMLElement): IndeksShareEvent["shareMethod"] {
  const haystack = [
    (element as HTMLAnchorElement).href || "",
    getClassName(element),
    element.textContent || "",
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.includes("facebook")) return "facebook";
  if (haystack.includes("twitter") || haystack.includes("x.com/intent")) return "twitter";
  if (haystack.includes("linkedin")) return "linkedin";
  if (haystack.includes("whatsapp") || haystack.includes("wa.me")) return "whatsapp";
  if (haystack.includes("mailto:") || haystack.includes("email")) return "email";
  return haystack.includes("copy") ? "copy_link" : "other";
}

function emitShare(ctx: CollectorContext, element: HTMLElement): void {
  const dataUrl = element.getAttribute("data-url") || element.getAttribute("data-share-url");
  const productId = element.getAttribute("data-product-id") || element.getAttribute("data-product");
  const href = (element as HTMLAnchorElement).href;
  const text = element.getAttribute("data-text") || element.getAttribute("data-share-text");
  const shareUrl = dataUrl || href;
  ctx.emit<IndeksShareEvent>({
    type: "share",
    shareMethod: shareMethod(element),
    contentShared: dataUrl ? scrubUrl(dataUrl) : productId || scrubUrl(window.location.href),
    shareLocation: shareLocation(),
    shareText: text ? normalizeText(text) : undefined,
    shareUrl: shareUrl ? scrubUrl(shareUrl) : undefined,
  });
}

const SHARE_WRAPPED = Symbol.for("indeks.share.wrapped");

function wrapNativeShare(ctx: CollectorContext): void {
  const original = navigator.share;
  if (
    typeof original !== "function" ||
    (original as unknown as Record<symbol, unknown>)[SHARE_WRAPPED]
  ) {
    return;
  }
  const wrapped = (data?: ShareData) =>
    original.call(navigator, data).then(() => {
      ctx.emit<IndeksShareEvent>({
        type: "share",
        shareMethod: "native_share",
        contentShared: scrubUrl(data?.url || window.location.href),
        shareLocation: shareLocation(),
        shareText: data?.text ? normalizeText(data.text) : undefined,
        shareUrl: data?.url ? scrubUrl(data.url) : undefined,
      });
    });
  Object.defineProperty(wrapped, SHARE_WRAPPED, { value: true });
  navigator.share = wrapped;
  ctx.hub.observe({
    disconnect: () => {
      if (navigator.share === wrapped) navigator.share = original;
    },
  });
}

export const share: Collector = (ctx) => {
  wrapNativeShare(ctx);
  ctx.on(document, "click", (e) => {
    const target = toElement(e.target);
    if (!target) return;
    const shareControl = target.closest(SHARE_SELECTOR);
    if (shareControl) {
      emitShare(ctx, shareControl as HTMLElement);
      return;
    }
    const copy = target.closest(`${BUTTON_LIKE_SELECTOR}, [data-action="copy-link"], .copy-link`);
    if (
      copy?.matches('[data-action="copy-link"], .copy-link') ||
      (copy && /^copy( the)? link$/i.test(copy.textContent?.trim() || ""))
    ) {
      ctx.emit<IndeksShareEvent>({
        type: "share",
        shareMethod: "copy_link",
        contentShared: scrubUrl(window.location.href),
        shareLocation: shareLocation(),
      });
    }
  });
};
