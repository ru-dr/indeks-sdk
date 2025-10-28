import { IndeksConfig } from "../types/config";

export function validateConfig(config: Partial<IndeksConfig>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!config.apiKey) {
    errors.push("API key is required");
  } else if (typeof config.apiKey !== "string") {
    errors.push("API key must be a string");
  } else if (config.apiKey.length < 10) {
    errors.push("API key appears to be too short (minimum 10 characters)");
  }

  // Optional fields validation
  if (
    config.enableConsoleLogging !== undefined &&
    typeof config.enableConsoleLogging !== "boolean"
  ) {
    errors.push("enableConsoleLogging must be a boolean");
  }

  if (config.debounceMs !== undefined) {
    if (typeof config.debounceMs !== "number") {
      errors.push("debounceMs must be a number");
    } else if (config.debounceMs < 0) {
      errors.push("debounceMs must be non-negative");
    } else if (config.debounceMs > 10000) {
      errors.push("debounceMs should not exceed 10 seconds");
    }
  }

  if (config.endpoint !== undefined) {
    if (typeof config.endpoint !== "string") {
      errors.push("endpoint must be a string");
    } else if (!isValidUrl(config.endpoint)) {
      errors.push("endpoint must be a valid URL");
    }
  }

  return errors;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeConfig(config: Partial<IndeksConfig>): IndeksConfig {
  const defaults: Omit<IndeksConfig, "apiKey"> = {
    enableConsoleLogging: false,
    captureClicks: true,
    captureScrolls: true,
    capturePageViews: true,
    captureFormSubmissions: true,
    captureKeystrokes: false,
    captureMouseMovements: false,
    captureResizes: true,
    captureErrors: true,
    captureBeforeUnload: true,
    captureVisibilityChange: true,
    captureWindowFocus: true,
    captureHashChange: true,
    capturePopState: true,
    captureMouseHover: false,
    captureContextMenu: true,
    captureDoubleClick: true,
    captureMousePress: false,
    captureMouseWheel: true,
    captureTouchEvents: true,
    captureDragDrop: true,
    captureInputChanges: true,
    captureFieldFocus: true,
    captureClipboard: true,
    captureTextSelection: false,
    captureMediaEvents: true,
    captureNetworkStatus: true,
    capturePageLoad: true,
    captureFullscreenChange: true,
    debounceMs: 100,
  };

  return {
    ...defaults,
    ...config,
    apiKey: config.apiKey!, // Required field, should be validated before this
  };
}

export function validateEventData(event: any): boolean {
  if (!event || typeof event !== "object") return false;
  if (!event.type || typeof event.type !== "string") return false;
  if (!event.timestamp || typeof event.timestamp !== "number") return false;
  if (!event.sessionId || typeof event.sessionId !== "string") return false;
  if (!event.userId || typeof event.userId !== "string") return false;
  if (!event.url || typeof event.url !== "string") return false;

  return true;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
