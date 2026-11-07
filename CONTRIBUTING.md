# Contributing

Thanks for helping improve the Indeks SDK. This guide covers how to set up the repository, what to run before opening a pull request, and how the code is organized.

## Setup

Requirements: [Bun](https://bun.sh) 1.1 or newer and Node.js 18 or newer.

```bash
bun install
bun run build:all      # shared -> core -> react
bun test               # unit tests (happy-dom)
bun run lint
bun run typecheck
bunx playwright install chromium firefox   # once, for browser tests
bun run e2e            # real-browser tests
bun run e2e:container  # same tests in the official Playwright image (needs podman or docker)
```

Playwright's WebKit build needs system libraries that are missing on some distributions (for example Fedora). `bun run e2e:container` runs the smoke tests in all three browsers inside the official image instead. The image tag in `package.json` must match the pinned `@playwright/test` version.

Run everything CI runs with `bun run build:all && bun run lint && bun run format:check && bun run typecheck && bun run check:packages && bun test && bun run docs:check`.

## Project layout

| Path | Contents |
| --- | --- |
| `packages/shared` | Types, config resolution, URL and text sanitizers, device parsing |
| `packages/core` | `IndeksTracker`, transport, session handling and the collectors |
| `packages/react` | Provider, hook and debugger |
| `e2e` | Playwright tests against a local page and a local collector |
| `docs` | Protocol and generated event reference |

Collectors live in `packages/core/src/collectors`. A collector is a function `(ctx: CollectorContext) => void` that registers listeners through `ctx.on(...)` and sends events with `ctx.emit(...)`. To add one:

1. Add its name to `COLLECTOR_NAMES` in `packages/shared/src/types/config.ts` and decide which presets include it (`packages/shared/src/utils/config.ts`).
2. Add the event type to `packages/shared/src/types/events.ts` and to the `IndeksEvent` union.
3. Implement it in the matching file under `collectors/` and register it in `collectors/index.ts` (the registry is typed, so a missing entry fails the build).
4. Add tests, then run `bun run docs:events` to update `docs/events.md`.

## Privacy rules

This SDK is used on other people's websites, so privacy is a hard requirement:

- Never send form values, keystroke characters or free text without an explicit opt-in under `privacy`.
- Pass every URL through `scrubUrl` and every piece of free text through `redactText` or `normalizeText`.
- New options must default to the most private behavior, and `updateConfig` must never allow loosening privacy at runtime.
- Do not add network calls other than the configured `endpoint`.

## Pull requests

- Keep changes focused and add tests for new behavior. Bug fixes need a test that fails without the fix.
- Run `bun run format` before committing; CI fails on formatting differences.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat(core): ...`, `fix(shared): ...`). Mark breaking changes with `!`.
- Update `CHANGELOG.md` and the relevant README for user-visible changes.
- Do not add code comments that restate what the code does. Prefer clear names and small functions; use a comment only to explain a non-obvious reason.

## Releases

Maintainers run `bun run release <patch|minor|major|x.y.z>`, which bumps all packages, commits and tags. The publish workflow runs when the release commit message contains `[publish]`.

## Reporting bugs and security issues

Use the issue templates for bugs and feature requests. Report security problems privately as described in [SECURITY.md](SECURITY.md).
