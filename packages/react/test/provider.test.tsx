import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Indeks, useIndeks } from "../src";
import type { UseIndeksReturn } from "../src";
import type * as ContextModule from "../src/context/IndeksContext";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const API_KEY = "test_api_key_123";
let container: HTMLDivElement;
let root: Root;
let latest: UseIndeksReturn | null;

function Probe() {
  latest = useIndeks();
  return null;
}

async function mount(props: Partial<React.ComponentProps<typeof Indeks>> = {}) {
  await act(async () => {
    root.render(
      <Indeks apiKey={API_KEY} config={{ localOnly: true, debounceMs: 1 }} {...props}>
        <Probe />
      </Indeks>,
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  latest = null;
});

const nativePushStateGlobal = history.pushState;
const nativeReplaceStateGlobal = history.replaceState;

afterEach(async () => {
  await act(async () => root.unmount());
  history.pushState = nativePushStateGlobal;
  history.replaceState = nativeReplaceStateGlobal;
  container.remove();
});

describe("Indeks provider", () => {
  test("exposes an initialized tracker, session and user id", async () => {
    await mount();
    expect(latest?.isInitialized).toBe(true);
    expect(latest?.tracker).not.toBeNull();
    expect(latest?.sessionId).toBe(latest!.tracker!.getSessionId());
    expect(latest?.userId).toBeTruthy();
  });

  test("the tracker is available in the same render that reports initialization", async () => {
    await mount();
    expect(latest!.isInitialized && latest!.tracker !== null).toBe(true);
  });

  test("recreates the tracker when the config changes", async () => {
    await mount();
    const first = latest!.tracker;
    await mount({ config: { localOnly: true, debounceMs: 2 } });
    expect(latest!.tracker).not.toBe(first);
    expect(latest!.config?.debounceMs).toBe(2);
  });

  test("does not recreate the tracker when re-rendered with an equal config", async () => {
    await mount();
    const first = latest!.tracker;
    await mount({ config: { localOnly: true, debounceMs: 1 } });
    expect(latest!.tracker).toBe(first);
  });

  test("tears the tracker down on unmount", async () => {
    await mount();
    const tracker = latest!.tracker!;
    await act(async () => root.unmount());
    root = createRoot(container);
    document.body.innerHTML = `<button id="b">x</button>`;
    document.getElementById("b")!.click();
    expect(tracker.getEvents()).toHaveLength(0);
  });

  test("useIndeks outside a provider throws", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => {
        const host = document.createElement("div");
        act(() => {
          createRoot(host).render(<Probe />);
        });
      }).toThrow(/within an Indeks provider/);
    } finally {
      console.error = original;
    }
  });

  test("missing API key renders children without a tracker", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      await mount({ apiKey: "" });
    } finally {
      console.error = original;
    }
    expect(latest?.tracker).toBeNull();
    expect(latest?.isInitialized).toBe(false);
  });
});

describe("Indeks provider API", () => {
  test("track/identify/page called before the tracker exists are buffered and replayed", async () => {
    function Early() {
      const { track, identify } = useIndeks();
      React.useEffect(() => {
        track("early", { a: 1 });
        identify("user-7");
      }, [track, identify]);
      return <Probe />;
    }
    await act(async () => {
      root.render(
        <Indeks apiKey={API_KEY} config={{ localOnly: true, debounceMs: 1 }}>
          <Early />
        </Indeks>,
      );
    });
    const events = latest!.tracker!.getEvents();
    expect(events.some((e) => e.type === "custom" && e.eventName === "early")).toBe(true);
    expect(events.some((e) => e.type === "identify")).toBe(true);
    expect(latest!.tracker!.getExternalUserId()).toBe("user-7");
  });

  test("the debug prop is forwarded to the tracker config", async () => {
    await mount({ debug: true });
    expect(latest!.config?.debug).toBe(true);
  });
});

describe("duplicate package copies", () => {
  test("a second copy of the package shares the same context", async () => {
    const specifier = "../src/context/IndeksContext.tsx?copy=1";
    const copy = (await import(specifier)) as typeof ContextModule;
    expect(copy.Indeks).not.toBe(Indeks);

    let sessionId: string | null = null;
    function Reader() {
      sessionId = copy.useIndeksContext().sessionId;
      return null;
    }
    await act(async () => {
      root.render(
        <Indeks apiKey={API_KEY} config={{ localOnly: true, debounceMs: 1 }}>
          <Reader />
        </Indeks>,
      );
    });
    expect(typeof sessionId).toBe("string");
  });
});

describe("StrictMode and live values", () => {
  const nativePushState = history.pushState;

  test("a StrictMode double mount leaves exactly one working tracker with SPA tracking", async () => {
    await act(async () => {
      root.render(
        <React.StrictMode>
          <Indeks apiKey={API_KEY} config={{ localOnly: true, debounceMs: 1 }}>
            <Probe />
          </Indeks>
        </React.StrictMode>,
      );
    });
    expect(latest?.isInitialized).toBe(true);
    expect(history.pushState).not.toBe(nativePushState);
    history.pushState({}, "", "/spa-next");
    await new Promise((resolve) => setTimeout(resolve, 80));
    const events = latest!.tracker!.getEvents();
    expect(events.filter((e) => e.type === "pageview")).toHaveLength(2);
    expect(events.filter((e) => e.type === "session_start")).toHaveLength(1);
  });

  test("session and user ids stay current after a reset", async () => {
    await mount();
    const before = latest!.sessionId;
    latest!.tracker!.reset();
    expect(latest!.sessionId).not.toBe(before);
    expect(latest!.sessionId).toBe(latest!.tracker!.getSessionId());
  });

  test("changing config recreates the tracker without losing SPA tracking", async () => {
    await mount();
    await mount({ config: { localOnly: true, debounceMs: 3 } });
    history.pushState({}, "", "/after-config-change");
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(latest!.tracker!.getEvents().filter((e) => e.type === "pageview")).toHaveLength(2);
  });
});
