# Phase 3 — Edge Discipline and Value Ladder

- **Track:** 20261113-lighting-recovery
- **Phase:** 3
- **Date:** 2026-11-13
- **Branch:** feat/20261113-lighting-recovery
- **Base:** ec1491a
- **Head:** 1f02c88
- **Result:** verified (with a recorded scope limitation)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `render --strict` on the six assets | 0 | no error or warning finding |
| unit | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| full | `pnpm verify` | 0 | typecheck, lint, 858 tests, build |

## Interior edge convention

Each `ascii_blit` part of at least 70 painted pixels takes the lightest derived
tone on its top and left boundary cells and the darkest tone on its bottom and
right boundary cells; interior cells keep the lighting pass's tone. Corners resolve
to the light tone — with the occlusion tone first, the lint called the lid, bands,
roof, rim, bucket and rope pillow-shaded, which is exactly the failure the
precedence change fixes.

Coverage: wall, ground, post, rim, water, both roof planes, bucket, beam, rope,
chest body/lid/bands/lock, sword blade, humanoid torso, and on the character the
torso, arms, legs, boots, blade, helm, pauldron, shield and boss.

## Value ladder: the 0.12 attempt

`DERIVE_GAP=0.12` was run per asset. The fitted minimum adjacent gaps were:

| Asset | min gap at 0.12 | result |
| --- | --- | --- |
| potion | 0.570 | fits |
| sword | 0.192 | fits |
| chest | 0.129 | fits, but body base fell to 1.43:1 contrast and `SILHOUETTE_LOSS` blocked it |
| scene | 0.113 | fits, clean |
| humanoid | 0.056 | does not fit; also under the 0.06 lint floor |
| character | 0.000 | does not fit |

The forcing factor is the silhouette floor, not the solver: a base must sit either
below roughly 0.13 or above roughly 0.31 in luminance, so a 0.12 ladder has fewer
usable rungs than the dense assets have adjacent materials. FR-7 is conditional
("where the silhouette contrast floor allows"), so the 0.06 ladder is kept and this
is recorded rather than forced. The 0.12 run was reverted; the six recipes are the
Phase 2 palettes plus the edge convention.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | edge_language mean >= 3.5 | scoring is Phase 4 | pending |
| AC-4 | value_separation mean >= 3.7 | scoring is Phase 4; probe already 4.0 on scene and chest | pending |
| AC-8 | strict-clean renders, re-baselined digests with reasons | six strict renders exit 0, six digests rewritten, `## Interior edges` in each note | satisfied |

## Deviations

- **Potion has no edge treatment.** Every potion part is under the 70-pixel area
  floor (brew is 38 pixels), so the convention would outline rather than edge the
  form. Recorded in its design note.
- **FR-6 says "all seven assets"; the prop is untouched.** FR-9 and AC-10 make the
  prop a byte-identical control, so FR-6 is applied to the six redrawn assets only.
  The two requirements conflict as written; FR-9 wins here and the conflict is
  flagged for review rather than silently resolved.
- **Probe artifact deviation (Phase 2).** The four probe calls passed the plain 8x
  for both passes; the record's pass B is defined on the debug sheet. Phase 4 uses
  the correct artifacts for all fourteen passes, so the final record is consistent.
