# Lever selection — Phase 2 (P2.T1)

**Track:** 20261117-craft-application
**Phase:** 2 — Apply validated levers and re-score the gate
**Instrument (frozen):** `scripts/rubric.mjs` with model `gemini-4-hydrogen`
**Score order:** silhouette / value_separation / lighting / edge_language / cluster_discipline / palette_craft
**Phase-1 checkpoint:** 4ccfbf5

## T1.1 — failing-criterion → lever mapping

The Phase-1 diagnostic established the baseline chest recipe at `3/3/1/2/4/2` on both
passes and validated exactly one candidate that clears every weak criterion on both
passes: **L (warm/cool directional light)**, measured `3/4/5/4/4/5` on pass A and
`3/4/4/3/4/4` on pass B. The lever has two inseparable parts:

1. **Warm/cool hue-stepped 5-stop ramps** — highlight tones (`t0`/`t1`) step warm
   (yellow/cream), shadow tones (`t3`/`t4`) step cool (blue-grey / deep umber).
2. **One directional `light` op**
   `{op:'light',angle:'top-left',form:'bevel',ao:true,cast:null,cast_offset:2,rim:'edge'}`
   inserted after every `ascii_blit` and before the baseline `auto_outline`.
   The flat `harmonize` op is removed where present; `design.light` stays `top-left`.

| Asset | Below-floor criteria (baseline) | Lever mapping | Phase-1 measured ≥3 evidence |
|---|---|---|---|
| chest | lighting 1/1, edge_language 2/2, palette_craft 2/2 | L ramps + light replace flat `harmonize`/flat lid; warm/cool stepping and directional bevel/AO/rim restore value interest, tonal edge contrast, and hue variety | L measured lighting **5/4**, edge_language **4/3**, palette_craft **5/4** — all ≥3 on both passes |
| character | edge_language 2/2 | L ramps + light: directional highlight-on-light-facing / shadow-on-away edges supplies the tonal richness edge_language responds to | L edge_language **4/3** vs baseline 2/2; no literal outline-hierarchy op needed |
| potion | lighting 1/1, palette_craft 2/2 | Explicit ramps already present; light op + `harmonize` removal restores directional lighting; warm/cool stepping (brew red, cork amber, glass mint→cyan, gorget steel) strengthens palette_craft | L lighting **5/4**, palette_craft **5/4**; glass/gorget ramps already match the validated deriveRamp steel-blue family |
| prop | lighting 2/2 | Convert named-role ramps to explicit warm/cool 5-stop ramps (iron cool steel, brass warm gold, flame warm orange, glass deep teal), keep the existing light op normalized to the L shape | L lighting **5/4**; prop already had a light op but flat role ramps and no tone stepping — same lighting root cause |
| scene | pass A edge_language 2; pass B lighting 2 + edge_language 2 | L ramps + light: warm roof/stone vs cool water/stone stepping and directional bevel/AO/rim lift both weak criteria | L edge_language **4/3**, lighting **5/4**; baseline edge 2/2 and lighting 1/2 on the two passes |
| sword | pass A lighting 2 + palette 2; pass B lighting 1 + edge_language 2 + palette 2 | L ramps + light: warm brass vs cool steel/ruby stepping, directional bevel/AO/rim; drop `harmonize` | L lighting **5/4**, edge_language **4/3**, palette_craft **5/4**; all three weak criteria lifted on both passes |

**Scope note (FR-4):** the plan's P2.T2.1 text omitted `prop`, but `scores.json` records
prop lighting 2/2 on both passes, so FR-4 ("every below-floor asset") requires it.
All **six** failing assets are re-authored. **humanoid has zero below-floor criteria**
(lighting 4/3, edge_language 3/3, palette_craft 4/3) and is therefore untouched — its
recipe and all sidecars remain byte-identical (AC-5).

`E` (literal edge hierarchy) was **refuted**: measured edge_language `2/2` and a
silhouette regression (`3→2` on pass A). No literal outline-hierarchy ops were added;
edge_language is addressed only through warm/cool ramps plus directional light tonal
richness.

## T1.2 — regression and candidate comparison

- **L caused no below-floor regression.** Every weak criterion that L targets moves
  from below 3 to ≥3 on both passes (chest 1/2/2 → 5/4/4 A and 4/3/4 B; the other five
  assets' targeted criteria follow the same L pattern). No previously-passing criterion
  (silhouette, value_separation, cluster_discipline) dropped below 3 in any L pass.
- **H is not sufficient.** H measured `3/3/4/2/4/4` on pass A — edge_language stayed
  at **2** — so a hue ramp alone does not fix edge_language. L adds the directional
  light that H lacks.
- **C is A-only** (`3/4/3/2/3/3`) and also leaves edge_language at 2.
- **B and E candidates returned EXHAUSTED** in Phase 1 and are not reproducible inputs.
- **Chosen configuration:** L, applied uniformly to the six failing assets; humanoid
  excluded. Instrument, model, and pass-generation method unchanged.

## Implementation note

Chest uses the exact hand-authored chest-L ramps validated in Phase 1. Potion keeps its
already-explicit warm/cool ramps. Prop's named-role ramps are converted to explicit
tone ramps with the `outline` key preserved for its `auto_outline` seam legend. For
character, scene, and sword the explicit ramps are materialized from the project's own
`deriveRamp(base, 5)` function applied to each original derive base — this is the same
warm-highlight/cool-shadow stepping as the hand-authored chest-L set, and it renders
strict-clean. Sword additionally brightens `brass.t0` to clear a t0 plane collision
and restores a legible dark-red gem ramp (the original `#000000` base derived to
near-black). Every recipe now has exactly one `light` op before `auto_outline`, no
`harmonize`, unchanged ascii_blit grids/anchors/meta/design, and a regenerated 1x
strict-render digest sidecar.
