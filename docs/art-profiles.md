# Art profiles

One data table, `src/core/profile.ts`, decides every size-sensitive number the
engine uses: the lint thresholds, the cluster minimum, dither eligibility, outline
thickness, the expected tone count and the debug zoom. Nothing else hard-codes a
limit. `docs/lint-thresholds.md` records what each rule catches; this page records
which regime gets which number, and why.

## Why a table

Every threshold used to be calibrated on 32 px sprites. At 128–256 px they
misfired, and always in the same direction: a legitimate shallow curve was cut
into "long straight runs" and reported as a jaggy, and a normal 3 px separation
between two details was far enough from anything else to be reported as an orphan.
Neither was a bug in the rule — a 3 px run *is* a long wall on a 32 px sprite and
*is* a shallow curve on a 256 px sheet.

The fix is a regime, not a formula. "Is this a straight edge" is a judgement about
how much room the art has, and the honest encoding of a judgement is a row per
regime that a human tuned and can re-tune, not a derived multiplier nobody has
looked at.

## Boundaries

The regime is derived from the canvas's **longest side**, so a 48x256 sheet is
`large`: what matters is how much room the art was drawn in, not the smaller axis.

| Longest side | Profile | Typical content |
| --- | --- | --- |
| 8–16 px | `tiny` | inventory icons, projectiles, single tiles |
| 17–48 px | `small` | the classic sprite range, and every existing benchmark |
| 49–128 px | `medium` | character sheets, large props, portraits |
| 129–256 px | `large` | full scenes, splash art, background panels |

The boundaries are inclusive on the lower profile: 16 is `tiny` and 17 is `small`;
48 is `small` and 49 is `medium`; 128 is `medium` and 129 is `large`.

## The table

| key | tiny | small | medium | large |
| --- | --- | --- | --- | --- |
| `jaggyMinRuns` | 3 | 3 | 3 | 3 |
| `jaggyMaxRun` | 3 | 3 | 4 | 6 |
| `jaggyStepJump` | 2 | 2 | 2 | 3 |
| `orphanRadius` | 2 | 2 | 2 | 2 |
| `lowContrastMinRatio` | 2.0 | 1.5 | 1.35 | 1.25 |
| `minCluster` | 1 | 2 | 2 | 3 |
| `ditherAllowed` | false | true | true | true |
| `ditherMinTones` | 3 | 3 | 3 | 3 |
| `outlineWidth` | 1 | 1 | 1 | 2 |
| `toneCount` | 3 | 3 | 4 | 5 |
| `debugZoom` | 8 | 8 | 4 | 2 |

The table is frozen at load. A rule cannot tune it at runtime, and a test
(`test/profiles/profile.test.ts`) pins every value, so a change is a diff in one
object rather than a constant drifting in three files.

## `small` is the compatibility row

`small` holds exactly the numbers the engine was calibrated against at 32 px —
`JAGGY_MIN_RUNS 3`, `JAGGY_MAX_RUN 3`, `JAGGY_STEP_JUMP 2`,
`ORPHAN_NEIGHBOUR_RADIUS 2`, `LOW_CONTRAST_MIN_RATIO 1.5`. `src/lint/thresholds.ts`
re-exports them under those names, and `lintNumbers(context)` falls back to this
row when a context has no profile of its own.

That is a deliberate constraint, not nostalgia: every committed asset is between
16 and 48 px, so making `small` identical to the old constants is what lets the
four benchmarks keep passing `render --strict` with zero findings and keeps the
hero PNG byte-identical. If a change to this row makes an existing lint test fail,
the change is wrong; do not edit the test.

Two rows are allowed to be stricter or looser, and the table would be decoration
if they were not:

- `tiny` is **stricter** where a small canvas cannot afford noise: the contrast
  floor rises to 2.0 and dithering is not sanctioned at all.
- `large` is **looser**: longer runs count as staircase steps (6), a step jump has
  to reach 3 to be a kink, the contrast floor drops to 1.25, and a scene is
  expected to spend more tones.

## `orphanRadius` is 2 in every row, on purpose

