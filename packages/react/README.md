# @indeks/react

React hooks and components for the Indeks analytics SDK. Provides easy-to-use React integration for browser event tracking and user behavior analytics.

## Installation

```bash
npm install @indeks/react
# or
yarn add @indeks/react
# or
bun add @indeks/react
```

## Quick Start

### 1. Wrap your app with IndeksProvider

```tsx
import { IndeksProvider } from "@indeks/react";

function App() {
  return (
    <IndeksProvider
      apiKey="your-api-key"
      enableConsoleLogging={process.env.NODE_ENV === "development"}
      config={{
        captureClicks: true,
        captureScrolls: true,
        capturePageViews: true,
        captureFormSubmissions: true,
      }}
    >
      <YourApp />
    </IndeksProvider>
  );
}
```

### 2. Use hooks in your components

```tsx
import { useIndeks } from "@indeks/react";

function MyComponent() {
  const { tracker, isInitialized, sessionId, userId } = useIndeks();

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  const handleClick = () => {
    // Access tracker directly for custom events
    console.log("Current session:", sessionId);
    console.log("User ID:", userId);
  };

  return (
    <div>
      <p>Session: {sessionId}</p>
      <p>User: {userId}</p>
      <button onClick={handleClick}>Log Info</button>
    </div>
  );
}
```

## API Reference

### Components

#### `IndeksProvider`

Provider component that initializes the tracker and makes it available to child components.

**Props:**

- `apiKey` (string, required): Your Indeks API key
- `config` (Partial<IndeksConfig>, optional): Configuration options
- `enableConsoleLogging` (boolean, optional): Enable console logging for debugging
- `children` (ReactNode, required): Child components

#### `IndeksDebugger`

Debug component to visualize tracked events in development.

**Props:**

- `position` ('top-right' | 'top-left' | 'bottom-right' | 'bottom-left', optional): Position of debugger panel
- `refreshInterval` (number, optional): Auto-refresh interval in milliseconds
- `maxEvents` (number, optional): Maximum number of events to display

**Example:**

```tsx
{
  process.env.NODE_ENV === "development" && (
    <IndeksDebugger position="bottom-right" refreshInterval={1000} />
  );
}
```

### Hooks

#### `useIndeks()`

Main hook to access the Indeks tracker instance and state.

**Returns:**

- `tracker`: The IndeksTracker instance (use tracker methods directly)
- `isInitialized`: Whether the tracker is initialized
- `sessionId`: Current session ID
- `userId`: Current user ID

**Example:**

```tsx
const { tracker, isInitialized, sessionId, userId } = useIndeks();

// Access all tracker methods
const events = tracker?.getEvents();
tracker?.clearEvents();
tracker?.updateConfig({ captureClicks: false });
```

## Configuration Options

The `config` prop accepts all options from `@indeks/core`:

```typescript
{
  // Basic Events
  captureClicks: boolean;
  captureScrolls: boolean;
  capturePageViews: boolean;
  captureFormSubmissions: boolean;
  captureKeystrokes: boolean;
  captureMouseMovements: boolean;
  captureResizes: boolean;
  captureErrors: boolean;

  // Navigation Events
  captureBeforeUnload: boolean;
  captureVisibilityChange: boolean;
  captureWindowFocus: boolean;
  captureHashChange: boolean;
  capturePopState: boolean;

  // Mouse & Touch Events
  captureMouseHover: boolean;
  captureContextMenu: boolean;
  captureDoubleClick: boolean;
  captureMousePress: boolean;
  captureMouseWheel: boolean;
  captureTouchEvents: boolean;
  captureDragDrop: boolean;

  // Input & Form Events
  captureInputChanges: boolean;
  captureFieldFocus: boolean;
  captureClipboard: boolean;
  captureTextSelection: boolean;

  // Media Events
  captureMediaEvents: boolean;

  // Network & Performance
  captureNetworkStatus: boolean;
  capturePageLoad: boolean;

  // UI Interaction
  captureFullscreenChange: boolean;

  // Performance
  debounceMs: number;
}
```

## TypeScript Support

All hooks and components are fully typed with TypeScript.

```tsx
import type {
  IndeksConfig,
  IndeksEvent,
  ClickEvent,
  ScrollEvent,
} from "@indeks/react";
```

## Examples

### Basic Usage

```tsx
import { IndeksProvider, useIndeks } from "@indeks/react";

function App() {
  return (
    <IndeksProvider apiKey="your-api-key">
      <Dashboard />
    </IndeksProvider>
  );
}

function Dashboard() {
  const { tracker, sessionId, userId, isInitialized } = useIndeks();

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Session: {sessionId}</p>
      <p>User: {userId}</p>
      <button onClick={() => console.log(tracker?.getEvents())}>
        View Events
      </button>
    </div>
  );
}
```

### With Debugger

```tsx
import { IndeksProvider, IndeksDebugger } from "@indeks/react";

function App() {
  return (
    <IndeksProvider apiKey="your-api-key">
      {process.env.NODE_ENV === "development" && <IndeksDebugger />}
      <YourApp />
    </IndeksProvider>
  );
}
```

## License

MIT

## Author

Nishit Chaudhary
