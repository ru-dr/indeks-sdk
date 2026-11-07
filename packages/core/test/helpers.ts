import { IndeksTracker } from "../src";
import type { IndeksConfig, IndeksEvent } from "../src";

export const API_KEY = "test_api_key_123";

export function resetBrowser(url = "https://app.example.com/"): void {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
  window.happyDOM.setURL(url);
}

export async function createTracker(overrides: Partial<IndeksConfig> = {}): Promise<IndeksTracker> {
  const tracker = new IndeksTracker({
    apiKey: API_KEY,
    localOnly: true,
    debounceMs: 1,
    ...overrides,
  });
  await tracker.init();
  return tracker;
}

export function eventsOfType<T = IndeksEvent>(tracker: IndeksTracker, type: string): T[] {
  return tracker.getEvents().filter((event) => event.type === type) as unknown as T[];
}

export function html(markup: string): void {
  document.body.innerHTML = markup;
}

export function click(target: Element): void {
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 5, clientY: 6 }),
  );
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
