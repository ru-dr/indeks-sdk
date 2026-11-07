import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "packages/shared/src/types/events.ts");
const target = resolve(root, "docs/events.md");
const check = process.argv.includes("--check");

const sourceFile = ts.createSourceFile(
  source,
  readFileSync(source, "utf8"),
  ts.ScriptTarget.ES2020,
  true,
);
const printer = ts.createPrinter({ removeComments: true });

const print = (node) =>
  printer
    .printNode(ts.EmitHint.Unspecified, node, sourceFile)
    .replace(/\s*\n\s*/g, " ")
    .replace(/;\s*}/g, " }")
    .replace(/\{\s+/g, "{ ")
    .replace(/\s+\}/g, " }")
    .replace(/\|/g, "\\|");

const events = [];
for (const node of sourceFile.statements) {
  if (!ts.isInterfaceDeclaration(node) || !node.name.text.endsWith("Event")) continue;
  if (node.name.text === "IndeksBaseEvent") continue;
  const fields = [];
  let types = [];
  for (const member of node.members) {
    if (!ts.isPropertySignature(member) || !member.type) continue;
    const name = member.name.getText(sourceFile);
    if (name === "type") {
      types = ts.isLiteralTypeNode(member.type)
        ? [member.type.literal.text]
        : member.type.types.map((t) => t.literal.text);
      continue;
    }
    fields.push({ name, optional: Boolean(member.questionToken), type: print(member.type) });
  }
  events.push({ interface: node.name.text, types, fields });
}

const lines = [
  "# Event reference",
  "",
  "Generated from `packages/shared/src/types/events.ts` by `scripts/generate-event-docs.mjs`. Do not edit by hand; run `bun run docs:events`.",
  "",
  "## Common fields",
  "",
  "Every event carries these fields. In the request body they are top-level, and everything else is sent under `properties` (see [protocol.md](protocol.md)).",
  "",
  "| Field | Type | Description |",
  "| --- | --- | --- |",
  "| `type` | string | Event type (listed below) |",
  "| `timestamp` | number | Milliseconds since the Unix epoch |",
  "| `url` | string | Current page URL, scrubbed of credentials, fragments and sensitive query values |",
  "| `userAgent` | string | `navigator.userAgent` |",
  "| `sessionId` | string | Current session id |",
  "| `userId` | string | Anonymous user id (or fingerprint when enabled) |",
  "| `referrer` | string, optional | Scrubbed `document.referrer` |",
  "| `externalUserId` | string, optional | Id set with `identify()`; sent inside `properties` |",
  "",
  `There are ${events.length} event shapes covering ${events.reduce((n, e) => n + e.types.length, 0)} event types.`,
  "",
];
for (const event of events) {
  lines.push(`## ${event.types.map((t) => `\`${t}\``).join(", ")}`, "");
  lines.push(`TypeScript type: \`${event.interface}\``, "");
  if (event.fields.length === 0) {
    lines.push("No additional fields.", "");
    continue;
  }
  lines.push("| Field | Type | Required |", "| --- | --- | --- |");
  for (const f of event.fields) {
    lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.optional ? "no" : "yes"} |`);
  }
  lines.push("");
}

const output = `${lines.join("\n")}\n`;
if (check) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error(
      "docs/events.md is out of date. Run `bun run docs:events` and commit the result.",
    );
    process.exit(1);
  }
  console.log("docs/events.md is up to date");
} else {
  writeFileSync(target, output);
  console.log(`Wrote ${target} (${events.length} event shapes)`);
}
