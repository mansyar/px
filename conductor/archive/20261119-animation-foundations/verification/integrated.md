# Integrated verification — 20261119-animation-foundations

- **Track:** `20261119-animation-foundations`
- **Type:** feature
- **Branch:** `feat/20261119-animation-foundations`
- **Final check HEAD:** `a72d6763883439891c24d8393916b59d4ebbb8cf` (post Phase 3 acceptance; later doc-sync, review and completion commits are Conductor documentation only and do not change any command, exit code or metric recorded here)
- **Date:** 2026-11-19
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + integration + smoke + build | `pnpm verify` | 0 | 119 test files / 1041 tests passed; Biome 224 files, 1 pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (outside Touches); build clean |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; All files 95.01% statements (4021/4232), 85.8% branches (2671/3113), 98.36% functions (543/552), 94.82% lines (3809/4017); gate 80%; benchmarks excluded |
| determinism | `pnpm vitest run --project goldens` | 0 | 1 test file / 5 tests; hero golden plus anim-duo frame-0 and sheet digests |
| unit (explicit) | `pnpm exec vitest run test/recipe/version-1-4.test.ts test/unit/recipe.test.ts test/unit/compile.test.ts` | 0 | 2 in-scope test files / 29 tests; `test/recipe/**` is outside the vitest project includes |
| scoped | `pnpm exec vitest run test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts` | 0 | 3 files / 16 tests in final state (9 at the time the result was first supplied, before finalization test additions) |
| gate report | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite` |
| export | `pnpm dev render --file test/goldens/fixtures/anim-duo.px.json --out <tmp>/anim-duo.png --export --pretty` | 0 | frame-0 `7c0c9b38…b559`, sheet `6189229c…f045` (32×16), plus meta files; both workspaces byte-identical |
| integrity | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged |
| scope | `git diff --name-only d082eae6b958da29bf67cada67b46d3b3b86684a..HEAD` | 0 | 31 paths, all Conductor state/verification or approved Phase 1/2 Touches; no `test/art/scores.json`, archive, CI config or `hero.sha256` change |
| PR state | `gh pr list --state open --json number,url` | 0 | `[]` |

## Requirements

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Version `1.4` accepted; `frames` rejected below 1.4; empty/duplicate ids rejected | `verification/schema-frames.md`; `test/unit/recipe.test.ts`, `test/recipe/version-1-4.test.ts` | covered |
| FR-2 | Canonical frame round-trip; v1.4 without frames behaves as v1.3 | `verification/schema-frames.md`; `test/unit/recipe.test.ts` | covered |
| FR-3 | Frame 0 unchanged; additional frames compile through shared pipeline | `test/unit/compile.test.ts`; `src/core/compile.ts` | covered |
| FR-4 | Per-frame lint findings tagged and deterministic | `src/lint/{types,index}.ts`; `verification/schema-frames.md` | covered |
| FR-5 | Opt-in deterministic single-row sheet PNG | `src/cli/commands.ts`; double-render harness; `anim-duo.sheet.sha256` | covered |
| FR-6 | Additive `sheet` metadata, existing fields unchanged | `src/meta/index.ts`; `test/mcp/meta-export.test.ts` | covered |
| FR-7 | 2-frame golden fixture with committed frame-0 and sheet digests | `test/goldens/fixtures/anim-duo.*`; `test/goldens/render.test.ts` | covered |
| FR-8 | Help/MCP descriptions and `docs/animation.md` | `src/cli/main.ts`, `src/mcp/tools.ts`, `docs/animation.md`, `test/mcp/parity.test.ts` | covered |
| NFR-1 | Phase 1 byte digests and protected files unchanged | hash checks; scope diff | covered |
| NFR-2 | `pnpm verify` 0; coverage ≥80% on four metrics | commands table | covered |
| NFR-3 | Deterministic sheet, no RNG/timestamps/paths | two-workspace double render, all four hashes `SAME=True` | covered |
| NFR-4 | No new dependency; version-gated additive schema; opt-in sheet | manifest unchanged; `src/core/recipe/normalize.ts` | covered |
| AC-1 | v1.4 parses; v1.3 `frames` rejected naming 1.4; bad ids fail | `test/unit/recipe.test.ts` | covered |
| AC-2 | Canonical byte-identical round-trip | `test/unit/recipe.test.ts` | covered |
| AC-3 | Frame 0 hash equals legacy; extra frames compile | `test/unit/compile.test.ts` | covered |
| AC-4 | Frame id and order on lint findings; `--strict` gates | `verification/schema-frames.md`; lint tests | covered |
| AC-5 | Sheet PNG/meta written only with `--export` on framed recipes | `test/goldens/render.test.ts`, `test/mcp/meta-export.test.ts` | covered |
| AC-6 | Single-row sheet; two renders match committed SHA | double-render harness; `anim-duo.sheet.sha256` | covered |
| AC-7 | Ordered per-frame rect/trim/origin/duration; existing fields unchanged | `src/meta/index.ts`; meta-export tests | covered |
| AC-8 | New fixture golden passes twice; `hero.sha256` unchanged | goldens; `hero.sha256` hash | covered |
| AC-9 | Help/MCP/docs updated; envelope unchanged | parity tests; `docs/animation.md` | covered |
| AC-10 | Verify green; coverage ≥80%; scores hash unchanged; scope limited | commands and scope rows | covered |
| AC-11 | Honest PASS record with evidence; no re-baseline | `verification/decision.md`, `verification/phase-3.md` | covered |

## Outcome

`PASS` — version-gated animation foundations are implemented and verified. Phase checkpoints: Phase 1 `5cc61039886438e23dca5322e485439ba66ebc23`, Phase 2 `be67c0380f297183fad8cb9396eb0f5a908e25c7`, Phase 3 `37e42231bf2f2c9c35a6d9957e4d26a79362391f`. No pass was forced; no score, rationale, digest, golden, archive or CI value was re-baselined or hand-edited.

## Deviations

- `test/recipe/version-1-4.test.ts` lives outside every vitest project include; equivalent assertions were added to the in-scope `test/unit/recipe.test.ts` and `test/unit/compile.test.ts` so `pnpm verify` executes them. The explicit-path command was run by the primary (exit 0).
- Frame shape errors reuse existing `E_BAD_META`/`E_BAD_LAYER` codes with explicit messages because `src/core/errors.ts` is outside the approved Touches; no rule was weakened.
- The `anim-duo` fixture's initial `design` block was removed because `validateIntent` rejects hierarchy parts not declared in a `parts` block; canvas, palette and anchors remain shared by both frames.
- Phase 2's `pnpm dev render` command was shell-denied to the subagent; the primary ran it verbatim and supplied the four digests. Subagents' scoped coverage and rubric-report commands were likewise shell-denied; the primary ran them and the outputs were transcribed verbatim (RESOLVED BY PRIMARY).
- Phase squashes applied for all three phases (one reported commit each after squash).

## Evidence

- `verification/schema-frames.md`
- `verification/phase-1.md`
- `verification/export-sheet.md`
- `verification/phase-2.md`
- `verification/decision.md`
- `verification/phase-3.md`
- `docs/animation.md`
- `.conductor/evidence/anim-duo-digests.json` (gitignored)

## Notes

- Limitations disclosed honestly in `decision.md`: no new CLI verb or MCP tool; no onion-skin viewer, playback/interpolation, timeline, tilemap, GUI, translucent alpha, RNG, npm publish or non-Godot export; `duration` recorded but not interpreted; one lint warning pre-dates the track.
- `LATEST_RECIPE_VERSION` deliberately remains `1.1`.
- No new runtime dependency.
