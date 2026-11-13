# Rubric ceiling probe

- Model: `gemini-3.5-flash-lite`
- Base asset: `test/art/chest/chest.px.json`
- Generated: 2026-11-13T13:15:16.400Z
- Calls: 20 attempted, 8 rejected

Nine candidates fixed before the first call and addressed by recipe hash. A
criterion counts as reached only when a candidate scores at least 4 on both
passes for that criterion.

| criterion | candidate | target A/B | reached |
| --- | --- | --- | --- |
| `lighting` | `warm-cool` | 4/3 | no |
| `lighting` | `dither-band` | 3/3 | no |
| `lighting` | `engine-deband` | 3/2 | no |
| `edge_language` | `selective` | 3/3 | no |
| `edge_language` | `hue-shift` | 3/3 | no |
| `edge_language` | `hierarchy` | 3/3 | no |
| `palette_craft` | `hue-ramp` | 4/4 | **yes** |
| `palette_craft` | `accent` | 3/4 | no |
| `palette_craft` | `nonlinear` | 3/3 | no |

## Verdicts

- **lighting:** not reached (none of three)
- **edge_language:** not reached (none of three)
- **palette_craft:** ceiling reached (hue-ramp)

## Rationales

### lighting / warm-cool

Intent: one light direction, with the shadow ramp pulled toward blue and the highlight ramp toward yellow

- **pass A:** Light consistently originates from the top-left, clearly defining the curved lid and flat front faces with appropriate highlights and shadows.
- **pass B:** The light direction is generally consistent from top-left, but some shading on the metal straps and wood clashes slightly in form interpretation.

### lighting / dither-band

Intent: a two-tone surface whose band boundary is dithered, so the falloff reads as a gradient at 1x

- **pass A:** The light source is mostly consistent from the top-left, but some shading on the metal straps feels ambiguous.
- **pass B:** The shading mostly implies a top-down or ambient light source, but the diagonals on the lower body confuse the primary direction.

### lighting / engine-deband

Intent: engine-banded falloff that the engine itself dithers, so the band edge is not a hard line

- **pass A:** The lighting source is generally consistent, but diagonal light bands create some conflicting shading across the masses.
- **pass B:** The lighting is inconsistent, featuring conflicting diagonal shading and overlapping highlights that contradict a single directional light source.

### edge_language / selective

Intent: a selective outline: dark where the form turns away, light where it faces the light

- **pass A:** The outline is generally consistent, but internal structural edges sometimes blur into the surrounding shapes.
- **pass B:** The outer silhouette and structural bands are readable, but some inner detail edges blend into the surface textures.

### edge_language / hue-shift

Intent: an outline tinted toward the material's own hue instead of black, so edges belong to the surface

- **pass A:** The outline is consistently dark, but inner detail edges sometimes blur or lack deliberate distinction from the main silhouette.
- **pass B:** The outline is generally clean, but internal detail edges sometimes blend with the outer boundary treatment.

### edge_language / hierarchy

Intent: three edge treatments: dark silhouette, mid-tone detail lines, and no outline inside a mass

- **pass A:** The outer silhouette uses a consistent dark outline, but internal metal straps and wood boundaries lack a distinct treatment hierarchy.
- **pass B:** The outer silhouette has a consistent outline, but internal detail edges sometimes blend into the surface textures.

### palette_craft / hue-ramp

Intent: ramps that step in hue as well as value: shadows run cool, highlights run warm

- **pass A:** The palette is cohesive and thematic with good contrast between wood, metal, and gold, though ramps could step slightly more evenly.
- **pass B:** The wood browns, grey-blue metal, and golden lock form a coherent palette with well-chosen hues for each material.

### palette_craft / accent

Intent: one saturated accent against quiet surroundings, so the palette has a focal point

- **pass A:** The color palette uses appropriate wood and metal tones, but the value steps and hue shifts could be more harmonious.
- **pass B:** The color ramps for wood, metal, and gold are coherent and purposeful, though value steps could be slightly smoother in places.

### palette_craft / nonlinear

Intent: a ramp weighted toward the darks, so form reads with few tones and the highlight stays small

- **pass A:** The colors are functional and recognizable for wood and metal, but the ramps could step more evenly.
- **pass B:** The color palette is coherent and functional for a wooden chest, but the ramps step somewhat unevenly across the wood and metal surfaces.

