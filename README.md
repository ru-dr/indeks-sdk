# Indeks SDK

Privacy-first web analytics SDK for self-hosted [Indeks](https://github.com/ru-dr/indeks). It tracks page views, clicks, scroll depth, forms, errors, performance and more, and sends batched events to your own collector.

| Package | What it is |
| --- | --- |
| [`@indeks/core`](packages/core) | Framework-agnostic tracker (`indeks()`, `IndeksTracker`, script-tag build) |
| [`@indeks/react`](packages/react) | `<Indeks>` provider, `useIndeks()` hook and an optional debugger |
| [`@indeks/shared`](packages/shared) | Types, config resolution, sanitizers and device parsing used by both |

More documentation: [collector protocol](docs/protocol.md), [event reference](docs/events.md), [changelog](CHANGELOG.md), [contributing](CONTRIBUTING.md), [security policy](SECURITY.md).

## Quick start

```bash
npm install @indeks/core
```

```ts
import { indeks } from "@indeks/core";

const tracker = indeks("YOUR_PROJECT_KEY", {
  endpoint: "https://analytics.example.com/api/v1/collect",
});

tracker.track("signup", { plan: "pro" });
tracker.identify("user-42", { plan: "pro" });
```

There is no default server: `endpoint` is required for events to be sent. React users should read the [`@indeks/react`](packages/react) README.

## Browser support

The packages target ES2020, which means Chrome and Edge 80+, Firefox 78+ and Safari 13.1+. Browser APIs that are not everywhere degrade gracefully: if a collector's API is missing (for example Event Timing, the Page Lifecycle API or the Network Information API), that collector does nothing and the rest keep working. End-to-end tests run against current Chromium, Firefox and WebKit in CI.

Bundle size (gzipped): the script-tag build is about 23 kB, and CI fails if it exceeds 24 kB.

## Design

- **Collectors.** Every kind of event is an independent collector (`click`, `scrollDepth`, `performance`, ...). Choose a preset (`minimal`, `standard`, `full`) and override single collectors.
- **Privacy by default.** URLs are scrubbed (fragments, credentials and sensitive query values removed), free text is redacted for emails, card numbers and tokens, form values are never sent unless enabled, and Do Not Track / Global Privacy Control are honored.
- **Simple requests.** Events are posted as `text/plain` with the key in the body, so browsers send no CORS preflight, and `sendBeacon` is used on page exit.
- **Small payloads.** Device details are sent once with `session_start`, not with every event.

## Migrating from 1.x

| 1.x | 2.x |
| --- | --- |
| `indeks(key, true, config)` | `indeks(key, { debug: true, ...config })` |
| `captureClicks: false`, `captureXxx` flags | `collectors: { click: false }` or `preset` |
| `captureFormValues`, `captureClipboardText`, `captureSearchTerms`, `useFingerprint`, `respectDoNotTrack` | `privacy: { formValues, clipboardText, searchTerms, fingerprint, respectDoNotTrack }` |
| `enableConsoleLogging` | `debug` |
| `tracker.track({ selectors })` | `tracker.trackElements({ selectors })`; `tracker.track(name, props)` sends a custom event |
| `import { IndeksDebugger } from "@indeks/react"` | `import { IndeksDebugger } from "@indeks/react/debugger"` |
| Event types `ClickEvent`, `ErrorEvent`, ... | `IndeksClickEvent`, `IndeksErrorEvent`, ... |
| `device` on every event | `device` on `session_start` only |
| `field` focus events `focus` / `blur` | `field_focus` / `field_blur` (window `focus` / `blur` unchanged) |
| `outbound_link.url` | `outbound_link.targetUrl` |
| `first_input_delay`, `time_to_interactive` | `interaction_to_next_paint` |
| Auto-send to `localhost:3000` | Removed, set `endpoint` |

## Development

```bash
bun install
bun run build:all   # shared -> core -> react
bun run typecheck
bun test            # happy-dom based unit tests
bun run e2e         # real-browser tests (Chromium, Firefox, WebKit) against a local collector
bun run release minor --dry-run
```

Requires Bun 1.1 or newer. Releases are created with `scripts/release.ts`, which bumps all packages, commits and tags; the publish workflow runs when the commit message contains `[publish]`.

## License

MIT
