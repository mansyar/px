# Recipe Changes — Publishable Gate Close (Phase 1)

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 1 — Re-author the two target recipes and re-render faithful artifacts
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Base commit:** `5e16250d81fdb0b84e10ec40e83bbebf781773af`
**Head commit (verified tree):** `06c408b583993d70b1a57614ac94ecd38c75dbfe`
**Result:** `verified`

## 1. Recipe change summary

Only two v2 recipes were modified. Both changes follow the validated chest-L lever:
warm/cool five-stop ramps (already authored in these recipes), exactly one top-left
`light` pass before `auto_outline`, and no `harmonize`.

### 1.1 `test/art/v2/humanoid/humanoid.px.json`

- Removed three dormant `facing` declarations (`blade`: `right`, `helm`: `front`,
  `torso`: `front`). With them present, `planeShade` overwrote each declared mass
  with a single role slot, flattening the plate/shading even though the recipe's
  ramps carry five authored tones.
- Inserted one `light` op (`angle: top-left`, `form: bevel`, `ao: true`,
  `cast: null`, `cast_offset: 2`, `rim: edge`) immediately before the existing
  `auto_outline`. No `harmonize` was added.
- Grids, anchors, hierarchy, values, materials, edges and all 10 `ascii_blit`
  ops are unchanged; the transcript still has one `--strict` render.

### 1.2 `test/art/v2/scene/scene.px.json`

- Removed the two opposing gable `facing` declarations (`roof_left`: `left`,
  `roof_right`: `right`). Under `top-left`, `planeDot` maps `left` to `+0.707`
  (highlight) and `right` to `-0.707` (shadow), so `planeShade` flattened the
  left slope to its lightest tone and the right slope to its darkest tone.
  Visual inspection of the baseline (`scene-baseline.png`) confirmed a stark
  cream-vs-reddish-brown split at the ridge.
- The `light` op already present in this recipe was retained unchanged; no second
  light, no new op, no `harmonize`. Both slopes now receive the same top-left
  bevel/AO/rim treatment and keep their authored tone detail.
- All twelve hierarchy parts, the hero `wall`, the well geometry, grids, anchors,
  values and ramps are unchanged. Three candidate `deriveRamp(base, 5)`
  re-materializations of `roof_right` were evaluated and rejected by strict lint
  (see §5); the original terracotta ramp was kept because it is the only
  luminance that clears both `VALUE_COLLISION` (≥0.06 against `roof_left.t2`)
  and `SILHOUETTE_LOSS` (≥1.25:1 against the `#808080` backdrop).

### 1.3 Digest changes

| Asset | Before (committed SHA-256) | After (committed SHA-256) | Stability |
| --- | --- | --- | --- |
| humanoid | `fc6be1345f8019b1f1a7d39e2122c4ce17fbf163d81edcc1ee8f6c788f85732f` | `27fd32e616389b767d112ae68992ae2912eeca57cf8cd9f7daa7a70aacea0c2a` | two strict renders identical |
| scene | `e1e0a91b3f45da5c42665e7ae3ae141a0c928a97e29f731cbb16f4d6ba5d6072` | `f48e72d7ecfda015c5de9623ed2e732cc648a2675d7b0b950406af7f42457a24` | two strict renders identical |

`.conductor/evidence/art-v2/generation-summary.json` independently confirms
`recipe_sha256 === committed_sha256` with zero blocking findings for both assets
(humanoid 35 info findings, scene 66 info findings).

## 2. Byte-identity table — five unchanged v2 assets

`git diff --name-only 2a71fac..HEAD` returns only
`conductor/tracks/20261118-gate-close-flash-lite/plan.md`; `git status --short`
before the task commits listed only the six humanoid/scene files. No v2 recipe,
sidecar, score record or v1 original for these assets was touched.

| Asset | v2 recipe / sidecar / score | v2 committed digest | v1 original digest (pinned) |
| --- | --- | --- | --- |
| potion | unchanged | `032ea8b95c9bf7f368cedaca8e88527b3133f0f4bcbeb7d1657a55524543cb90` | `2ea4173c7b8e27cc6723e4acd4fffc38a412f7d32bc65308dd4bfb7fe6622a3e` ✓ |
| sword | unchanged | `cd23f140f0f0ffcd6146d0d7ebc082e2680987e4a6a630faabfc7bfc8319d057` | `722fc7dbac870e31e34c8359a6a623b57a96396d900aba81489d8161b9290ee2` ✓ |
| chest | unchanged | `1bca726e94fa32cf9830a1234bfc631e8054eb649170fb815b1cde4019750354` | `07193f4570790b3d5c4df8cf2a8bcf9339b3e63f70dbc36f5d36a101d06906b6` ✓ |
| character | unchanged | `f1ff1aede6943b60efe5fbff5fe6a18e5de4dd486fd9564615a2e29a31c0b3a5` | `18e12c69b28b73d87faf2e5a843f7516364d61cc4e6eab6e8c7ed229c27d039b` ✓ |
| prop | unchanged | `387cd4ccf1bda19d5a1540f98d49aafd880ab1db247b1dff92c7f210a1b29d58` | `9c6bd6d9d13da48e29332f8076cb27330eebcc6400f83f7aaa5663916a879c31` ✓ |

