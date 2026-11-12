# sword — 32×32 curved sabre

**Profile** small (32 px). **Parts** 5. **Materials** 4. **Light** top-left, `bevel`
form, AO on, no cast, edge rim.

## Silhouette intent

A sabre, not a straight sword: the blade's spine sweeps from (21–22, y2) down to
(15–18, y19), so every one or two rows the left edge shifts and the right edge stays
almost vertical. At 1× the curve is the identifying feature — the crossguard, the
offset grip and the pommel all sit under the blade's lower third so nothing competes
with the sweep.

## Materials and gloss

| family | role | hex | gloss |
| --- | --- | --- | --- |
| `steel` | ramp | outline `#2a3442`, shadow `#5a6a80`, base `#c3cfdd`, highlight `#f4f9ff` | metal |
| `brass` | ramp | outline `#3a2a10`, shadow `#8a5a1e`, base `#d9a93c`, highlight `#ffe08a` | metal |
| `leather` | ramp | outline `#120c08`, shadow `#2a1a10`, base `#4a3220`, highlight `#7a5a3c` | matte |
| `ruby` | ramp | outline `#24080e`, shadow `#5c0f1e`, base `#b32338`, highlight `#ff6f7a` | gem |

The palettes are explicit 4-role ramps rather than synthesised tone ramps: the steel's
`#f4f9ff` highlight is a deliberately cold specular and the leather's `#7a5a3c` stops the
grip from reading as the same material as the brass. `metal` gloss gives the blade one
hard diagonal specular band with no diffuse gradient; `gem` gives the ruby a bright core.

## Light

Top-left again. The bevel puts `steel.shadow` on the blade's right edge and the guard's
bottom row, and `steel.highlight` on the spine. `cast` is `null` on purpose: the guard
casting onto its own face produced `PILLOW_SHADE` (three shadowed edges on one part),
and a 32 px sabre gains nothing from a ground shadow it does not have.

## Anchors

- `grip_pivot` (15, 25) — centre of the hand wrap; parent a character's hand here.
- `blade_tip` (22, 3) — the point; VFX and trail geometry attach here.
- `pivot` (16, 16) — canvas centre, guarded for generic icon transforms.

## Cleanup

None. `strays` at this profile has a minimum of 2 px and the sabre's smallest cluster is
the 2×2 ruby, so the pass would be a no-op (`W_CLEANUP_NOOP`).

## Findings

`--strict` clean: 24 `info` `BANDING`, 4 `info` `CLUSTER_THIN`. The banding is the
detector counting the 1 px outline runs down a near-vertical blade — an upright sprite
cannot avoid vertical runs, and the runs stop where the sabre curves.

## Known weaknesses

The grip is five rows long but the crossguard's 3-row block covers its top two, so the
wrap detail is mostly hidden at 1×; the sword reads as "blade + gold bar". The pommel
highlight row is the only thing telling the bottom of the hilt from the guard. A second
pass would shorten the guard to two rows and move the ruby to the pommel so the gem is
visible from the side the character holds it.
