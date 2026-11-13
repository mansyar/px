# potion — 16×16 healing flask

**Profile** tiny (16 px). **Parts** 3. **Materials** 3. **Light** top-left, `round` form,
AO on, cast from `cork`, edge rim.

## Silhouette intent

A hand-held flask that reads at 1×: a knobbly cork wedge on top, a narrow neck, and a
round-bellied glass body filled with dark red brew. The cork is twice as wide as the
neck so the top of the sprite never reads as a bottle-cap blob, and the body's widest
point sits two rows above the base so the base is a flat plinth rather than a ball.

## Materials and gloss

| family | role | hex | gloss |
| --- | --- | --- | --- |
| `cork` | base | `#584331` (t1) | matte |
| `glass` | base | `#8fd6cc` (t2) | matte |
| `brew` | base | `#5a0e28` (t2) | matte |

All three families are synthesised 4-step OKLCH ramps (`t0` light → `t3` dark); the art
addresses `tN` slots directly. `ink` is a single-colour flat family used by the outer
outline pass. Gloss is `matte` everywhere: at 16 px a `gem` core on the liquid produced
a muddy brown without a readable specular, so the liquid keeps hard matte banding and
the glass carries the only highlight (its `t0` rim on the light side).

## Light

One direction for the whole sprite: top-left. The cork's left cheek and the glass's
upper-left rim take the highlight, the shadow lands bottom-right, and the cork casts a
1 px shadow onto the neck. `auto_outline` runs **after** `light` so the outline keeps the
ink family instead of inheriting the neighbouring part's shade.

## Anchors

- `cork_top` (8, 2) — where a pour/cork-pop effect or a tooltip bubble attaches.
- `base_pivot` (8, 13) — the flask's resting point; use it for inventory placement and
  for a bobbing idle animation.

## Cleanup

None. A 16 px sprite has no cluster room for `strays` (the profile minimum is 1, so a
cleanup pass would be a guaranteed no-op and is therefore omitted rather than left in
the recipe to raise `W_CLEANUP_NOOP`).

## Findings

`--strict` render is clean: no errors, no warnings.

*(Reviewed 2026-11-13: an earlier draft of this note recorded an `info` `W_PART_OVERWRITE`
naming op 5 (`light`) for repainting glass pixels. That warning was a defect — the `light`
pass was writing the caster's owner into pixels another part owned, so a cast shadow read
as a part repaint. Phase R4 fixed the cause, so the finding no longer exists and the note
now records none.)*

## Known weaknesses

The body is only 11 px wide once the outline lands, so the brew reads as a single dark
mass with one lit surface line rather than a liquid with volume. The cork is a flat
three-row wedge and its grain is one `t0` pixel pair — legible at 8×, invisible at 1×.
If this asset were re-authored I would give the belly one more row and spend the extra
pixel on a glass `t0` glint opposite the light.
