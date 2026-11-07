<p align="center">
  <a href="https://github.com/ru-dr/indeks-sdk">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ru-dr/indeks-sdk/main/assets/logo-sdk-dark.svg">
      <img src="https://raw.githubusercontent.com/ru-dr/indeks-sdk/main/assets/logo-sdk-light.svg" alt="Indeks SDK" width="420">
    </picture>
  </a>
</p>

<p align="center">Privacy-first web analytics SDK for self-hosted Indeks.</p>

<p align="center">
  <a href="https://github.com/ru-dr/indeks-sdk/actions/workflows/ci.yml"><img alt="CI" src="https://shieldcn.dev/github/ci/ru-dr/indeks-sdk.svg"></a>
  <a href="https://github.com/ru-dr/indeks-sdk/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/ru-dr/indeks-sdk.svg"></a>
  <a href="https://github.com/ru-dr/indeks-sdk/releases"><img alt="Release" src="https://shieldcn.dev/github/release/ru-dr/indeks-sdk.svg"></a>
  <a href="https://www.npmjs.com/package/@useindeks/core"><img alt="@useindeks/core on npm" src="https://shieldcn.dev/npm/@useindeks/core.svg"></a>
  <a href="https://www.npmjs.com/package/@useindeks/react"><img alt="@useindeks/react on npm" src="https://shieldcn.dev/npm/@useindeks/react.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://shieldcn.dev/badge/TypeScript-7-blue.svg?logo=typescript"></a>
  <a href="https://bun.sh"><img alt="Bun" src="https://shieldcn.dev/badge/Bun-latest-black.svg?logo=bun"></a>
  <a href="https://nodejs.org"><img alt="Node.js" src="https://shieldcn.dev/badge/Node-22%2B-green.svg?logo=nodedotjs"></a>
</p>

# Indeks SDK

Privacy-first web analytics SDK for self-hosted [Indeks](https://github.com/ru-dr/indeks). It tracks page views, clicks, scroll depth, forms, errors, performance and more, and sends batched events to your own collector.

| Package | What it is |
| --- | --- |
| [`@useindeks/core`](packages/core) | Framework-agnostic tracker (`indeks()`, `IndeksTracker`, script-tag build) |
| [`@useindeks/react`](packages/react) | `<Indeks>` provider, `useIndeks()` hook and an optional debugger |
| [`@useindeks/shared`](packages/shared) | Types, config resolution, sanitizers and device parsing used by both |

More documentation: [collector protocol](docs/protocol.md), [event reference](docs/events.md), [changelog](CHANGELOG.md), [contributing](CONTRIBUTING.md), [security policy](SECURITY.md).

## Quick start

```bash
npm install @useindeks/core
```

```ts
import { indeks } from "@useindeks/core";

const tracker = indeks("YOUR_PROJECT_KEY", {
  endpoint: "https://analytics.example.com/api/v1/collect",
});

tracker.track("signup", { plan: "pro" });
tracker.identify("user-42", { plan: "pro" });
```

There is no default server: `endpoint` is required for events to be sent. React users should read the [`@useindeks/react`](packages/react) README.

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
| `import { IndeksDebugger } from "@useindeks/react"` | `import { IndeksDebugger } from "@useindeks/react/debugger"` |
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

Requires the latest Bun and Node.js 22 or newer. Releases are created with `scripts/release.ts`, which bumps all packages, commits and tags; the publish workflow runs when the commit message contains `[publish]`.

## License

MIT
