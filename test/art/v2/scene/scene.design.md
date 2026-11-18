# scene — re-authored design note (v2)

**Subject:** a wishing well at 256×256, roof and bucket over an open water surface.

**Light:** one direction, `top-left`, in `design.light`. The existing `light` pass (bevel, AO,
rim, no second light) shapes the roof, wall and fittings from that one corner. The gable uses
two related warm ramps, but neither roof plane declares a `facing`, so the light pass does not
flatten either slope to a single plane role; the authored tone detail survives on both.

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

**Facing:** no part declares a plane facing. The old opposing `left` / `right` roof facings
made plane shading flatten each slope to a single role, which read as a flat roof split down
the ridge by conflicting shadow directions. With both removed, the shared top-left light pass
shapes the two slopes from one direction and keeps their authored roofing detail.

**Self-assessment:** the weakest visible aspect is the rope at large sizes — its hatch
texture is sparse enough that the eye reads a dashed line rather than a twisted cord. The
wall courses and stone mottle survive the profile's `minCluster`, but the rope does not.
