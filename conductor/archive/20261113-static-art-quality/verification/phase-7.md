# Phase 7 — Benchmarks and Rubric: verification

Branch `feat/20261113-static-art-quality`, phase base `d53b74e`.
Status: **partial** — every asset and the harness shipped; AC-20 is **blocked** on the
primary's two vision passes (`test/art/scores.json` does not exist yet).

Round 2 revised four assets (humanoid, character, scene, sword) against the rubric scores
the primary recorded, and fixed a defect in the scoring method that made pass 1 measure
the resampler rather than the art.

## What shipped

| commit | subject |
| --- | --- |
| `c8940cf` | test(art): author character, prop and scene on the parts surface |
| `5cf3685` | test(art): re-author potion, sword, humanoid and chest with parts and light |
| `4676428` | docs(rubric): define the six criteria and the scoring harness |
| `38d475d` | test(perf): measure a 256x256 scene with parts and a full light pass |
| `737cde5` | docs(conductor): record Phase 7 verification and the blocked AC-20 |
| `09f0edc` | fix(art): revise humanoid, character, scene and sword against the rubric |
| `31421af` | docs(rubric): score both passes from a faithful nearest-neighbour view |
| `36ff374` | fix(art): keep the character's cloth dither on the shadow rim |
| (this) | docs(conductor): record the Phase 7 round-2 art revision |

## Reproduce the images

Every asset is rendered from its committed recipe, at 1× on the neutral `#808080`
backdrop, with the debug sheet written beside it by the same call:

```sh
pnpm exec tsx src/cli.ts render --file test/art/potion/potion.px.json --out .conductor/evidence/art/potion.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/sword/sword.px.json --out .conductor/evidence/art/sword.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/humanoid/humanoid.px.json --out .conductor/evidence/art/humanoid.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/chest/chest.px.json --out .conductor/evidence/art/chest.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/character/character.px.json --out .conductor/evidence/art/character.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/prop/prop.px.json --out .conductor/evidence/art/prop.png --debug --strict
pnpm exec tsx src/cli.ts render --file test/art/scene/scene.px.json --out .conductor/evidence/art/scene.png --debug --strict
```

Each call writes `.conductor/evidence/art/<asset>.png` and `.conductor/evidence/art/<asset>.debug.png`
(the debug sheet: profile zoom with grid and coordinates, 1× panel, posterised silhouette,
per-part crops). Outputs are gitignored; the recipes are the committed source.

