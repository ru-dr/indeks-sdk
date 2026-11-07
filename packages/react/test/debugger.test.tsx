import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Indeks, useIndeks } from "../src";
import { IndeksDebugger } from "../src/debugger";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let trackFn: ReturnType<typeof useIndeks>["track"];

function Capture() {
  trackFn = useIndeks().track;
  return null;
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <Indeks apiKey="test_api_key_123" config={{ localOnly: true, debounceMs: 1 }}>
        <Capture />
        <IndeksDebugger refreshInterval={0} />
      </Indeks>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const query = <T extends Element>(selector: string) =>
  container.ownerDocument.querySelector<T>(selector);

describe("IndeksDebugger", () => {
  test("renders a closed trigger button and opens a dialog", async () => {
    expect(query('[role="dialog"]')).toBeNull();
    await act(async () =>
      query<HTMLButtonElement>('button[aria-label="Open Indeks debugger"]')!.click(),
    );
    expect(query('[role="dialog"]')).not.toBeNull();
    expect(query('[role="dialog"]')!.textContent).toContain("Local only");
  });

  test("lists events and shows sanitized payloads", async () => {
    await act(async () =>
      query<HTMLButtonElement>('button[aria-label="Open Indeks debugger"]')!.click(),
    );
    await act(async () => {
      trackFn("checkout", { password: "hunter2", plan: "pro" });
    });
    const refresh = Array.from(container.ownerDocument.querySelectorAll("button")).find(
      (b) => b.textContent === "Refresh",
    )!;
    await act(async () => refresh.click());

    const dialog = query('[role="dialog"]')!;
    expect(dialog.textContent).toContain("custom");
    const row = Array.from(dialog.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("custom"),
    )!;
    await act(async () => row.click());
    const payload = dialog.querySelector("pre")!.textContent!;
    expect(payload).toContain("checkout");
    expect(payload).toContain("pro");
    expect(payload).not.toContain("hunter2");
  });

  test("clear empties the list", async () => {
    await act(async () =>
      query<HTMLButtonElement>('button[aria-label="Open Indeks debugger"]')!.click(),
    );
    await act(async () => {
      trackFn("one");
    });
    const buttons = () => Array.from(container.ownerDocument.querySelectorAll("button"));
    await act(async () =>
      buttons()
        .find((b) => b.textContent === "Refresh")!
        .click(),
    );
    expect(query('[role="dialog"]')!.textContent).not.toContain("No events yet");
    await act(async () =>
      buttons()
        .find((b) => b.textContent === "Clear")!
        .click(),
    );
    expect(query('[role="dialog"]')!.textContent).toContain("No events yet");
  });
});
