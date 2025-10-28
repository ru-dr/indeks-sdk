# @indeks/react

React/Next.js wrapper for Indeks Core analytics. No provider setup needed - just drop the component in and start tracking!

## Installation

```bash
npm install @indeks/react @indeks/core
# or
bun add @indeks/react @indeks/core
```

## Usage

### Next.js 15 (App Router)

Simply wrap your app with the `IndeksWrapper` component in your root layout:

```tsx
// app/layout.tsx
import { IndeksWrapper } from "@indeks/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <IndeksWrapper
          apiKey={process.env.NEXT_PUBLIC_INDEKS_API_KEY!}
          printToConsole={process.env.NODE_ENV === "development"}
          config={{
            captureClicks: true,
            captureScrolls: true,
            captureFormSubmissions: true,
            captureErrors: true,
          }}
        >
          {children}
        </IndeksWrapper>
      </body>
    </html>
  );
}
```

### Next.js 14 (Pages Router)

```tsx
// pages/_app.tsx
import { IndeksWrapper } from "@indeks/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <IndeksWrapper
      apiKey={process.env.NEXT_PUBLIC_INDEKS_API_KEY!}
      printToConsole={false}
      config={{
        captureClicks: true,
        capturePageViews: true,
      }}
    >
      <Component {...pageProps} />
    </IndeksWrapper>
  );
}
```

### Standard React App

```tsx
// App.tsx
import { IndeksWrapper } from "@indeks/react";

function App() {
  return (
    <IndeksWrapper
      apiKey="your-api-key-here"
      printToConsole={true}
      config={{
        captureClicks: true,
        captureScrolls: true,
      }}
    >
      <YourAppContent />
    </IndeksWrapper>
  );
}

export default App;
```

## Using the Hook

Access the tracker instance anywhere in your app with the `useIndeksTracker` hook:

```tsx
import { useIndeksTracker } from "@indeks/react";

function AnalyticsButton() {
  const tracker = useIndeksTracker();

  const handleClick = () => {
    if (tracker) {
      // Get analytics data
      console.log("Session ID:", tracker.getSessionId());
      console.log("User ID:", tracker.getUserId());
      console.log("All Events:", tracker.getEvents());

      // Track custom events
      tracker.trackCustomEvent("button_clicked", {
        button: "analytics",
        timestamp: new Date().toISOString(),
      });
    }
  };

  return <button onClick={handleClick}>View Analytics</button>;
}
```

## API Reference

### `IndeksWrapper`

Main wrapper component that initializes Indeks analytics.

**Props:**

- `apiKey` (string, required): Your Indeks API key
- `printToConsole` (boolean, optional): Enable console logging. Default: `false`
- `config` (Partial<IndeksConfig>, optional): Configuration options for event tracking
- `children` (ReactNode, optional): Your app components

**Config Options:**

All options from `@indeks/core` are supported:

```typescript
{
  // Basic Events
  captureClicks?: boolean;
  captureScrolls?: boolean;
  capturePageViews?: boolean;
  captureFormSubmissions?: boolean;
  captureErrors?: boolean;

  // Input Events
  captureInputChanges?: boolean;
  captureFieldFocus?: boolean;
  captureTextSelection?: boolean;

  // Mouse Events
  captureDoubleClick?: boolean;
  captureContextMenu?: boolean;
  captureMouseMovement?: boolean;
  captureHover?: boolean;

  // Keyboard Events
  captureKeyPress?: boolean;

  // Media Events
  captureMediaEvents?: boolean;

  // Navigation Events
  captureNavigation?: boolean;
  captureHashChange?: boolean;

  // Visibility Events
  captureVisibilityChange?: boolean;
  captureWindowFocus?: boolean;

  // Performance Events
  capturePerformance?: boolean;

  // Custom Events
  captureCustomEvents?: boolean;
}
```

### `useIndeksTracker()`

Hook that returns the tracker instance.

**Returns:** `IndeksTracker | null`

**Available Methods:**

- `getSessionId()`: Get current session ID
- `getUserId()`: Get current user ID (from FingerprintJS)
- `getEvents()`: Get all tracked events
- `getEventQueue()`: Get event queue
- `clearEvents()`: Clear all events
- `trackCustomEvent(name, data)`: Track a custom event
- `destroy()`: Cleanup tracker (automatically called on unmount)

## Example: Custom Event Tracking

```tsx
import { useIndeksTracker } from "@indeks/react";

function CheckoutButton() {
  const tracker = useIndeksTracker();

  const handleCheckout = async () => {
    // Track checkout initiated
    tracker?.trackCustomEvent("checkout_initiated", {
      cart_value: 99.99,
      items_count: 3,
    });

    // Your checkout logic...
    await processCheckout();

    // Track checkout completed
    tracker?.trackCustomEvent("checkout_completed", {
      order_id: "ORDER-123",
      total: 99.99,
    });
  };

  return <button onClick={handleCheckout}>Complete Purchase</button>;
}
```

## Features

✅ **No Provider Setup** - Just wrap and go  
✅ **Next.js 15 Compatible** - Works with App Router and Server Components  
✅ **TypeScript Support** - Full type safety  
✅ **Automatic Cleanup** - No memory leaks  
✅ **React Strict Mode Safe** - Prevents double initialization  
✅ **SSR/SSG Compatible** - Only runs on client side  
✅ **Lightweight** - Minimal overhead

## License

MIT
