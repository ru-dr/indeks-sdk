import type { IndeksConfig } from '@/types';
import { isValidUrl } from '@/index';
import { DEFAULT_CONFIG, VALIDATION } from '@/constants';

/**
 * Validates IndeksConfig object and returns array of error messages
 * @param config - Partial configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfig(config: Partial<IndeksConfig>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!config.apiKey) {
    errors.push("API key is required");
  } else if (typeof config.apiKey !== "string") {
    errors.push("API key must be a string");
  } else if (config.apiKey.length < VALIDATION.MIN_API_KEY_LENGTH) {
    errors.push(`API key appears to be too short (minimum ${VALIDATION.MIN_API_KEY_LENGTH} characters)`);
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
    } else if (config.debounceMs > VALIDATION.MAX_DEBOUNCE_MS) {
      errors.push(`debounceMs should not exceed ${VALIDATION.MAX_DEBOUNCE_MS / 1000} seconds`);
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

/**
 * Sanitizes and merges partial config with defaults
 * @param config - Partial configuration
 * @returns Complete IndeksConfig with defaults
 */
export function sanitizeConfig(config: Partial<IndeksConfig>): IndeksConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey: config.apiKey!, // Required field, should be validated before this
  };
}

/**
 * Validates event data structure
 * @param event - Event object to validate
 * @returns true if valid, false otherwise
 */
export function validateEventData(event: any): boolean {
  if (!event || typeof event !== "object") return false;
  if (!event.type || typeof event.type !== "string") return false;
  if (!event.timestamp || typeof event.timestamp !== "number") return false;
  if (!event.sessionId || typeof event.sessionId !== "string") return false;
  if (!event.userId || typeof event.userId !== "string") return false;
  if (!event.url || typeof event.url !== "string") return false;

  return true;
}
