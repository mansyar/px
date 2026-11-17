# chest — re-authored design note (v2)

**Subject:** a treasure chest at 48×48: arched lid, banded body and a brass lock plate.

**Light:** one direction, `top-left`, in `design.light`. The lid ramp's light tones sit along
the upper-left curve and the body ramp darkens toward the lower-right, so the whole object
shares one light source.

**Hero part:** `lid`. Its arch is the first shape the eye reads at 48×48 and it carries the
widest tonal sweep; 4 distinct tones on the lid against 2–3 on the body, bands and lock keep
the hierarchy unambiguous.

**Value plan (part → distinct tones):** `lid` 4, `body` 2, `bands` 3, `lock` 2. These are the
four parts actually painted, in the hierarchy's visual dominance order with the hero first.

**Edge treatment:** silhouette `outline`, material `none`, detail `none`. A single dark outer
border keeps the chest separate from a busy background; the band seams and lock bevel are
left to their authored tones rather than being outlined a second time.

**Facing:** no part was re-faced. Testing `lid = top` moved the lid onto a plane beside the
body ramp and triggered a value collision; the original plane assignment was kept so the
passing asset is not traded for a regression.

**Self-assessment:** the weakest visible aspect is the lock — its two-tone brass plate is only
a few pixels wide and reads as a bright square rather than a hasp. A harmonize pass was added
because it stayed strict-clean and made the declared value plan explicit across the four
parts.
