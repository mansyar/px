# Review: Animation Inspection & Playback

- **Track:** `20261119-animation-playback`
- **Type:** `feature`
- **Branch:** `feat/20261119-animation-playback`
- **Range:** `b3f984f49374b8ba394afa4d3a708f4a93af67ca..30448d6` (includes R1 review-fix squash `7196ab9`)
- **Date:** `2026-11-19T10:14:21Z`
- **Verdict:** `PASS`

## Summary

The track delivers both inspection surfaces cleanly. `--onion <index>` is a deterministic, view-only three-panel prev|current|next composite with transparent boundary panels, a sibling PNG, and no change to `--out` or frame-0 bytes; framed `--export` gains an additive `timeline` block with cumulative millisecond offsets and no key for single-frame exports. CLI help, `px_render` schema/description/`argvFor`, parity tests and `docs/animation.md` are consistent, and MCP tool count stays at 11. Round 1 surfaced one non-blocking Low finding (F1: the render envelope reported frame-0 width for the 3×-wide onion strip). R1 fixed the root cause and added behavioral regression assertions; the round-2 re-review returned PASS with no new findings. All protected digests, the publishable gate, the envelope version/shape, the single-runtime-dependency budget and the tool count are preserved.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test (full) | `pnpm verify` (typecheck → lint → test → build) | pass | `conductor/tracks/20261119-animation-playback/verification/integrated.md` (120 files / 1057 tests; only pre-existing warning in `test/recipe/version-1-2.test.ts:50`, untouched by this diff) |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | `verification/integrated.md` — 95.03% stmts / 85.96% branches / 98.38% funcs / 94.84% lines (gate 80%) |
| lint | `pnpm biome check .` (inside `pnpm verify`) | pass | 1 pre-existing unrelated warning, no error |
| typecheck | `pnpm exec tsc --noEmit` (inside `pnpm verify`) | pass | — |
| build | `pnpm exec tsc -p tsconfig.build.json` (inside `pnpm verify`) | pass | — |
| goldens | `pnpm exec vitest run --project goldens` | pass | 1 file / 6 tests, incl. onion determinism and double-render |
| rubric gate | `node scripts/rubric-report.mjs` | pass | mean 3.82 · pass on `gemini-3.5-flash-lite`; frozen scores byte-identical |
| protected hash | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | pass | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (unchanged) |
| R1 regression | `pnpm exec vitest run test/mcp/parity.test.ts test/cli/onion.test.ts test/goldens/render.test.ts` | pass | `verification/phase-R1.md` — 3 files / 19 tests |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2, P2.T2 | `test/cli/onion.test.ts`, `test/render/views.test.ts`, `test/mcp/parity.test.ts`, `test/mcp/reachability.test.ts` | covered |
| FR-2 | P1.T1, P1.T2 | `test/render/views.test.ts`, `test/cli/onion.test.ts`, `test/goldens/render.test.ts` | covered |
| FR-3 | P2.T1 | `test/mcp/meta-export.test.ts`, `test/mcp/parity.test.ts` | covered |
| FR-4 | P2.T1 | `test/mcp/meta-export.test.ts` | covered |
| FR-5 | P1.T3, P2.T3 | `test/goldens/render.test.ts`, `test/mcp/meta-export.test.ts`, `anim-duo.onion{0,1}.sha256` | covered |
| FR-6 | P2.T2 | `test/mcp/parity.test.ts`, `src/cli/main.ts`, `src/mcp/tools.ts`, `docs/animation.md` | covered |
| NFR-1 | P1.T3, P2.T3, P3.T2 | `test/mcp/meta-export.test.ts`, primary hash check, `verification/decision.md` | covered |
| NFR-2 | P3.T2 | `pnpm verify`, scoped coverage, `verification/phase-3.md` | covered |
| NFR-3 | P1.T1, P2.T1 | pure-function code inspection, double-render tests | covered |
| NFR-4 | P1.T1, P2.T2, P3.T2 | diff review, `test/mcp/parity.test.ts` (`MCP_TOOLS` = 11) | covered |
| AC-1 | P1.T2 | `test/cli/onion.test.ts` | covered |
| AC-2 | P1.T1, P1.T3 | `test/cli/onion.test.ts`, `test/goldens/render.test.ts` | covered |
| AC-3 | P1.T2 | `test/cli/onion.test.ts`, `src/cli/commands.ts` | covered |
| AC-4 | P2.T2 | `test/mcp/parity.test.ts`, `test/mcp/reachability.test.ts` | covered |
| AC-5 | P2.T1 | `test/mcp/meta-export.test.ts` | covered |
| AC-6 | P2.T1 | `test/mcp/meta-export.test.ts` | covered |
| AC-7 | P1.T3, P2.T3 | `test/goldens/render.test.ts`, primary hash check | covered |
| AC-8 | P2.T2 | `test/mcp/parity.test.ts`, `docs/animation.md` | covered |
| AC-9 | P3.T2 | `pnpm verify`, coverage, `verification/phase-3.md`, `verification/integrated.md` | covered |
| AC-10 | P3.T1 | `verification/decision.md` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- <none> — F1 was the sole finding (Low, FR-2: onion envelope `width` reported frame-0 width). Fixed in Phase R1: `src/cli/commands.ts` now reports `result.width * ONION_PANELS` for the onion view, with regression assertions in `test/mcp/parity.test.ts` (envelope width/height equal the emitted PNG's IHDR dimensions: 48×16 onion, 16×16 normal). Re-review confirmed `f1_status: fixed` and zero new findings.

## Overrides

- <none>

## Plan compliance

Pass. All three implementation phases are `verified` with `Result`, `Checkpoint` and `Evidence`; every `[x]` task was implemented and no task was silently dropped. The review-fix phase R1 is complete and recorded with its own checkpoint/evidence. The diff stays within the union of each phase's `Touches` except two recorded, justified deviations (`vitest.config.ts` adds `test/cli/**/*.test.ts` to the unit project; `test/mcp/reachability.test.ts` is required by P2.T2.1). Volume was LARGE (16 code files, 871 insertions, 22 deletions), so the reviewer used per-phase diffs plus a cross-phase integration diff and merged duplicates.

## Out of scope

No in-scope regressions. The pre-existing Biome warning in `test/recipe/version-1-2.test.ts:50` is untouched by this diff. No archive, CI config, dependency, golden sidecar (other than the two pre-existing onion fixtures being consumed, not modified), score, CLI verb, MCP tool or schema changed.

## Debt

- <none> — review.strict is true; F1 was fixed rather than deferred. No issues were created or needed.

## Doc sync

`updated` — R1 changed only the envelope `width` expression and a regression test; no user-facing product docs required an update. `docs/animation.md` and the `conductor/tech-stack.md` dated note were already synchronized in Phase 2 and the Section 6 doc-sync commit (`1688af7`). Post-review, `verification/integrated.md` was refreshed with the final-HEAD re-verification results so the integrated record matches the shipped tree.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 (F1 fixed in R1) |
| 2 | PASS | 0 | 0 | 0 | 0 | — |
