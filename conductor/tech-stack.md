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
  design/    declared intent, project style inheritance and validation
  brief/     local subject templates (no network)
  critique/  whole-image gap report and applyable fixes
test/
  unit/      per-op and per-rule tests
  lint/      one file per rule plus the debug sheet
  ops/       one file per op family
  mcp/       tool surface, parity, no-network guard
  palettes/  curated values and derivation
  design/    intent schema, inheritance, canonicalisation, authoring
  intent-passes/ declared design driving light, edges, values, harmonize
  brief/     local templates and no-write render views
  critique/  gap report, fix verb, stagnation, bounded responses
  art/       seven v1 assets plus seven v2 re-authored assets and score records
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

**Dated note (2026-11-13).** The reactivity of a profile default to rendered bytes is now a determinism concern in its own right: `auto_outline`'s depth keys on the recipe version (`1`/`"1.0"` keep the historical 1 px, `"1.1"` takes `profile.outlineWidth`), so a change in what a version *means* is a byte-level change. Two networked scripts exist and neither is part of the build: `scripts/rubric.mjs` scores art through a vision model and `scripts/upscale.mjs` produces faithful nearest-neighbour views for that scoring. Both are human-run, imported by nothing, and must stay outside `pnpm verify` - the engine and its tests never take a network dependency.

**Dated note (2026-11-17).** The intent layer adds three local source modules (`src/design`, `src/brief`, `src/critique`) and three tool verbs (`px_brief`, `px_critique`, `px_fix`) with no runtime dependency. Schema 1.2 makes a declared `design` a byte-level input: it changes pass defaults, reported deviations and rendered output, so it is version-gated exactly like a profile default - older recipes are rejected rather than promoted. The project style file `px.style.json` is resolved relative to the recipe's directory, so a recipe moved into a scratch workspace needs its style copied with it; that is a path rule, not hidden state. Scoring of the v2 assets uses the same two faithful views and the same six anchors as before; the 4.0 gate remains hard and the measured result is recorded as failed in `test/art/scores.json`. **Clarification (2026-11-18, Phase 1 closeout audit):** the "4.0 gate remains hard / recorded as failed" wording above was superseded by the 2026-11-17 gate-reconciliation decision that binds acceptance to the publishable tier (mean >= 3.5 with no criterion below 3); the current gate is `pass` at mean 3.82 on `gemini-3.5-flash-lite`. The original sentence and its 2026-11-17 figures are retained as history.

**Dated note (2026-11-17, gate reconciliation).** The shipping quality gate is now the publishable tier in `docs/rubric.md` (mean >= 3.5 with no criterion below 3); the 4.0 exceptional tier stays documented as unreachable calibration evidence. The baseline for that gate is a single instrument: `scripts/rubric.mjs` with `gemini-4-hydrogen`, two faithful views, seven v2 assets, recorded in `test/art/scores.json`, with the two earlier records preserved as provenance. Coverage is now measured without the benchmarks project because v8 instrumentation inflates the wall-clock NFR-7 result; NFR-7 continues to be enforced uninstrumented by `pnpm verify`, and `package.json` plus the lockfile are unchanged.

**Dated note (2026-11-18, craft application).** The `gemini-4-hydrogen` instrument hit its free-tier daily quota (429 `RESOURCE_EXHAUSTED`, 20 requests/day, ~18 h reset) during the gate re-score. With explicit user authorization the instrument of record in `test/art/scores.json` was promoted to `gemini-3.5-flash-lite` for all 14 passes, and the record's metadata (`instrument.model`, `fallback_used`, `note`) plus the `rubric.test.ts` guard were updated to state this honestly. Scores do NOT transfer across instruments, so the re-scored result (mean 3.67, verdict `fail` on the floor clause) is comparable to the 3.25 baseline only directionally. The two prior records remain preserved as provenance. This is a deliberate, user-authorized deviation from the frozen-instrument rule in the track spec; no criterion score or rationale was hand-edited.

