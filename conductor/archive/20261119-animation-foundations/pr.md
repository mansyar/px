## Summary

Adds version-gated animation foundations to the deterministic pixel-art engine: schema `1.4` with an optional `frames` array, frame-0 byte identity, per-frame compile/lint, and an opt-in single-row sprite sheet with additive metadata on `--export`. No new CLI verb or MCP tool, no product/score/golden/archive change, and the publishable gate remains `pass` at mean 3.82.

## Track

- **ID:** `20261119-animation-foundations`
- **Type:** feature
- **Spec:** [`conductor/archive/20261119-animation-foundations/spec.md`](conductor/archive/20261119-animation-foundations/spec.md)
- **Plan:** [`conductor/archive/20261119-animation-foundations/plan.md`](conductor/archive/20261119-animation-foundations/plan.md)
- **Review:** [`conductor/archive/20261119-animation-foundations/review.md`](conductor/archive/20261119-animation-foundations/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Version-gated frame schema and compile | Accept v1.4 frames, canonicalize and compile deterministically | verified | `5cc61039886438e23dca5322e485439ba66ebc23` | `LATEST_RECIPE_VERSION` stays `1.1`; v1.4 assertions mirrored into in-scope unit tests |
| 2: Sheet export, additive metadata, fixture and docs | Deterministic sheet PNG/meta, `anim-duo` golden, docs and descriptions | verified | `be67c0380f297183fad8cb9396eb0f5a908e25c7` | Primary ran the denied render command; two-workspace double render byte-identical |
| 3: Closeout decision and integrated record | Honest PASS with final checks | verified | `37e42231bf2f2c9c35a6d9957e4d26a79362391f` | No forced pass, no re-baseline; protected digests unchanged |
| Integrated verification | Full requirement matrix and command record | verified | `5dd438c` | `verification/integrated.md` |
| Review Fix R1 | Resolve F1/F2/F3 (all-frame strict gating, test header, golden design) | verified | `2a4ca4ebc30941308fcbd88b8a5cfe185135c548` | `verification/phase-R1.md`; final verify 119/1043 |

## Requirements

- [x] `FR-1` — v1.4 accepted; `frames` rejected below 1.4; empty/duplicate ids rejected
- [x] `FR-2` — canonical frame round-trip; v1.4 without frames as v1.3
- [x] `FR-3` — frame 0 byte identity; additional frames compiled through shared pipeline
- [x] `FR-4` — per-frame lint findings with deterministic order
- [x] `FR-5` — opt-in deterministic single-row sheet PNG
- [x] `FR-6` — additive sheet metadata; existing fields unchanged
- [x] `FR-7` — 2-frame golden fixture with committed frame-0 and sheet digests
- [x] `FR-8` — help/MCP descriptions and `docs/animation.md`
- [x] `NFR-1` — protected Phase 1 digests unchanged
- [x] `NFR-2` — `pnpm verify` 0; coverage above 80%
- [x] `NFR-3` — sheet output deterministic
- [x] `NFR-4` — no new dependency; additive version-gated schema; opt-in sheet
- [x] `AC-1`..`AC-11` — covered per `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static/unit/integration/smoke/build | `pnpm verify` | pass (119 files / 1043 tests after R1) | `verification/integrated.md`, `verification/phase-R1.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (95.01/85.8/98.36/94.82%) | `verification/integrated.md` |
| determinism | `pnpm vitest run --project goldens` | pass (1 file / 5 tests) | `verification/integrated.md` |
| double render | two isolated workspaces | pass (all four hashes A=B) | `verification/export-sheet.md` |
| gate report | `node scripts/rubric-report.mjs` | pass (mean 3.82, gemini-3.5-flash-lite) | `verification/integrated.md` |
| integrity | `Get-FileHash test/art/scores.json` | unchanged `E5CCE080…828D` | `verification/decision.md` |

## Review

- **Verdict:** PASS after review-fix round 1 (round-1 PASS WITH FINDINGS: 1 Medium + 2 Low)
- **Rounds:** 1
- **Fixed:** 3 (F1 all-frame strict gating, F2 test-file header, F3 golden design/parts)
- **Accepted/deferred:** 0

## Deviations and risks

- `test/recipe/version-1-4.test.ts` is outside vitest project includes; equivalent assertions were added to in-scope unit tests, and the primary ran the explicit-path command (exit 0). R1 added a header comment recording this.
- Frame shape errors reuse `E_BAD_META`/`E_BAD_LAYER` with explicit messages because `src/core/errors.ts` is outside Touches.
- In Phase 2 the `anim-duo` design block was removed because `validateIntent` rejects undeclared hierarchy parts; R1 restored a declared `body` part plus a minimal `design` block (and tagged all ops with `part: body`), without weakening validation. Raster digests stayed byte-identical; only metadata digests changed.
- Several subagent-shell commands (`pnpm dev render`, scoped coverage, rubric report) were denied; the primary ran them and outputs were transcribed verbatim as RESOLVED BY PRIMARY.
- R1's restored `design.style: @project` initially broke two MCP test helpers that copied only the recipe into a temp workspace; R1 fixed both helpers by copying the root `px.style.json`, with no assertion change.
- No onion-skin/playback/interpolation/timeline/tilemap/GUI/alpha/RNG/npm/non-Godot work; `duration` is recorded but not interpreted.

## Follow-ups

- none

## Rollback

```bash
# Merge commit (fill after merge)
git revert --no-edit -m 1 <merge-commit>
```

