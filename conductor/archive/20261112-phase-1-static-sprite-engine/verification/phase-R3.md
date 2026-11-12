# Phase R3 — Review fixes (round 3 Lows): verification

Track: `20261112-phase-1-static-sprite-engine`
Phase: R3
Branch: `feat/20261112-phase-1-static-sprite-engine`
Base: `c22bbe5` · Head: `04c0380`
Date: 2026-11-13
Result: **PASS**. Both round-3 Lows are closed in code and evidence. No golden or
benchmark hash moved, and no rendered byte changed: the diff is one hint branch, one
parametrised test, one new fixture and one corrected sentence.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + build | `pnpm verify` | 0 | `tsc --noEmit` clean, `biome check .` 99 files clean, `vitest run` 41 files / 350 tests passed, `tsc -p tsconfig.build.json` clean |
| coverage | `pnpm vitest run --coverage` | 0 | 41 files / 350 tests passed, coverage below |

Test count moved 349 → 350 (one new fixture; the light-direction test was
parametrised, not duplicated, so it stays one test).

## Coverage

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| All files | 94.88% | 87.31% | 100% | 94.65% |
| `src/core` | 97.23% | 91.48% | 100% | 97.10% |
| `src/core/ops` | 96.40% | 89.49% | 100% | 96.14% |
| `src/core/recipe` | 89.38% | 82.20% | 100% | 89.27% |
| `src/lint` | 98.20% | 91.79% | 100% | 98.07% |
| `src/core/ops/ramp.ts` | 95.71% | 85.29% | 100% | 95.31% |

Gate: 80% statements and branches for `src/core` and `src/lint` — both pass. No
exclude list was widened, no ignore comment was added, and no threshold was lowered.
`ramp.ts` moved from 94.20%/78.12% (R2) to 95.71%/85.29% because the new hint branch
and its one-position fixture are now exercised.

## Finding rows

| Finding | Severity | Evidence | Commit |
| --- | --- | --- | --- |
| F1 — at `occupiedCount === 1` the hint told the caller to "pass bands 1 or fewer", which `normalize.ts` rejects with `E_BANDS_RANGE` | Low | `src/core/ops/ramp.ts` now picks the hint from the occupied count: below two positions it says `ramp_fill needs at least two light-axis positions: paint one more position along the light direction.` and omits the band-count clause entirely; at two or more it keeps `Pass bands N or fewer, or paint more positions along the light direction.`, which the parser accepts. Fixture `does not suggest a band count the parser rejects`: `set_pixels [[0,1],[1,0]]` + `ramp_fill bands: 2` → `E_REGION_TOO_THIN`, hint contains `at least two light-axis positions`, does **not** contain `or fewer`, and matches no `bands <digit>` form. The two existing fixtures at two occupied positions still assert `bands 2 or fewer`. | `04496db` |
| F2 — `verification/phase-R2.md` claimed the ramp fixtures cover "all four light directions" while `axisProjection`'s `bottom-right` branch was untested | Low | `test/ops/ramp-fill.test.ts` parametrises `moves the light with light_dir` over every accepted direction on the existing 8×4 block at `bands: 2`, asserting the first role row: `top-left` `hhhhhhss`, `top-right` `sshhhhhh`, `bottom-left` `hhhsssss`, `bottom-right` `ssssshhh` (the mirror of `top-left`). `verification/phase-R2.md` now reads "the four light directions (each asserted on its first role row)", so the count is earned by four assertions. | `04c0380` |

## Determinism

No golden or benchmark fixture was touched. Re-rendered through the suite that owns
each hash:

| Fixture | SHA-256 | Result |
| --- | --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | match |
| `test/benchmarks/chest/chest.sha256` | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | match |
| `test/benchmarks/sword/sword.sha256` | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | match |
| `test/benchmarks/potion/potion.sha256` | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | match |
| `test/benchmarks/humanoid/humanoid.sha256` | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | match |

`test/goldens/render.test.ts` renders the hero twice and compares both digests;
`test/benchmarks/benchmarks.test.ts` re-renders each asset twice and compares both
against the committed hash and against the hash the CLI envelope reports. Both passed
in the runs above, so the signed hashes are reproduced, not asserted.

The change cannot move a byte by construction: the new branch only chooses error
text, and `axisProjection` returns the same values for `bottom-right` it always did —
the only new thing is a test that reads it.

## Tasks

| Task | Commit | Summary |
| --- | --- | --- |
| R3.T1 | `04496db` | `E_REGION_TOO_THIN` hint is branched on the occupied count, so at one position it never suggests an illegal band count; fixture `set_pixels [[0,1],[1,0]]` pins it. |
| R3.T2 | `04c0380` | Light-direction test parametrised over all four directions including `bottom-right`; the R2 evidence sentence corrected to match. |

## Deviations

1. **Test-first ordering left the fixture in the same commit as the fix, and the
   test file is shared by both tasks.** T1's fixture was written and observed failing
   before `ramp.ts` changed. To keep one commit per task, T2's parametrisation was
   staged out of the T1 commit and re-applied for T2. No hunk was lost; the final
   tree contains both changes, and `git show --stat` on `04496db` / `04c0380` shows
   the split.
2. **`verification/phase-R2.md` was edited outside the code tree.** It is in
   `Touches` for this phase, but it is a committed evidence file rather than source:
   the edit is limited to the one sentence F2 falsified. No coverage row, commit
   table or other claim was altered.

## Checked, not changed

- The rest of the ramp section in `phase-R2.md` still holds: bands 2 and 3 rows, the
  legal domain, transparency, determinism, `E_NO_RAMP`, the gap fixture `hhb...bss`,
  and the guard fixture at two occupied positions with hint `bands 2 or fewer` are all
  still asserted by the current file. No other false statement was found in it.

## For the primary (not edited here)

- `plan.md`: R3.T1.1 and R3.T2.1 can be checked; R3 phase status → complete.
- `review.md`: F1 and F2 can be marked fixed in round 3.
- `spec.md`: no change required — neither fix moves a contract, only agent-facing text
  and fixture coverage.
