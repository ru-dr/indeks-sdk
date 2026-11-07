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

const MAX_STRING_LENGTH = 4000;
const MAX_ARRAY_LENGTH = 100;

export function sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet<object>();

  const walk = (value: unknown, depth: number): unknown => {
    switch (typeof value) {
      case "string":
        return redactText(value).slice(0, MAX_STRING_LENGTH);
      case "bigint":
        return value.toString();
      case "function":
      case "symbol":
      case "undefined":
        return undefined;
      case "number":
      case "boolean":
        return value;
    }
    if (value === null) return null;
    if (depth >= MAX_SANITIZE_DEPTH) return REDACTED;
    const object = value as object;
    if (seen.has(object)) return "[circular]";
    seen.add(object);

    if (object instanceof Date) {
      return Number.isNaN(object.getTime()) ? null : object.toISOString();
    }
    if (object instanceof Error) {
      return { name: object.name, message: redactText(object.message) };
    }
    if (Array.isArray(object)) {
      return object.slice(0, MAX_ARRAY_LENGTH).map((item) => walk(item, depth + 1) ?? null);
    }

    let entries: Array<[string, unknown]>;
    try {
      entries = Object.entries(object);
    } catch {
      return "[unserializable]";
    }
    const out: Record<string, unknown> = {};
    let keyCount = 0;
    for (const [key, child] of entries) {
      if (UNSAFE_KEYS.has(key)) continue;
      if (++keyCount > MAX_SANITIZE_KEYS) break;
      const sanitized = isSensitiveFieldName(key) ? REDACTED : walk(child, depth + 1);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  };

  if (!data || typeof data !== "object") return {};
  const result = walk(data, 0);
  return result && typeof result === "object" ? (result as Record<string, unknown>) : {};
}

export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") return false;
  const trimmed = apiKey.trim();
  return trimmed.length >= VALIDATION.MIN_API_KEY_LENGTH;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}\.[A-Z]{2,24}/gi;
const EMAIL_ANYWHERE = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}\.[A-Z]{2,24}/i;
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]{32,}$/;
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
  for (const [key, value] of Array.from(params.entries())) {
    if (isScrubbableParam(key) || EMAIL_ANYWHERE.test(value)) params.set(key, REDACTED);
  }
}

function looksLikeToken(segment: string): boolean {
  return TOKEN_SEGMENT.test(segment) && /\d/.test(segment) && /[A-Za-z]/.test(segment);
}

function scrubPath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        decoded = segment;
      }
      return EMAIL_ANYWHERE.test(decoded) || looksLikeToken(decoded) ? REDACTED : segment;
    })
    .join("/");
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
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${parsed.protocol}${REDACTED}`;
  }
  parsed.username = "";
  parsed.password = "";
  parsed.pathname = scrubPath(parsed.pathname);
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

const TEXT_ATTRIBUTES = new Set(["alt", "title", "aria-label"]);

export function filterElementAttributes(
  attributes: Array<{ name: string; value: string }>,
  options: { includeText?: boolean } = {},
): Record<string, string> {
  const includeText = options.includeText !== false;
  const out: Record<string, string> = {};
  for (const attr of attributes) {
    const name = attr.name.toLowerCase();
    if (name === "value") continue;
    if (!includeText && TEXT_ATTRIBUTES.has(name)) continue;
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
