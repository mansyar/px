# Phase 6 — Agent Ergonomics

| Field | Value |
| --- | --- |
| Track | `20261113-static-art-quality` |
| Phase | 6 — Agent Ergonomics (FR-22, FR-23, FR-24, NFR-4, AC-18, AC-19) |
| Date | 2026-11-13 |
| Branch | `feat/20261113-static-art-quality` |
| Base commit | `af29374` |
| Head commit | `9116c0d` (task commits `84c70e8`, `a9e3655`, `22d59e4`, `9116c0d`) |
| Result | **verified** |

An agent can address pixels by name (`{"ref": "guard.top", "dy": -2}`), prove an
edit landed (`px diff --against prev.png`, or a hash it already knows), and read
per-part statistics (`inspect` tones and value histogram, debug-sheet crop strip).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm typecheck` (`tsc --noEmit`) | 0 | clean |
| static | `pnpm lint` (`biome check .`) | 0 | 151 files, no findings |
| unit/integration/smoke/goldens/benchmarks | `pnpm test` (`vitest run`) | 0 | 73 files, 653 tests |
| build | `pnpm build` (`tsc -p tsconfig.build.json`) | 0 | no output |
| coverage | `pnpm vitest run --coverage` | 0 | statements 95.32%, branches 86.05%, functions 98.13%, lines 95.17% (gate 80%) |
| phase gate | `pnpm verify` | 0 | typecheck → lint → test → build, all clean |

## Acceptance criteria

| Criterion | Named test(s) | Result |
| --- | --- | --- |
| FR-22 refs, AC-18 exactness | `AC-18: a ref resolves to exactly the pixel its literal does` → *renders a ref-driven line byte-identically to the same line in numbers* (`test/ergonomics/refs.test.ts`) | pass — ref line and literal line produce the same PNG bytes and the same flattened buffer |
| FR-22 resolution table | *resolves every where to the documented point of the bounding box*, *takes edge as the raster-first pixel, smallest y then smallest x*, *resolves an anchor ref to the declared point, plus dx and dy*, *adds dx and dy after resolution, not before* | pass |
| FR-22 entry snapshot (trap 1) | *resolves against the entry snapshot, never against the op being drawn* | pass — a ref never sees the geometry the same op paints |
| FR-22 grammar and errors | *rejects an undeclared part with E_PART_UNKNOWN and lists the declared ones*, *rejects a part with no pixels at op start with E_EMPTY_PART*, *rejects an unknown where …*, *rejects a ref string with no dot*, *rejects an undeclared anchor …*, *rejects a ref with an extra key*, *rejects a non-integer offset*, *keeps points arrays integer-only* | pass |
| FR-22 serialisation | *writes ref, dx, dy in that order and omits zero offsets*, *round-trips a ref recipe byte-identically*, *keeps numbers as numbers* | pass |
| FR-23 `px diff` | `px diff against a PNG` → *reports identical …*, *locates a change as a count, a bounding box and a per-part breakdown*, *writes the current render when --out is given*, *rejects a comparison image of a different size with E_DIFF_SIZE*, *omits the parts table for a recipe that declares none* (`test/ergonomics/diff.test.ts`) | pass |
| FR-23 hash-only honesty | `px diff against a hash` → *proves a difference without inventing a per-pixel diff* | pass — `count: null`, `bounds: null`, `W_DIFF_HASH_ONLY`, no fabricated locations |
| FR-23 / AC-19 eighth tool | `test/mcp/reachability.test.ts` → *publishes eight tools, each with a definition*, *maps px_diff to the diff verb with both comparison sources*, *reaches every CLI flag through some tool parameter*, *declares in the published schema every parameter a mapping sends*, *reaches every declared schema property through some mapping* | pass |
| AC-19 parity | `test/mcp/parity.test.ts` → *returns byte-identical envelopes for every verb*, *renders the same PNG, debug sheet and metadata through both paths*, *diffs the same way in both paths*, *fails the same way in both paths* | pass |
| FR-24 inspect statistics | `test/ergonomics/stats.test.ts` → *reports bounds, painted count, a tone table and an eight-bucket value histogram*, *orders equal counts by slot name so the table is stable*, *caps the tone table at 24 slots and says how many the part really used* (`test/ergonomics/stats.test.ts`) | pass |
| NFR-4 bounded response | *keeps a 256x256 scene with 2000 ops under a 320 KB inspect response* | pass — ceiling asserted at 320 KB |
| FR-24 crop strip | *adds no strip and keeps the exact height for a recipe without parts*, *draws one crop per part, largest first, inside the existing width*, *shows at most six crops and stays bounded with more parts*, *stays byte-deterministic with a strip* | pass |
| Additive only (trap 3) | *leaves a part-less inspect envelope with exactly the keys it always had* (`test/ergonomics/stats.test.ts`), `test/parts/surface.test.ts` → *leaves a part-less envelope exactly as it was, with no parts key*, `test/profiles/sheet.test.ts` sheet-size and determinism tests | pass — key lists byte-identical, the sheet's height formula and byte determinism unchanged for part-less recipes |
| No regression | `pnpm verify` (73 files, 653 tests) | pass |

## Golden hashes

| Golden | Expected | Observed |
| --- | --- | --- |
| Hero render | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged (`test/goldens/fixtures/hero.sha256`) |
| Benchmark digests (4) | unchanged | unchanged — `pnpm vitest run test/goldens test/benchmarks` → 4 files, 33 tests, exit 0 |

No recipe, golden or benchmark recipe was edited; no threshold lowered, no
coverage exclude widened, no ignore comment added.

## Deviations

| File | Reason |
| --- | --- |
| `src/render/png.ts` | No PNG decoder existed, and `px diff --against <png>` needs one. `decodePng` was added beside the encoder so the reader and writer share the same deterministic contract; `src/render` is outside the phase's `Touches` (`src/core/**`, `src/cli/**`, `src/mcp/**`, `src/render/debug/**`, `src/lint/**`, …). |
| `test/parts/surface.test.ts` | FR-24 appends `tones`, `slot_count` and `values` to each inspect part entry, so the two exact-shape assertions there were extended with the new fields (the part-less envelope assertion was left untouched and still passes). Outside `test/ergonomics/**` / `test/mcp/**`. |
| `test/mcp/anchor.test.ts` | The help verb list gained `diff`, and this test asserts that list exactly. |
| `test/smoke/mcp-stdio.test.ts` | The stdio handshake test asserted seven published tools; `px_diff` makes eight. |

`vitest.config.ts` is inside `Touches`, so adding `test/ergonomics/**/*.test.ts`
to the `unit` project's include list there is not a deviation — without it the
new suite is never collected.

Deliberate shape decision: inspect part entries keep the phase-1/2 fields
(`name`, `material`, `gloss`, `z`, `painted`, `bounds`) and append `tones`,
`slot_count` and `values`, rather than replacing the entry with the brief's
shortened example. Dropping `gloss`/`z` would have been a subtraction from an
existing surface, which the additive rule forbids; `truncated: true` appears only
when the tone table was actually cut, mirroring how `cleanup` appears only when
non-empty.

## Evidence paths

- `test/ergonomics/refs.test.ts` (22 tests)
- `test/ergonomics/diff.test.ts` (10 tests)
- `test/ergonomics/stats.test.ts` (9 tests)
- `test/mcp/parity.test.ts`, `test/mcp/reachability.test.ts` (AC-19)
- Source: `src/core/refs.ts`, `src/core/diff.ts`, `src/core/parts.ts`,
  `src/cli/commands.ts`, `src/mcp/tools.ts`, `src/render/debug/sheet.ts`

## Notes

- Refs resolve in `compileRecipe` from a copy of the layer state taken before
  `applyOp`, and the resolved `Op` is what reaches the rasterizer. Validation
  (`validateReferences`) reports an undeclared part or anchor with the op's
  location; `E_EMPTY_PART` can only be known during replay, so it is raised by
  the compiler and still reported at the op that asked.
- `polygon.points` and `set_pixels.points` stay integer arrays: a ref in a points
  array would need an O(n) resolution order that nothing in this phase specifies.
- Between the `px diff` verb commit and the `px_diff` tool commit the reachability
  suite was red by construction (the flag had no tool yet). Both commits landed
  together in the phase, and the final tree is green.
- `src/core/parts.ts` carries its own WCAG luminance helper instead of importing
  `src/palettes/luminance.ts`, matching `src/lint/contrast.ts`: core must not
  depend on the palette authoring layer.

## Primary verification

Independent re-check by the primary at `af29374..HEAD`, run before the phase was squashed.

| Check | Result |
| --- | --- |
| Working tree | clean |
| Commits | 5, none a merge |
| `test/` recipe fixtures | `git diff --stat af29374..HEAD -- test/goldens test/benchmarks/*/` empty |
| Out-of-Touches paths | `src/render/png.ts` (declared), `test/parts/surface.test.ts` (declared), `test/smoke/mcp-stdio.test.ts` (declared), `test/benchmarks/benchmarks.test.ts` (undeclared, accepted below) |
| `pnpm verify` | exit 0, 73 files / 653 tests, build clean |
| `pnpm vitest run --coverage` | exit 0, statements 95.32% (2694/2826), branches 86.05% (1691/1965), functions 98.13%, lines 95.17% |

### Accepted undeclared deviation

`test/benchmarks/benchmarks.test.ts` was not in the deviations list. The change is a
type rename ripple, not a behavioural edit: `types.ts` now distinguishes `Op` (refs
resolved) from `RawOp = WidenedCoord<Op>` (as parsed), and the benchmark helpers
read raw ops so they see what the transcript wrote. `opTypes` and `setPixelPoints`
only switch their parameter type; no assertion changed.

### Design spot-checks

- `types.ts:299` keeps `Op` for the rasterizer and `:339` defines `RawOp` as the
  widened form, so ref resolution cannot silently leak into the drawing path.
- `src/render/png.ts::decodePng` is a reader for the engine's own output — filter
  types 0–4 and multiple IDATs accepted, documented as not a general decoder. A
  PNG from another tool is out of scope by design, so `diff` cannot be blamed for
  misreading a foreign encoding.
- `px diff` on the dogfooded sword, driven through `dist/cli.js`: hash mode against
  the committed digest reports `identical: true`, `count: 0`; PNG mode against a
  file rendered from the same recipe reports the same; after one `set_pixels` the
  PNG mode reports `count: 1` with `bounds: {x: 1, y: 1, w: 1, h: 1}` — AC-19
  verified on real art, not only in a unit fixture.
- `inspect --summary` on that same part-less recipe returns no `parts` key, so
  additive features stay invisible when unused.

```
af29374..HEAD  git status --porcelain            clean
af29374..HEAD  git log --oneline                  5 commits, 0 merges
af29374..HEAD  git diff --stat -- test/goldens test/benchmarks/*/   empty
               pnpm verify                        exit 0, 653 tests
               pnpm vitest run --coverage         exit 0, 95.32 / 86.05 / 98.13 / 95.17
```
