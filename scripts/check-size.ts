import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const budgets = [
  { file: "packages/core/dist/indeks.global.js", maxGzipBytes: 24_000 },
  { file: "packages/core/dist/index.js", maxGzipBytes: 24_000 },
  { file: "packages/shared/dist/index.js", maxGzipBytes: 9_000 },
  { file: "packages/react/dist/index.js", maxGzipBytes: 2_000 },
  { file: "packages/react/dist/debugger.js", maxGzipBytes: 4_000 },
];

let failed = false;
for (const { file, maxGzipBytes } of budgets) {
  const size = gzipSync(readFileSync(resolve(root, file))).length;
  const ok = size <= maxGzipBytes;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${file}: ${size} B gzip (budget ${maxGzipBytes} B)`);
}
process.exit(failed ? 1 : 0);