`test/art/scores.json` was not edited; the instrument-of-record re-score remains
a Phase 2 responsibility. The seven v1 sidecars under `test/art/<asset>/` all
match the digests pinned in `test/art/assets-v2.test.ts`.

## 3. Humanoid byte-identity waiver

Phase 1 explicitly releases humanoid byte-identity for this track. The humanoid
v2 recipe, design note and SHA-256 sidecar were intentionally changed, as
recorded above. The user-authorized waiver is exercised only for humanoid; the
five assets listed in §2 remain byte-identical, satisfying FR-6 / AC-6.

## 4. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `git diff --name-only 2a71fac..HEAD` | 0 | only `plan.md` changed in committed history since the track checkpoint |
| static | `git status --short` | 0 | only the six humanoid/scene files were modified before task commits |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-baseline.png --strict` | 0 | baseline digest `fc6be134…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-v2.png --strict` | 0 | new digest `27fd32e6…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-v2-repeat.png --strict` | 0 | repeat digest `27fd32e6…`, stable |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-baseline.png --strict` | 0 | baseline digest `e1e0a91b…`, strict clean, roof split visually confirmed |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-v2.png --strict` | 0 | new digest `f48e72d7…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-v2-repeat.png --strict` | 0 | repeat digest `f48e72d7…`, stable |
| integration | `pnpm verify` | 0 | typecheck, lint (1 pre-existing warning), 119 files / 1028 tests, build; regenerates faithful A/B artifacts |

## 5. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1/FR-2 | humanoid and scene v2 recipes re-authored to lift lighting | §1.1–§1.2; validated L lever applied | done |
| FR-3 / AC-3 | recipes render `--strict` clean to new committed digests | §1.3; generation-summary.json zero blocking findings | done |
| FR-6 / AC-6 | five unchanged assets byte-identical | §2 pinned digests + git diff/status | done |
| NFR-3 | digest stability across two renders | §1.3 stability column; repeat render files | done |
| NFR-4 | faithful A/B artifacts regenerated | `.conductor/evidence/art-v2/<asset>.{png,8x.png,debug.png}` | done |
| AC-1/AC-2 | design-block invariants preserved | `pnpm verify` → `assets-v2.test.ts` 1028 tests pass | done |
| AC-7 | `pnpm verify` exit 0 | §4 integration row | done |

## 6. Evidence paths

- `.conductor/evidence/render-ws/humanoid-{baseline,v2,v2-repeat}.png`
- `.conductor/evidence/render-ws/scene-{baseline,v2,v2-repeat}.png`
- `.conductor/evidence/art-v2/humanoid.{png,8x.png,debug.png}`
- `.conductor/evidence/art-v2/scene.{png,8x.png,debug.png}`
- `.conductor/evidence/art-v2/generation-summary.json`

## 7. Deviations

- The `humanoid.calls.json` and `scene.calls.json` transcripts were reviewed but
  not rewritten: both already satisfy the invariant (one `--strict` render,
  ≤20 calls, correct asset/v), and fabricating additional authoring calls would
  misrepresent the session.
- Three `deriveRamp(base, 5)` candidates for `roof_right` were tried as strict-lint
  repairs (`#c26f38` → `SILHOUETTE_LOSS` at t2 luminance 0.213 vs backdrop 0.216;
  `#f0d2b0` → `VALUE_COLLISION` against `beam.t2`; identical-to-left →
  `VALUE_COLLISION` against `roof_left.t2`). The original ramp is the strict-clean
  solution, so no ramp bytes changed in the committed scene recipe.
- `pnpm exec vitest run test/art/scoring-artifacts.test.ts` and shell file-copy
  commands are not permitted for this subagent; faithful artifacts were
  regenerated by the full permitted `pnpm verify` instead.

## 8. Notes

- Visual inspection after removing the facing declarations shows the well wall
  and bucket remain fully readable; the roof retains authored tonal detail on
  both slopes. A residual gentle warm-tone difference between the two ramps is
  deliberate (left lit, right turned away under one light) and is now far smaller
  than the baseline plane-flattened split.
- Credentialed scoring (`scripts/rubric.mjs`) was deliberately not run; Phase 2
  belongs to the primary agent.
