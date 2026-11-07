import {
  ALLOWED_ELEMENT_ATTRIBUTES,
  REDACTED,
  SAFE_QUERY_PARAMS,
  SENSITIVE_FIELD_SEGMENTS,
  SENSITIVE_FIELD_SUBSTRINGS,
  SENSITIVE_QUERY_PARAMS,
  VALIDATION,
} from "../constants";

const MAX_SANITIZE_DEPTH = 6;
const MAX_SANITIZE_KEYS = 200;
const MAX_REDACT_LENGTH = 20_000;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fieldSegments(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .flatMap((part) => part.split(/(?<=[a-zA-Z])(?=[0-9])/))
    .map((part) => part.toLowerCase())
    .filter(Boolean);
}

export function isSensitiveFieldName(name: string): boolean {
  if (!name || typeof name !== "string") return false;

  const normalized = normalizeFieldName(name);
  if (!normalized) return false;

  if (SENSITIVE_FIELD_SUBSTRINGS.some((entry) => normalized.includes(entry))) {
    return true;
  }

  const segments = new Set(fieldSegments(name));
  return SENSITIVE_FIELD_SEGMENTS.some((entry) => segments.has(entry));
}

export function sanitizeUserInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\p{Cc}/gu, "")
    .trim();
}

export function sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet<object>();

  const walk = (value: unknown, depth: number): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (depth >= MAX_SANITIZE_DEPTH) return REDACTED;
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, depth + 1));
    }

    const out: Record<string, unknown> = {};
    let keyCount = 0;
    for (const [key, child] of Object.entries(value as object)) {
      if (UNSAFE_KEYS.has(key)) continue;
      if (++keyCount > MAX_SANITIZE_KEYS) break;
      out[key] = isSensitiveFieldName(key) ? REDACTED : walk(child, depth + 1);
    }
    return out;
  };

  if (!data || typeof data !== "object") return {};
  return walk(data, 0) as Record<string, unknown>;
}

export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") return false;
  const trimmed = apiKey.trim();
  return trimmed.length >= VALIDATION.MIN_API_KEY_LENGTH;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}\.[A-Z]{2,24}/gi;
const CARD_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;
const JWT_PATTERN = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g;
const BEARER_PATTERN = /\bBearer\s+[\w.~+/=-]+/gi;
const URL_PATTERN = /https?:\/\/[^\s"'<>)]+/gi;
const ROUTE_HASH_PATTERN = /^#!?\//;

function isScrubbableParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith("utm_")) return false;
  if ((SAFE_QUERY_PARAMS as readonly string[]).includes(lower)) return false;
  return (SENSITIVE_QUERY_PARAMS as readonly string[]).includes(lower) || isSensitiveFieldName(key);
}

function scrubSearchParams(params: URLSearchParams): void {
  for (const key of Array.from(params.keys())) {
    if (isScrubbableParam(key)) params.set(key, REDACTED);
  }
}

export function scrubHash(hash: string | null | undefined): string {
  if (!hash || !ROUTE_HASH_PATTERN.test(hash)) return "";
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return hash;
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  scrubSearchParams(params);
  return `${hash.slice(0, queryStart)}?${params.toString()}`;
}

export function scrubUrl(url: string | null | undefined): string {
  if (!url) return "";
  let parsed: URL;
  try {
    parsed = new URL(url, typeof location !== "undefined" ? location.href : undefined);
  } catch {
    return "";
  }
  parsed.username = "";
  parsed.password = "";
  scrubSearchParams(parsed.searchParams);
  parsed.hash = scrubHash(parsed.hash);
  return parsed.toString();
}

export function pathAndSearch(url: string | null | undefined): string {
  const scrubbed = scrubUrl(url);
  if (!scrubbed) return "";
  const parsed = new URL(scrubbed);
  return parsed.pathname + parsed.search;
}

export function redactText(text: string | null | undefined): string {
  if (!text) return "";
  const bounded = text.length > MAX_REDACT_LENGTH ? text.slice(0, MAX_REDACT_LENGTH) : text;
  return bounded
    .replace(URL_PATTERN, (match) => scrubUrl(match) || REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(JWT_PATTERN, REDACTED)
    .replace(BEARER_PATTERN, REDACTED)
    .replace(CARD_PATTERN, REDACTED);
}

export function filterElementAttributes(
  attributes: Array<{ name: string; value: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of attributes) {
    const name = attr.name.toLowerCase();
    if (name === "value") continue;
    const allowed =
      (ALLOWED_ELEMENT_ATTRIBUTES as readonly string[]).includes(name) ||
      name.startsWith("data-indeks-");
    if (!allowed) continue;
    if (isSensitiveFieldName(attr.name)) {
      out[attr.name] = REDACTED;
    } else if (name === "href" || name === "src") {
      out[attr.name] = scrubUrl(attr.value);
    } else {
      out[attr.name] = redactText(attr.value);
    }
  }
  return out;
}
