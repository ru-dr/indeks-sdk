<p align="center">
  <a href="https://github.com/ru-dr/indeks-sdk">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ru-dr/indeks-sdk/main/assets/logo-sdk-dark.svg">
      <img src="https://raw.githubusercontent.com/ru-dr/indeks-sdk/main/assets/logo-sdk-light.svg" alt="Indeks SDK" width="420">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@useindeks/shared"><img alt="@useindeks/shared on npm" src="https://shieldcn.dev/npm/@useindeks/shared.svg"></a>
  <a href="https://www.npmjs.com/package/@useindeks/shared"><img alt="@useindeks/shared downloads" src="https://shieldcn.dev/npm/dw/@useindeks/shared.svg"></a>
  <a href="https://www.npmjs.com/package/@useindeks/shared"><img alt="@useindeks/shared types" src="https://shieldcn.dev/npm/types/@useindeks/shared.svg"></a>
  <a href="https://github.com/ru-dr/indeks-sdk/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/ru-dr/indeks-sdk.svg"></a>
  <a href="https://github.com/ru-dr/indeks-sdk/actions/workflows/ci.yml"><img alt="CI" src="https://shieldcn.dev/github/ci/ru-dr/indeks-sdk.svg"></a>
</p>

# @useindeks/shared

Types and utilities shared by `@useindeks/core` and `@useindeks/react`. Most apps do not need to install it directly.

## Exports

| Area | Exports |
| --- | --- |
| Config | `IndeksConfig`, `ResolvedConfig`, `PrivacyConfig`, `CollectorName`, `CapturePreset`, `COLLECTOR_NAMES`, `resolveConfig()`, `presetCollectors()`, `validateConfig()` |
| Events | `IndeksEvent` (union of all `Indeks*Event` types), `IndeksBaseEvent`, `ElementRef`, `DeviceData`, `ManualTrackingSchema`, `validateEventData()` |
| Privacy | `scrubUrl()`, `scrubHash()`, `pathAndSearch()`, `redactText()`, `sanitizeEventData()`, `sanitizeUserInput()`, `filterElementAttributes()`, `isSensitiveFieldName()`, `REDACTED` |
| Device | `getDeviceInfo()` (browser, OS, device type, bot detection from the user agent) |
| Utilities | `debounce()`, `generateId()`, `generateUuid()`, `safeJsonParse()`, `isValidUrl()`, `Logger`, `LogLevel` |
| Constants | `DEFAULTS`, `SESSION_TIMEOUT_MS`, `BATCH_CONFIG`, `STORAGE_KEYS`, `PRIVACY_SENSITIVE_COLLECTORS` |

```ts
import { resolveConfig, scrubUrl } from "@useindeks/shared";

resolveConfig({ apiKey: "key_1234567890", preset: "minimal" }).collectors.click; // true
scrubUrl("https://a.com/cb?token=x#access_token=y"); // "https://a.com/cb?token=%5Bredacted%5D"
```
