# Verification — Phase R1 — Review Fixes

| Field | Value |
| --- | --- |
| Track | `20261112-phase-1-static-sprite-engine` |
| Phase | R1 (review round 1 fixes) |
| Date | 2026-11-13 |
| Branch | `feat/20261112-phase-1-static-sprite-engine` |
| Base | `33ee981` (review round 1 recorded; diff-only doc commit) |
| Head | `227c495` plus this evidence commit |
| Result | **Pass** — one High and six Medium findings resolved, five Low findings resolved or recorded, both user-approved spec amendments implemented, goldens unchanged |

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | `tsc --noEmit` clean; `biome check .` 99 files clean; `vitest run` 41 files / 342 tests passed; `tsc -p tsconfig.build.json` clean |
| `pnpm vitest run --coverage` | 0 | 41 files / 342 tests passed; aggregate coverage statements 94.72%, branches 87.13%, functions 100%, lines 94.5% — all above the 80 gate |

`pnpm verify` ran before every task commit below. Both gates were re-run on the final tree.

Coverage moved from 94.71 / 86.95 to 94.72 / 87.13 (statements / branches); no threshold, no
per-file configuration, and no `vitest.config.ts` edit was made — the only CI-side change is the
step that actually runs the documented gate.

## Findings

| ID | Sev | Resolution | Commit | Evidence |
| --- | --- | --- | --- | --- |
| F1 | High | Exit codes restored to FR-23: caller faults 1, `E_INTERNAL` 2, lint gate 3. Constants renamed `EXIT_CALLER` / `EXIT_INTERNAL` / `EXIT_LINT`, help map fixed, `isInternalError` added, four inverted tests flipped, real internal-fault test added | `3ef0660` | `test/integration/internal-error.test.ts` forces `renderRecipe` to throw for one recipe name and asserts exit 2 with `E_INTERNAL`; a missing file in the same file asserts exit 1 |
| F2 | Medium | `px_validate` is a seventh MCP tool; a table-driven reachability test enumerates every CLI value and boolean flag and fails when one is unreachable; parity covers `derive_ramps`, `force`, and `validate` | `1385f54` | `test/mcp/reachability.test.ts` (VALUE_FLAGS + BOOLEAN_FLAGS minus help/pretty/color, each mapped to a tool and an argv); `test/mcp/parity.test.ts`; `test/smoke/mcp-stdio.test.ts` expects seven tools |
| F3 | Medium | `ORPHAN_PIXEL` uses 8-way connectivity, so a 1-px diagonal `line` and `dither_fill checker_50` are clean while an isolated pixel is still flagged | `6b4dfaf` | `test/lint/rules.test.ts`: diagonal neighbour test inverted, line 0,0→7,7 and checker_50 fixtures assert no finding, 64 isolated dots still bounded with `count: 64` |
| F4 | Medium | `pixel_perfect` withdrawn from the type, normaliser, canonical serialiser, `line`, `drawLine`, tests and fixtures; `removeCorners` deleted; a recipe that still carries the key is rejected with `E_BAD_PARAM`, never silently ignored | `d7650bc` | `test/unit/recipe.test.ts` ('rejects the withdrawn pixel_perfect flag instead of ignoring it'); `test/unit/ops.test.ts` no longer imports `removeCorners` |
| F5 | Medium | `replaced_index` replaces `replaced`, including the index-0 case; `px_edit`'s description states the field name and that it is zero-based | `7768948` | `test/ops/op-addressing.test.ts` asserts `replaced_index` 2, 0 (index 0 within a layer), and 0 (multi-layer search) |
| F6 | Medium | `ramp_fill` rejects a band count the region's light axis cannot display, naming the maximum (`E_REGION_TOO_THIN`, documented beside `E_BANDS_RANGE`); AC-12's N−1 transitions stay unconditionally true | `94a40ad` | `test/ops/ramp-fill.test.ts`: 2×1 with `bands: 3` → `E_REGION_TOO_THIN`, message 'supports at most 2', hint 'bands 2 or fewer'; the N−1 loop for bands 2 and 3 is unchanged |
| F7 | Medium | The verify job runs `pnpm coverage` after `pnpm test`; aggregate threshold untouched | `15a029a` | `.github/workflows/ci.yml` |
| F8 | Low | `--backdrop <hex\|null>` on `render` and `backdrop` on `px_render`; `null` clears panel B | `9e62943` | `test/integration/cli.test.ts`: default, custom and null sheets produce three distinct debug hashes; invalid hex and `--backdrop` without `--debug` are `E_USAGE` exit 1; `test/mcp/reachability.test.ts` asserts the null mapping |
| F9 | Low | `draw` and `edit` return source + parse warnings, deduplicated; `anchor` shares the same merge | `d5c619a` | `test/integration/cli.test.ts`: out-of-canvas anchor yields exactly one `W_ANCHOR_OUT_OF_BOUNDS` from both verbs; a clean draw omits the key |
| F10 | Low | File writes go through one helper; an unwritable `--out` is `E_WRITE_FAILED` (exit 1) naming the resolved path with a hint | `8ccf9fb` | `test/integration/cli.test.ts` passes a directory as `--out` for `render` and `draw`, asserting code, message path and hint |
| F11 | Low | Resolved as a warning, not a fifth lint code: FR-20's four codes stay closed. Every verb that compiles the recipe returns `W_PASS_NOOP` | `227c495` | `test/lint/feedback-cli.test.ts` runs `validate`, `inspect`, `render` over the same no-op post-pass recipe and finds two warnings in each, with an empty findings list |
| F12 | Low | Recorded here (see Deviations) | this file | — |

