# Rubric calibration

- Model: `gemini-3.5-flash-lite`
- Generated: 2026-11-13T10:31:28.110Z
- Base asset: `test/art/chest/chest.px.json`
- Calls: 28 attempted, 6 rejected

Each variant pair is scored twice: pass A on the plain 8× upscale, pass B on
the debug sheet. `separates` needs Δ ≥ 2 on the pass mean and Δ ≥ 1 on each
pass. A criterion whose high variant never exceeds 3 is `saturated`: the judge
cannot reach the top of the scale for it, whatever the art does.

| criterion | low A/B | high A/B | Δ | verdict | 4-anchor |
| --- | --- | --- | --- | --- | --- |
| `silhouette` | 1/1 | 5/5 | 4.00 | **separates** | yes |
| `value_separation` | 3/3 | 4/4 | 1.00 | **ambiguous** | yes |
| `lighting` | 1/1 | 3/3 | 2.00 | **separates** | no |
| `edge_language` | 3/3 | 3/3 | 0.00 | **ambiguous** | no |
| `cluster_discipline` | 1/1 | 4/4 | 3.00 | **separates** | yes |
| `palette_craft` | 2/1 | 3/3 | 1.50 | **ambiguous** | no |

## Rationales

### silhouette

- **low pass A:** The shape reads only as a generic rounded rectangle rather than a distinct chest.
- **low pass B:** The shape reads merely as an unidentifiable filled rounded rectangle with no chest-specific features.
- **high pass A:** The blocky, rounded-top shape clearly reads as a chest instantly even without colour.
- **high pass B:** The rounded rectangular shape with its distinct top lid reads immediately as a chest even at 1x resolution.

### value_separation

- **low pass A:** Major regions are separated, but the brown body and blue strap values are quite close in tone.
- **low pass B:** The major parts like the wooden body, straps, and lid separate adequately, but some adjacent color tones are quite close in value.
- **high pass A:** Most structural elements contrast well, though the dark wooden lid blends slightly with the outer outline in places.
- **high pass B:** Most distinct parts like the metal bands, lock, and wooden body separate well, though some adjacent tones are quite close.

### lighting

- **low pass A:** There is no shading or directional light source applied to the asset, leaving it completely flat.
- **low pass B:** There is a complete absence of lighting and shading, rendering the asset entirely flat.
- **high pass A:** The lighting generally comes from the top-left, but the shading on the right side and metal bands feels somewhat flat and inconsistent.
- **high pass B:** The lighting generally indicates a top-down source, but shading across the wooden planks and metal bands is inconsistent in direction and application.

### edge_language

- **low pass A:** The outer silhouette is distinct, but the internal textures rely on scattered single pixels that blur the distinction between material and detail edges.
- **low pass B:** The outer silhouette is well defined, but some internal details and material edges blur into each other without distinct treatment.
- **high pass A:** The outline is consistently dark, but some internal detail edges blend into the silhouette and lack clear material definition.
- **high pass B:** The outer outline is clean and consistent, but some interior material boundaries blend into adjacent pixels without a clear edge treatment.

### cluster_discipline

- **low pass A:** The asset consists almost entirely of isolated single-pixel checkerboard patterns, creating severe pixel confetti.
- **low pass B:** The entire image is composed of alternating single-pixel checks, violating cluster discipline completely with checkerboard noise.
- **high pass A:** Pixels are mostly grouped into solid clusters, with only minor jaggedness along diagonal steps.
- **high pass B:** Pixel clusters are well-formed and avoid single-pixel noise, though some minor color transitions could be cleaner.

### palette_craft

- **low pass A:** The colors create a coherent base, but the heavy checkered dithering results in a flat and noisy overall look.
- **low pass B:** The colours are arranged in harsh alternating checkerboard ramps that fight the form rather than defining material or lighting.
- **high pass A:** The palette is cohesive and thematic for wood and metal, but certain ramps do not step evenly across values.
- **high pass B:** The palette is coherent and fits a wooden chest with metal hardware, but the ramps could step more evenly across values.

