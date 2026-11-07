export const DEFAULTS = {
  preset: "standard",
  debounceMs: 100,
  idleTimeoutMs: 30000,
  scrollDepthThresholds: [25, 50, 75, 100],
  privacy: {
    respectDoNotTrack: true,
    elementText: true,
    formValues: false,
    clipboardText: false,
    searchTerms: false,
    fingerprint: false,
  },
} as const;

export const DEFAULT_COLLECTOR_OPTIONS = {
  search: {
    inputSelector:
      'input[type="search"], input[name*="search"], input[name*="query"], input[name="q"]',
    resultsCountSelector:
      ".results-count, .search-results-count, [data-results-count], .total-results",
    resultItemSelector: ".search-result, .result-item, .product-item, .item",
  },
  frustration: {
    rageClickCount: 3,
    rageClickWindowMs: 2000,
    deadClickWindowMs: 500,
    clickableSelector: ".btn, .button, .clickable",
  },
} as const;

export const PRIVACY_SENSITIVE_COLLECTORS = [
  "keystroke",
  "mouseMove",
  "clipboard",
  "textSelection",
  "inputChange",
  "formSubmit",
] as const;

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const STORAGE_KEYS = {
  EVENTS: "indeks_events",
  USER_ID: "indeks_user_id",
  LAST_VISIT: "indeks_last_visit",
  LAST_SEARCH: "indeks_last_search",
  OPT_OUT: "indeks_opt_out",
  EXTERNAL_ID: "indeks_external_id",
  SESSION_ID: "indeks_session_id",
} as const;

export const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 50,
  AUTO_FLUSH_INTERVAL: 5000,
  MAX_BATCH_SIZE: 100,
  MIN_BATCH_SIZE: 1,
  MAX_QUEUE_SIZE: 1000,
  MAX_EVENT_QUEUE_SIZE: 1000,
  RETRY_BASE_MS: 1000,
  RETRY_MAX_MS: 30000,
  KEEPALIVE_MAX_BODY_BYTES: 60000,
  MAX_PERSISTED_EVENTS: 500,
} as const;

export const SENSITIVE_FIELD_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "apikey",
  "authorization",
  "bearer",
  "csrf",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "socialsecurity",
  "taxid",
  "creditcard",
  "cardnumber",
  "cardnum",
  "cardexpiry",
  "accountnumber",
  "routingnumber",
  "dateofbirth",
  "birthdate",
  "passport",
  "nationalid",
  "driverslicense",
  "licensenumber",
  "mothersmaiden",
  "securityanswer",
  "onetimecode",
  "streetaddress",
  "postalcode",
  "zipcode",
  "emailaddress",
  "ccnumber",
  "cardno",
  "securitycode",
  "expdate",
  "sessionid",
  "authkey",
  "credential",
  "birthday",
  "passcode",
  "taxnumber",
  "mobile",
  "address",
  "username",
  "fullname",
  "phonenumber",
  "telephone",
  "email",
  "phone",
] as const;

export const SENSITIVE_FIELD_SEGMENTS = [
  "pwd",
  "pin",
  "ssn",
  "ein",
  "dob",
  "cc",
  "cvv",
  "cvc",
  "otp",
  "iban",
  "token",
  "zip",
  "tel",
  "postal",
  "expiry",
  "cardholder",
  "jwt",
  "pass",
  "mail",
  "auth",
  "ticket",
] as const;

export const SENSITIVE_FIELD_NAMES = [
  ...SENSITIVE_FIELD_SUBSTRINGS,
  ...SENSITIVE_FIELD_SEGMENTS,
] as const;

export const SENSITIVE_QUERY_PARAMS = [
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "code",
  "state",
  "session",
  "sid",
  "key",
  "api_key",
  "apikey",
  "password",
  "email",
  "signature",
  "sig",
  "session_id",
  "sessionid",
  "auth",
  "auth_key",
  "authkey",
  "jwt",
  "ticket",
  "credential",
  "passcode",
  "pass",
  "q",
  "query",
  "search",
  "s",
  "keyword",
  "keywords",
  "term",
  "terms",
  "text",
] as const;

export const SAFE_QUERY_PARAMS = ["ref", "referrer", "source"] as const;

export const REDACTED = "[redacted]";

export const ALLOWED_ELEMENT_ATTRIBUTES = [
  "id",
  "class",
  "href",
  "src",
  "alt",
  "title",
  "type",
  "role",
  "name",
  "aria-label",
  "data-testid",
] as const;

export const VALIDATION = {
  MIN_API_KEY_LENGTH: 10,
  MAX_DEBOUNCE_MS: 10000,
  MAX_IDLE_TIMEOUT_MS: 3600000,
  MAX_TEXT_LENGTH: 100,
  MAX_SELECTION_LENGTH: 200,
} as const;
