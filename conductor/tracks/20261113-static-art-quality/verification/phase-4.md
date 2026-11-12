# Phase 4 — Palette Intelligence (verification)

- Track: `20261113-static-art-quality`
- Branch: `feat/20261113-static-art-quality`
- Phase base: `4a4299c`
- Head: `5a2964a` (+ this evidence file)
- Date: 2026-11-13

## Tasks

| Task | Status | Commit | What landed |
| --- | --- | --- | --- |
| P4.T1 | done | `2e4ded0` | `src/palettes/oklch.ts`: hand-written sRGB↔linear (0.04045/12.92/1.055/2.4), linear↔OKLab (Ottosson matrices), OKLab↔OKLCH polar; `src/palettes/synthesize.ts`: `synthesizeRamp`, `toneTargets`, every constant a named export (L step 0.06, floor 0.08, ceiling 0.98, chroma clamp 0.16 with 0.35 floor, light falloff 0.10, dark 0.20, 12°/step toward 250° cool / 60° warm, achromatic threshold 0.004, nudge 0.004). `src/palettes/luminance.ts` now shares the transfer function. |
| P4.T2 | done | `6de0465` | `RampTone`/`Ramp`/`RAMP_TONE_PATTERN`/`rampTones`/`rampSuffixes` in `recipe/types.ts`; `normalizeFamily` accepts a contiguous `t0…t(n-1)` block and rejects gaps/unknown keys; `buildSlotRoles` derives highlight→`t0`, base→`t(floor((n-1)/2))`, shadow→`t(n-1)` *after* explicit roles, materialised in `roleSlots` (the light pass reads that table directly); `canonicalPalette` writes tones after roles, so a synthesised family round-trips; `px synthesize --file --family --from --steps [--force]` and repeatable `--synthesize name=#hex:steps` on `px init`; `px_init.synthesize` in MCP (seven tools unchanged). |
| P4.T3 | done | `676bfeb` | `parseStepCount`: non-numeric/fractional → `E_BAD_PARAM`; outside 3–6 → `E_RAMP_STEPS_RANGE` with a hint naming the range and why. Suites `test/palettes/steps.test.ts` (2, 7, 0, 1.5, 3, 6 through the parser, `px init` and `px synthesize`) and `test/palettes/tmp-debug.test.ts` (every tone count at near-black/near-white/saturated extremes either strictly monotonic or a loud `E_INTERNAL`). |
| P4.T4 | done | `5a2964a` | `src/palettes/swap.ts`: `parseSwapEntries`/`resolveSwapMap`/`applySwaps`; `--swap from=to` (repeatable) on `render`; `px_render.swap` (array or comma string) in MCP; the swapped palette feeds the PNG, the debug sheet and the exported manifest, while `recipe_hash` still hashes the file. `src/meta/index.ts` gained an optional `paletteRecipe` so the manifest describes drawn colours and the hash describes the recipe. |

## Gates

Both run on the final tree (`5a2964a`), exactly as the brief names them.

```
$ pnpm verify
$ tsc --noEmit
$ biome check .
Checked 129 files in 72ms. No fixes applied.
$ vitest run
 Test Files  62 passed (62)
      Tests  545 passed (545)
$ tsc -p tsconfig.build.json
exit 0
```

```
$ pnpm vitest run --coverage
 Test Files  62 passed (62)
      Tests  545 passed (545)
Statements   : 94.98% ( 1951/2054 )
Branches     : 86.94% ( 1192/1371 )
Functions    : 98.68% ( 300/304 )
Lines        : 94.85% ( 1863/1964 )
exit 0
```

496 tests became 545 (+49), 59 files became 62. Statements moved 95.09 → 94.98
and branches 87.38 → 86.94 because two sizeable pure modules arrived; the 80 %
thresholds in `vitest.config.ts` are untouched, no exclusion was widened and no
ignore comment was added. `src/palettes/swap.ts` is at 97.18 % statements,
`synthesize.ts` at 87.96 %.

## Step storage (the part most likely to drift)

