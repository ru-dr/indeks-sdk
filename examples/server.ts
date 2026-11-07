import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const routes: Record<string, string> = {
  "/indeks.global.js": resolve(root, "packages/core/dist/indeks.global.js"),
  "/vanilla/": resolve(root, "examples/vanilla/index.html"),
  "/react/": resolve(root, "examples/react/index.html"),
  "/react/app.js": resolve(root, "examples/react/dist/app.js"),
};

export interface ExamplesServer {
  url: string;
  received: CollectedEvent[];
  close: () => Promise<void>;
}

interface CollectedEvent {
  type: string;
  url?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface StartOptions {
  port?: number;
  onEvents?: (events: CollectedEvent[]) => void;
}

export function startExamples({
  port = 5173,
  onEvents = defaultLogger,
}: StartOptions = {}): Promise<ExamplesServer> {
  const received: CollectedEvent[] = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (url.pathname === "/collect") {
      if (req.method !== "POST") return res.writeHead(204).end();
      let raw = "";
      for await (const chunk of req) raw += chunk;
      try {
        const { events = [] } = JSON.parse(raw);
        received.push(...events);
        onEvents(events);
        return res.writeHead(200, { "content-type": "application/json" }).end('{"success":true}');
      } catch {
        return res.writeHead(400).end("invalid JSON");
      }
    }

    const file = routes[url.pathname];
    if (!file || !existsSync(file)) return res.writeHead(404).end("Not found");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((done) => {
    server.listen(port, () => {
      const address = server.address() as AddressInfo;
      done({
        url: `http://localhost:${address.port}`,
        received,
        close: () =>
          new Promise<void>((closed) => {
            server.closeAllConnections();
            server.close(() => closed());
          }),
      });
    });
  });
}

function defaultLogger(events: CollectedEvent[]): void {
  for (const event of events) console.log(`${new Date().toISOString()} ${event.type} ${event.url}`);
}

if (import.meta.main) {
  const { url } = await startExamples({ port: Number(process.env.PORT) || 5173 });
  console.log(`Examples running:\n  ${url}/vanilla/\n  ${url}/react/\nEvents are printed here.`);
}
