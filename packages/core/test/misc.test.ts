import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { STORAGE_KEYS } from "@indeks/shared";
import type { IndeksEvent } from "@indeks/shared";
import { exposeGlobals, indeks } from "../src";
import type { IndeksTracker } from "../src";
import { LocalStorageAdapter } from "../src/storage";
import { API_KEY, click, createTracker, eventsOfType, html, resetBrowser, sleep } from "./helpers";

let tracker: IndeksTracker | null = null;
beforeEach(() => resetBrowser());
afterEach(async () => {
  await tracker?.destroy();
  tracker = null;
});

describe("indeks() factory", () => {
  test("creates a tracker that initializes once the DOM is ready", async () => {
    tracker = indeks(API_KEY, { localOnly: true });
    await sleep(20);
    html(`<button id="b">Go</button>`);
    click(document.getElementById("b")!);
    expect(tracker.getEvents().some((event) => event.type === "click")).toBe(true);
  });

  test("waits for DOMContentLoaded while the document is loading", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "readyState");
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    try {
      tracker = indeks(API_KEY, { localOnly: true });
      await sleep(10);
      expect(tracker.getEvents()).toHaveLength(0);
      Object.defineProperty(document, "readyState", { value: "interactive", configurable: true });
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await sleep(20);
      expect(tracker.getEvents().length).toBeGreaterThan(0);
    } finally {
      delete (document as unknown as Record<string, unknown>).readyState;
      if (descriptor) Object.defineProperty(Document.prototype, "readyState", descriptor);
    }
  });

  test("throws for an invalid configuration", () => {
    expect(() => indeks("short")).toThrow(/invalid configuration/);
  });

  test("exposeGlobals publishes the API on window", () => {
    delete (window as unknown as Record<string, unknown>).indeks;
    exposeGlobals();
    expect(typeof (window as unknown as Record<string, unknown>).indeks).toBe("function");
    expect(typeof (window as unknown as Record<string, unknown>).IndeksTracker).toBe("function");
    delete (window as unknown as Record<string, unknown>).indeks;
    delete (window as unknown as Record<string, unknown>).IndeksTracker;
  });
});

describe("LocalStorageAdapter", () => {
  const event = (i: number) => ({ type: "custom", timestamp: i }) as unknown as IndeksEvent;

  test("stores, retrieves, appends and clears events", async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.store([event(1)]);
    await adapter.store([event(2)]);
    expect((await adapter.retrieve()).map((e) => e.timestamp)).toEqual([1, 2]);
    await adapter.clear();
    expect(await adapter.retrieve()).toEqual([]);
  });

  test("caps the number of persisted events and keeps the newest", async () => {
    const adapter = new LocalStorageAdapter();
    adapter.replace(Array.from({ length: 700 }, (_, i) => event(i)));
    const stored = await adapter.retrieve();
    expect(stored).toHaveLength(500);
    expect(stored[0].timestamp).toBe(200);
  });

  function withFakeStorage<T>(
    setItem: (store: Map<string, string>, key: string, value: string) => void,
    run: (store: Map<string, string>) => T,
  ): T {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")!;
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => setItem(store, key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    try {
      return run(store);
    } finally {
      Object.defineProperty(globalThis, "localStorage", original);
    }
  }

  test("halves the payload until it fits when storage quota is exceeded", async () => {
    const adapter = new LocalStorageAdapter();
    let attempts = 0;
    await withFakeStorage(
      (store, key, value) => {
        attempts++;
        if (value.length > 600) throw new DOMException("full", "QuotaExceededError");
        store.set(key, value);
      },
      async () => {
        adapter.replace(Array.from({ length: 100 }, (_, i) => event(i)));
        expect(attempts).toBeGreaterThan(1);
        const stored = await adapter.retrieve();
        expect(stored.length).toBeGreaterThan(0);
        expect(stored.length).toBeLessThan(100);
        expect(stored.at(-1)!.timestamp).toBe(99);
      },
    );
  });

  test("removes the key when nothing fits at all", async () => {
    const adapter = new LocalStorageAdapter();
    await withFakeStorage(
      () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      async (store) => {
        store.set(STORAGE_KEYS.EVENTS, "[]");
        adapter.replace([event(1), event(2)]);
        expect(store.has(STORAGE_KEYS.EVENTS)).toBe(false);
      },
    );
  });

  test("gives up quietly on other storage errors and ignores corrupt data", async () => {
    const adapter = new LocalStorageAdapter();
    withFakeStorage(
      () => {
        throw new Error("blocked");
      },
      () => {
        expect(() => adapter.replace([event(1)])).not.toThrow();
      },
    );
    localStorage.setItem(STORAGE_KEYS.EVENTS, "{not json");
    expect(await adapter.retrieve()).toEqual([]);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify({ not: "an array" }));
    expect(await adapter.retrieve()).toEqual([]);
  });
});

