import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PACKAGES = ["shared", "core", "react"];
const SEMVER = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const bump = args.find((arg) => !arg.startsWith("--")) ?? "patch";
const dryRun = flags.has("--dry-run");
const publish = flags.has("--publish");

const root = resolve(import.meta.dirname, "..");
const manifestPath = (name: string) => resolve(root, "packages", name, "package.json");
const readManifest = (name: string): { version: string; [key: string]: unknown } =>
  JSON.parse(readFileSync(manifestPath(name), "utf8"));

function nextVersion(current: string, kind: string): string {
  if (SEMVER.test(kind)) return kind;
  const [major, minor, patch] = current.split("-")[0].split(".").map(Number);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump "${kind}". Use patch, minor, major or an explicit x.y.z version.`);
}

const git = (...gitArgs: string[]) =>
  execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();

const current = readManifest("core").version;
const version = nextVersion(current, bump);
console.log(`Releasing ${current} -> ${version}${dryRun ? " (dry run)" : ""}`);

if (!dryRun && git("status", "--porcelain")) {
  console.error("Working tree is not clean. Commit or stash changes first.");
  process.exit(1);
}

for (const name of PACKAGES) {
  const manifest = readManifest(name);
  manifest.version = version;
  console.log(`  packages/${name}/package.json -> ${version}`);
  if (!dryRun) writeFileSync(manifestPath(name), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (dryRun) process.exit(0);

git("add", ...PACKAGES.map((name) => `packages/${name}/package.json`));
git("commit", "-m", `chore: release v${version}${publish ? " [publish]" : ""}`);
git("tag", `v${version}`);
console.log(`Created commit and tag v${version}.`);
console.log(
  publish
    ? "Push with: git push --follow-tags (CI publishes)"
    : "Push when ready: git push --follow-tags",
);