**Dated note (2026-11-18, gate close).** Track `20261118-gate-close-flash-lite` re-authored the humanoid and scene v2 recipes for consistent top-left lighting and re-scored the four affected passes on the `gemini-3.5-flash-lite` instrument of record. All three original below-floor `lighting=2` findings cleared; humanoid A regressed to `edge_language=2` and `palette_craft=2`. The scorer-recomputed verdict is `fail` at mean 3.73 — the 3.5 threshold is cleared but the floor clause binds — and the honest fail was accepted by explicit user decision. The ten unaffected passes are byte-identical. No engine, op, linter, rubric or dependency change was made; the stale `verdict.note` / `scored_by` free text was reconciled by the primary as a metadata-only edit, with no criterion score or rationale touched. The 3.67 result above is the prior track's point-in-time record; 3.73 is the current one. **Clarification (2026-11-18, Phase 1 closeout audit):** both "the ten unaffected passes are byte-identical" and "3.73 is the current one" were superseded by the 2026-11-18 publishable-gate-pass note below — a later track re-scored two passes and left the other twelve byte-identical, and the current verdict is `pass` at mean 3.82. The 3.67 and 3.73 figures are retained here as point-in-time history.

**Dated note (2026-11-18, publishable gate pass).** Track `20261118-gate-publishable-pass` re-authored the humanoid v2 palette as one coherent warm/cool hue-stepped steel family and re-scored only its two affected passes on the `gemini-3.5-flash-lite` instrument of record. Both prior below-floor humanoid A findings cleared (`edge_language` 2→3, `palette_craft` 2→4); the other twelve passes are byte-identical. The scorer-recomputed publishable gate is now `pass` at mean 3.82 with zero below-floor criterion scores; this supersedes the prior point-in-time 3.73 fail record and is not comparable to the old `gemini-4-hydrogen` 3.25 baseline. No engine, op, linter, rubric or dependency change was made; the primary reconciled only free-text metadata in `scores.json`. The primary additionally read the baseline and candidate A/B images directly before scoring (visual self-review gate).

**Dated note (2026-11-18, agent legibility verification).** Track `20261118-agent-legibility-verification` exercised the product success metric with a fresh, docs-only agent using MCP px tools first and a bounded CLI parity check: potion 9, sword 11, humanoid 12 and chest 11 calls (all ≤12), zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` findings, and flash-lite `--dry-run` silhouettes 5/4/5/5. The honest decision is **PASS with disclosed residual strict-gate gaps**: humanoid and chest strict renders exited 3 (`E_LINT_GATE`) on craft findings (contrast, value collision, pillow shade); these are recorded, not hidden. No documentation fix was applied because the thresholds were already documented and the failures were craft choices, not a documentation gap. This is an evidence-only verification: no engine, CLI, MCP, op, linter, rubric, CI, score, recipe or dependency change, `test/art/scores.json` byte-identical at mean 3.82 `pass`, and the published gate untouched. Dry-run silhouette diagnostics are not comparable to published gate scores.

**Dated note (2026-11-19, engineering debt sweep).** Three accepted debt items were closed without changing product behavior: `scripts/**/*.mjs` (seven files, including the three under `scripts/calibrate/`) is now covered by Biome with zero findings and no rule weakened, no suppressions and no new dependency; twelve stale `.conductor/runs/*.json` records for already-archived tracks were removed from gitignored runtime state, leaving only the active track's run file; and this note records that point-in-time prose inside archived tracks (for example "score file untouched" or "ten unaffected passes") is historical, while the live truth is the publishable-gate `pass` at mean 3.82 and the twelve byte-identical unaffected passes described above. Archives remain frozen and byte-identical (215 files re-hashed, zero mismatches), `test/art/scores.json` is unchanged, and full `checkJs` typing of the scripts remains explicitly accepted debt rather than part of this sweep.

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

## Recipe schema 1.2 (2026-11-13)

Track `20261113-surface-fidelity` introduced options that change pixels only when
used, so they are version-gated rather than backported: `texture` `fit: "region"`,
a derived palette family (`{ "derive": { "base", "stops" } }`), and `stroke`
`corner`/`cap`. `normalizeRecipe` accepts `"1.2"` and rejects those options under
`1`/`"1.0"`/`"1.1"` with `E_BAD_VERSION` and a hint naming `"1.2"`. Absent
options stay byte-identical, so `"1.1"` documents keep their digests.