Scoring pass 1 needs a faithful enlargement, not the raw 1× file (a 16–48 px PNG is
resampled by whatever views it, which is what made round 1's pass 1 measure the resampler):

```sh
pnpm exec tsx scripts/upscale.mjs .conductor/evidence/art/<asset>.png
```

That writes `.conductor/evidence/art/<asset>.8x.png` (nearest neighbour, no filtering) for
each of the seven assets. Pass 2 scores the debug sheet from the same recipe.

## Assets

| asset | size | profile | parts | materials | gloss | anchors | calls | ops | findings | cleanup | sha256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `potion` | 16×16 | tiny | 3 | 3 | matte | `cork_top`, `base_pivot` | 4 | 7 | none | none | `8afddb462fd7300abad64fd6a257b55f58c844b0ceaabc0e4db118f10b99004a` |
| `sword` | 32×32 | small | 5 | 4 | metal, gem, cloth | `grip_pivot`, `blade_tip`, `pivot` | 5 | 21 | BANDING 8, CLUSTER_THIN 5 | none | `e049713712b02e5c21a3d43e28e41c63a7ed96d091e466fa370fb440dd71599e` |
| `humanoid` | 32×32 | small | 11 | 7 | cloth, metal | `foot_origin`, `hand_weapon` | 4 | 42 | BANDING 24, CLUSTER_THIN 10 | deband −15 px | `9395073a13bbe91d728b641156e3df7ac7e661926168c94efe2608160734fb9e` |
| `chest` | 48×48 | small | 4 | 4 | metal | `lid_pivot` | 3 | 15 | BANDING 35, CLUSTER_THIN 4 | none | `d5f001d645120108425549de835d320d88481d383cf926f435b871f8cf7576da` |
| `character` | 48×128 | medium | 12 | 8 | metal, cloth | `hand`, `foot_origin` | 4 | 41 | BANDING 45, CLUSTER_THIN 12, JAGGY_LINE 1 | deband −56 px | `77bec28003d7b3e9f4f69447ff9e1c868e7581a8de358d5b3622af20fb60aa1e` |
| `prop` | 64×64 | medium | 4 | 4 | metal, gem | `handle_top`, `flame_core`, `base_pivot` | 5 | 11 | BANDING 25, CLUSTER_THIN 4 | none | `a911379a23a3590abf05abf78c6c7aa97918e1e435b2fced568698454b6c4cde` |
| `scene` | 256×256 | large | 6 | 5 | cloth | `well_center`, `roof_apex`, `rope_hook`, `bucket_hook` | 6 | 23 | BANDING 51, CLUSTER_THIN 6, JAGGY_LINE 2 | deband −1299 px | `f83ca849ea773ebfe5a4f6bb7c1b2bd43e0b7e7b804c6b7192d1636f70804410` |

Findings are exactly what `render --strict` reported: **no error and no warning on any
asset**, only `info`. `BANDING` sits at the 50-per-code cap on the two tallest/widest
assets, which is the detector counting straight outline runs on a 128-row sprite and a
256-row wall — the shape's own silhouette edges.

Authoring rules from the brief, checked mechanically:

- every asset declares parts (3–12) and ≥2 materials (3–8);
- **6 of 7** use a non-matte gloss (metal/gem/cloth); `prop` is one of them and is the
  asset required to carry `metal`;
- one light direction per asset (`top-left` everywhere), stated in each `*.design.md`;
- no `set_pixels` op carries more than 10 % of the painted area — detail comes from
  `ascii_blit` grids in all seven assets (one blit per part/colour pair), and the
  `set_pixels` ops are accents and highlights only;
- **3 of 7** run a cleanup op and report what changed (`humanoid` −15 px, `character`
  −146 px, `scene` −1299 px, all `deband`); no cleanup op reports `changed 0`
  (`W_CLEANUP_NOOP` would have required removing it — `chest`'s `seal` was removed for
  exactly that reason, and round 2 replaced `scene`'s `strays` with `deband` when the
  wider masonry left no stray cluster small enough to erase);
- call budget: max **6** of `MAX_CALLS_NEW = 20`. The transcripts record the real
  finishing calls per asset (`anchor…`, `validate`, `render --debug --strict`). They are
  not replayable from `init`: no CLI verb declares `parts` (Phases 1–6 established that),
  and `init --palette` can express either a flat colour list or one 4-role ramp, not the
  per-family explicit-role palettes these assets use. The full recipe is the committed
  artifact; the transcript is the command log that produced the digest.

## Rubric (AC-20): blocked

`scripts/rubric.mjs` and `docs/rubric.md` are in place. `test/art/scores.json` does not
exist, so **no scores were recorded, no `test/art/rubric.test.ts` was added, and no
criterion was invented**. AC-20 stays open until the primary runs two passes per asset:

```sh
# faithful 8x view for pass 1 (a raw 16-48 px PNG is resampled by the viewer)
pnpm exec tsx scripts/upscale.mjs .conductor/evidence/art/<asset>.png

PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<model> pnpm exec tsx scripts/rubric.mjs --asset <asset> --pass 1 \
  --artifact .conductor/evidence/art/<asset>.8x.png
PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<model> pnpm exec tsx scripts/rubric.mjs --asset <asset> --pass 2 \
  --artifact .conductor/evidence/art/<asset>.debug.png
```

Round 2 fixed the protocol defect the first passes exposed: pass 1 scored the raw 1× PNG
and came out systematically lower than pass 2 on the same art (potion 2.67 vs 4.33,
humanoid 2.83 vs 3.33, scene 2.67 vs 4.17), with pass-1 rationales naming "blurry" and
"low-res artifacting". That measures the resampler, not the sprite, and contradicts the
anchors, which are written against the debug sheet's 1× panel. `docs/rubric.md` now
requires a faithful nearest-neighbour view for **both** passes — the plain 8× upscale
via `scripts/upscale.mjs` (a zero-dependency PNG tool: `node:zlib`, its own CRC32, all
five PNG filters, no filtering on enlargement) or the debug sheet — and states that a raw
1× PNG below ~32 px is not valid evidence.

Blocked reason: **awaiting the primary's vision passes**. The script has been exercised
in this phase only to the extent of its argument and validation paths; it makes no
network call without `PX_RUBRIC_API_KEY` and exits `2` with a clear message in that case.

## Round 2: what changed per asset

Scores from the primary's two faithful passes put humanoid (3.42), character (3.67) and
scene (3.58) below the 4.0 bar, with sword (4.08) weakest on `edge_language`. The causes
were fixed in the art, not in the scores or the rules:

- **`humanoid`** — the light stopped at the neck. Every part now obeys top-left: helm dome
  lit across its crown and shadowed on the right cheek and chin, torso with a lit left
  column, base body and shadowed right column plus a full-width seam that separates chest
  from abdomen, sleeves lit inside / shadowed outside, legs with a highlight column and a
  knee band, blade with a lit spine and a dark cutting edge. Interior boundaries now use
  each material's own dark tone; the ink outline is kept for the silhouette only.
  `face` and `belt` were raised to `z: 2` so AO can no longer darken the whole inset (which
  also cleared two `PILLOW_SHADE` warnings), and the visor became a 2 px slit.
- **`character`** — flat parts shaded by row rank (left highlight, middle base, right
  shadow) instead of vertical bands down blade and legs, with the band edges wandering row
  to row so cloth reads as folds; the blade has one lit spine and one shadowed edge; the
  hips gained a tabard skirt (8 rows off the visible leg, so the 46-row stilt read is
  gone); the shield got a bevel rim, a 2 px gold cross and a 3×3 boss so it reads as a
  shield rather than a plain oval; the legs got a knee band and a darker shin.
  `arm_l`, `shield` and `legs` needed their boundary rows re-ranks (the shield rim follows
  ownership, not coordinates) before `PILLOW_SHADE` cleared. The `cloth` dither was
  confined to a two-column shadow rim: at 30 % of the part width the light pass's dither
  read as checkerboard noise at 8×.
- **`scene`** — the roof no longer splits lit/shadowed at the apex: both planes run
  ridge-highlight → base → eave-shadow, so the light direction is single. The wall is real
  masonry: 2 px mortar courses with staggered joints and a lit top edge, spaced to survive
  1× under the `large` profile (`minCluster` 3, `outlineWidth` 2). The apron is a value
  ladder (highlight → base → shadow) with a deterministic pebble scatter, so it reads as
  ground instead of a hole. The bucket was re-shaded as dark staves with two hoops after it
  read as a bright grid.
- **`sword`** — interior boundaries (guard/grip, grip/pommel, gem/guard) no longer carry
  the ink outline; they separate with each material's own darkest tone. The blade is one
  lit spine (`steel.highlight`), a base body and a shadowed cutting edge, the guard was cut
  from 5 rows to 3 so it no longer out-masses the 94 px blade, and the render uses
  `form: "flat"` with AO on so the hand-painted shading survives. The gem sits at `z: 2`
  to match the guard, which is what finally cleared the `PILLOW_SHADE` on the guard.

Sizes, file names, parts, materials, gloss and anchor names are untouched; `calls.json`
files were regenerated as the honest finishing-call log and digests refreshed.

## Performance (NFR-7)

`test/benchmarks/performance.test.ts` gained a second case in the existing suite: 2,000
deterministic LCG ops on 256×256, each tagged to one of four parts with metal / cloth /
gem / matte gloss, followed by `light` with `form: "round"`, `ao: true` and
`cast: "rock"`. One warm-up, five timed runs, asserted on the median.

| case | budget | median | runs |
| --- | --- | --- | --- |
| 2,000 bare ops (unchanged) | 250 ms | **36.2 ms** | 31.1, 34.5, 36.2, 37.2, 38.6 |
| 2,000 ops + parts + full light (new) | 500 ms | **181.1 ms** | 166.7, 178.5, 181.1, 195.2, 210.1 |

Measured under `pnpm vitest run --coverage` with the benchmark file run alone; the new
case is 36 % of its budget. `vitest.config.ts` sets `fileParallelism: false` on the
`benchmarks` project: with the whole suite running in parallel the same case measured
514–576 ms median purely from CPU contention with the seven transcript replays, which
would make the budget a measurement of the runner rather than of the engine. The budget
itself was not raised.

## Verification runs

| command | result |
| --- | --- |
| `pnpm verify` | exit 0 — typecheck, biome (152 files), 74 test files / **682 tests**, build |
| `pnpm vitest run --coverage` | exit 0 — statements **95.57 %**, branches **86.51 %**, functions **98.40 %**, lines **95.40 %** (threshold 80) |

Both ran on the final tree. Coverage improved from the Phase 6 baseline (95.32 / 86.05)
because `test/art/assets.test.ts` pushes every asset recipe through parse, compile,
render, lint and the digest check.

`test/art/assets.test.ts` (new, 28 tests) asserts per asset: the four files exist; the
digest is 64 hex; the recipe parses with no warning; ≥2 parts and ≥2 materials; the
required anchors exist and sit inside the canvas; the transcript is ≤20 calls with
exactly one `--strict` render; and two independent renders reproduce the committed
digest with no error or warning finding.

## No regression

- Hero golden `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`
  unchanged (`test/goldens` project green).
- The four Phase-1 benchmark digests unchanged and their fixtures untouched:
  `potion 9529870a…`, `sword 4050e845…`, `humanoid 03e71701…`, `chest cda5bbed…`.
- `git diff --stat` against the phase base touches `test/benchmarks/` only in
  `performance.test.ts` (the new case); nothing under `test/benchmarks/*/` and nothing
  under `test/goldens/**` changed.
- New files are `test/art/**` and `scripts/` (`rubric.mjs`, and `upscale.mjs` added in
  round 2 for the pass-1 view). Neither is imported by the engine, the CLI or any test;
  the runtime dependency list is unchanged.
- No new dependency, no threshold lowered, no coverage exclude widened, no `v8 ignore`,
  no lint rule weakened. `PILLOW_SHADE` and `VALUE_COLLISION` were fixed by changing the
  art (part materials split, `form: round` → `bevel`, casts removed), never by
  suppressing the rule.

## Honest self-assessment

The assets are better than the Phase-1 benchmarks but they are not uniformly good, and
the design notes record where they fall short rather than smoothing it over. Round 2 fixed
the causes the first scoring passes named; these are the weaknesses that remain:

- **`scene`** — the mortar courses now survive 1×, but the wall is still the strongest
  shape and the weakest texture: at 1× the courses read as two value bands more than as
  blockwork, and the roof's shingles are a plain gradient with no tile edges. The apron
  reads as ground now, though the pebbles are single pixels and vanish at 1×.
- **`character`** — reads as a paladin at 1× and the shield finally looks like a shield,
  but the face is a flat tan band with no features, the boots are plain blocks, and the
  blade's lit spine is one column, so the weapon is a bright line with a gold guard. The
  legs are shorter than round 1 but still long.
- **`chest`** — the bright iron straps form a "U" that out-shouts the wood; the lock reads
  as a mail slot; the grain is invisible at 1×.
- **`humanoid`** — the figure now obeys one light direction from plume to boot, but the
  torso is still a dark mass, the limbs are attached blocks with 1 px gaps, and the sword
  floats beside the hand rather than being gripped.
- **`prop`** — the ring merges with the cap at 1× (it looks set down, not hanging), and
  the glass panes are flat with no reflection.
- **`sword`** — the guard/pommel/grip are separated by each material's own dark tone now,
  but the blade's lit spine against its base is subtle at 1× and the grip is short.
- **`potion`** — 11 px of body leaves the liquid as one dark mass with a single lit
  surface line.

Worst of the seven, in this author's judgement: **`character`** — it is legible and better
shaded than round 1, but at 128 rows every unresolved detail (featureless face, block
boots, one-column spine) is 8× visible, and `lighting` and `edge_language` are the
criteria it is most likely to still lose. Best: **`prop`**, where the metal gloss and the
dark-chamber/bright-flame contrast carry the read at every zoom.
