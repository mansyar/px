# Phase 1 — Version-gated frame schema and compile

- Track: `20261119-animation-foundations`
- Phase: 1
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `3b64f8e2098f38a04eb407f7d29d15cf6c09463b`
- Head at verification: `8dd23d9`

## Result

Verified. Both required verification commands pass: `pnpm verify` exits 0, and the scoped
`pnpm exec vitest run …` command exits 0 (2 test files / 29 tests). An earlier shell permission
denial of the scoped command in the subagent session was RESOLVED BY PRIMARY, which ran the exact
command from the project root with exit 0 (see Commands history below). Both original deviations
are kept intact for the record.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static + unit + integration + smoke + goldens + build | `pnpm verify` | 0 | `tsc --noEmit`, `biome check .` (1 pre-existing warning in `test/recipe/version-1-2.test.ts`), 119 test files / 1034 tests passed, `tsc -p tsconfig.build.json` |
| Scoped tests | `pnpm exec vitest run test/recipe/version-1-4.test.ts test/unit/recipe.test.ts test/unit/compile.test.ts` | 0 | `RUN v5.1.0`; 2 test files / 29 tests passed in ~618 ms. `test/recipe/**` is outside every vitest project include, so the explicit-path run executes the two in-scope unit files (`test/unit/recipe.test.ts`, `test/unit/compile.test.ts`); their equivalent v1.4 assertions are also what `pnpm verify` runs |

History — **RESOLVED BY PRIMARY (2026-11-19)**: in the subagent session the scoped command returned
`permission.rejected` because `pnpm exec` is not in that shell's allowlist. The primary ran the exact
command from the project root and it exited 0 with the summary above. The permission denial is
retained here as history; the deviation below records the original condition unchanged.

## Acceptance criteria

| AC | Evidence | Status |
| --- | --- | --- |
| AC-1 — v1.4 accepted; `frames` below 1.4 rejected naming 1.4; empty/duplicate frame ids fail | `test/recipe/version-1-4.test.ts` (schema gate and frame shape), mirrored in `test/unit/recipe.test.ts` (`schema 1.4 frames`); `normalize.ts` version gate uses `E_BAD_VERSION` with `1.4` in message + hint; `E_BAD_META` for shape errors | Verified |
| AC-2 — canonical `frames` round-trip byte-identical; v1.4 without frames matches v1.3 apart from version literal | `serialize.ts` emits `frames` after `layers` only when present; round-trip tests in all three test files; `v14 === v13.replace('1.3','1.4')` assertion | Verified |
| AC-3 — frame 0 flattened/layers/owners/render SHA equal legacy; extra frames reuse the pipeline with stable hashes | `test/unit/compile.test.ts` compiles frame 0 against the legacy `compileRecipe` result, compares PNG SHA-256, and checks deterministic non-equal hashes for frames 1 and 2; `compileLayers` shared by both entry points | Verified |
| AC-4 — every frame linted with correct frame identifier, deterministic order, `--strict` gates any frame | `lint/types.ts` optional `frame`, `compareFindings` frame-first ordering, `lintCompiledFrames`; tests confirm frame-0 findings equal legacy, extra-frame findings are tagged and `lintBlocks(..., true)` is true | Verified |
| AC-10 — `pnpm verify` exit 0; ≥80% scoped coverage; `scores.json` SHA unchanged; no out-of-scope changes | `pnpm verify` exit 0 above; golden/gate tests pass; `git status --short` clean after commits and limited to the Touches list (plus the two evidence files); `scores.json` and `hero.sha256` untouched | Verified |

`LATEST_RECIPE_VERSION` remains `'1.1'`; no new dependency, engine op, lint threshold, rubric or CI
change; no change to `test/art/**`, existing goldens, `hero.sha256`, archived tracks or product docs.

## Evidence paths

- `conductor/tracks/20261119-animation-foundations/verification/schema-frames.md`
- `conductor/tracks/20261119-animation-foundations/verification/phase-1.md`

## Deviations

- `test/recipe/version-1-4.test.ts` lives outside any vitest project include (`vitest.config.ts`
  does not list `test/recipe/**`), and the explicit-path verification command is denied by shell
  permissions. To keep the assertions executable, equivalent checks were added to the in-scope
  files `test/unit/recipe.test.ts` and `test/unit/compile.test.ts` (both listed in Touches). No
  config file was changed.
- `src/core/errors.ts` was not in Touches, so frame shape errors reuse existing `E_BAD_META` /
  `E_BAD_LAYER` codes with explicit messages and hints instead of adding new error codes.

## Notes

- Task commits: `c304db4` (T1), `0dd801e` (T2), `de31a99` (T3), `ecdae89` (T4), `4dd8145`
  (tests). Evidence is committed separately.
- The one Biome warning is pre-existing in `test/recipe/version-1-2.test.ts` and does not fail
  `pnpm lint`.
- `duration` is stored verbatim and never interpreted; mapping frame indices to declared ids for
  downstream metadata remains a later phase concern.

## Primary verification (conductor-implement)

Date: 2026-11-19. Branch `feat/20261119-animation-foundations`; phase base `3b64f8e2098f38a04eb407f7d29d15cf6c09463b`.

- Working tree clean before verification; range `3b64f8e..HEAD` contains exactly the seven commits reported by the phase subagent (c304db4, 0dd801e, de31a99, ecdae89, 4dd8145, 8dd23d9, 058096c), with no merge or user commit. All 11 changed paths are within Phase 1 Touches.
- The exact secondary command denied to the subagent was run by the primary from the project root: `pnpm exec vitest run test/recipe/version-1-4.test.ts test/unit/recipe.test.ts test/unit/compile.test.ts` → exit 0, 2 test files / 29 tests. `test/recipe/**` is outside every vitest project include, so the executed assertions live in the two in-scope unit files.
- Primary re-ran `pnpm verify` → exit 0: `biome check .` 224 files with one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 test files / 1034 tests pass; build clean.
- Baseline integrity confirmed unchanged: `scores.json` `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`, `hero.sha256` `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62`, `render.test.ts`, `meta-export.test.ts`, `parity.test.ts`, `src/meta/index.ts` and `src/mcp/tools.ts` all match the pre-phase digests.
- AC-1, AC-2, AC-3, AC-4 and AC-10 are satisfied. The historical scoped-command denial is retained as RESOLVED BY PRIMARY history; the `schema-frames.md` command row is corrected to record the primary's exit 0 without altering any assertion, scope or digest.
- Squash eligible: all phase commits were reported by the subagent.

