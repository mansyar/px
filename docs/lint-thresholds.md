# Lint thresholds

`src/lint/thresholds.ts` is the only place the linter's numbers live. Every rule
reads them from there; nothing else hard-codes a limit. This page records each
value, what it catches, what it deliberately ignores, and the fixtures on both
sides. Phase 5 calibrated the `JAGGY_LINE` values against the four benchmarks in
`test/benchmarks/`; the others were checked there and left unchanged.

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

## `JAGGY_MIN_RUNS` — 3 (unchanged)

- **Catches:** a step sequence long enough to have a shape. Two runs are a
  corner, not a line.
- **Ignores:** a single slope change.
- **Fixtures:** fires — `test/benchmarks/thresholds.test.ts` ("reports a
  staircase that leaves its diagonal and returns"); silent — "accepts a four-line
  wall before a curve" (the wall is cut, leaving one run).

## `JAGGY_MAX_RUN` — 3 (new in phase 5)

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

## `JAGGY_STEP_JUMP` — 2 (new in phase 5)

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

## `LOW_CONTRAST_MIN_RATIO` — 1.5 (unchanged)

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

## `ORPHAN_NEIGHBOUR_RADIUS` — 2 (new in review round 2)

- **Was:** 8-way only (radius 1), calibrated against a 1-px `line` and a
  `checker_50` dither.
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
