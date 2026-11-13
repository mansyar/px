# Phase 2 — Lighting

- **Track:** 20261113-lighting-recovery
- **Phase:** 2 — Lighting
- **Date:** 2026-11-13
- **Branch:** feat/20261113-lighting-recovery
- **Base:** c43911d
- **Head:** f6e3609
- **Result:** verified (with a recorded shortfall)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `render --file test/art/<asset>/<asset>.px.json --strict` (six assets) | 0 | no error or warning finding |
| unit | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| full | `pnpm verify` | 0 | typecheck, lint, 858 tests, build |
| probe | `node scripts/rubric.mjs --asset {scene,chest} --pass {A,B} --artifact ...8x.png --model gemini-3.5-flash-lite --replace` | 0 | four passes recorded |

## Interim probe

| Asset | lighting A | lighting B | asset mean |
| --- | --- | --- | --- |
| scene | 2 | 2 | 3.76 |
| chest | 3 | 4 | 3.77 |

Three replies were rejected and retried inside the four-attempt limit: two came
back as malformed JSON (`"score":2,for:`, an unquoted `value_separation` key) and
one returned `2.5`. The scorer wrote nothing for any of them, so no partial pass
was recorded.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | lighting mean >= 3.5 | probe only: chest 3.5, scene 2.0; full mean is Phase 4 | pending |
| AC-6 | no scene lighting reason contains "split" or "arbitrar" | current reason: "The lighting is contradictory, with flat geometric roof planes suggesting top-down light while shadows on the base and well cylinder do not align consistently." Contains neither word. | met literally |

**Recorded shortfall.** The scene's `lighting` score did not move (2 to 2) while
the chest's moved from 1 to 3.5. The roof is now one hue and one ridge-to-eave
ramp, and the earlier "split down the middle" wording is gone, but the critic reads
the roof as top-lit while the painted ground shadow sits to the right, and calls
the result contradictory. That is a real inconsistency in the drawing, not a
measurement artifact. It is left as-is for the Phase 4 verdict rather than papered
over.

## What changed

- Scene: `roof_left` and `roof_right` share one hue, each falling from a bright
  ridge to darker eaves, with the right plane one ladder rung behind; `stone`,
  `rim`, `post` and `wall` carry a left-to-right falloff.
- Chest: body front face on a diagonal ramp, lid shallower on the same direction.
- Humanoid and character: torso ramp from lit shoulder to shadowed flank.
- Potion: lit surface line with successive steps down through the liquid.
- Geometry untouched; six digests re-baselined and `## Lighting` added to each
  design note.

## Deviations

- None to the phase contract. Two rejected model replies and one non-integer
  score are recorded above rather than hidden.
