import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BUNDLE = resolve(import.meta.dirname, "../packages/core/dist/indeks.global.js");

export interface CollectedRequest {
  contentType: string;
  body: { apiKey?: string; events: Array<Record<string, any>> };
  headers: Record<string, string | string[] | undefined>;
}

export interface Harness {
  appUrl: string;
  collectUrl: string;
  requests: CollectedRequest[];
  preflights: number;
  events: () => Array<Record<string, any>>;
  eventsOfType: (type: string) => Array<Record<string, any>>;
  waitForEvent: (type: string, timeoutMs?: number) => Promise<Record<string, any>>;
  reset: () => void;
  close: () => Promise<void>;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolvePort) => {
    server.listen(0, "127.0.0.1", () => {
      resolvePort((server.address() as { port: number }).port);
    });
  });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
  });
}

export function pageHtml(collectUrl: string, options: Record<string, unknown> = {}): string {
  const config = JSON.stringify({ endpoint: collectUrl, debounceMs: 30, ...options });
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Indeks e2e</title>
<style>body{margin:0;font-family:sans-serif}.tall{height:3000px;background:linear-gradient(#fff,#ccc)}.clickable{cursor:pointer;padding:12px;background:#eef}</style>
<script src="/indeks.global.js" data-indeks-global></script>
<script>window.tracker = indeks("e2e_api_key_12345", ${config});</script>
</head>
<body>
<button id="buy" type="button">Buy now</button>
<div data-indeks-mask><button id="masked" type="button">Secret account 12345</button></div>
<a id="outbound" href="http://127.0.0.1:1/away?token=SECRET">Away</a>
<a id="next" href="/other">Next page</a>
<div id="dead" class="clickable">Does nothing</div>
<form id="f"><input name="city" id="city"><input name="password" type="password" id="pw"></form>
<div class="tall"></div>
</body></html>`;
}

export async function startHarness(options: Record<string, unknown> = {}): Promise<Harness> {
  const state = { requests: [] as CollectedRequest[], preflights: 0 };
  const waiters: Array<() => void> = [];

  const collector = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const cors = { "access-control-allow-origin": "*" };
    if (req.method === "OPTIONS") {
      state.preflights++;
      res.writeHead(204, {
        ...cors,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "Content-Type, x-api-key",
      });
      res.end();
      return;
    }
    if (req.method === "POST") {
      const raw = await readBody(req);
      try {
        state.requests.push({
          contentType: String(req.headers["content-type"] ?? ""),
          body: JSON.parse(raw),
          headers: req.headers,
        });
      } catch {
        res.writeHead(400, cors);
        res.end("bad json");
        return;
      }
      res.writeHead(200, { ...cors, "content-type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      for (const wake of waiters.splice(0)) wake();
      return;
    }
    res.writeHead(404, cors);
    res.end();
  });
  const collectorPort = await listen(collector);
  const collectUrl = `http://127.0.0.1:${collectorPort}/api/v1/collect`;

  const app = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/indeks.global.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      res.end(readFileSync(BUNDLE));
    } else if (path === "/" || path === "/other") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(pageHtml(collectUrl, options));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  const appPort = await listen(app);

  const events = () => state.requests.flatMap((request) => request.body.events);
  const harness: Harness = {
    appUrl: `http://localhost:${appPort}`,
    collectUrl,
    requests: state.requests,
    get preflights() {
      return state.preflights;
    },
    events,
    eventsOfType: (type) => events().filter((event) => event.type === type),
    waitForEvent: async (type, timeoutMs = 8000) => {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const found = events().find((event) => event.type === type);
        if (found) return found;
        const remaining = deadline - Date.now();
        if (remaining <= 0)
          throw new Error(
            `Timed out waiting for "${type}" (got: ${[...new Set(events().map((e) => e.type))].join(", ")})`,
          );
        await new Promise<void>((wake) => {
          waiters.push(wake);
          setTimeout(wake, Math.min(remaining, 250));
        });
      }
    },
    reset: () => {
      state.requests.length = 0;
      state.preflights = 0;
    },
    close: () =>
      new Promise((done) => {
        app.close(() => collector.close(() => done()));
        app.closeAllConnections?.();
        collector.closeAllConnections?.();
      }),
  };
  return harness;
}