This is the one row a future reader will want to "fix". It is not a size number.
The radius is set by the sparsest dither lattice the engine itself emits:
`bayer_25` lights (0,0), (2,0), (0,2) and (2,2) of every 4x4 tile, so its lit
cells sit two pixels apart on both axes. A radius of 1 flags every sanctioned
fade; a radius of 3 lets a speck three pixels from real art pass. Canvas size has
nothing to do with either failure, so the value does not move with the regime —
a 1 px dot four pixels from a 256 px body is still noise.

## `meta.profile`

A recipe may name its regime instead of deriving it:

```json
{ "meta": { "name": "banner", "width": 256, "height": 64, "alpha_mode": "binary", "profile": "small" } }
```

- The override **governs**: every number, and the debug zoom, comes from the named
  row, not from the canvas.
- A name that is not one of the four is `E_PROFILE_UNKNOWN`, whose hint lists
  `tiny, small, medium, large`.
- An override that disagrees with the canvas is **one** `W_PROFILE_MISMATCH`
  `info` warning naming both regimes — never an error, because a caller may
  deliberately draw a 256 px sheet in a 32 px idiom and should be told, not
  stopped.
- `profile` is written back only when the recipe declared it, so a recipe that
  never mentioned one round-trips byte-identically (FR-1).

The override is a recipe concern, not a CLI flag: the recipe is the artefact a
reviewer reads and re-renders.

## What each number is consumed by

| key | consumed by |
| --- | --- |
| `jaggyMinRuns`, `jaggyMaxRun`, `jaggyStepJump` | `JAGGY_LINE` |
| `orphanRadius` | `ORPHAN_PIXEL` |
| `lowContrastMinRatio` | `LOW_CONTRAST` |
| `debugZoom` | the debug sheet's zoom panel and its ruler interval |
| `minCluster` | `strays` and `CLUSTER_THIN` (Phase 5) |
| `ditherAllowed`, `ditherMinTones` | `DITHER_NOISE` (Phase 5) |
| `outlineWidth` | a recommendation for `auto_outline`; a recipe may exceed it |
| `toneCount` | the expected tone budget, used by the tone and palette rules |

`ditherAllowed` does **not** ban `dither_fill`: the op still works at every size.
It says that at that scale a dither reads as noise rather than as a fade, which is
what the rule reports. Same for `outlineWidth` — a recommendation the recipe may
exceed; nothing fails because of a 2 px outline on a 32 px sprite.

## When a finding misfires

Diagnose before changing anything: a misfire is either the wrong regime or the
wrong number in one row, and the two look identical from the outside.

1. **Check the regime first.** `px validate --pretty` reports the profile's
   warning when a recipe overrides it; the debug sheet's caption prints the
   regime and zoom it composed with. If the canvas is 96 px and the art is drawn
   in a 32 px idiom, the fix is `"profile": "small"` in the recipe, not a table
   change.
2. **Then read the row.** Reproduce on the smallest fixture that shows it
   (`test/profiles/scale.test.ts` builds one-canvas sprites at any regime) and
   decide which field produced the finding: `JAGGY_LINE` reads three of them, so a
   "long straight run" is `jaggyMaxRun` and a "kink" is `jaggyStepJump`.
3. **Change one number, in one row.** Edit `src/core/profile.ts`. Never add a
   constant beside a rule, and never branch on canvas size inside a rule — that is
   how the old calibration drifted.
4. **Pin both sides.** Add a firing fixture and a silent one to `test/profiles/`,
   the way `test/benchmarks/thresholds.test.ts` does for `small`. A number without
   a fixture on each side is a guess.
5. **Update this page and `docs/lint-thresholds.md`** with the new value and the
   reason, then run `pnpm verify` and `pnpm vitest run --coverage`.

Never silence a finding by loosening `small`: that row is the compatibility
contract, and the benchmarks fail loudly when it moves.

## Determinism and cost

Deriving a profile is four comparisons on the two dimensions, done once per
compile or lint run and never per pixel. Nothing is cached across recipes: a cache
keyed by canvas size would be correct, but the derivation is free and a stale
cache is not.
