# @indeks/core

Framework-agnostic tracker for the Indeks SDK.

```bash
npm install @indeks/core
```

```ts
import { indeks } from "@indeks/core";

const tracker = indeks("YOUR_PROJECT_KEY", {
  endpoint: "https://analytics.example.com/api/v1/collect",
  preset: "standard",
  debug: false,
});
```

`indeks()` creates a tracker and starts it once the DOM is ready. Use `new IndeksTracker(config)` and `await tracker.init()` if you want to control startup yourself. The constructor throws if the configuration is invalid.

## Script tag

`dist/indeks.global.js` (about 20 kB gzipped) is a minified build that exposes `window.indeks` and `window.IndeksTracker` when the script tag has `data-indeks-global`:

```html
<script src="/indeks.global.js" data-indeks-global></script>
<script>
  indeks("YOUR_PROJECT_KEY", { endpoint: "https://analytics.example.com/api/v1/collect" });
</script>
```

The script-tag build cannot use `privacy.fingerprint`, because the optional fingerprint library is not bundled into it. Use the npm packages if you need it.

## Tracker API

| Method | Description |
| --- | --- |
| `track(name, properties?, { category, value, label }?)` | Send a custom event. Properties are sanitized. Calls made before `init()` finishes are buffered. |
| `trackElements({ selectors, eventType?, eventName?, properties? })` | Send a custom event when matching elements receive an event (default `click`). Returns a function that stops tracking. |
| `identify(id, traits?)` | Attach your own user id to all later events and send an `identify` event. Persisted in `localStorage`. |
| `page(name?, properties?)` | Send a manual page view (useful when the `pageview` collector is off). |
| `reset()` | Forget the identified user and start a new anonymous user and session (for logout). |
| `optOut()` / `optIn()` / `isOptedOut()` | Persistent opt-out. `optOut()` stops collection and deletes buffered events. |
| `updateConfig({ privacy, debug })` | Make privacy stricter or toggle debug logging at runtime. Privacy can never be loosened after start. |
| `flush()` / `destroy()` | Send queued events now / remove every listener and stop. |
| `getEvents()` / `clearEvents()` | Inspect or clear the in-memory debug buffer. |
| `getSessionId()` / `getUserId()` / `getExternalUserId()` / `getDeviceInfo()` | Read identity and device info. |

## Configuration

```ts
interface IndeksConfig {
  apiKey: string;
  endpoint?: string;            // absolute URL or same-origin path such as "/api/collect"; required to send events
  localOnly?: boolean;          // track but never send
  debug?: boolean;              // console logging
  preset?: "minimal" | "standard" | "full"; // default "standard"
  collectors?: Partial<Record<CollectorName, boolean>>;
  privacy?: PrivacyConfig;
  collectorOptions?: CollectorOptions; // tune the heuristic collectors
  debounceMs?: number;          // default 100
  idleTimeoutMs?: number;       // default 30000
  scrollDepthThresholds?: number[]; // default [25, 50, 75, 100]
}
```

### Collectors

| Group | Names |
| --- | --- |
| Interaction | `click`, `doubleClick`, `contextMenu`, `mousePress`, `hover`, `mouseMove`, `wheel`, `touch`, `dragDrop`, `keystroke` |
| Engagement | `scroll`, `scrollDepth`, `resize`, `fullscreen`, `orientation`, `idle` |
| Navigation | `pageview`, `pageLoad`, `pageLeave`, `pageLifecycle`, `beforeUnload`, `hashChange`, `popState`, `visibility`, `windowFocus`, `tabFocus`, `session` |
| Forms | `formSubmit`, `inputChange`, `fieldFocus`, `formAbandon`, `formError`, `clipboard`, `textSelection`, `search` |
| Links | `download`, `outboundLink`, `print`, `share` |
| Frustration | `frustration` (rage clicks, dead clicks, error clicks) |
| Media | `media`, `mediaProgress` |
| Reliability | `error`, `resourceError`, `networkStatus`, `networkChange`, `performance` (FCP, LCP, CLS, INP, TTFB) |

`search` and `frustration` are heuristic collectors. They infer intent from common markup and timing, so treat their output as a signal and tune them with `collectorOptions` for your site:

```ts
collectorOptions: {
  search: {
    inputSelector: "#site-search",        // default: input[type=search], [name*=search], [name*=query], [name=q]
    resultsCountSelector: ".hit-count",   // element whose text contains the number of results
    resultItemSelector: ".hit",           // fallback: count matching elements
  },
  frustration: {
    rageClickCount: 3,                    // clicks on one element ...
    rageClickWindowMs: 2000,              // ... within this window
    deadClickWindowMs: 500,               // no DOM change or navigation within this time = dead click
    clickableSelector: ".btn, .card",     // elements that look clickable besides cursor: pointer
  },
}
```

Traffic source on `session_start` follows fixed rules: a paid `utm_medium` (cpc, ppc, paid, ...) is `paid`; email medium or source is `email`; social medium or known social source is `social`; any other `utm_source` is `other`; otherwise the referrer decides (same site or none is `direct`, search engines `organic`, social networks `social`, anything else `referral`).

Presets: `minimal` (click, pageview, session, error, pageLeave, scrollDepth, outboundLink, download, performance), `standard` (everything except `keystroke`, `mouseMove`, `hover`, `mousePress`, `textSelection`), `full` (everything). Collectors are fixed when the tracker starts.

### Privacy

| Option | Default | Effect |
| --- | --- | --- |
| `respectDoNotTrack` | `true` | Do nothing if Do Not Track or Global Privacy Control is on |
| `elementText` | `true` | Include (redacted) text of clicked elements |
| `formValues` | `false` | Include non-sensitive form values (`[len:n]` otherwise) |
| `clipboardText` | `false` | Include copied or selected text |
| `searchTerms` | `false` | Include search queries |
| `fingerprint` | `false` | Use a [ThumbmarkJS](https://www.thumbmarkjs.com) (MIT) browser fingerprint as the anonymous user id. Install `@thumbmarkjs/thumbmarkjs` (optional peer dependency). Indeks always creates it with `logging: false` and no API key, so it makes no network calls. Fingerprinting is still tracking: get consent where the law requires it. |

What is always applied:

- URLs: fragments (except hash-router routes), credentials, and values of sensitive query params (`token`, `code`, `email`, ...) are removed.
- Free text (element text, errors, share text) is redacted for emails, card numbers, JWTs and bearer tokens.
- Password, email, tel, number and similar fields are never recorded, and sensitive field names are shown as `[redacted]`.
- Add `data-indeks-mask` (or `data-indeks-ignore`) to an element to drop its text and ignore its fields.
- Custom event and `identify` properties with sensitive key names are redacted.

## Events and transport

Every event has `type`, `timestamp`, `url`, `userAgent`, `sessionId`, `userId` and optionally `referrer` and `externalUserId`. `session_start` also carries the device details. Events are batched (50 per batch, flushed every 5 s), sent as `text/plain` JSON `{ apiKey, events }`, retried with backoff on 5xx/429/408, dropped on other 4xx, and flushed with `sendBeacon` when the page is hidden or unloaded. If the browser is offline, events are kept in `localStorage` and restored on the next visit.

Sessions end after 30 minutes without activity. `session_end` is sent when the page is hidden or unloaded and carries the latest totals for that session, so use the last one per `sessionId`.
