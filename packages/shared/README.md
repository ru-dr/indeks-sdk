# @indeks/shared

Shared types, utilities, and constants for the Indeks SDK. Provides common interfaces, validation functions, and configuration types used across all Indeks packages.

## Installation

### From GitHub Packages
```bash
npm install @indeks/shared@npm:@indeks/shared@github:ru-dr/indeks-sdk
```

### From npm
```bash
npm install @indeks/shared
# or
yarn add @indeks/shared
# or
bun add @indeks/shared
```

## Overview

The shared package contains:

- **Type Definitions**: Comprehensive TypeScript interfaces for all event types
- **Configuration Types**: Strongly typed configuration options
- **Validation Utilities**: Input validation and sanitization functions
- **Constants**: Common constants and enumerations
- **Error Classes**: Custom error types for better error handling
- **Logger Utilities**: Structured logging utilities

## Event Types

### Core Event Interfaces

```typescript
import type {
  IndeksEvent,
  ClickEvent,
  ScrollEvent,
  PageViewEvent,
  FormSubmitEvent,
  ErrorEvent
} from "@indeks/shared";
```

### Session Events

```typescript
import type {
  SessionStartEvent,
  SessionEndEvent
} from "@indeks/shared";

interface SessionStartEvent {
  type: "session_start";
  timestamp: number;
  sessionId: string;
  userId: string;
  referrer?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  trafficSource?: {
    source: string;
    medium: string;
    campaign?: string;
  };
}
```

### Advanced Event Types

```typescript
import type {
  SearchEvent,
  RageClickEvent,
  FileDownloadEvent,
  PrintEvent,
  ShareEvent,
  ManualTrackingEvent
} from "@indeks/shared";
```

### Manual Tracking Schema

```typescript
import type { ManualTrackingSchema } from "@indeks/shared";

interface ManualTrackingSchema {
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  eventValue?: number;
  customData?: Record<string, any>;
  [key: string]: any;
}
```

## Configuration Types

```typescript
import type { IndeksConfig } from "@indeks/shared";

interface IndeksConfig {
  // Basic Events
  captureClicks?: boolean;
  captureScrolls?: boolean;
  capturePageViews?: boolean;
  captureFormSubmissions?: boolean;
  captureKeystrokes?: boolean;
  captureMouseMovements?: boolean;
  captureResizes?: boolean;
  captureErrors?: boolean;

  // Session & Navigation
  captureSessionEvents?: boolean;
  captureBeforeUnload?: boolean;
  captureVisibilityChange?: boolean;
  captureWindowFocus?: boolean;
  captureHashChange?: boolean;
  capturePopState?: boolean;

  // Advanced Events
  captureSearchEvents?: boolean;
  captureRageEvents?: boolean;
  captureDownloadEvents?: boolean;
  capturePrintEvents?: boolean;
  captureShareEvents?: boolean;

  // Mouse & Touch
  captureMouseHover?: boolean;
  captureContextMenu?: boolean;
  captureDoubleClick?: boolean;
  captureMousePress?: boolean;
  captureMouseWheel?: boolean;
  captureTouchEvents?: boolean;
  captureDragDrop?: boolean;

  // Input & Forms
  captureInputChanges?: boolean;
  captureFieldFocus?: boolean;
  captureClipboard?: boolean;
  captureTextSelection?: boolean;

  // Media & Performance
  captureMediaEvents?: boolean;
  captureNetworkStatus?: boolean;
  capturePageLoad?: boolean;
  captureFullscreenChange?: boolean;

  // Settings
  debounceMs?: number;
  enableConsoleLogging?: boolean;
}
```

## Validation Utilities

### Input Validation

```typescript
import { validateApiKey, validateConfig } from "@indeks/shared";

// Validate API key format
const isValidKey = validateApiKey("your-api-key");

// Validate configuration object
const validation = validateConfig({
  captureClicks: true,
  debounceMs: 100
});
```

### Data Sanitization

