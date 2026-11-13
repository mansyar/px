# Phase 4 — Feedback and Compatibility: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `ac14b8c` · **Head at verification:** `50a8317`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)

## What the phase adds

Two primitives landed without any way to see them. The sheet could show *what*
was painted, but not *how the new surface reads*: two parts on different planes
looked identical in panel A, and a texture's spacing existed only as a number in
its report. This phase makes both visible without growing the sheet's panels, and
proves that nothing older moved.

### Plane boundaries (P4.T1.1)

`CompiledPart` now carries the `facing` the part declared, omitted when the part
is viewer-facing, so `px inspect` reports it and the sheet can compare planes.
Planes are compared by **vector**, through the existing `facingVector`, not by
name: `right` and `[1, 0, 0]` are the same plane, and an undeclared part is
viewer-facing like an explicit `front`. Comparing names would have marked an edge
between two spellings of one plane.

Panel A dashes the shared grid line wherever two adjacent pixels belong to parts
with different planes — alternating black and white, four device pixels per pair.
The mark is shape and luminance only, never hue, so it survives a grayscale view
and stays distinct from the grey grid it replaces. Edge detection is a single
scan of `owners` (right and down neighbours per pixel), so it costs no extra
buffer and cannot widen the sheet.

The facing pairs are named on **one bounded notes line** (`PLANES 16
FRONT-RIGHT`), capped at three pairs. A text label at every edge would be
unbounded in count and unreadable at the profile zoom — the very failure the
task is about — so the sheet shows *where* with marks and *what* with a single
line. This is the one place the task's wording ("edges labelled") is met by a
combination rather than a label per edge; recorded under Deviations.

### Texture spacing (P4.T1.2)

The texture report is now self-describing: `pattern`, `density`, `mark`, `gap`,
with `mark`/`gap` coming from the lattice the pass actually used rather than
being recomputed by the reader. The sheet prints them as one line
(`TEXTURE STIPPLE D2 M1 G2`) and draws a **gauge at the panel's zoom**: two marks
with the real gap between them, over a rule that spans the pair. Drawing at zoom
is the point — the spacing the pass produced can be compared against the marks in
panel A instead of trusted from a number.

Layout: notes occupy the rows between the regime caption and the parts strip.
With no notes the geometry is byte-identical to before (the strip caption sits at
`captionY + captionHeight + PAD`, as it always did); with notes the strip moves
down by exactly the notes' height, so the sheet grows by a few rows and by
nothing else. `panels` are untouched, which the tests assert by equality.

### Compatibility (P4.T2.1, P4.T2.2)

`test/feedback/compat.test.ts` renders the pre-track potion recipe and asserts
the committed `potion.sha256`, twice, with no warnings; the sword, humanoid and
chest digests are asserted the same way, so the claim covers the benchmark set
rather than one convenient fixture. Nothing under `test/goldens`,
`test/benchmarks` or `test/art` changed this phase.

The round-trip test keeps a recipe that uses `facing` (both a name and a vector),
`stroke` (multi-point, `smooth`, `width 2`), `texture` (`mottle`, `density 3`) and
a `light` pass in one file, writes it with `serializeRecipe`, parses it back and
writes it again: the two texts are identical, the fields survive verbatim, and
rendering before and after produces the same digest.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-12 every pre-track recipe renders byte-identically; the hero golden is unchanged | `compat.test.ts` asserts `potion.sha256` (rendered twice, no warnings) plus sword/humanoid/chest; `git diff --stat ac14b8c..HEAD -- test/goldens test/benchmarks test/art` is empty | Pass |
| FR-14 plane boundaries and texture spacing legible in the sheet at the profile zoom | `sheet.test.ts` (9 tests): two-tone dash on the shared edge, note names the pair, same-plane edges stay grey, name/vector equivalence, undeclared ≈ `front`, gauge drawn at zoom with the real gap, sheet grows by a line and panels do not move | Pass |
| FR-15 the three primitives round-trip through the canonical writer | `compat.test.ts`: `serialize → parse → serialize` identical; fields present verbatim; render digest unchanged across the round trip | Pass |
| NFR-4 reports stay counts, not pixels | texture report extends its counts with the lattice; `coords` remains empty and the Phase 3 assertions on `coords` still pass unchanged | Pass |

## Tasks

