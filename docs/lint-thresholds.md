# Lint thresholds

The values live in one table, `src/core/profile.ts`, because a threshold that is
right at 32 px is wrong at 256 px; `docs/art-profiles.md` explains the regimes and
when to change one. `src/lint/thresholds.ts` keeps the `small` row under the old
names (`JAGGY_MIN_RUNS` and friends) plus the two response bounds, so existing
fixtures and prose keep their vocabulary; rules read the table through
`lintNumbers(context)` and never a module constant. This page records each value
as it applies to `small`, the compatibility regime — every existing asset is
between 17 and 48 px — and notes where the other rows differ. Phase 5 calibrated
the `JAGGY_LINE` values against the four benchmarks in `test/benchmarks/`; the
others were checked there and left unchanged.

## How the `JAGGY_LINE` values were chosen

Method, in order:

1. Author the four benchmarks (16x16 potion, 32x32 sword, 32x32 humanoid, 48x48
   chest) and gather every finding they produced. No constant was touched first.
2. All four failed `JAGGY_LINE`, and nothing else: 17 `info` findings across the
   four assets, zero `OUT_OF_BOUNDS`, zero `ORPHAN_PIXEL`, zero `LOW_CONTRAST`.
3. Read each finding against the shape that produced it. Every one was a
   deliberate pixel-art idiom, not a defect: a chamfer meeting a vertical wall
   (a bottle shoulder), a curve whose slope tightens, and a straight edge that
   the rule was reading as a staircase step.
4. Fix the rule's definition of "jaggy" — one run that leaves two agreeing
   neighbours and comes back — instead of relaxing the signal until the assets
   passed.
5. Add fixtures on both sides (`test/benchmarks/thresholds.test.ts`): the
   genuine defects that must still fire, and the idioms that must stay silent.

Before, on the committed geometry:

| Asset | Findings | Sequences reported |
| --- | --- | --- |
| potion | 3 | left `1,5,1,2,3`; right `1,5,1,2,3`; bottom `1,2,4` |
| sword | 3 | left `1,1,3,3,12`; right `1,2,3,3,11`; top `1,1,2` |
| humanoid | 6 | left/right `1,2,1,1,3`; left/right `4,1,1`; top/bottom-of-crest `1,2,1` |
| chest | 5 | left/right `1,1,1,1,7`; top `1,1,1,1,32`; bottom `1,5,1,5`; bottom `1,5,1` |

After: 0 findings on all four, and the fixtures prove the rule still fires on a
`2,1,3` staircase and on a three-row flat stretch in a one-row staircase.

## `JAGGY_MIN_RUNS` — 3 (every profile)

- **Catches:** a step sequence long enough to have a shape. Two runs are a
  corner, not a line.
