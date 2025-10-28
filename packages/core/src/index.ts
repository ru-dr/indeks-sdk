import IndeksTracker from "@/lib/tracker";
import type { IndeksConfig } from "@/types";

// Main initialization function
export function indeks(
  apiKey: string,
  printToConsole: boolean = false,
  config: Partial<IndeksConfig> = {}
): IndeksTracker {
  if (!apiKey) {
    throw new Error("Indeks: API key is required");
  }

  const fullConfig: IndeksConfig = {
    apiKey,
    enableConsoleLogging: printToConsole,
    ...config,
  };

  const tracker = new IndeksTracker(fullConfig);

  // Auto-initialize if we're in a browser environment
  if (typeof window !== "undefined") {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        tracker.init().catch(console.error)
      );
    } else {
      tracker.init().catch(console.error);
    }
  }

  return tracker;
}

// Named exports
export { IndeksTracker };
export * from "@/types";
export * from "@/lib";
export * from "@/utils";

// Default export
export default indeks;

// Global types for better TypeScript support
declare global {
  interface Window {
    indeks?: typeof indeks;
    IndeksTracker?: typeof IndeksTracker;
  }
}

// Auto-attach to window for browser usage
if (typeof window !== "undefined") {
  window.indeks = indeks;
  window.IndeksTracker = IndeksTracker;
}
