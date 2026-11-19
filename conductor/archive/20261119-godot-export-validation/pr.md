# Godot 4 Export Validation

## Summary

Validated the exported metadata contract in real Godot 4.7.2 for the golden hero fixture. The headless GDScript validator passed all five assertions, the exported PNG is byte-identical to the committed golden and unchanged after import, and the offset/anchor rule is verified in-engine. The decision is an honest PASS with no product change.

## Track

- Track: `20261119-godot-export-validation`
- Type / priority: chore / high
- Spec: `conductor/archive/20261119-godot-export-validation/spec.md`
- Plan: `conductor/archive/20261119-godot-export-validation/plan.md`
- Review: `conductor/archive/20261119-godot-export-validation/review.md`

## What happened

| Phase | Result | Checkpoint | Evidence |
| --- | --- | --- | --- |
| Phase 1 ΓÇö Export hero and validate in headless Godot | verified (two validator-authoring defects corrected before first clean run) | `18004de1f669c989945aea52c7ad85960987ef9f` | `verification/godot-validation.md`, `verification/phase-1.md` |
| Phase 2 ΓÇö Record the honest decision and bounded stop | verified (honest PASS) | `9fbbda5504064a5dd4ed168984a3db67084163b2` | `verification/decision.md`, `verification/phase-2.md` |
| Phase 3 ΓÇö Final verification snapshot and closeout | verified | `a6a9d3d7ba9976de1ce3c2ef00fdfe0ab88de3d6` | `verification/final-checks.md`, `verification/phase-3.md` |
| Integrated verification | pass | `e9fa314` | `verification/integrated.md` |
| Review Fix R1 ΓÇö first Godot run label standardized to `V1a` | verified | `5cb2a83198d232c5db003c09de56539a66a2c72a` | `verification/phase-R1.md` |
| Review bookkeeping R2 ΓÇö corrected V1a count | verified | `073a160744228014bc02cd46a85124a59f743e97` | `verification/phase-R1.md` |

## Requirements

- FR-1 hero exported with `--export`; PNG hash equals golden; `.meta.json` emitted.
- FR-2 temporary Godot 4 project with headless GDScript validator.
- FR-3 in-engine Godot block fields asserted (texture path, filter, centered, offset/origin/negated trim).
- FR-4 in-engine anchor transform asserted; pivot `[8,8]` maps to local `[4,4]`.
- FR-5 primary integrity: PNG unchanged after export/import; `recipe_hash` matches canonical recipe; metadata deep-equals `buildMetadata`.
- FR-6 honest PASS decision with exact commands, exits, Godot version, hashes and paths.
- FR-7 final verification snapshot with all configured checks green.
- NFR-1..NFR-6: no product change; configured commands; local headless Godot; exact evidence; no re-roll/fishing; scores and archives untouched.
- AC-1..AC-8: all satisfied.

## Verification

| Check | Result |
| --- | --- |
| `pnpm verify` | exit 0; 119 files / 1028 tests; one pre-existing non-failing Biome warning |
| Scoped coverage | exit 0; 95.02% statements / 85.72% branches / 98.33% functions / 94.82% lines (gate 80%) |
| Goldens determinism | exit 0; 1 file / 2 tests |
| `node scripts/rubric-report.mjs` | exit 0; mean 3.82 `pass` on `gemini-3.5-flash-lite` |
| `test/art/scores.json` SHA-256 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged |
| Godot 4.7.2 headless validation | exit 0; five assertions PASS; `GODOT_VALIDATION=PASS` |

## Review

PASS after two review-fix rounds: round 1 standardized the first-run label to `V1a` (one Low NFR-4 finding), round 2 corrected a V1a count in the R1 evidence (one Low bookkeeping finding). Zero findings remain; see `review.md` for the full history.

## Deviations and risks

- The plan's `--export --strict` variant exits 3 on the golden fixture's pre-existing `LOW_CONTRAST` / `DITHER_NOISE` findings; the canonical non-strict export produces the exact golden bytes and is the validated artifact. No fixture, threshold or linter rule changed.
- Two early validator runs failed before any usable assertion result: a GDScript parse error and an incorrect trimmed-dimension expectation. Both were validator-authoring defects corrected before V1c; no assertion result or expected value was changed and no re-roll occurred.
- Limitations recorded, not passed: empty-trim assets, other Godot versions, GUI editor import, and the other six v2 assets.

## Follow-ups

None. No product discrepancy was found; no issue was filed.

## Rollback

Revert the merge commit with `git revert --no-edit -m 1 <merge-commit>`. No product code or published evidence changes are contained in this PR.

