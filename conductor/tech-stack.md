# Technology Stack — px

## Languages & Runtimes

| Item | Value |
|---|---|
| Language | TypeScript **7.0.2** (stable `latest` at time of writing), `strict: true`, ESM only (`"type": "module"`) |
| Runtime | Node.js **24 LTS** — host is v24.22.2 |
| Pin | `engines.node: ">=24 <25"` + `.node-version`. The major is pinned deliberately: zlib output stability underpins the byte-identical guarantee |
| PNG encoding | `node:zlib` (deflate) plus a hand-written chunk writer and CRC-32. No image library |

TypeScript 7 is the native compiler. Declaration emit and `--noEmit` are exercised by the first scaffold task; if either blocks, the fallback is the 6.x line, recorded as a deliberate downgrade rather than a silent one.

## Frameworks & Libraries

Pinned to current stable versions; `pnpm-lock.yaml` is committed and is the real source of truth.

**Runtime dependency — exactly one:**

| Package | Version | Purpose |
|---|---|---|
| `@modelcontextprotocol/sdk` | `1.32.2` | MCP server, tool schemas, stdio transport |

Everything else is Node built-ins: `node:zlib`, `node:fs`, `node:process`, `node:path`.

**Dev dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `7.0.2` | Typecheck and build |
| `vitest` | `5.1.0` | Test runner |
| `@vitest/coverage-v8` | `5.1.0` | Coverage (version-matched to Vitest) |
| `@biomejs/biome` | `2.6.7` | Lint and format |
| `tsx` | `4.23.15` | Run TS directly during development |
| `@types/node` | `24.19.2` | Node typings (`node:fs`, `node:zlib`, …) |

No raster, canvas, or drawing library. The rasterizer is ours, because determinism and pixel-art semantics *are* the product.

> **Change — 2026-11-12:** `@types/node` was added. Phase 1 started with hand-written ambient declarations to avoid the dependency, but `@modelcontextprotocol/sdk`'s own declarations import `node:http`, `node:stream` and `node:process`, so the hand-rolled file made `src/mcp` untypecheckable. It is a dev dependency, so the one-runtime-dependency budget is untouched.

## Package Manager & Build

- **pnpm** (installed; single package, no workspace).
- Build: `tsc -p tsconfig.build.json` → `dist/` (ESM + `.d.ts`). **No bundler** — a bundler would fight the MCP SDK's optional subpath imports and inline a dependency we don't control.
- Dev execution: `tsx`, so the authoring loop never waits on a build.
- Bins: `px` → `dist/cli.js`, `px-mcp` → `dist/mcp/server.js`.

## Repository Layout

```
src/
  core/      indexed slot canvas, palette resolution, recipe AST + validation
  render/    op implementations, flatten, PNG encoder, debug sheet composer
  lint/      static pixel-art rules
  cli/       argument parsing, command wiring, output formatting
  mcp/       MCP tool definitions, transport, response shaping
  meta/      Godot 4 + generic metadata emitters
  palettes/  curated flat palettes and ramp derivation
test/
  unit/      per-op and per-rule tests
  lint/      one file per rule plus the debug sheet
  ops/       one file per op family
  mcp/       tool surface, parity, no-network guard
  palettes/  curated values and derivation
  goldens/   recipe → PNG SHA-256 fixtures
  benchmarks/ the four calibration assets and their transcripts
docs/        lint threshold rationale
opencode.json  project MCP registration for `px-mcp`
```

## Data Stores

None. The filesystem is the store: `.px.json` recipes in; PNG, `.meta.json`, and `.debug.png` out. No database, no cache, no persistent state beyond gitignored `.conductor/`.

## External Services

None at runtime. MCP transport is **stdio only** in Phase 1, consistent with local-only distribution. HTTP transport ships with publication, not before.

## Hosting & Deployment

Local only; not published in Phase 1. Invoked from the repo as `node dist/cli.js` (after `pnpm build`) or `pnpm exec tsx src/cli.ts` during development.

> **Correction — 2026-11-12:** an earlier revision said `pnpm exec px`. pnpm does not link a package's own bins, so that command fails with `Command "px" not found`; the `px` and `px-mcp` bins are for consumers of a published package, not for this repo. The MCP server is registered in `opencode.json` as `node dist/mcp/server.js` for the same reason.

## Test, Coverage, Lint, Format, Typecheck

| Concern | Command |
|---|---|
| Test | `pnpm test` (`vitest run`) |
| Watch | `pnpm test:watch` |
| Coverage | `pnpm coverage` (`vitest run --coverage`, v8) |
| Lint + format | `pnpm lint` (`biome check`) |
| Autofix | `pnpm format` (`biome format --write` + `biome check --write`) |
| Typecheck | `pnpm typecheck` (`tsc --noEmit`) |
| Build | `pnpm build` |

## Local Development Environment

Windows host, no containers. Node 24 already installed. No env files and no seed data — fixtures are committed `.px.json` recipes.

## Determinism Tooling

Every op has a golden fixture: a recipe plus the expected PNG SHA-256, committed as text. A determinism test re-renders and compares hashes, and CI asserts identical hashes on Windows and Linux. This is the one suite that can rot into a false pass, so it is treated as a first-class gate rather than an ordinary test.

**Dated note (2026-11-13).** The reactivity of a profile default to rendered bytes is now a determinism concern in its own right: `auto_outline`'s depth keys on the recipe version (`1`/`"1.0"` keep the historical 1 px, `"1.1"` takes `profile.outlineWidth`), so a change in what a version *means* is a byte-level change. Two networked scripts exist and neither is part of the build: `scripts/rubric.mjs` scores art through a vision model and `scripts/upscale.mjs` produces faithful nearest-neighbour views for that scoring. Both are human-run, imported by nothing, and must stay outside `pnpm verify` — the engine and its tests never take a network dependency.

## Constraints

No third-party raster or image library. No browser surface. Binary alpha only. Recipes must round-trip through a hand-editable text format. Single runtime dependency is a budget, not a coincidence. Parts and materials are a schema 1.1 feature, so a `version: 1` document that declares them is rejected rather than silently promoted — promotion changed rendered bytes the moment a profile default keyed on the version.

## Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Python | Slower cold start on every MCP invocation; weaker single-command CLI story |
| Rust | Best determinism and speed, but materially slower iteration for a solo quality-first Phase 1 |
| Raw RGBA canvas | `auto_shade` and selective outlining degrade from exact to hex-matching heuristics |
| Vite as build tool | Browser-first, and there is no browser surface. Already present transitively via Vitest |
| tsup / esbuild bundling | Fights MCP SDK subpath resolution; inlines a dependency we don't own |
| npm or bun | Available, but pnpm gives stricter isolation for a package that must stay dependency-thin |
| `node:test` | Capable, but coarser watch and reporting ergonomics than Vitest |

## Upgrade & Maintenance Policy

The Node major is pinned and bumped deliberately, only after re-verifying golden hashes. `@modelcontextprotocol/sdk` is the sole runtime dependency, so its major versions get an explicit migration task rather than a blind bump. Dev dependencies may move within a major freely; `@vitest/coverage-v8` always tracks `vitest`.

## Open Questions & Assumptions

**Assumptions:**

1. zlib output is stable across Node 24 patch releases. The cross-OS hash CI fails loudly if that ever stops being true.
2. stdio-only transport is sufficient for the Phase 1 local workflow.
3. TypeScript 7's native compiler handles this project's declaration emit; verified in the scaffold task, with 6.x as the documented fallback.

**Open:** the coverage gate number and the CI provider are configured in the workflow step, not here.
