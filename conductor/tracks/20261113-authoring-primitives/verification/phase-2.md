# Phase 2 — Stroke: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `8a3bc2a` · **Head at verification:** `cab8949`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)

## What the phase adds

A `stroke` op: a polyline given `path: [[x, y], ...]`, optionally `closed`,
`smooth` and `width: 1 | 2`, painted through the shared writer with `color` and
`part` like any other geometry op. It is one new op plus one new error code
(`E_BAD_PATH`); nothing else in the engine changed behaviour.

### The two cleanup rules

Both live in `src/core/ops/stroke.ts` and both are documented there as
behaviour rather than implementation detail.

**1. L-turn doubles.** Three consecutive pixels whose first and last are
diagonal neighbours form an L; the corner pixel is dropped. The two survivors
are diagonal neighbours, so the path stays 8-connected. The path's first pixel
is never dropped: on a closed path it is the seam the closing segment lands on,
so dropping it would be a hole, not a cleanup (AC-6). That exemption is the one
asymmetry in the rule and it is deliberate.

**2. Repeating step runs.** Bresenham places a segment's minority steps on a
fixed rational cadence. On the 256 px 2:1 diagonal used by AC-5 the cadence is
literally 126 consecutive gaps of 2 — a pure 1-2-1-2 staircase. `stroke`
rasterises each segment by placing the k-th minority step at
`round(k * spacing + (frac(k * ALPHA) - 0.5) * spread)`, `ALPHA` the golden
ratio conjugate and `spread` a full period. The gaps then take four values,
`1/2/3/4`, and the longest run of any one of them is **2**:

| Path (256 px) | Gap sequence (first 12) | Longest equal run |
| --- | --- | --- |
| `line` (0,0)→(255,127) | `2,2,2,2,2,2,2,2,2,2,2,2` | **126** |
| `stroke` path (0,0)→(255,127) | `1,4,1,1,3,2,3,1,1,4,1,1` | **2** |

The schedule is clamped strictly increasing and its last position is pinned to
the segment length, so both endpoints are exact, the path has one pixel per
column on a shallow line, and the worst deviation from the ideal line is
0.70 px — measured for this slope while tuning the amplitude (a half-period
shift left runs of six, a full period keeps every run at two).

Determinism: integer coordinates, a compile-time constant, and IEEE-754-exact
multiply/floor arithmetic on small integers. No RNG, no clock, no transcendental
function, no platform-dependent rounding.

### Width, smoothing, erase

- `width: 2` adds one pixel per centreline pixel, below a mostly-horizontal
  point and to the right otherwise. Fixed side, so replay is deterministic;
  overhang goes through the shared clipped writer, which already emits one
  `W_OUT_OF_BOUNDS` per op.
- `smooth: true` replaces each interior vertex with an entry and an exit point
  cut back up to 2 px along its segments, and the chamfer between them is
  rasterised like any other segment. A two-point path is unchanged; a closed
  path's seam is a vertex like any other.
- `color: null` erases: `ownerFor` maps it to `UNOWNED`, so both the colour and
  the ownership are cleared, exactly as `line`/`rect` erasing already did.

### Surface

`stroke` is a normal member of the op union, so it rides the existing surfaces
with no CLI or MCP change: the recipe file, `px draw --ops` (an array of op
objects or tuples) and the tool surface that accepts the same op objects. Its
`OP_PARAM_ORDER` entry `path, color, closed, smooth, width` also makes the
compact tuple form work. Round-trip proof through the canonical writer is
Phase 4's task (P4.T2.2); the writer case and `serialize` ordering land here so
that task can assert it.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-5 a 256 px diagonal has no repeating 1-2-1-2 step pattern, while `line` does | `cleanup.test.ts` — `line` gaps longest run 126, `stroke` longest run ≤ 2, gap sequences differ; both asserted as geometry read from the compiled canvas | Pass |
| AC-6 a closed 64 px square joins with no missing pixel at the start point | `path.test.ts` — seam pixel (4,4) painted, 217 perimeter pixels (220 less three chamfered far corners), 8-connected | Pass |
| AC-7 `smooth` over a right angle is one connected path with no diagonal gap | `cleanup.test.ts` — (9,1) gone, (7,1)/(8,2)/(9,3) diagonal chamfer, 15 px, 8-connected; two-point path unchanged | Pass |
| AC-8 `color: null` erases along the path and clears ownership | `options.test.ts` — erased pixels `UNOWNED`, the row below still owned by the declared part, and an erase carrying `part` still leaves ownership clear | Pass |

