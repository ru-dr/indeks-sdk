import { sanitizeUserInput } from "@indeks/shared";
import type {
  IndeksClickEvent,
  IndeksContextMenuEvent,
  IndeksDoubleClickEvent,
  IndeksDragDropEvent,
  IndeksKeystrokeEvent,
  IndeksMouseHoverEvent,
  IndeksMouseMoveEvent,
  IndeksMousePressEvent,
  IndeksTouchEvent,
  IndeksWheelEvent,
} from "@indeks/shared";
import type { Collector } from "../context";
import {
  categorizeKey,
  describeElement,
  fieldLabel,
  getElementInfo,
  isMasked,
  isSensitiveField,
  toElement,
} from "../dom";

export const click: Collector = (ctx) => {
  ctx.on(
    document,
    "click",
    (e) => {
      const target = toElement(e.target);
      if (!target) return;
      ctx.emit<IndeksClickEvent>({
        type: "click",
        element: getElementInfo(target, ctx.captureText()),
        coordinates: { x: e.pageX, y: e.pageY, clientX: e.clientX, clientY: e.clientY },
      });
    },
    true,
  );
};

function textElement(ctx: Parameters<Collector>[0], target: Element) {
  const { tagName, className, id, textContent } = getElementInfo(target, ctx.captureText());
  return { tagName, className, id, textContent };
}

export const doubleClick: Collector = (ctx) => {
  ctx.on(document, "dblclick", (e) => {
    const target = toElement(e.target);
    if (!target) return;
    ctx.emit<IndeksDoubleClickEvent>({
      type: "dblclick",
      element: textElement(ctx, target),
      coordinates: { x: e.pageX, y: e.pageY },
    });
  });
};

export const contextMenu: Collector = (ctx) => {
  ctx.on(document, "contextmenu", (e) => {
    const target = toElement(e.target);
    if (!target) return;
    ctx.emit<IndeksContextMenuEvent>({
      type: "contextmenu",
      element: textElement(ctx, target),
      coordinates: { x: e.pageX, y: e.pageY },
    });
  });
};

export const mousePress: Collector = (ctx) => {
  const track = (type: "mousedown" | "mouseup") => (e: MouseEvent) => {
    const target = toElement(e.target);
    if (!target) return;
    ctx.emit<IndeksMousePressEvent>({
      type,
      button: e.button,
      buttons: e.buttons,
      element: describeElement(target),
      coordinates: { x: e.pageX, y: e.pageY },
    });
  };
  ctx.on(document, "mousedown", track("mousedown"));
  ctx.on(document, "mouseup", track("mouseup"));
};

export const hover: Collector = (ctx) => {
  const track = (type: "mouseenter" | "mouseleave") => (e: MouseEvent) => {
    const target = toElement(e.target);
    if (!target) return;
    ctx.emit<IndeksMouseHoverEvent>({
      type,
      element: describeElement(target),
      coordinates: { x: e.pageX, y: e.pageY },
    });
  };
  ctx.on(document, "mouseenter", track("mouseenter"), true);
  ctx.on(document, "mouseleave", track("mouseleave"), true);
};

export const mouseMove: Collector = (ctx) => {
  const track = ctx.debounced((e: MouseEvent) => {
    ctx.emit<IndeksMouseMoveEvent>({
      type: "mousemove",
      coordinates: { x: e.pageX, y: e.pageY, clientX: e.clientX, clientY: e.clientY },
    });
  });
  ctx.on(document, "mousemove", (e) => track(e), { passive: true });
};

export const wheel: Collector = (ctx) => {
  ctx.on(
    document,
    "wheel",
    (e) => {
      ctx.emit<IndeksWheelEvent>({
        type: "wheel",
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        coordinates: { x: e.pageX, y: e.pageY },
      });
    },
    { passive: true },
  );
};

export const touch: Collector = (ctx) => {
  for (const type of ["touchstart", "touchend", "touchmove"] as const) {
    ctx.on(
      document,
      type,
      (e) => {
        const target = toElement(e.target);
        if (!target) return;
        ctx.emit<IndeksTouchEvent>({
          type,
          touches: Array.from(e.touches).map((t) => ({
            identifier: t.identifier,
            clientX: t.clientX,
            clientY: t.clientY,
            force: t.force,
          })),
          element: describeElement(target),
        });
      },
      { passive: true },
    );
  }
};

export const dragDrop: Collector = (ctx) => {
  for (const type of ["dragstart", "dragend", "drop"] as const) {
    ctx.on(document, type, (e) => {
      const target = toElement(e.target);
      if (!target) return;
      ctx.emit<IndeksDragDropEvent>({
        type,
        dataTransfer: e.dataTransfer
          ? {
              dropEffect: e.dataTransfer.dropEffect,
              effectAllowed: e.dataTransfer.effectAllowed,
              types: Array.from(e.dataTransfer.types),
            }
          : undefined,
        element: describeElement(target),
        coordinates: { x: e.pageX, y: e.pageY },
      });
    });
  }
};

export const keystroke: Collector = (ctx) => {
  ctx.on(document, "keydown", (e) => {
    const target = toElement(e.target) as HTMLElement | null;
    if (!target) return;
    if (target.tagName === "TEXTAREA" || target.isContentEditable) return;
    if (target.getAttribute("contenteditable") !== null) return;
    if (isSensitiveField(target) || isMasked(target)) return;
    const type = (target as HTMLInputElement).type;
    if (target.tagName === "INPUT" && ["search", "url"].includes(type)) return;
    const keyCategory = categorizeKey(e.key);
    ctx.emit<IndeksKeystrokeEvent>({
      type: "keystroke",
      keyCategory,
      key: keyCategory === "printable" ? undefined : sanitizeUserInput(e.key),
      code: keyCategory === "printable" ? undefined : e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      target: { ...describeElement(target), type, name: fieldLabel(target) },
    });
  });
};
