# Phase 2 — Sheet export, additive metadata, fixture and docs

- Track: `20261119-animation-foundations`
- Phase: 2
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `ffbd33ca7f1147392b079810825af51311d44f02`

## Result

Verified. Every verification cell is filled with real output; no
`PENDING PRIMARY` cells remain. `pnpm verify` exits 0, the scoped vitest command
exits 0, the framed export produces the expected four files with the committed
digests, two isolated renders are byte-identical, and the protected baselines
are unchanged. The first-invocation `pnpm dev` shell denial is recorded below as
RESOLVED BY PRIMARY; the final report has no blockers.

## Commands and exit codes

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static + unit + integration + smoke + goldens + build | `pnpm verify` | 0 | `tsc --noEmit`; `biome check .` 224 files with one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 test files / 1041 tests passed; `tsc -p tsconfig.build.json` clean |
| Scoped tests (primary) | `pnpm exec vitest run test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts` | 0 | `RUN v5.1.0`; 3 test files / 9 tests passed. The primary ran this before the finalization test additions; the additions are covered by the final `pnpm verify` above |
| Framed export (primary) | `pnpm dev render --file test/goldens/fixtures/anim-duo.px.json --out C:/Users/Ansyar/AppData/Local/Temp/opencode/anim-duo.png --export --pretty` | 0 | Four files written; frame-0 `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559`, sheet `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045`, normal meta `81592ec340a78fdd2febcc4bdcd81cbee8cdbcb482ddc75a5b4dcca9cc913dd0`, sheet meta `92fe07c5d648a6bc7cfd86ee4986cf045bc0ae857bb334aaf5856e46110cce17`, recipe hash `sha256:78b813f210c55a241e29b93e0249c954a7faee2e07ee0973c24a4157631c6966`; sheet 32×16, frame-0 PNG 16×16 |
| Deterministic double render (primary) | two isolated workspaces; recipe + root `px.style.json` copy; `node_modules/.bin/tsx.ps1 render --file anim-duo.px.json --out anim-duo.png --export` | 0 / 0 | All four outputs byte-identical A = B (uppercase digests). PNGs: `7C0C9B38…B559` / `6189229C…F045`; metas: `81592EC3…3DD0` / `92FE07C5…CE17` |
| Rubric (primary) | `node scripts/rubric-report.mjs` | 0 | `mean 3.82 · pass · gemini-3.5-flash-lite`; `scores.json` SHA unchanged |

**RESOLVED BY PRIMARY (2026-11-19).** The first subagent invocation of
`pnpm dev render …` returned `permission.rejected` because only `pnpm verify`
and git commands are in that shell's allowlist. The primary ran the exact
command from the project root with exit 0 and the digests above; the two
isolated workspaces independently reproduced them. The denial is retained as
history only — it is not a current blocker.

## Acceptance criteria

| AC | Evidence | Status |
| --- | --- | --- |
| AC-5 — sheet files only with `--export` on a framed recipe; normal pair always present; no new verb/tool | `runRender` gates `writeSheet` on `args.metaExport && effective.frames.length > 0`; `test/mcp/meta-export.test.ts` asserts the four files with export, no sheet without it, and no sheet for a v1.4 recipe with `frames` deleted; help and `px_render` descriptions unchanged in shape | Verified |
| AC-6 — single left-to-right row, cumulative x, y=0, sum widths, max height, transparent padding; existing `encodePng` | `renderSheet` packs compiled frames with `rasterizeSlots`, transparent `Uint8Array` canvas and the unchanged `encodePng` (filter 0, deflate 9); `test/goldens/render.test.ts` asserts the ordered frame rectangles and 16×16 / 32×16 sizes | Verified |
| AC-7 — ordered `sheet` array with index/id/x/y/width/height/trim/origin/duration; v/texture_path/filter/centered/offset/anchors/recipe_hash unchanged | `buildSheetFrames` + `buildMetadata` spread `generic.sheet` in only when non-empty; `test/mcp/meta-export.test.ts` compares the normal and sheet meta field-by-field and checks the ordered entries, optional `id`/`duration`, trim and origin; single-frame meta has no `sheet` key | Verified |
| AC-8 — new golden fixture with committed SHAs; goldens render twice; hero unchanged | `anim-duo.px.json` plus `anim-duo.sha256` / `anim-duo.sheet.sha256`; `test/goldens/render.test.ts` renders the fixture twice and checks both digests; primary double render A = B; `hero.sha256` unchanged | Verified |
| AC-9 — help/MCP/docs mention framed export; envelope unchanged | `src/cli/main.ts` usage line, `src/mcp/tools.ts` `px_render` description and `docs/animation.md` document the four-file contract; no new tool or verb; only the additive `sheet` payload key; `test/mcp/parity.test.ts` asserts envelope equality between CLI and MCP | Verified |
| AC-10 — `pnpm verify` exit 0; coverage; `scores.json` SHA unchanged; no out-of-scope changes | Final `pnpm verify` exit 0 (119 files / 1041 tests, build clean) above; `scores.json` `E5CCE080…C828D` and `hero.sha256` `A8FE8F44…ED62` unchanged; changes limited to the Touches list plus the two evidence files | Verified |
| AC-11 — honest evidence | All commands, digests and counts above are real primary or final-session output; no score, digest, render or test result was invented; historical denial is labelled RESOLVED BY PRIMARY | Verified |

