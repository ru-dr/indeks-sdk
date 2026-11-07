# @indeks/shared

Types and utilities shared by `@indeks/core` and `@indeks/react`. Most apps do not need to install it directly.

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
import { resolveConfig, scrubUrl } from "@indeks/shared";

resolveConfig({ apiKey: "key_1234567890", preset: "minimal" }).collectors.click; // true
scrubUrl("https://a.com/cb?token=x#access_token=y"); // "https://a.com/cb?token=%5Bredacted%5D"
```
