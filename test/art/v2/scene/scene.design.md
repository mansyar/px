# scene — re-authored design note (v2)

**Subject:** a wishing well at 256×256, roof and bucket over an open water surface.

**Light:** one direction, `top-left`, in `design.light`. The gable is the deliberate exception:
its two planes are papered with `roof_left` and `roof_right` ramps whose base tones differ,
so the left plane reads as lit and the right as turned away from the same single light.

**Hero part:** `wall`. It is the largest continuous cluster in the 256px frame and anchors
the bucket, rim and water; giving it the deepest value plan (4 tones) keeps the well body
dominant over the roof and grass.

**Value plan (part → distinct tones):** `wall` 4, `roof_left` 3, `roof_right` 2, `ground` 2,
`water` 2, `stone` 2, `post` 3, `beam` 3, `bucket` 2, `rim` 2, `rope` 3, `grass` 3. The
hierarchy lists these twelve painted parts in visual dominance order, hero first.

**Edge treatment:** silhouette `highlight`, material `none`, detail `none`. At 256px a dark
silhouette tends to look like a hard sticker edge, so the lit rim of the derived ramps is
used for the outer boundary; the masonry courses and roof seam keep their authored tones
without an added outline.

**Facing:** `roof_left` faces `left`, `roof_right` faces `right`, `ground` faces `top` in its
recipe slot; only the two gable planes were re-faced here because the ground face change
created a value collision against the neighbouring dirt ramp.

**Self-assessment:** the weakest visible aspect is the rope at large sizes — its hatch
texture is sparse enough that the eye reads a dashed line rather than a twisted cord. The
wall courses and stone mottle survive the profile's `minCluster`, but the rope does not.
