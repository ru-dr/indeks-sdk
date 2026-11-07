import { COLLECTOR_NAMES } from "../types";
import type { IndeksConfig } from "../types";
import { VALIDATION } from "../constants";
import { isValidUrl } from "./url";
import { validateApiKey } from "./sanitize";

const SAME_ORIGIN_PATH = /^\/(?!\/)/;

function checkNumber(errors: string[], name: string, value: unknown, max: number): void {
  if (value === undefined) return;
  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`${name} must be a number`);
  } else if (value < 0) {
    errors.push(`${name} must be non-negative`);
  } else if (value > max) {
    errors.push(`${name} should not exceed ${max / 1000} seconds`);
  }
}

export function validateConfig(config: Partial<IndeksConfig>): string[] {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push("API key is required");
  } else if (typeof config.apiKey !== "string") {
    errors.push("API key must be a string");
  } else if (!validateApiKey(config.apiKey)) {
    errors.push(
      `API key appears to be too short (minimum ${VALIDATION.MIN_API_KEY_LENGTH} characters)`,
    );
  }

  if (config.debug !== undefined && typeof config.debug !== "boolean") {
    errors.push("debug must be a boolean");
  }

  if (config.preset !== undefined && !["minimal", "standard", "full"].includes(config.preset)) {
    errors.push('preset must be "minimal", "standard" or "full"');
  }

  for (const [name, value] of Object.entries(config.collectors ?? {})) {
    if (!(COLLECTOR_NAMES as readonly string[]).includes(name)) {
      errors.push(`unknown collector "${name}"`);
    } else if (value !== undefined && typeof value !== "boolean") {
      errors.push(`collectors.${name} must be a boolean`);
    }
  }

  for (const [name, value] of Object.entries(config.privacy ?? {})) {
    if (value !== undefined && typeof value !== "boolean") {
      errors.push(`privacy.${name} must be a boolean`);
    }
  }

  checkNumber(errors, "debounceMs", config.debounceMs, VALIDATION.MAX_DEBOUNCE_MS);
  checkNumber(errors, "idleTimeoutMs", config.idleTimeoutMs, VALIDATION.MAX_IDLE_TIMEOUT_MS);

  if (config.scrollDepthThresholds !== undefined) {
    const thresholds = config.scrollDepthThresholds;
    const valid =
      Array.isArray(thresholds) &&
      thresholds.every((t) => typeof t === "number" && t > 0 && t <= 100);
    if (!valid) {
      errors.push("scrollDepthThresholds must be an array of numbers in (0, 100]");
    }
  }

  for (const [group, options] of Object.entries(config.collectorOptions ?? {})) {
    if (group !== "search" && group !== "frustration") {
      errors.push(`unknown collectorOptions group "${group}"`);
      continue;
    }
    for (const [name, value] of Object.entries(options ?? {})) {
      const isSelector = name.endsWith("Selector");
      if (value !== undefined && typeof value !== (isSelector ? "string" : "number")) {
        errors.push(
          `collectorOptions.${group}.${name} must be a ${isSelector ? "string" : "number"}`,
        );
      }
    }
  }

  if (config.endpoint !== undefined) {
    if (typeof config.endpoint !== "string") {
      errors.push("endpoint must be a string");
    } else if (!isValidUrl(config.endpoint) && !SAME_ORIGIN_PATH.test(config.endpoint)) {
      errors.push("endpoint must be an absolute URL or a path starting with /");
    }
  }

  return errors;
}

export function validateEventData(event: unknown): boolean {
  if (!event || typeof event !== "object") return false;
  const candidate = event as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    candidate.type !== "" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.sessionId === "string" &&
    candidate.sessionId !== "" &&
    typeof candidate.userId === "string" &&
    candidate.userId !== "" &&
    typeof candidate.url === "string" &&
    candidate.url !== ""
  );
}
