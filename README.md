<div align="center">

[![INDEKS-dark.png](https://i.postimg.cc/V6gwJfqT/INDEKS-dark.png)](https://postimg.cc/jwDm9rkQ)

A lightweight, modular web analytics SDK for tracking user behavior and events on your website.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange?style=flat-square&logo=bun)](https://bun.sh)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

## Installation

### From npm

```bash
npm install @indeks/core @indeks/react
```

### From GitHub Packages

```bash
npm install @indeks/core@npm:@indeks/core@github:ru-dr/indeks-sdk
npm install @indeks/react@npm:@indeks/react@github:ru-dr/indeks-sdk
```

Or using bun:

```bash
bun add @indeks/core @indeks/react
```

## Usage

### Vanilla TypeScript

```typescript
import indeks from "@indeks/core";
const tracker = indeks("api_key", true);
```

### React

```tsx
import { Indeks, useIndeks } from "@indeks/react";

export default function App() {
  return (
    <Indeks apiKey="api_key" enableConsoleLogging>
      <Dashboard />
    </Indeks>
  );
}
```

## Configuration

```typescript
import indeks from "@indeks/core";

const tracker = indeks("api_key", true, {
  // Event capture
  captureClicks: true,
  captureScrolls: true,
  capturePageViews: true,
  captureFormSubmissions: true,
  captureErrors: true,
  captureResizes: true,

  // Privacy controls
  captureKeystrokes: false,
  captureMouseMovements: false,

  // Performance
  debounceMs: 100,

  // Development
  enableConsoleLogging: true,
});

// Runtime controls
tracker.updateConfig({ captureKeystrokes: true });
tracker.getEvents(); // Retrieve captured events
tracker.clearEvents(); // Clear event queue
tracker.destroy(); // Cleanup listeners
```

## Packages

```
@indeks/core      # Core tracking engine
@indeks/react     # React hooks & provider
@indeks/shared    # Shared types & utilities
```

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build:all

# Build specific package
bun run build:core
bun run build:react

# Development mode
bun run dev
```

## Event Schema

```typescript
interface ClickEvent {
  type: "click";
  timestamp: number;
  element: { tagName: string; id: string; className: string };
  coordinates: { x: number; y: number };
  sessionId: string;
}

// ScrollEvent, PageViewEvent, FormSubmitEvent, ErrorEvent...
```

## Privacy

Auto-excludes passwords and sensitive data. Events stored client-side by default.
