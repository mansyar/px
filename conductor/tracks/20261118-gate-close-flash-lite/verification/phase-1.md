# Phase 1 Verification — Publishable Gate Close

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 1 — Re-author the two target recipes and re-render faithful artifacts
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Base commit:** `5e16250d81fdb0b84e10ec40e83bbebf781773af`
**Head commit (verified tree):** `06c408b583993d70b1a57614ac94ecd38c75dbfe`
**Result:** `verified`

## 1. Goal

Re-author the `humanoid` and `scene` v2 recipes to lift the three below-floor
lighting scores, render both `--strict` clean to new committed digests, and
regenerate faithful A/B artifacts — while leaving the five unchanged assets
byte-identical. Covers FR-1, FR-2, FR-3, FR-6, NFR-3, NFR-4, AC-1, AC-2, AC-3,
AC-6, AC-7.

## 2. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `git log --oneline --max-count=6` | 0 | confirmed phase base `5e16250` and prior checkpoints |
| static | `git status --short` | 0 | clean at phase start; only six target files modified during the phase |
| static | `git diff --name-only 2a71fac..HEAD` | 0 | only `plan.md` changed in committed history |
| static | `git diff -- test/art/v2/humanoid/humanoid.px.json test/art/v2/scene/scene.px.json` | 0 | humanoid: −3 `facing` +1 `light`; scene: −2 `facing` |
| static | `git show --stat HEAD` | 0 | scene commit touches only design note, recipe, sidecar |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-baseline.png --strict` | 0 | digest `fc6be134…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-v2.png --strict` | 0 | digest `27fd32e6…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-v2-repeat.png --strict` | 0 | digest `27fd32e6…`, stable |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-baseline.png --strict` | 0 | digest `e1e0a91b…`, strict clean; root-cause split visually confirmed |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-v2.png --strict` | 0 | digest `f48e72d7…`, strict clean |
| render | `pnpm exec tsx src/cli.ts render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/render-ws/scene-v2-repeat.png --strict` | 0 | digest `f48e72d7…`, stable |
| integration | `pnpm verify` | 0 | typecheck → lint → 119 test files / 1028 tests → build; faithful A/B artifacts regenerated |

`pnpm verify` emitted one warning in `test/recipe/version-1-2.test.ts:50`
(`lint/style/noNonNullAssertion`) that predates this phase; it is not a failure
and was not touched.

## 3. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | humanoid recipe re-authored with one top-left light | `humanoid.px.json` diff: −3 facings, +1 `light` before `auto_outline` | done |
| FR-2 | scene gable unified under one top-left light | `scene.px.json` diff: −2 opposing roof facings; existing `light` retained | done |
| FR-3 | target recipes render `--strict` clean to new committed digests | new sidecars `27fd32e6…` / `f48e72d7…`; `generation-summary.json` zero blocking findings | done |
| FR-6 | five unchanged assets byte-identical | `recipe-changes.md` §2; pinned v1 digests all match; no git changes | done |
| NFR-3 | deterministic digests | two identical strict renders per asset | done |
| NFR-4 | faithful A/B artifacts regenerated | `.conductor/evidence/art-v2/<asset>.{png,8x.png,debug.png}` for all seven assets | done |
| AC-1 | design-block invariants preserved | `assets-v2.test.ts` passes under `pnpm verify` | done |
| AC-2 | hierarchy/hero/anchors/values/materials/edges unchanged | recipe diffs are limited to facings + one `light` | done |
| AC-3 | `.sha256` sidecars updated to committed digests | `humanoid.sha256`, `scene.sha256`; harness digest equality | done |
| AC-6 | v1 originals untouched | seven pinned v1 digests match sidecars | done |
| AC-7 | `pnpm verify` exit 0 | §2 integration row | done |

## 4. Task status

| Task | Status | Commit |
| --- | --- | --- |
| P1.T1 — re-author humanoid | done | `b47f7d5` |
| P1.T2 — re-author scene gable | done | `06c408b` |
| P1.T3 — byte-identity verification and waiver record | done | recorded in `recipe-changes.md`; committed with evidence |

## 5. Evidence paths

- `conductor/tracks/20261118-gate-close-flash-lite/verification/recipe-changes.md`
- `.conductor/evidence/render-ws/humanoid-{baseline,v2,v2-repeat}.png`
- `.conductor/evidence/render-ws/scene-{baseline,v2,v2-repeat}.png`
- `.conductor/evidence/art-v2/generation-summary.json`
- `.conductor/evidence/art-v2/<asset>.{png,8x.png,debug.png}` (seven assets)

## 6. Deviations

- Transcripts (`*.calls.json`) were reviewed but left unchanged; both already
  satisfy the ≤20-calls / exactly-one-`--strict`-render invariant.
- `deriveRamp(base, 5)` re-materializations of `roof_right` were attempted as
  strict-lint repairs but failed `VALUE_COLLISION` / `SILHOUETTE_LOSS`; the
  original ramp was retained. Details in `recipe-changes.md` §7.
- The isolated faithful-artifact vitest command and shell file-copy commands
  are not permitted for this subagent; `pnpm verify` (permitted, and named in
  the brief) regenerated the artifacts and asserted digest equality.
- Evidence files account for the earlier phase-checkpoint commits; no
  `plan.md`, `spec.md`, `metadata.json`, `tracks.md`, product doc, `review.md`
  or `pr.md` was edited by this subagent.

## 7. Notes

- Humanoid byte-identity is explicitly waived for this track; the five other
  v2 assets and all seven v1 originals are unchanged.
- Residual roof tone difference between the two ramps is deliberate and much
  smaller than the baseline plane-flattened split; both slopes now receive the
  same top-left bevel/AO/rim treatment and keep authored tonal detail.
- Phase 2 credentialed scoring and Phase 3 gate decision remain with the
  primary agent; `scripts/rubric.mjs` and `test/art/scores.json` were not run
  or edited here.