| Task | Evidence | Files |
| --- | --- | --- |
| P4.T1.1 — plane boundaries | `sheet.test.ts`: `PLANES 16 FRONT-RIGHT` note, dash pixels at the cell edge, grey edge when planes agree, `[0,0,1]` ≡ `front`, `[1,0,0]` ≠ `front` | `src/render/debug/sheet.ts`, `src/core/parts.ts`, `test/parts/surface.test.ts` |
| P4.T1.2 — texture spacing | `sheet.test.ts`: gauge geometry (`mark 1`, `gap 2` at 8×), gap pixel white between two black marks, height grows by a line while `panels` compare equal, `D3` reaches the note | `src/render/debug/sheet.ts`, `src/core/ops/{texture,index,cleanup}.ts` |
| P4.T2.1 — pre-track byte identity | `compat.test.ts`: potion digest twice + three further benchmark digests | `test/feedback/compat.test.ts` |
| P4.T2.2 — all-primitives round trip | `compat.test.ts`: canonical text identical, fields verbatim, render digest stable | `test/feedback/compat.test.ts` |

`test/parts/surface.test.ts` gains one assertion that `inspect` carries a
declared `facing` and that it is absent when undeclared — the newer surfaces must
report the new field without changing the shape of part-less or facing-less
output, and the pre-existing exact-object assertion on `inspect.parts` is what
proves the omission.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, `biome check .`, 88 test files / 828 tests passed, build |
| `pnpm vitest run --coverage` | 0 | 88 files / 828 tests passed; statements 95.88 %, branches 87.25 %, functions 98.33 %, lines 95.70 % (gate 80 %, unchanged); `src/core/ops/texture.ts` still 100 % |

## Deviations

- **Files outside the phase's `Touches`.** `Touches` lists
  `src/render/debug/**`, `src/lint/**`, `src/core/recipe/**`, `test/feedback/**`,
  `test/parts/**`. The work also changed `src/core/parts.ts` (the compiled part
  must carry `facing`; there is no other honest source for a plane at render
  time), `src/core/ops/{texture,index,cleanup}.ts` (the lattice the pass used must
  reach the sheet; recomputing `mark`/`gap` in the renderer would duplicate the
  floor rule and could disagree with it), and `vitest.config.ts` (the new
  `test/feedback` project). All three are additive; `src/lint` was not needed.
- **"Edges labelled" is met by marks plus one pair line**, capped at three pairs,
  rather than a text label per edge — bounded by design, explained above.
- **`src/core/recipe/**` was not touched**: the canonical writer already carried
  all three primitives, which is exactly what the round-trip test proves.

No new dependency, no threshold lowered, no coverage exclude widened, no
`v8 ignore`, no lint rule weakened, no rule disabled, no digest refreshed.

## Primary verification

Verified by the primary at `50a8317`.

| Check | Result |
| --- | --- |
| Working tree | clean apart from this untracked file and the plan edit |
| Commits in `ac14b8c..HEAD` | 1 (`50a8317`), 0 merges |
| Scope | `src/core/`, `src/render/debug/`, `test/feedback/`, `test/parts/`, `vitest.config.ts` |
| `git diff --stat ac14b8c..HEAD -- test/goldens test/benchmarks test/art` | empty |
| `pnpm verify` | exit 0 — typecheck, biome, 88 files / 828 tests, build |
| `pnpm vitest run --coverage` | exit 0 — 95.88 % statements, 87.25 % branches |

### Spot-checks in source

- **The boundary is compared by vector, not by spelling.** `facingKey` goes
  through `facingVector` and formats the three components, so `right` and
  `[1, 0, 0]` collapse; the sheet test asserts both the collapse (`front` vs
  `[0,0,1]` → no note) and the distinction (`front` vs `[1,0,0]` → a note).
- **Notes cannot turn into a panel.** Their height is a sum of fixed lines and
  each gauge is at most `mark × zoom`; `sheet.test.ts` asserts the panels are
  unchanged and only the height moves.
- **The gauge is drawn, not described.** The test reads the gauge rect back out
  of the sheet and samples three pixels: mark, gap, mark.
- **Compatibility is asserted against committed bytes.** The expected digest is
  read from `potion.sha256` in the repository, not from a fresh render, so a
  changed renderer cannot silently agree with itself.
