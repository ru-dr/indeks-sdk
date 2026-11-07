# @indeks/react

React provider, hook and optional debugger for the Indeks SDK. Requires React 19.

```bash
npm install @indeks/react
```

```tsx
import { Indeks } from "@indeks/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Indeks
      apiKey="YOUR_PROJECT_KEY"
      config={{ endpoint: "https://analytics.example.com/api/v1/collect" }}
    >
      {children}
    </Indeks>
  );
}
```

The tracker is created on the client after mount. It is recreated when `apiKey`, `debug` or the contents of `config` change, and destroyed on unmount. `config` accepts every option from [`@indeks/core`](../core) except `apiKey`.

## `useIndeks()`

```tsx
const { track, identify, page, tracker, isInitialized, sessionId, userId } = useIndeks();

<button onClick={() => track("add_to_cart", { sku: "A1" })}>Add</button>;
```

`track`, `identify` and `page` are safe to call at any time, including from effects that run before the tracker is ready: calls are buffered (up to 100) and replayed. `tracker` is `null` until initialization finishes.

## Debugger

```tsx
import { IndeksDebugger } from "@indeks/react/debugger";

{process.env.NODE_ENV === "development" && <IndeksDebugger />}
```

A floating button opens a panel with the current session, user id and the latest events. Payloads are shown after sanitization. The debugger lives in its own entry point, so it is not in your bundle unless you import it, and it needs no icon library.
