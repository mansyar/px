# Phase 4 — Engine Metadata, MCP Parity, Palettes

- Track: `20261112-phase-1-static-sprite-engine`
- Phase: 4 (FR-17, FR-19, FR-22, NFR-5, AC-15, AC-17, AC-19)
- Date: 2026-11-12
- Branch: `feat/20261112-phase-1-static-sprite-engine`
- Base: `b6c4a9f`
- Head: the commit that adds this file (phase-4 task commits: `b5da24f`, `454a8f2`, `260bde6`, `ecf8eec`, parity commit)

## Result

**verified** — `pnpm verify` and `pnpm vitest run --coverage` both exit 0. The hero golden hash is unchanged.

## Commands

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck clean, biome 92 files, 35 test files / 293 tests pass, `tsc -p tsconfig.build.json` clean |
| `pnpm vitest run --coverage` | 0 | 293 tests pass; statements 94.21%, branches 86.04%, functions 99.47%, lines 93.95% |

## Acceptance criteria

| AC | Claim | Proving tests |
| --- | --- | --- |
| AC-15 | Exported metadata reproduces trim bounds and anchor coordinates for a known sprite | `test/mcp/meta.test.ts` (trim `{4,4,8,8}`, origin `{-4,-4}`, godot offset, anchors, empty trim `{0,0,0,0}` without `-0`, out-of-canvas anchor retained, exact palette manifest, canonical recipe hash ≠ PNG hash); `test/mcp/meta-export.test.ts` (`render --export` writes `out/hero.meta.json`, payload hash equals the PNG sha, file equals `buildMetadata`, absent without `--export`) |
| AC-17 | Multi-region inspect returns every region plus legend in one call | `test/mcp/inspect.test.ts` (region order preserved, matrices in Phase 1 format, role codes `o/s/b/h/w`, ≥2 families get `b1`/`b2`, flat palettes fall back to letters and say so, legend covers every code used, `--summary` default and explicit); `test/integration/cli.test.ts` (single-region contract, no implicit summary) |
| AC-19 | CLI and MCP produce the same output for the same recipe | `test/mcp/parity.test.ts` (five verbs compared envelope-for-envelope across two workspaces with only the MCP content blocks stripped; PNG, debug sheet and `asset.meta.json` byte-identical; identical failure envelope for an unknown layer); `test/smoke/mcp-stdio.test.ts` (real stdio handshake, one `image/png` block matches the file, debug sheet only with `debug:true`, clean exit on stdin EOF) |

## Coverage

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| All included files | 94.21% | 86.04% | 99.47% | 93.95% |
| `src/core` | 97.23% | 91.48% | 100% | 97.10% |
| `src/core/ops` | 96.16% | 88.44% | 100% | 95.90% |
| `src/core/recipe` | 87.63% | 80.19% | 98.50% | 87.50% |
| `src/lint` | 98.41% | 91.66% | 100% | 98.29% |
| `src/meta` | 94.54% | 77.77% | 100% | 94.33% |
| `src/palettes` | 100% | 91.42% | 100% | 100% |

`src/meta/**` and `src/palettes/**` are in `coverage.include`; `test/mcp/**` and `test/palettes/**` are unit projects. `src/mcp` and `src/cli` remain outside the numerator.

## Golden hash

`test/goldens/fixtures/hero.sha256` = `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` (unchanged; the goldens project passes in both commands).

## Evidence

- `test/mcp/meta.test.ts`, `test/mcp/meta-export.test.ts` — AC-15
- `test/mcp/inspect.test.ts` — AC-17
- `test/mcp/parity.test.ts`, `test/mcp/no-network.test.ts`, `test/smoke/mcp-stdio.test.ts` — AC-19 / NFR-5
- `test/palettes/palettes.test.ts` — FR-4 derivation rules
- `test/mcp/anchor.test.ts` — the new `px anchor` verb

## Deviations

| File | Reason |
| --- | --- |
| `test/integration/cli.test.ts` | Inspect assertions updated for the new `{regions, legend, summary}` response; the old single-`region`/`matrix` shape no longer exists |
| `test/smoke/mcp-stdio.test.ts` | New file outside the listed Touches, needed for the required stdio handshake and EOF smoke coverage |
| `src/mcp/tools.ts` | `callTool` gained an optional `cwd` so the parity suite can isolate the MCP path from the CLI path; the server still uses `process.cwd()` |

## Notes

- Metadata is pinned exactly: `{v,name,godot,generic}` with `recipe_hash` hashing canonical recipe text, not the PNG.
- Ramp derivation is pure selection: luminance-ordered neighbours, hue-nearest outline, no interpolation; `E_NO_RAMP` still names `--derive-ramps` when a family lacks a role.
- Parity is a real equality check: only the MCP `text` framing and `image` blocks are stripped.

## Primary verification

Verified by the primary agent on 2026-11-12, independently of the phase subagent's report.

- Tree state: clean. `git diff --name-only b6c4a9f..HEAD` produced 21 paths — all inside the
  phase's `Touches` (`src/meta/**`, `src/mcp/**`, `src/palettes/**`, `src/cli/**`,
  `test/mcp/**`, `test/palettes/**`, `vitest.config.ts`) or the three declared deviations
  (`test/integration/cli.test.ts`, `test/smoke/mcp-stdio.test.ts`, `src/mcp/tools.ts`).
- `git diff b6c4a9f..HEAD -- package.json` is empty: the MCP SDK was already the pinned single
  runtime dependency, so this phase activated it without adding anything.
- `pnpm verify` → exit 0. Typecheck clean, Biome clean on 92 files, 293 tests across 35 files,
  build clean.
- `pnpm vitest run --coverage` → exit 0. Statements 94.21%, branches 86.04%, functions 99.47%,
  lines 93.95%. New gate members: `src/meta` 94.54% statements, `src/palettes` 100%.
- Golden hash unchanged:
  `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`, matching Phases 1-3.
- Squash guard: 5 commits in range, 0 merges, all reported. Squashed to `dca204b`.
- AC-15, AC-17 and AC-19 checked against tests rather than the summary: `test/mcp/parity.test.ts`
  compares envelope-for-envelope across all five state-changing verbs plus the render artifacts;
  `test/mcp/inspect.test.ts` asserts multi-region plus legend in one call; `test/mcp/meta-export.test.ts`
  asserts trim bounds and anchor coordinates round-trip. `test/mcp/no-network.test.ts` enforces
  NFR-5 at the import level.
- Carried observation, not a Phase 4 defect: `src/core/recipe/serialize.ts` remains the weakest
  covered file in the gate (76.59% statements / 52% branches). It is exercised heavily in practice,
  so this is a test-depth gap rather than a risk, but it is worth closing opportunistically before
  the track ends.
