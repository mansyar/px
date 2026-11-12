# Phase 2 verification — `light`: form, AO, cast, rim, gloss

**Result: verified.** `light` renders bevel, round and flat form, ambient occlusion, cast
shadows, selective rim and gloss-specific treatment from a single snapshot-based post-pass.
Both gates exit 0 (`pnpm verify`, `pnpm vitest run --coverage`), the suite is at 457 tests
(390 before this phase), and no rendered byte moved: the hero golden and all four benchmark
digests are unchanged and `test/goldens/**` and `test/benchmarks/**` are untouched.

| | |
| --- | --- |
| Base SHA | `7bc5142` |
| Head SHA (code under test) | `9766c27` |
| Branch | `feat/20261113-static-art-quality` |
| Test files / tests | 52 files, 457 tests (7 new files, 67 new tests) |
| Coverage (statements / branches) | 94.99% (1671/1759) / 87.11% (1055/1211) |

## Tasks and commits

| Task | What | Commit |
| --- | --- | --- |
| P2.T1 | Op shape, parsing, serialisation, validation; `flat`/`bevel`/`round` form from a snapshot | `f34a0a4` |
| P2.T2 | AO: one role darker across a strictly higher-`z` contact | `dd7b704` |
| P2.T3 | Cast: caster family `shadow` offset 1–4 px along the light vector | `81ed7a2` |
| P2.T4 | Rim: `edge` and `selective` | `ab682d2` |
| P2.T5 | Gloss profiles, plus the composite form→AO→cast→rim order test | `9b440ee` |
| — | AC-8's exact 2 px offset assertion | `9766c27` |

## Commands

| Command | Exit | Output |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck clean, `biome check .` 114 files clean, 52 files / 457 tests passed, build clean |
| `pnpm vitest run --coverage` | 0 | 52 files / 457 tests passed; statements 94.99%, branches 87.11%, functions 99.20%, lines 94.82% |
| `git diff --stat 7bc5142 -- test/goldens test/benchmarks` | 0 | no output — no fixture, golden or benchmark edited |

`src/core/ops/light.ts` is at 95.80% statements / 88.88% branches / 100% functions; `ramp.ts`
stays at 96.00 / 87.17 after the rank extraction, so the refactor did not trade coverage for
reuse.

## Acceptance criteria

| AC | Requirement | Proving test |
| --- | --- | --- |
| AC-7 | AO darkens exactly the boundary pixels adjacent to a higher-`z` part by one ramp step | `light ao` › `occlusion between parts` › *steps one role darker where a strictly higher part touches*; *never occludes at equal z*; *does not reach across a transparent gap*; *clamps at the canvas edge instead of wrapping* |
| AC-8 | A cast shadow with a 2 px offset matches the expected offset pixels and clips at the canvas edge | `light cast` › `offset` › *follows cast_offset diagonally* (asserts the 2 px destination and the 3 px one); `light cast` › `clipping` › *drops a shadow that leaves the canvas without an error* |
| AC-9 | `rim: "selective"` uses the neighbour's `outline` colour where families differ | `light rim` › `selective` › *borrows the neighbouring family outline against it*; *falls back to edge when the neighbouring family has no outline* |
| AC-10 | A metal part renders a diagonal specular and no diffuse banding along the shadow side | `light gloss` › `metal` › *keeps a hard specular band per light-axis rank instead of bands*; *drops the shadow-side bevel band and every round band* |

FR-7 (form) is proved by `light form` › `bevel` › *lights <corner> and shadows the opposite
side* (all four corners) and `light form` › `round` › *bands the part along the light axis with
three occupied ranks*. The interaction order the brief required is pinned twice:
`light pass order` › *shows each stage on the pixel only that stage can reach* puts form, AO,
cast and rim on four separate pixels of one recipe, and *rim overwrites a form highlight the
light never reaches without it* shows rim running after form (and that `edge` reads only
transparency while form also honours a foreign boundary). The conventions are pinned by
`light light-vector convention` › *points toward the named corner and throws the shadow the
other way* and › *reads a positive dot as lit, a negative one as dark, zero as unchanged*.

## Golden hashes

| Asset | SHA-256 | Verified by |
| --- | --- | --- |
| hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | `test/goldens/render.test.ts` |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | `test/benchmarks/benchmarks.test.ts` |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | `test/benchmarks/benchmarks.test.ts` |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | `test/benchmarks/benchmarks.test.ts` |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | `test/benchmarks/benchmarks.test.ts` |

All five run inside `pnpm verify` and pass without an edit to the hashes themselves. No
existing recipe uses `light`, so the new pass cannot reach them.

## Deviations