describe("media collector", () => {
  test("play, pause, volume and ended events describe the element without leaking the URL query", async () => {
    tracker = await createTracker();
    html(`<audio id="a"></audio>`);
    const audio = document.getElementById("a") as HTMLAudioElement;
    Object.defineProperty(audio, "currentSrc", {
      value: "https://cdn.example.com/a.mp3?token=SECRET",
      configurable: true,
    });
    for (const type of ["play", "pause", "volumechange", "seeking", "seeked", "ended"]) {
      audio.dispatchEvent(new Event(type));
    }
    const events = tracker
      .getEvents()
      .filter((e) =>
        ["play", "pause", "volumechange", "seeking", "seeked", "ended"].includes(e.type),
      );
    expect(events).toHaveLength(6);
    expect(JSON.stringify(events)).not.toContain("SECRET");
  });

  test("ignores non-media elements and resets progress when playback ends", async () => {
    tracker = await createTracker();
    html(`<video id="v"></video><div id="d"></div>`);
    document.getElementById("d")!.dispatchEvent(new Event("play"));
    expect(eventsOfType(tracker, "play")).toHaveLength(0);

    const video = document.getElementById("v") as HTMLVideoElement;
    Object.defineProperty(video, "currentSrc", {
      value: "https://cdn.example.com/v.mp4",
      configurable: true,
    });
    Object.defineProperty(video, "duration", { value: 10, configurable: true });
    const seek = (time: number) => {
      Object.defineProperty(video, "currentTime", { value: time, configurable: true });
      video.dispatchEvent(new Event("timeupdate"));
    };
    seek(3);
    video.dispatchEvent(new Event("ended"));
    seek(3);
    expect(eventsOfType(tracker, "video_progress")).toHaveLength(2);
  });
});

describe("link collectors", () => {
  test("data-share controls report the platform, scrubbed URL and location", async () => {
    resetBrowser("https://app.example.com/blog/post-1");
    tracker = await createTracker();
    html(
      `<a id="s" class="share-button" data-share data-url="https://app.example.com/blog/post-1?token=SECRET" data-text="Great read" href="https://twitter.com/share?u=x">Tweet</a>`,
    );
    document.getElementById("s")!.addEventListener("click", (e) => e.preventDefault());
    click(document.getElementById("s")!);
    const [share] = eventsOfType<{
      shareMethod: string;
      shareLocation: string;
      shareUrl: string;
      shareText: string;
    }>(tracker, "share");
    expect(share.shareMethod).toBe("twitter");
    expect(share.shareLocation).toBe("article");
    expect(share.shareUrl).not.toContain("SECRET");
    expect(share.shareText).toBe("Great read");
  });

  test("downloads report their source and detect programmatic links", async () => {
    tracker = await createTracker();
    html(`
      <button><a id="b" href="https://app.example.com/files/a.zip">zip</a></button>
      <a id="d" href="https://app.example.com/export" download="report.xlsx">export</a>
      <a id="x" href="https://app.example.com/download/archive">dl</a>`);
    for (const id of ["b", "d", "x"]) {
      document.getElementById(id)!.addEventListener("click", (e) => e.preventDefault());
      click(document.getElementById(id)!);
    }
    const downloads = eventsOfType<{ downloadSource: string; fileType: string; fileName: string }>(
      tracker,
      "file_download",
    );
    expect(downloads.map((d) => d.downloadSource)).toEqual(["button", "link", "auto"]);
    expect(downloads[0].fileType).toBe("archive");
    expect(downloads[1].fileType).toBe("excel");
    expect(downloads[1].fileName).toBe("report.xlsx");
  });

  test("keyboard print shortcut is reported as a keyboard trigger", async () => {
    tracker = await createTracker();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true }),
    );
    window.dispatchEvent(new Event("beforeprint"));
    expect(eventsOfType<{ printTrigger: string }>(tracker, "print")[0].printTrigger).toBe(
      "keyboard",
    );
  });

  test("share location is derived from the path", async () => {
    const cases: Array<[string, string]> = [
      ["/product/1", "product_page"],
      ["/cart", "cart"],
      ["/checkout", "checkout"],
      ["/about", "other"],
    ];
    for (const [path, expected] of cases) {
      resetBrowser(`https://app.example.com${path}`);
      const t = await createTracker();
      html(`<button id="c" data-action="copy-link">Copy</button>`);
      click(document.getElementById("c")!);
      expect(eventsOfType<{ shareLocation: string }>(t, "share")[0].shareLocation).toBe(expected);
      await t.destroy();
    }
  });
});