## Acceptance criteria touched

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC-5 — geometry ops produce the pinned rasters | `line` is plain Bresenham; goldens unchanged; hero hash still `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | Pass |
| AC-12 — N bands yield exactly N−1 role transitions | `test/ops/ramp-fill.test.ts` bands 2 and 3 (unchanged assertions) plus the thin-region rejection, so the accepted domain is exactly the domain that satisfies it | Pass |
| AC-18 — each rule fires, is silent on clean art, and `--strict` changes the exit | `test/lint/rules.test.ts` diagonal/checker fixtures now silent; `test/lint/feedback-cli.test.ts` strict gate still 3 | Pass |
| AC-19 — CLI and MCP return the same output | Parity suite covers init (twice, with `derive_ramps` and `force`), draw, validate, anchor, inspect, edit, render; byte-identical envelopes, recipes, PNG, metadata and debug sheet | Pass |
| FR-22 — seven tools | `MCP_TOOLS`, `test/smoke/mcp-stdio.test.ts`, reachability table | Pass |
| FR-23 — exit codes and envelope | F1, F9, F10 | Pass |
| FR-24 — op ids and the index map | F5 | Pass |
| NFR-7 — coverage on new code | CI step plus aggregate run above | Pass |

## Goldens

| Golden | Expected | Observed | Status |
| --- | --- | --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | same | unchanged |
| `test/benchmarks/chest/chest.sha256` | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | same | unchanged |
| `test/benchmarks/humanoid/humanoid.sha256` | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | same | unchanged |
| `test/benchmarks/sword/sword.sha256` | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | same | unchanged |
| `test/benchmarks/potion/potion.sha256` | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | same | unchanged |

`git diff 33ee981 HEAD -- test/goldens test/benchmarks` is empty: no fixture, recipe or hash was
touched, and the goldens project passes on the final tree.

## Deviations

### Undeclared file changes from earlier phases (F12)

| File | Why it changed and why it is not a workspace or engine change |
| --- | --- |
| `pnpm-workspace.yaml` | Carries the pnpm 12 build-approval policy so `@biomejs/biome` and other install scripts may run. It is not a workspace definition — the repo is a single package and the file declares no packages. Declared here as a process defect: it should have had a deviation entry when introduced. |
| `opencode.json` | Registers the project's own MCP server for dogfooding (the dogfooding pass that found the missing `derive_ramps` mapping). A local tool configuration, not shipped product surface. Declared here for the same reason. |
| `.opencode/agents/conductor-phase.md` | Gained a `pnpm coverage *` allow rule so a phase executor can run the documented coverage gate for evidence. Declared here; it grants nothing beyond the command `workflow.md` already names. |

The phase-5 rewrite of `src/lint/jaggy.ts` was declared in
`conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-5.md` under the
primary-verification section rather than as a deviation. Recorded here so the file list reconciles.

### Deviations from the reviewer's literal suggestion

| Area | Deviation | Reason |
| --- | --- | --- |
| F11 / `W_PASS_NOOP` | Kept as a warning and covered by a new test, instead of adding a fifth lint finding code. The spec's edge-case row still says "info finding" and must be amended by the primary. | FR-20 pins exactly four codes; a fifth code would widen a closed product surface for a condition that is already reported. The behaviour the caller needs — visible, actionable, silent when clean — is met by `warnings`. |
| F9 / warnings | Source and parse warnings are merged with a de-duplicating helper rather than concatenated. | The source file and the re-parsed output describe the same recipe, so the raw concatenation emitted the same `W_ANCHOR_OUT_OF_BOUNDS` twice. `anchor` shares the helper, so all three writers now report one copy of each distinct warning. |
| F6 / new code | Added `E_REGION_TOO_THIN` rather than reusing `E_BANDS_RANGE`. | `E_BANDS_RANGE`'s hint explains the three-shading-role ceiling and would be false for a 2×1 region with three bands, where the band count is legal but the region is too thin. Two failure modes, two codes, each with a truthful hint. |
| F10 / new code | Added `E_WRITE_FAILED` rather than reusing `E_USAGE` or `E_FILE_EXISTS`. | Neither fits: the flags parsed fine and the file may not exist yet; only the destination is unwritable. The message names the resolved path so the caller does not have to guess which directory failed. |
| F8 / flag validity | `--backdrop` without `--debug` is `E_USAGE` exit 1 instead of silently ignored. | The backdrop only exists on the debug sheet; accepting it without `--debug` would be dead surface again, the exact defect F8 reports. |

No file outside the phase's `Touches` paths was modified. No runtime dependency was added, removed
or changed.

## Notes for the primary

Conductor state was not edited. These updates belong to the primary:

1. `spec.md` edge cases: change the `auto_outline` / `auto_shade` on an empty layer row from
   "no-op with an info finding" to "no-op reported as a `W_PASS_NOOP` warning in `warnings`; the
   four lint codes of FR-20 are closed". This is the F11 decision.
2. `spec.md` assumptions (around the open-question line): the bullet mentioning "pixel-perfect"
   line corner removal is stale now that FR-6 withdrew the flag — remove the phrase.
3. `plan.md` Phase R1: tick R1.T1–R1.T12 and mark the phase complete; the task text already
   matches what shipped.
4. `metadata.json` / `tracks.md` / `conductor/index.md`: phase R1 complete, 342 tests, coverage
   94.72 / 87.13 / 100 / 94.5, new verification path.
5. `review.md` round 1 can move to resolved once the primary's own acceptance run agrees; the
   Resolution column already points at the tasks above.
6. No product doc says "six tools", so no product-doc edit is needed for FR-22. The exit-code
   table in `product-guidelines.md` was already correct and the code now matches it.
   `verification/phase-2.md` claimed a `--backdrop` flag that did not exist; it exists now, so that
   row is accurate without an edit.
