# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - Unreleased

A redesign of the SDK. See the migration table in the [README](README.md#migrating-from-1x).

### Added

- Collector architecture: every event kind is an independent collector, selectable with `preset` (`minimal`, `standard`, `full`) and `collectors`.
- `track(name, properties, options)`, `identify()`, `page()`, `reset()`, `optOut()` and `optIn()`. Calls made before initialization are buffered.
- `trackElements()` (the previous selector-based `track`), returning a function that stops it.
- `collectorOptions` to tune the `search` and `frustration` heuristics.
- Privacy options: `elementText`, `formValues`, `clipboardText`, `searchTerms`, `fingerprint`, `respectDoNotTrack`. Elements with `data-indeks-mask` are ignored.
- URL scrubbing (fragments, credentials, sensitive query values) and text redaction (emails, card numbers, tokens).
- Transport as a CORS simple request (`text/plain`, key in the body) with retry and backoff, offline buffering and `sendBeacon` on exit.
- Real session handling: 30 minute timeout, persisted counters, active time.
- Real INP, LCP, CLS, FCP and TTFB reporting.
- `@indeks/react`: `track`, `identify` and `page` on `useIndeks()`, and the debugger in its own entry point, `@indeks/react/debugger`.
- Script-tag build `indeks.global.js`.
- Documentation: collector protocol, generated event reference.
- Tooling: unit tests, real-browser tests (Chromium, Firefox, WebKit), ESLint, Prettier, `publint` and `attw` checks.

### Changed

- Configuration is grouped (`preset`, `collectors`, `privacy`, `collectorOptions`); `indeks(apiKey, config)` replaces the positional logging flag; `enableConsoleLogging` is now `debug`.
- Device details are sent once with `session_start` instead of with every event.
- Event types are prefixed `Indeks` (`IndeksClickEvent`, ...). Field focus events are `field_focus` and `field_blur`. `outbound_link.url` is `targetUrl`.
- `first_input_delay` is replaced by `interaction_to_next_paint`.
- Packages are dual ESM and CommonJS with bundled type declarations.
- The optional fingerprint library is now [ThumbmarkJS](https://www.thumbmarkjs.com), always started with its telemetry disabled. The script-tag build does not include it.
- The publish workflow runs lint, type, test and package checks first, publishes with provenance, and uses the `next` dist-tag for prereleases.

### Fixed

- iPhone and iPad were reported as macOS.
- Clicks and scrolls were never counted in session totals.
- Failed flushes were not retried until another event arrived.
- Page load events were missed when the tracker started after the load event.
- Non-pageview events used the current page as their referrer.
- Dead clicks were reported for elements that responded correctly.
- Outbound links were reported for `mailto:` and `tel:` links and for subdomains of the same site.
- OAuth tokens in URL fragments and sensitive query values could be sent.
- Text redaction could freeze the page for seconds on very large text blocks (quadratic regular expression); input is now bounded and the expression is linear.
- Event properties named `__proto__`, `constructor` or `prototype` are ignored instead of altering the sanitized object.
- Clicking a very large container no longer reads its full rendered text.
- Same-origin collector paths such as `/api/collect` are accepted as `endpoint`.
- The React provider and the debugger now share one context even when the package is bundled twice.
- StrictMode or a config change could leave `history.pushState` unpatched and silently stop SPA tracking; a tracker destroyed during start could keep running; `optIn()` did nothing after an opted-out load; calls made while opted out were replayed; sessions expired during activity that produced no events; offline persistence overwrote earlier batches and nothing flushed after reconnecting; visibility events missed the exit send; page time included hidden time and no `pageleave` was sent for the page a route change left; `reset()` skipped the session lifecycle; the React context kept stale ids and the debugger collapsed expanded rows.

### Security and privacy fixes from independent review

- Sensitive inputs no longer emit input events or lengths; printable keystrokes no longer carry `code`.
- URL scrubbing covers non-http schemes, emails and tokens in paths, email-valued parameters, search terms and more parameter names; field-name detection covers more names.
- Masked elements and masked content inside selections no longer leak through attributes, clipboard or selection text; page titles, campaign parameters, search filters, sort labels and selectors are redacted or gated.
- Events with values JSON cannot represent no longer block the send queue or break `destroy()`.
- Opt-out is complete: in-flight sends are dropped, identifiers are removed, `identify` is ignored, and an opt-out in another tab or a Do Not Track change is honored.

### Removed

- Automatic sending to `http://localhost:3000`; an `endpoint` is required.
- Unused storage adapters, utilities, error classes and constants.