```typescript
import { sanitizeEventData, sanitizeUserInput } from "@indeks/shared";

// Remove sensitive data from events
const cleanEvent = sanitizeEventData({
  type: "click",
  password: "secret123", // This will be removed
  email: "user@example.com", // This will be removed
  buttonId: "submit-btn" // This stays
});

// Sanitize user input
const cleanInput = sanitizeUserInput("<script>alert('xss')</script>");
```

## Error Classes

```typescript
import {
  IndeksError,
  ValidationError,
  ConfigurationError,
  TrackingError
} from "@indeks/shared";

// Custom error types for better error handling
try {
  tracker.track(invalidEvent);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log("Validation failed:", error.message);
  } else if (error instanceof ConfigurationError) {
    console.log("Configuration error:", error.message);
  }
}
```

## Logger Utilities

```typescript
import { createLogger, LogLevel } from "@indeks/shared";

const logger = createLogger({
  level: LogLevel.DEBUG,
  prefix: "[Indeks]"
});

logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

## Constants

```typescript
import {
  EVENT_TYPES,
  MAX_EVENT_QUEUE_SIZE,
  DEFAULT_DEBOUNCE_MS,
  SENSITIVE_FIELD_NAMES
} from "@indeks/shared";

// Event type constants
console.log(EVENT_TYPES.CLICK); // "click"
console.log(EVENT_TYPES.SCROLL); // "scroll"

// Configuration defaults
console.log(DEFAULT_DEBOUNCE_MS); // 100
console.log(MAX_EVENT_QUEUE_SIZE); // 1000

// Privacy constants
console.log(SENSITIVE_FIELD_NAMES); // ["password", "email", "ssn", ...]
```

## Usage Examples

### Type-Safe Event Handling

```typescript
import type {
  IndeksEvent,
  ClickEvent,
  SessionStartEvent
} from "@indeks/shared";

function handleEvent(event: IndeksEvent) {
  switch (event.type) {
    case "click":
      const clickEvent = event as ClickEvent;
      console.log("Click on:", clickEvent.element.tagName);
      break;

    case "session_start":
      const sessionEvent = event as SessionStartEvent;
      console.log("New session:", sessionEvent.sessionId);
      break;
  }
}
```

### Configuration Validation

```typescript
import { validateConfig, IndeksConfig } from "@indeks/shared";

const userConfig: Partial<IndeksConfig> = {
  captureClicks: true,
  debounceMs: 50,
  enableConsoleLogging: true
};

const validation = validateConfig(userConfig);
if (validation.isValid) {
  console.log("Configuration is valid");
} else {
  console.log("Validation errors:", validation.errors);
}
```

### Custom Event Creation

```typescript
import type {
  ManualTrackingEvent,
  ManualTrackingSchema
} from "@indeks/shared";

const customEvent: ManualTrackingEvent = {
  type: "manual",
  timestamp: Date.now(),
  sessionId: "session-123",
  schema: {
    eventCategory: "user_interaction",
    eventAction: "button_click",
    eventLabel: "download_cta",
    customData: {
      buttonText: "Download Now",
      pageSection: "hero"
    }
  }
};
```

## TypeScript Support

All exports are fully typed with comprehensive JSDoc comments:

```typescript
import type {
  // Event Types
  IndeksEvent,
  ClickEvent,
  ScrollEvent,
  PageViewEvent,
  FormSubmitEvent,
  ErrorEvent,
  SessionStartEvent,
  SessionEndEvent,
  SearchEvent,
  RageClickEvent,
  FileDownloadEvent,
  PrintEvent,
  ShareEvent,
  ManualTrackingEvent,

  // Configuration
  IndeksConfig,

  // Utilities
  ValidationResult,
  LoggerConfig,

  // Errors
  IndeksError,
  ValidationError,
  ConfigurationError,
  TrackingError
} from "@indeks/shared";
```

## License

MIT

## Author

Team indeksModular</content>
<parameter name="filePath">d:\Los Pollos Hermanos\indeks-sdk\packages\shared\README.md