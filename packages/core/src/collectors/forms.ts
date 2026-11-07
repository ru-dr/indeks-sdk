import { REDACTED, sanitizeUserInput, scrubUrl } from "@useindeks/shared";
import type {
  IndeksClipboardEvent,
  IndeksFieldFocusEvent,
  IndeksFormAbandonEvent,
  IndeksFormErrorEvent,
  IndeksFormSubmitEvent,
  IndeksInputChangeEvent,
  IndeksTextSelectionEvent,
} from "@useindeks/shared";
import type { Collector, CollectorContext } from "../context";
import {
  MAX_TEXT_LENGTH,
  describeElement,
  fieldLabel,
  isMasked,
  isSensitiveField,
  selectionTouchesMasked,
  normalizeText,
  safeFieldName,
  toElement,
  valueIndicator,
} from "../dom";

const FIELD_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

interface FormInteraction {
  form: HTMLFormElement;
  startTime: number;
  fields: Set<HTMLElement>;
  lastInteraction: number;
  lastField: string;
}

function formKey(form: HTMLFormElement): string {
  if (form.id) return form.id;
  const siblings = Array.from(form.parentElement?.children ?? []);
  return `form:nth-child(${siblings.indexOf(form) + 1})`;
}

function safeValue(value: string): string {
  return normalizeText(sanitizeUserInput(value));
}

export const formSubmit: Collector = (ctx) => {
  ctx.on(document, "submit", (e) => {
    const form = toElement(e.target) as HTMLFormElement | null;
    if (!form) return;
    const captureValues = ctx.config.privacy.formValues;
    const formData: Record<string, string> = {};
    const controls = form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");
    for (const control of Array.from(controls)) {
      const rawName = control.name || control.id;
      if (!rawName) continue;
      const value = typeof control.value === "string" ? control.value : "";
      const hidden = isSensitiveField(control) || isMasked(control);
      formData[safeFieldName(rawName)] = hidden
        ? REDACTED
        : captureValues
          ? safeValue(value)
          : valueIndicator(value);
    }
    ctx.emit<IndeksFormSubmitEvent>({
      type: "form_submit",
      formData,
      formValuesCaptured: captureValues,
      formAction: scrubUrl(form.action),
      formMethod: form.method,
      element: describeElement(form),
    });
  });
};

export const inputChange: Collector = (ctx) => {
  const track = (type: "input" | "change") => (e: Event) => {
    const target = toElement(e.target) as HTMLInputElement | null;
    if (!target) return;
    const value = typeof target.value === "string" ? target.value : "";
    const sensitive = isSensitiveField(target);
    if (sensitive) return;
    const captureValue = ctx.config.privacy.formValues && !sensitive && !isMasked(target);
    ctx.emit<IndeksInputChangeEvent>({
      type,
      element: {
        ...describeElement(target),
        type: target.type,
        name: safeFieldName(target.name || ""),
        value: captureValue ? safeValue(value) : undefined,
        valueLength: value.length,
      },
      inputType: (e as InputEvent).inputType,
    });
  };
  ctx.on(document, "input", track("input"));
  ctx.on(document, "change", track("change"));
};

export const fieldFocus: Collector = (ctx) => {
  const track = (type: "field_focus" | "field_blur", domType: "focus" | "blur") =>
    ctx.on(
      document,
      domType,
      (e) => {
        const target = toElement(e.target) as HTMLElement | null;
        if (!target || !FIELD_TAGS.includes(target.tagName)) return;
        ctx.emit<IndeksFieldFocusEvent>({
          type,
          element: {
            ...describeElement(target),
            type: (target as HTMLInputElement).type || "",
            name: fieldLabel(target),
          },
        });
      },
      true,
    );
  track("field_focus", "focus");
  track("field_blur", "blur");
};

