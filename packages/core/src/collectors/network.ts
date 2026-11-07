import { redactText, scrubUrl } from "@indeks/shared";
import type {
  IndeksErrorEvent,
  IndeksNetworkChangeEvent,
  IndeksNetworkStatusEvent,
  IndeksResourceErrorEvent,
} from "@indeks/shared";
import type { Collector } from "../context";
import { getConnection } from "../dom";

function reasonMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === "string" ? reason : String(reason);
}

export const error: Collector = (ctx) => {
  const report = (
    message: string,
    filename: string,
    lineno: number,
    colno: number,
    stack?: string,
  ) => {
    const safeMessage = redactText(message);
    ctx.state.lastError = { message: safeMessage, at: Date.now() };
    ctx.emit<IndeksErrorEvent>({
      type: "error",
      error: {
        message: safeMessage,
        filename: scrubUrl(filename),
        lineno,
        colno,
        stack: stack ? redactText(stack) : undefined,
      },
    });
  };
  ctx.on(window, "error", (e) => {
    if (e.target instanceof Element) return;
    report(e.message, e.filename, e.lineno, e.colno, e.error?.stack);
  });
  ctx.on(window, "unhandledrejection", (e) => {
    const reason = e.reason as { stack?: string } | undefined;
    report(`Unhandled Promise Rejection: ${reasonMessage(e.reason)}`, "", 0, 0, reason?.stack);
  });
};

export const resourceError: Collector = (ctx) => {
  ctx.on(
    window,
    "error",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const tag = target.tagName.toLowerCase();
      let resourceType: IndeksResourceErrorEvent["resourceType"] = "other";
      let resourceUrl = "";
      if (tag === "img" || tag === "script") {
        resourceType = tag;
        resourceUrl = (target as HTMLImageElement | HTMLScriptElement).src;
      } else if (tag === "link") {
        const link = target as HTMLLinkElement;
        if (link.rel === "stylesheet") resourceType = "style";
        else if (link.as === "font") resourceType = "font";
        resourceUrl = link.href;
      }
      if (!resourceUrl) return;
      const safeUrl = scrubUrl(resourceUrl);
      ctx.emit<IndeksResourceErrorEvent>({
        type: "resource_error",
        resourceType,
        resourceUrl: safeUrl,
        errorMessage: `Failed to load ${resourceType}: ${safeUrl}`,
      });
    },
    true,
  );
};

export const networkStatus: Collector = (ctx) => {
  const track = (type: "online" | "offline") => () =>
    ctx.emit<IndeksNetworkStatusEvent>({
      type,
      isOnline: navigator.onLine,
      connectionType: getConnection()?.effectiveType,
    });
  ctx.on(window, "online", track("online"));
  ctx.on(window, "offline", track("offline"));
};

export const networkChange: Collector = (ctx) => {
  const connection = getConnection();
  if (!connection) return;
  ctx.on(connection, "change", () => {
    ctx.emit<IndeksNetworkChangeEvent>({
      type: "network_change",
      effectiveType:
        (connection.effectiveType as IndeksNetworkChangeEvent["effectiveType"]) || "unknown",
      downlink: connection.downlink,
      rtt: connection.rtt,
    });
  });
};