A synthesised family is stored as `{ "ramp": { "t0": …, "t1": …, …, "t(n-1)": … } }`
only — no roles duplicated, no `synthesize` op, no `steps` field, no formula.
`test/palettes/synthesis-family.test.ts` asserts the written keys, their
lightest-first order, that the file text contains no `synthesize`/`steps` token,
and that `parseRecipe` → `serializeRecipe` is byte-identical.

Role resolution is a derivation, not storage. `buildSlotRoles` fills explicit
roles first, then derives from the tone map for roles the family did not declare:

- highlight → `t0` (lightest)
- base → `t(floor((n-1)/2))`
- shadow → `t(n-1)` (darkest)

Three consequences are pinned by tests:

1. A `steps: 3` family yields exactly the three roles, so a `ramp_fill` with
   `bands: 3` paints the way a hand-written three-role ramp does.
2. An explicit role key always wins: a family declaring `base` plus `t0…t4` keeps
   its authored base and only derives what is missing.
3. Because the derived roles are written into `roleSlots`, `src/core/ops/light.ts`
   (which indexes `roles.roleSlots` directly rather than through `roleSlot`) sees
   them too. Tone keys are *not* slot names for painting: `trim.shadow` does not
   exist unless authored; `trim.t2` does.

Existing recipes never take that path: no committed recipe declares a tone key,
`normalizeFamily` keeps role keys in `RAMP_ROLES` order, and `canonicalPalette`
writes roles before tones. Goldens and all four benchmark replays are unchanged
(see digests below), which is the before/after evidence for byte identity — the
suites were not edited, they were simply re-run against the new normaliser.

## Monotonicity

`enforceMonotonicLuminance` measures each generated tone in WCAG relative
luminance after 8-bit quantisation. If two adjacent steps fail to decrease, the
offending tone's OKLCH L is nudged down by 0.004 and reconverted; a tone that runs
out of room lifts the whole ramp by 0.02 and retries, up to four attempts, after
which it throws `E_INTERNAL` listing the hexes rather than shipping a broken ramp.

The floor is load-bearing: at L 0.08 there are only two distinct 8-bit greys left
below it, so a near-black base genuinely cannot carry six tones. That is why
`test/palettes/tmp-debug.test.ts` accepts "strictly monotonic **or** loud
`E_INTERNAL`" for 6 steps at the extremes, while `synthesis.test.ts` demands
strict monotonicity for every base at 3, 4 and 5 steps (AC-13 covers 5).

## Swap semantics

`resolveSwapMap` resolves every entry as a single map: `a=b` plus `b=c` makes `a`
become `c`; a cycle (`a=b`, `b=c`, `c=a`) is `E_BAD_PARAM` naming the chain, and
`a=a` is dropped. `applySwaps` then returns a shallow copy in which the **source
key keeps its place and receives the target family verbatim**.

Swapping is resolution by role and slot, never by index:

- a part whose material is `steel` resolves `highlight`/`base`/`shadow` in the
  target family, because the target family now sits under `steel`;
- direct slot references (`steel.base`, `steel.t2`, `mono.1`) resolve through the
  same map, so untagged painting swaps as well;
- compatibility is the slot-name superset rule: every suffix the source exposes
  must exist in the target, otherwise a recipe that renders today would fail on
  `E_UNKNOWN_SLOT` later. A missing role is reported by name
  (`"mono" has no "outline" role`), a missing tone or colour index by count;
- unknown family on either side → `E_FAMILY_UNKNOWN`; an entry without `=` → `E_BAD_PARAM`;
- the render, the debug sheet (preview) and the exported palette manifest all read
  the swapped palette; the recipe file and `recipe_hash` do not change.

`test/palettes/swap.test.ts` renders with and without `--swap steel=gold`, asserts
the recipe bytes and `recipe_hash` are identical, the PNG sha differs, the manifest
carries the gold hexes under `steel.*`, the debug PNG sha differs, and
`--swap steel=mono` exits 1 with `E_SWAP_INCOMPATIBLE` naming `"outline"`.

