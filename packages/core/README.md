# @indeks/core

The core analytics engine for the Indeks SDK. Provides comprehensive browser event tracking and user behavior analytics with automatic and manual event capture capabilities.

## Installation

### From GitHub Packages

```bash
npm install @indeks/core@npm:@indeks/core@github:ru-dr/indeks-sdk
```

### From npm

```bash
npm install @indeks/core
# or
yarn add @indeks/core
# or
bun add @indeks/core
```

## Quick Start

```typescript
import indeks from "@indeks/core";

// Initialize the tracker
const tracker = indeks("your-api-key", true, {
  // Enable automatic event capture
  captureClicks: true,
  captureScrolls: true,
  capturePageViews: true,
  captureSessionEvents: true,
  captureSearchEvents: true,
  captureRageEvents: true,
  captureDownloadEvents: true,
  capturePrintEvents: true,
  captureShareEvents: true,
});

// Manual event tracking
tracker.track({
  type: "manual",
  eventName: "button_click",
  properties: {
    buttonId: "signup-btn",
    page: "/landing",
    userType: "new",
  },
});

// Access tracked events
const events = tracker.getEvents();
console.log(`Captured ${events.length} events`);

// Control tracking
tracker.updateConfig({ captureClicks: false });
tracker.clearEvents();
tracker.destroy();
```

## Complete Event Capture Strategy

The Indeks SDK provides comprehensive automatic event tracking:

### Session Events

- **Session Start**: Tracks when users begin their session
- **Session End**: Captures session termination events

### User Interaction Events

- **Click Events**: All user clicks with element details
- **Scroll Events**: Scroll behavior and depth tracking
- **Form Submissions**: Form interaction and submission tracking
- **Input Changes**: Real-time input field monitoring

### Navigation Events

- **Page Views**: Automatic page view tracking
- **Before Unload**: Exit intent detection
- **Visibility Changes**: Tab switching and focus events
- **Hash Changes**: SPA navigation tracking

### Advanced Events

- **Search Events**: Search query capture and analysis
- **Rage Events**: Rapid clicking and frustration detection
- **Download Events**: File download tracking
- **Print Events**: Print action monitoring
- **Share Events**: Social sharing and link sharing

### Manual Event Tracking

For custom events and schema-based tracking:

```typescript
// Schema-based manual tracking
tracker.track({
  type: "manual",
  schema: {
    eventCategory: "user_action",
    eventAction: "purchase",
    eventLabel: "premium_plan",
    customData: {
      planId: "premium-monthly",
      price: 29.99,
      currency: "USD",
    },
  },
});
```

## Configuration Options

```typescript
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

## API Reference

### Core Functions

#### `indeks(apiKey, enableLogging?, config?)`

Creates and initializes a new tracker instance.

**Parameters:**

- `apiKey` (string): Your Indeks API key
- `enableLogging` (boolean, optional): Enable console logging
- `config` (IndeksConfig, optional): Configuration options

**Returns:** `IndeksTracker` instance

### IndeksTracker Methods

#### `track(event)`

Manually track a custom event.

```typescript
tracker.track({
  type: "manual",
  eventName: "custom_event",
  properties: {
    /* your data */
  },
});
```

#### `getEvents()`

Retrieve all captured events.

**Returns:** `IndeksEvent[]`

#### `clearEvents()`

Clear the event queue.

#### `updateConfig(config)`

Update tracker configuration at runtime.

#### `destroy()`

Clean up listeners and destroy the tracker.

## TypeScript Support

Fully typed with comprehensive interfaces:

```typescript
import type {
  IndeksConfig,
  IndeksEvent,
  ClickEvent,
  SessionStartEvent,
  ManualTrackingEvent,
  // ... and many more
} from "@indeks/core";
```

## Privacy & Security

- **No sensitive data capture**: Automatically excludes passwords and sensitive fields
- **Client-side storage**: Events stored locally by default
- **Configurable tracking**: Enable/disable any event type
- **Debounced events**: Prevents event spam with configurable delays

## Examples

### E-commerce Tracking

```typescript
const tracker = indeks("api-key", false, {
  captureClicks: true,
  captureFormSubmissions: true,
  captureSessionEvents: true,
});

// Track product views
tracker.track({
  type: "manual",
  eventName: "product_view",
  properties: {
    productId: "prod-123",
    productName: "Premium Widget",
    category: "electronics",
  },
});

// Track purchases
tracker.track({
  type: "manual",
  eventName: "purchase",
  properties: {
    transactionId: "txn-456",
    revenue: 99.99,
    items: ["prod-123", "prod-789"],
  },
});
```

### Error Monitoring

```typescript
// Automatic error capture
const tracker = indeks("api-key", true, {
  captureErrors: true,
});

// Manual error reporting
try {
  riskyOperation();
} catch (error) {
  tracker.track({
    type: "manual",
    eventName: "error",
    properties: {
      errorMessage: error.message,
      errorStack: error.stack,
      userAgent: navigator.userAgent,
    },
  });
}
```

## License

MIT

## Author

Team indeksModular</content>
<parameter name="filePath">d:\Los Pollos Hermanos\indeks-sdk\packages\core\README.md