function flushAbandons(
  ctx: CollectorContext,
  interactions: Map<string, FormInteraction>,
  onlyDisconnected: boolean,
): void {
  for (const [key, interaction] of Array.from(interactions)) {
    if (onlyDisconnected && interaction.form.isConnected) continue;
    interactions.delete(key);
    const completed = Array.from(interaction.fields).filter(
      (field) => (field as HTMLInputElement).value,
    ).length;
    if (completed === 0 && Date.now() - interaction.lastInteraction < 5000) continue;
    ctx.emit<IndeksFormAbandonEvent>({
      type: "form_abandon",
      formId: key,
      fieldsCompleted: completed,
      totalFields: interaction.form.querySelectorAll("input, textarea, select").length,
      timeSpent: Date.now() - interaction.startTime,
      lastField: interaction.lastField || "unknown",
    });
  }
}

export const formAbandon: Collector = (ctx) => {
  const interactions = new Map<string, FormInteraction>();
  ctx.on(document, "focusin", (e) => {
    const target = toElement(e.target) as HTMLElement | null;
    if (!target || !FIELD_TAGS.includes(target.tagName)) return;
    const form = target.closest("form");
    if (!form) return;
    const key = formKey(form);
    const now = Date.now();
    let interaction = interactions.get(key);
    if (!interaction) {
      interaction = {
        form,
        startTime: now,
        fields: new Set(),
        lastInteraction: now,
        lastField: "",
      };
      interactions.set(key, interaction);
    }
    interaction.fields.add(target);
    interaction.lastField = fieldLabel(target);
    interaction.lastInteraction = now;
  });
  ctx.on(document, "submit", (e) => {
    const form = toElement(e.target) as HTMLFormElement | null;
    if (form) interactions.delete(formKey(form));
  });
  ctx.lifecycle.onExit((trigger) => {
    if (trigger === "pagehide") flushAbandons(ctx, interactions, false);
  });
  ctx.lifecycle.onNavigation(() => flushAbandons(ctx, interactions, true));
};

export const formError: Collector = (ctx) => {
  ctx.on(
    document,
    "invalid",
    (e) => {
      const target = toElement(e.target) as HTMLInputElement | null;
      const form = target?.closest("form");
      if (!target || !form) return;
      ctx.emit<IndeksFormErrorEvent>({
        type: "form_error",
        formId: formKey(form),
        field: fieldLabel(target),
        errorType: target.validity.valueMissing
          ? "required"
          : target.validity.typeMismatch
            ? "format"
            : "validation",
        errorMessage: normalizeText(target.validationMessage),
      });
    },
    true,
  );
};

export const clipboard: Collector = (ctx) => {
  const track = (type: "copy" | "paste" | "cut") => (e: globalThis.ClipboardEvent) => {
    const target = toElement(e.target);
    if (!target) return;
    const range = window.getSelection();
    const selection = range?.toString() || "";
    const allowText =
      type !== "paste" &&
      ctx.config.privacy.clipboardText &&
      !isSensitiveField(target) &&
      !isMasked(target) &&
      !selectionTouchesMasked(range);
    ctx.emit<IndeksClipboardEvent>({
      type,
      element: {
        ...describeElement(target),
        type: (target as HTMLInputElement).type,
        name: fieldLabel(target),
      },
      text: allowText ? safeValue(selection) : undefined,
      textLength: type !== "paste" ? selection.length : undefined,
    });
  };
  ctx.on(document, "copy", track("copy"));
  ctx.on(document, "paste", track("paste"));
  ctx.on(document, "cut", track("cut"));
};

export const textSelection: Collector = (ctx) => {
  const report = ctx.debounced(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    if (!selection || !selectedText.length) return;
    const parent = selection.anchorNode?.parentElement;
    const allowText =
      ctx.config.privacy.clipboardText &&
      !(parent && (isSensitiveField(parent) || isMasked(parent))) &&
      !selectionTouchesMasked(selection);
    ctx.emit<IndeksTextSelectionEvent>({
      type: "selectionchange",
      selectedText: allowText
        ? normalizeText(sanitizeUserInput(selectedText), 2 * MAX_TEXT_LENGTH)
        : undefined,
      selectedTextLength: selectedText.length,
      selectionStart: selection.anchorOffset,
      selectionEnd: selection.focusOffset,
      element: parent
        ? {
            ...describeElement(parent),
            type: (parent as HTMLInputElement).type,
            name: fieldLabel(parent),
          }
        : undefined,
    });
  });
  ctx.on(document, "selectionchange", report);
};