- **Ignores:** a single slope change.
- **Fixtures:** fires — `test/benchmarks/thresholds.test.ts` ("reports a
  staircase that leaves its diagonal and returns"); silent — "accepts a four-line
  wall before a curve" (the wall is cut, leaving one run).

## `JAGGY_MAX_RUN` — 3 (`small`; 3 tiny, 4 medium, 6 large)

- **Was:** unbounded — every run length participated in the staircase, so a
  five-row vertical bottle neck (run length 5) was read as a "step" of the
  shoulder curve beside it.
- **Catches:** nothing on its own. It cuts a monotone edge into staircase
  segments: a run of four or more lines is a straight edge or a 4:1 slope, and a
  clean shape changes slope there rather than wobbling.
- **Deliberately ignores:** a straight wall next to a curve — the single most
  common false positive in the benchmarks (potion neck and shoulders, chest rim
  and sides, sword blade, humanoid arm).
- **Fixtures:** fires — "keeps reading an edge after a long straight wall" (a
  kink *after* an eight-row wall still reports), "accepts a four-line wall before
  a curve" pins the boundary at four: that edge is cut, so it stays silent.
- **Why 3:** the shallowest slope a sprite draws as a staircase is 3:1 (a run per
  three rows). Four is a straight side by any reading; the boundary fixture fails
  if this becomes 4.

## `JAGGY_STEP_JUMP` — 2 (`small`; 2 tiny and medium, 3 large)

- **Was:** implicit "any unequal steps", which flagged a curve the moment its
  slope changed — a convex shoulder (`1,2,3`) is not a jaggy.
- **Catches:** a run that leaves two neighbours agreeing within one line, by two
  lines or more. That is one pixel of the edge travelling away from the line and
  coming back: the `2,1,3` staircase, the `1,3,1` flat stretch.
- **Deliberately ignores:** a curve (`1,2,3` — slope changes by one and keeps
  going), a clean Bresenham 2:1 diagonal that alternates `1,2,1,2`, and a
  single doubled row (a one-line difference, too subtle to call a defect).
- **Fixtures:** fires — `hasKink([2,1,3])`, `hasKink([1,3,1])`, plus the two
  end-to-end fixtures above; silent — `hasKink([1,2,3])`, `hasKink([2,1,2])`, and
  the 2:1 alternation fixture.
- **Why 2:** at 1 a clean staircase that alternates two lengths fires on every
  other run; at 3 the canonical `2,1,3` defect stops firing.

## `LOW_CONTRAST_MIN_RATIO` — 1.5 (`small`; 2.0 tiny, 1.35 medium, 1.25 large)

- **Catches:** edge pixels whose WCAG contrast against the default backdrop
  (`#808080`) is below 1.5:1 — art that disappears when the sprite is seen on a
  mid grey.
- **Deliberately ignores:** interior contrast. The rule reads the sequence edge,
  so a dark outline around a dark fill is fine.
- **Left unchanged in phase 5** because it produced no findings on any
  benchmark: every asset's outline clears the floor against grey. Changing a
  threshold that has not misfired would be silencing by another name.
- **Fixtures:** fires — `test/lint/shape.test.ts` ("fires on edge pixels that
  vanish into the default backdrop") and the benchmark-side copy; silent —
  "stays silent when every edge pixel clears the floor" (`#000000`) in both
  suites.

## `DEFAULT_BACKDROP_HEX` / `LOW_CONTRAST_BACKDROP` — `#808080` (unchanged)

The backdrop the contrast verdict is measured against, resolved once at module
load and shared with the debug sheet's 1x panel so the verdict and the picture
agree. Not tuned: the benchmarks show no sensitivity to it.

## `ORPHAN_NEIGHBOUR_RADIUS` — 2 (every profile; new in review round 2)

- **Was:** 8-way only (radius 1), calibrated against a 1-px `line` and a
  `checker_50` dither.
- **Not a scale number:** every profile keeps 2, because the radius is set by the
  sparsest lattice the engine emits, not by the canvas. See
  `docs/art-profiles.md` for why the one row that looks like an oversight is not.
- **Catches:** a painted pixel with nothing painted within two pixels in any
  direction — a speck that cannot read as part of a silhouette, a line, or a
  dither fill.
- **Deliberately ignores:** `bayer_25`, the sparsest lattice the engine emits:
  it lights (0,0), (2,0), (0,2) and (2,2) of every 4x4 tile, so its lit cells sit
  two pixels apart in both axes. At radius 1 every one of them was a false
  positive, and a sanctioned fade hard-failed `--strict`.
- **Fixtures:** silent — `dither_fill bayer_25` over an 8x8 transparent layer,
  two pixels exactly two apart, the 1-px diagonal and `checker_50`; fires — a
  lone pixel, and a pair whose nearest distance is three, horizontally,
  vertically and diagonally. All in `test/lint/rules.test.ts`.
- **Why 2:** one cannot separate a sanctioned `bayer_25` fade from noise; three
  would let a speck three pixels from real art pass, and that is exactly the
  distance the firing fixture pins.

## Cleanup passes — `seal`, `strays`, `deband` (new, FR-21)

- **`seal`** floods transparency from the canvas border over the layer it reads.
  Whatever the flood cannot reach is an enclosed hole; holes whose bounding box
  is 2x2 or smaller are filled with the tone owning most of the hole's
  four-neighbours, ties to the lowest slot index. Bigger holes are left alone,
  because a two-pixel lip is a gap and a three-pixel span is a design.
- **`strays`** erases 4-connected painted components smaller than the profile's
  `minCluster` (1 tiny, 2 small/medium, 3 large) — the same number `CLUSTER_THIN`
  reports against, so the lint and the fix never disagree.
- **`deband`** reuses the `BANDING` detector and steps the middle run of each
  band one tone darker inside its own family (`highlight → base → shadow`,
  `t(i) → t(i+1)`). The darkest tone has nowhere to go, so that band is skipped.
- **One pass each.** None of them iterates to a fixed point: a second pass is a
  second op in the recipe. That keeps render time a function of the canvas, not
  of how the artwork happens to be shaded.
- **Reporting:** each pass returns `{op, changed, coords}` with the exact count
  and up to 50 coordinates, carried on the draw, edit and validate responses
  under `cleanup`. A pass that changes nothing raises `W_CLEANUP_NOOP` and
  reports `changed: 0`, including on an empty layer.
- **Fixtures:** `test/art-lint/cleanup.test.ts` (a one-pixel hole is sealed and
  reports `[[x, y]]`; a 3x3 hole is not; a border notch is not; `strays` keeps a
  lone pixel at tiny and erases it at large; `deband` moves one row; a shadow
  band is a no-op; the coordinate list caps at 50 with the count exact).

## `MAX_FINDINGS_PER_CODE` — 50 (unchanged)

- **Catches:** runaway output. The 51st finding per code becomes one `truncated`
  marker that states the total.
- **Fixtures:** `test/lint/rules.test.ts` (cap marker and the exactly-at-cap
  case), `test/lint/shape.test.ts` (contrast coordinates capped at 50).

## `MAX_COORDS_PER_FINDING` — 50 (unchanged)

- **Catches:** unbounded coordinate lists in one message. The message states how
  many coordinates it quoted.
- **Fixtures:** `test/lint/shape.test.ts` ("caps the quoted coordinates and says
  so").

## `VALUE_COLLISION_MIN_DELTA` — 0.06 (new, AC-16)

- **Catches:** two parts that meet but share a value. The rule compares the
  *material base tone* of the two parts — the `base` role of each part's family,
  never the pixel on the boundary — so a shaded blade still collides with a flat
  guard whose bases match.
- **Why 0.06:** it is one synthesis step. A ramp synthesised by
  `px synthesize` spaces its tones so adjacent steps differ by about this much,
  which makes "within one ramp step" from AC-16 the measurement itself rather
  than an approximation of it. Below it the two shapes read as one value at any
  canvas size, so the threshold does not vary by profile.
- **Reported once per pair of parts,** at the first boundary coordinate, with
  `part` set to the alphabetically first name. Identical base tones collide too.
- **Fixtures:** `test/art-lint/value.test.ts` (bases 0.019 apart fire; a full
  step apart stay silent; one pair boundary of eight pixels reports once; same
  part, unowned neighbour and missing `base` role stay silent).

## `DITHER_MIN_TILES` — 4 (new, AC-15)

- **Catches:** a checkerboard lattice four tiles deep inside one part, when the
  material has fewer tones than `ditherMinTones` or the profile sets
  `ditherAllowed` false. One finding per part, naming the tile count and the
  tone count; the message says which of the two conditions failed.
- **Why 4:** a single tile is a pair of pixels; four is the smallest patch that
  repeats in both axes and therefore reads as a field. Below that the pattern
  can still be a deliberate highlight.
- **Fixtures:** `test/art-lint/texture.test.ts` (a 3-tone ramp at tiny, where
  dither is unsanctioned, reports 81 tiles; the same lattice on a 5-step ramp at
  large stays silent; a 2-tone material under small fires on tone count; a 2x2
  dither stays under the floor; the same lattice with no parts reports once for
  the artwork).

## Cluster floor — 1 tiny, 2 small/medium, 3 large (new, AC-12)

- **Catches:** `CLUSTER_THIN` counts 4-connected same-tone components inside one
  part that are smaller than `profile.minCluster`. One info finding per part,
  the exact cluster count, and up to `MAX_COORDS_PER_FINDING` pixel coordinates;
  when the list is cut the message says so.
- **Why scale-dependent:** at 16 px a single pixel is a mark, at 160 px it is a
  speck. The same shape therefore reports differently on the two canvases, which
  is what AC-12 pins.
- **Fixtures:** `test/art-lint/texture.test.ts` (a 2-pixel mark is silent at tiny
  and reported at large; a component exactly at the floor stays silent; 51
  isolated pixels give one finding with 50 quoted coordinates; two parts report
  once each; a lone pixel on plain artwork reports once, without a part).

## Band and edge floor — 3 rows, 8 boundary pixels (new, AC-12)

- **`BANDING` catches:** equal-width parallel runs. A run is a maximal stretch of
  one tone inside one part; a band is three or more consecutive rows whose runs
  share a start, an end and a tone. Three rows is the smallest stack that reads
  as a rule rather than a shape, and a one-row gap ends it — a shading ramp with
  a deliberate break is two plates, not one band.
- **`PILLOW_SHADE` catches:** shadow on three or four edges of one part. The
  floor is 8 boundary pixels so a stray speck cannot be called pillow-shaded;
  the role tie-break (shadow > highlight > base) keeps the verdict stable when
  two roles share an edge.
- **Fixtures:** `test/art-lint/shading.test.ts` (a 4×8 block reports one band;
  two rows report none; a one-row gap splits two bands; different widths stay
  apart; a 4-edge shadow ring is one warning; two edges stay silent; one pixel
  with 4 boundary pixels is skipped; a plain fill reports one band and a plain
  shadow ring one pillow warning, both without a `part` field).

## Part scope: what the regional rules judge (new, review round 1 fix F6)

- **One region per part, or the whole canvas.** `BANDING`, `PILLOW_SHADE`,
  `DITHER_NOISE` and `CLUSTER_THIN` read one region at a time. A recipe that
  declares parts hands them one region per part. A recipe that declares none is
  not exempt: the flattened grid is one unnamed region, so plain artwork is still
  judged. Findings from such a region carry no `part` field and say "The
  artwork", because there is no declared name to blame.
- **Tones on plain artwork.** `DITHER_NOISE` compares the profile's
  `ditherMinTones` with the number of distinct slots the region actually paints.
  For a part that is the material's slot count; for the whole canvas it is the
  artwork's own tone count.
- **The two rules that stay part-scoped.** `VALUE_COLLISION` compares two
  materials' base tones at a shared boundary, and `SILHOUETTE_LOSS` judges a
  part's edge against the backdrop; both need declared parts and a material, so
  both stay silent on artwork that declares none.

## `RAMP_NONMONOTONIC` — no threshold, strict decrease (new)

- **Catches:** a palette family whose declared order does not darken. Tones are
  read as `t0` upward; classic families as highlight, base, shadow. One warning
  per family, naming the first adjacent pair that fails; equal tones fail too,
  because "strictly darker" is the contract a ramp makes.
- **Why no tolerance:** colours are 8-bit, so two steps either differ or are the
  same value. There is no noise to absorb, and a tolerance would only hide the
  equal-tone case that makes a ramp read as a flat fill.
- **Fixtures:** `test/art-lint/monotonic.test.ts` (a mid-ramp brightening, a
  classic highlight lighter than its base, equal neighbours, the first break of
  two, a monotonic five-step ramp, two-tone and flat families).

## `SILHOUETTE_LOSS` — `LOW_CONTRAST_MIN_RATIO`, per part (new)

- **Catches:** a part whose *material base tone* has less contrast against the
  active backdrop than `lowContrastMinRatio` allows. One warning per part,
  naming the part, its base hex, the measured ratio and the backdrop hex.
- **Why it repeats the ratio:** `LOW_CONTRAST` measures edge pixels against the
  default grey and reports a share; this rule answers the other question — which
  named part vanishes — and answers it for whatever background the caller asked
  to check (`render --debug --backdrop`). Same floor, same numbers, different
  subject.
- **Fixtures:** `test/art-lint/silhouette.test.ts` (grey on grey at 1.00:1;
  silent on black; the named backdrop appears in the message; one tone fails at
  tiny and passes at large; no parts and no base role stay silent) and
  `test/art-lint/backdrop.test.ts` (the CLI passes the requested panel through).