`LATEST_RECIPE_VERSION` stays `'1.1'`. No new dependency, engine op, lint
threshold, rubric or CI change; no change to `test/art/**`, archived tracks or
existing goldens. `test/recipe/version-1-2.test.ts:50` is a pre-existing warning
outside Touches and was deliberately left alone.

## Deviations

- The golden fixture's initial `design` block was removed: `validateIntent`
  rejects a `design.hierarchy` that names a part absent from a `parts` block, and
  the fixture needs no design intent to exercise sheet packing. Canvas, palette
  and anchors remain recipe-level and shared by both frames, which is what the
  contract requires. No validation rule was relaxed.
- `.conductor/evidence/anim-duo-digests.json` was written by a temporary
  digest-computation test during the first subagent invocation as a fallback
  when `pnpm dev` was denied. The primary's independent render agrees with it;
  the temporary test was removed before final verification. The artifact is an
  allowed evidence location and is not part of the shipped code.

## Notes

- `id` and `duration` are the only optional `sheet` entry fields: frame 0 has
  no declared id, and `duration` is recorded but never interpreted. This
  mirrors Phase 1's optional `CompiledFrame.id` and untagged frame-0 findings.
- The sheet meta's `texture_path` names the sheet PNG; every other frame-0
  projection field is carried over verbatim. The normal PNG is never rewritten.
- Evidence paths:
  `conductor/tracks/20261119-animation-foundations/verification/export-sheet.md`
  and `conductor/tracks/20261119-animation-foundations/verification/phase-2.md`.
- Task commits are listed in the final phase report; evidence is committed with
  the phase work.

## Primary verification (conductor-implement)

Date: 2026-11-19. Branch `feat/20261119-animation-foundations`; phase base
`ffbd33ca7f1147392b079810825af51311d44f02`.

- The exact command denied to the first subagent invocation was run from the
  project root and exited 0 with the four-file digests recorded above.
- Two isolated double renders (recipe + a copy of root `px.style.json`,
  `node_modules/.bin/tsx.ps1`) produced byte-identical PNGs and metas, proving
  no dependency on workspace path or ambient style resolution.
- Scoped vitest exited 0 (3 files / 9 tests) at the time supplied; the final
  `pnpm verify` after finalization exited 0 with 119 files / 1041 tests.
- `node scripts/rubric-report.mjs` exited 0 with `mean 3.82 · pass ·
  gemini-3.5-flash-lite`, and the rubric output `scores.json` SHA stayed
  `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
- `hero.sha256` stayed
  `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62`;
  no `test/art/**` file, existing golden, archived track, CI or rubric config
  was modified.
- AC-5 through AC-11 are satisfied. The denial is retained solely as RESOLVED
  BY PRIMARY history; no blockers remain.

## Primary verification (conductor-implement)

- Date: 2026-11-19.
- Working tree clean at verification time.
- Range `ffbd33ca7f1147392b079810825af51311d44f02..HEAD` contains exactly the four commits reported by the subagent (`00f0d3a`, `91e2af8`, `ededd61`, `819a7bf`), no merge or user commits; all 13 changed paths are within the phase Touches (CLI/meta/MCP/docs source and descriptions, `anim-duo` fixture + two sidecars, golden/meta-export/parity tests, and the two verification docs). Squash guard eligible.
- Primary re-ran `pnpm verify`: exit 0 — 119 test files / 1041 tests passed, build clean, one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (outside Touches).
- Primary re-ran the scoped command `pnpm exec vitest run test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts`: exit 0 — 3 test files / 16 tests in the final state (the evidence records 9 tests at the time the primary first supplied the result, before the finalization test additions; the added tests are included in the final `pnpm verify`).
- Primary re-ran the two-workspace double-render harness: both workspaces produced identical frame-0 PNG `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559`, sheet PNG `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045`, frame-0 meta `81592ec340a78fdd2febcc4bdcd81cbee8cdbcb482ddc75a5b4dcca9cc913dd0`, and sheet meta `92fe07c5d648a6bc7cfd86ee4986cf045bc0ae857bb334aaf5856e46110cce17`; all `SAME=True` and equal to the committed sidecars.
- Primary `node scripts/rubric-report.mjs`: exit 0 — 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite`. `test/art/scores.json` SHA-256 unchanged `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; `test/goldens/fixtures/hero.sha256` unchanged `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62`.
- Grep for `PENDING PRIMARY` returns two matches, both in negation prose ("no `PENDING PRIMARY` cells remain"); there are no unresolved cells.
- FR-5, FR-6, FR-7, FR-8, NFR-1, NFR-2, NFR-3, NFR-4 and AC-5 through AC-10 are satisfied. Phase 2 accepted; squash to one conventional commit.