| File | Reason |
| --- | --- |
| `src/core/recipe/types.ts` | `LightOp`, `LightForm`, `LightRim`, the `Op` union, `POST_PASS_OPS`, `OP_PARAM_ORDER.light` — the op cannot exist without the type |
| `src/core/recipe/normalize.ts` | Parsing, defaults and `cast`/`cast_offset` range checks |
| `src/core/recipe/serialize.ts` | Canonical output; every field is written explicitly, `cast: null` included |
| `src/core/recipe/validate.ts` | `slotReferences` case, `target_layer` existence, caster name check |
| `src/core/ops/ramp.ts` | Extracted `rankProjections` so `round` reuses the occupied-rank arithmetic rather than a second copy; `rampFill` output is unchanged |
| `vitest.config.ts` | `test/light/**` added to the `unit` project — without it the new suite never runs |

`parts.ts`, `canvas.ts`, `palette.ts`, `normalize.ts`'s other op bodies, `errors.ts` codes,
`conductor/product*.md` and every Conductor state file are untouched.

## Notes on the decisions as implemented

- **Light vector.** The op names the corner the light comes *from*. `towardLight` returns the
  unit step from the dark corner toward the light: top-left `(-1, -1)`, top-right `(1, -1)`,
  bottom-left `(-1, 1)`, bottom-right `(1, 1)`. A normal is lit when `dot(normal, toward) > 0`,
  dark when `< 0`; the shadow is thrown the other way (`SHADOW_STEP` = `-toward`, i.e.
  top-left casts `(+1, +1)`). Because the steps are diagonals, `dot == 0` only occurs for a
  zero normal, but the zero case keeps the base role rather than guessing.
- **Order inside one op.** Form → gloss → AO → cast → rim. Ownership masks (`partStats`-style
  ownership from the entry snapshot) are read once; colour writes are sequential, so the cast
  lands on the shaded form and the rim recolours whatever the cast left on a silhouette.
  `gloss` sits between form and AO because it rewrites form output rather than shading it
  again; `matte` is a no-op and therefore indistinguishable from plain form output.
- **Snapshot rule.** The pass reads `snapshot(context, target_layer)` and
  `snapshotOwners(...)` from the layer it targets and writes into the containing layer, exactly
  like `auto_outline`. `bevel` applied twice is byte-identical, which the form suite asserts
  (*is idempotent, so the pass never reads its own output*).
- **Equal `z` never occludes.** AO and the cast's overwrite test both use strict `>`; equal `z`
  is transparent to both. AO additionally requires an *opaque* neighbour, so a contact across a
  one-pixel gap does not darken, and a neighbour outside the canvas counts as no neighbour
  (clamped, no error).
- **`metal` does not band diffusely.** It suppresses the whole shadow-side bevel band and every
  `round` band, then paints `highlight` on the second-lowest occupied light-axis rank
  (rank 1, or rank 0 when the part has a single rank). That produces the diagonal streak along
  the light axis with no stepped falloff on the dark side. `gem` lights the silhouette plus the
  middle third of ranks; `cloth` dithers only pixels already carrying the shadow role, by
  `(x + y) % 2`, so it never invents a band where the form did not place one.
- **`selective` order.** For a boundary pixel, a foreign-family 4-neighbour wins and lends its
  `outline`; otherwise the pixel's own family `outline`; otherwise it falls back to the `edge`
  rule. Interiors are never touched. Missing roles degrade silently to `edge`, never to an
  error, matching `auto_shade`.
- **Ownership changes.** A cast that lands on transparent space claims that pixel for the
  caster (`canvas.set(..., owner)`), so `partStats` counts it and the caster's `painted` grows;
  a cast over a lower-`z` owner displaces it and therefore surfaces in `W_PART_OVERWRITE`. Both
  are asserted in `light cast`.
- **No `parts`.** The whole layer is one implicit part: matte, `z = 0`, no family — roles come
  from the palette's first family and a missing role changes nothing. An empty layer is the
  existing `W_PASS_NOOP`, and a flat-form pass that writes nothing is a no-op too.
- **Errors.** Only `E_PART_UNKNOWN` (undeclared caster, hint lists the declared parts or tells
  you to declare them), `E_BAD_PARAM` (range/enum/unknown key, `part` rejected) and
  `E_NO_RAMP` (caster family without a `shadow`, with the `--derive-ramps` hint) are raised. No
  new code was added to the registry.

## Primary verification

Re-run from `9766c27`:

```
pnpm verify                          # exit 0, 457 tests
pnpm vitest run --coverage           # exit 0, 94.99 % statements / 87.11 % branches
git diff --stat 7bc5142 -- test/goldens test/benchmarks   # no output
```
