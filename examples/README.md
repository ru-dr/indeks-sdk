# Examples

Two small pages that send events to a local mock collector.

```bash
bun run build:all
bun run examples
```

Then open the URLs printed in the terminal:

- `/vanilla/` loads `indeks.global.js` with a script tag and uses `indeks()`, `track()` and `identify()`.
- `/react/` uses `<Indeks>`, `useIndeks()` and the debugger.

`examples/server.mjs` accepts the collector protocol described in [docs/protocol.md](../docs/protocol.md) at `/collect` and prints each event.