## Digests

- Hero: `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` —
  asserted by `test/goldens/render.test.ts` against the untouched fixture.
- potion `9529870a…108f`, sword `4050e845…aaf1`, humanoid `03e71701…3bfc`,
  chest `cda5bbed…6917` — all four replays pass unmodified.
- `git diff --stat 4a4299c -- test/goldens test/benchmarks` is empty.

## AC coverage

- **AC-13** — `test/palettes/synthesis.test.ts`:
  `lists tones lightest first and strictly monotonic in WCAG luminance (AC-13)`
  (every base × 3/4/5 steps, adjacent WCAG luminance strictly decreasing) and
  `rotates shadows cool and highlights warm, along the shorter arc` (shadow hues
  move toward 250°, highlights toward 60°, each by the shorter arc, capped at 12°
  per step; a grey base rotates 0° and changes luminance only).
- **AC-14** — `test/palettes/swap.test.ts`:
  `changes the render and the manifest while the recipe file stays byte-identical`
  and `swaps the debug preview too`.
- **FR-17** — `test/palettes/steps.test.ts` covers 2, 7, 0 (range), 1.5 (type),
  3 and 6 (legal), through both CLI entry points and the parser.
- **FR-15/FR-16** — the exported constants in `src/palettes/synthesize.ts` are the
  documented rules, and `test/palettes/oklch.test.ts` pins the conversion pair
  (all 256 channels round-trip exactly; 8-bit colours round-trip within 1/255;
  black/white/greys are achromatic; red lands at L≈0.6279, C≈0.2577, h≈29.23°).

## Deviations

| File | Why |
| --- | --- |
| `test/mcp/reachability.test.ts` | The suite is exhaustive by design: a new CLI flag with no mapping fails it. Added mappings for `--synthesize` (px_init) and `--swap` (px_render); exempted `family`/`from`/`steps` alongside `pretty`/`color`/`help`, because `px synthesize` has no MCP tool — FR-22 keeps the surface at seven tools and agents synthesise through `px_init.synthesize`. |
| `test/mcp/anchor.test.ts` | One assertion lists the CLI verbs from `--help`; it now includes `synthesize`. No other line changed. |
| `test/palettes/tmp-debug.test.ts` | A real extreme-base suite written while diagnosing the monotonicity failures. It could not be deleted or renamed in this sandbox (no delete capability; `Remove-Item`, `git mv` and `git rm --cached` are all permission-denied), so it was committed under its scratch name with a header comment saying it should be renamed `ramp-extremes.test.ts`. **Primary action: rename it.** |
| `src/meta/index.ts` | `buildMetadata` gained an *optional* fourth argument (`paletteRecipe`) instead of a required one, because `test/mcp/meta.test.ts` and `test/mcp/meta-export.test.ts` (outside `Touches`) call it with three. `recipe_hash` still hashes the recipe file; only the manifest reads the swapped palette. |

No other pre-existing test file changed. `test/palettes/palettes.test.ts` (the six
existing palette/derivation tests) is untouched and green. No new dependency:
`package.json` is unchanged and the OKLCH maths is hand-written (NFR-2).

## Notes for review

- T2 and T3 share `src/palettes/synthesize.ts` (storage and `parseStepCount` live
  in one module). The sandbox forbids interactive partial staging, so the module
  landed with the T2 commit and the T3 commit carries the bounds/extremes suites
  that pin its behaviour. The final tree is the verified one.
- `--synthesize` on `px init` applies after the starting palette is built, so a
  name already present (`steel`, a curated family) is `E_FAMILY_EXISTS` unless
  `--force`; `--force` also makes a second identical `px synthesize` reproduce the
  same bytes (idempotence is asserted).
- Swapping onto a family with *more* tones is legal (superset), swapping onto fewer
  is `E_SWAP_INCOMPATIBLE`. A 5-tone source needs a 5-tone target, which is the
  spec's "fewer steps than the source" edge case made concrete.