## Tasks

| Task | Evidence | Files |
| --- | --- | --- |
| P2.T1 — path rasteriser | `path.test.ts` (9 tests) | `src/core/ops/stroke.ts`, `recipe/types.ts`, `recipe/normalize.ts`, `core/errors.ts` |
| P2.T2 — self-cleanup | `cleanup.test.ts` (9 tests) | `src/core/ops/stroke.ts`, `test/stroke/{support,cleanup}.ts` |
| P2.T3 — width, smoothing, erase | `options.test.ts` (8 tests) | `src/core/ops/stroke.ts`, `ops/index.ts`, `recipe/{normalize,serialize,validate}.ts` |

`E_BAD_PATH` covers three rejections: fewer than two path entries, a path that
collapses to one distinct point after deduplication, and a point that is not an
integer pair. An omitted `path` stays `E_MISSING_PARAM`, like every other
missing parameter.

## Digests (no digest moved this phase)

`git diff --stat 8a3bc2a..HEAD -- test/goldens test/benchmarks test/art` is
empty. The hero golden and all eight committed asset digests are untouched, as
they must be: no existing op changed.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, `biome check .` (165 files, no findings), 83 test files / 793 tests passed, build |
| `pnpm vitest run --coverage` | 0 | 83 files / 793 tests passed; statements 95.82 %, branches 87.03 %, functions 98.29 %, lines 95.65 % (gate 80 %, unchanged); `src/core/ops/stroke.ts` 98.34 / 88.05 / 100 / 98.23 |

## Deviations

None. Every changed path is inside the phase's declared `Touches`
(`src/core/ops/**`, `src/core/recipe/**`, `test/stroke/**`, `vitest.config.ts`).
`src/cli/**` and `src/mcp/**` are in `Touches` but needed no change: the op
surfaces are generic over the op union.

No new dependency, no threshold lowered, no coverage exclude widened, no
`v8 ignore`, no lint rule weakened, no rule disabled.

## Primary verification

Verified by the primary at `cab8949`, after writing the code, independently of
the test assertions being written by the same author.

| Check | Result |
| --- | --- |
| Working tree | clean apart from this untracked file |
| Commits in `8a3bc2a..HEAD` | 1 (`cab8949`), 0 merges |
| Scope | every changed path inside `src/core/`, `test/stroke/`, `vitest.config.ts` |
| `git diff --stat 8a3bc2a..HEAD -- test/goldens test/benchmarks test/art` | empty |
| `pnpm verify` | exit 0 — typecheck, biome (165 files), 83 files / 793 tests, build |
| `pnpm vitest run --coverage` | exit 0 — 95.82 % statements, 87.03 % branches |

### Spot-checks in source

- **The cadence fix is the schedule, not a filter after the fact.** The gap
  sequences above are read from rendered pixels, and `line` is measured in the
  same test: if the stroke were Bresenham plus a cosmetic pass, the two
  sequences would not differ in distribution.
- **The seam is genuinely the closing segment's landing point.** The test paints
  a 64 px square with `closed: true` and asserts the start pixel and the far
  corners separately, so a pass that simply skipped the closing segment would
  fail on the pixel count rather than pass on the seam assertion alone.
- **Erase clears ownership only where it writes.** The AC-8 test asserts both
  the erased row (`UNOWNED`) and the row below (still part 0), so an op that
  cleared the whole owner buffer would fail.
- **Width clips through one path.** The clipping test asserts exactly one
  warning with the first dropped coordinate, rather than merely "a warning".
