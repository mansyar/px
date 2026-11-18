# Recipe Changes — Gate Publishable Pass (Phase 1)

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 1 — Re-author the humanoid ramps and re-render faithful artifacts
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Base commit:** `4952b1addcd8838c18da5b3d31685e2506c13d00`
**Head commit (verified tree):** `0e17e25` (art commit; evidence commit follows)
**Result:** `blocked` — P1.T4 primary visual review is outstanding (see `phase-1.md`).

## 1. Recipe change summary

Only one v2 recipe was modified: `test/art/v2/humanoid/humanoid.px.json`. No engine,
CLI, MCP, op, linter, rubric, scoring, style or dependency file was touched.

### 1.1 `test/art/v2/humanoid/humanoid.px.json`

The ten palette ramps were re-authored as coherent warm-to-cool hue-stepped five-stop
families. Highlights step toward warm cream/silver, mid tones settle into one steel-blue
spine, and shadows step toward deeper cool blue. The seven armour parts (torso, helm,
pauldron, blade, arm, leg, gorget) now share that spine and differ mainly in value; the
hilt (warm brass) and plume (crimson) are the two small warm accents. This replaces the
prior arbitrary purple-torso / teal-limb / emerald-leg / mustard-hilt mix that the
instrument flagged as `palette_craft=2` ("colors feel somewhat arbitrary with harsh
ramps and hues that do not harmonize").

Final authored ramps (t0 lightest → t4 darkest; outline tone `#0b0a10` unchanged):

| Part | t0 | t1 | t2 (base) | t3 | t4 |
| --- | --- | --- | --- | --- | --- |
| arm | `#9db3ba` | `#6d8d99` | `#365f70` | `#193d50` | `#0a2032` |
| leg | `#9db3ba` | `#6d8d99` | `#365f70` | `#193d50` | `#0a2032` |
| blade | `#eee6d4` | `#d6d5cb` | `#b4c2d1` | `#87a2c1` | `#58799e` |
| helm | `#f2e9da` | `#dcd8cb` | `#bbc7d3` | `#93aac5` | `#6485a6` |
| hilt | `#f7e7b2` | `#e7ce7c` | `#c9ab48` | `#96782c` | `#57401a` |
| gorget | `#cbcbbd` | `#adb8bb` | `#92a4b8` | `#5d7898` | `#364f74` |
| pauldron | `#dedac9` | `#c0c6c4` | `#a6bccc` | `#6d8bab` | `#42638a` |
| plume | `#e79a76` | `#d05a44` | `#a32932` | `#6f182c` | `#390c1b` |
| torso | `#557087` | `#2f4962` | `#0a1c34` | `#061126` | `#030916` |
| ink | `#0b0a10` (outline role) | — | — | — | — |

Two strict-lint repairs were applied during authoring (both recorded in `phase-1.md`
§Deviations): `gorget.t2` was lightened `#879ab0` → `#92a4b8` to clear
`SILHOUETTE_LOSS` (1.37:1 → above 1.50:1), and `pauldron.t2` was lightened
`#9aadc0` → `#a6bccc` to open the `VALUE_COLLISION` gap with gorget from 0.044 to
~0.12 (≥0.06 required). No op, grid, anchor, hierarchy, value, material or edge
declaration changed. The single `light` op (`top-left` / `bevel` / `ao: true` /
`cast: null` / `cast_offset: 2` / `rim: edge`) remains immediately before
`auto_outline`; there is no `harmonize` and no second light. `design.style` stays
`@project`. `humanoid.calls.json` was not edited (one `--strict` render, four calls).

### 1.2 Digest changes

| Asset | Before (committed SHA-256) | After (committed SHA-256) | Stability |
| --- | --- | --- | --- |
| humanoid | `27fd32e616389b767d112ae68992ae2912eeca57cf8cd9f7daa7a70aacea0c2a` | `76c4ba9beecdbfdd56fd27ad69ea21b2f575092d59a74be9f4eef73409fb9ee1` | two strict renders identical |

`.conductor/evidence/art-v2/generation-summary.json` independently confirms
`recipe_sha256 === committed_sha256` with `blocking_findings: 0` for humanoid
(35 info findings; no error or warning).

## 2. Byte-identity table — v2 and v1 assets

`git status --short` and `git diff --stat` after the task commit list only the three
humanoid files (`humanoid.px.json`, `humanoid.sha256`, `humanoid.design.md`). `pnpm
verify` passed, and `test/art/assets-v2.test.ts` re-pins all seven v1 original digests.

### Other five unchanged v2 assets (unchanged since origin)

| Asset | v2 recipe / sidecars / score | v2 committed digest | v1 original digest (pinned) |
| --- | --- | --- | --- |
| potion | unchanged | `032ea8b95c9bf7f368cedaca8e88527b3133f0f4bcbeb7d1657a55524543cb90` | `2ea4173c7b8e27cc6723e4acd4fffc38a412f7d32bc65308dd4bfb7fe6622a3e` ✓ |
| sword | unchanged | `cd23f140f0f0ffcd6146d0d7ebc082e2680987e4a6a630faabfc7bfc8319d057` | `722fc7dbac870e31e34c8359a6a623b57a96396d900aba81489d8161b9290ee2` ✓ |
| chest | unchanged | `1bca726e94fa32cf9830a1234bfc631e8054eb649170fb815b1cde4019750354` | `07193f4570790b3d5c4df8cf2a8bcf9339b3e63f70dbc36f5d36a101d06906b6` ✓ |
| character | unchanged | `f1ff1aede6943b60efe5fbff5fe6a18e5de4dd486fd9564615a2e29a31c0b3a5` | `18e12c69b28b73d87faf2e5a843f7516364d61cc4e6eab6e8c7ed229c27d039b` ✓ |
| prop | unchanged | `387cd4ccf1bda19d5a1540f98d49aafd880ab1db247b1dff92c7f210a1b29d58` | `9c6bd6d9d13da48e29332f8076cb27330eebcc6400f83f7aaa5663916a879c31` ✓ |

### Sixth non-target v2 asset (unchanged this phase; re-authored in prior track)

| Asset | v2 committed digest | v1 original digest (pinned) |
| --- | --- | --- |
| scene | `f48e72d7ecfda015c5de9623ed2e732cc648a2675d7b0b950406af7f42457a24` | `ab2567d4e976355272d13476d58604d50d402bf38b6a643f4cb74ea7b31280c5` ✓ |

All seven v1 originals remain byte-identical to their pinned digests
(`assets-v2.test.ts` "leaves every original asset digest untouched" passes).

## 3. Humanoid byte-identity waiver

The prior track `20261118-gate-close-flash-lite` recorded a scoped waiver in its
`verification/recipe-changes.md` §3: "Phase 1 explicitly releases humanoid
byte-identity for this track. The humanoid v2 recipe, design note and SHA-256
sidecar were intentionally changed... The user-authorized waiver is exercised
only for humanoid; the five assets listed in §2 remain byte-identical."

This phase reuses that waiver for the same three humanoid files only. No other
recipe, sidecar, score record or v1 original was released or rewritten. FR-6 /
AC-6 byte-identity holds for all six non-humanoid v2 assets and all seven v1
originals.

## 4. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `git status --short` | 0 | only three humanoid files modified after task commit |
| static | `git diff --stat` | 0 | 3 files changed, 64 insertions, 54 deletions — all humanoid |
| static | `git diff --no-index --stat <repo-recipe> <temp-recipe>` | 0 | no output — temp copy byte-identical to committed recipe |
| render | `pnpm exec tsx src/cli.ts render --file <temp>/humanoid.px.json --out humanoid.png --debug --strict` (from temp workspace with root `px.style.json`) | 0 | new digest `76c4ba9b…`, strict clean, info findings only |
| render | same command, second run | 0 | repeat digest `76c4ba9b…`, stable |
| integration | `pnpm verify` | 0 | typecheck, lint (1 pre-existing warning), 119 files / 1028 tests, build; regenerates faithful A/B artifacts |

## 5. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 / AC-3 | humanoid recipe re-authored as coherent warm/cool hue-stepped ramps; strict-clean | §1.1; digest + generation-summary | done |
| NFR-3 | digest stability across two renders | §1.2 stability column; repeat render | done |
| AC-7 | `pnpm verify` exit 0; other assets byte-identical | §4 integration row; §2 pinned digests | done |
| AC-9 | primary visual review before scoring | `phase-1.md` §PENDING PRIMARY VISUAL REVIEW | PENDING PRIMARY |

## 6. Evidence paths

- `test/art/v2/humanoid/humanoid.{px.json,sha256,design.md}`
- `test/art/v2/humanoid/humanoid.calls.json` (unchanged)
- `.conductor/evidence/art-v2/humanoid.{png,8x.png,debug.png}`
- `.conductor/evidence/art-v2/generation-summary.json`
- `.conductor/evidence/gate-publishable-pass/humanoid-baseline.{8x.png,debug.png}` (preserved)

## 7. Deviations

- `shell` `New-Item/Copy-Item` was permission-denied for this subagent; the temp workspace
  was created with `write`/`edit` instead and confirmed byte-identical with `git diff
  --no-index --stat`. Faithful A/B artifacts were regenerated by the permitted
  `pnpm verify` (`scoring-artifacts.test.ts`).
- `pnpm lint` reports one pre-existing warning in `test/recipe/version-1-2.test.ts`
  (non-null assertion). It is unrelated to this phase and was not modified.

## 8. Notes

- Credentialed scoring (`scripts/rubric.mjs`) was deliberately not run; Phase 2 belongs
  to the primary agent, and only after the primary's visual verdict in `phase-1.md`.
