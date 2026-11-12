# Phase 7 — Benchmarks and Rubric: verification

Branch `feat/20261113-static-art-quality`, phase base `d53b74e`.
Status: **partial** — every asset and the harness shipped; AC-20 is **blocked** on the
primary's two vision passes (`test/art/scores.json` does not exist yet).

## What shipped

| commit | subject |
| --- | --- |
| `c8940cf` | test(art): author character, prop and scene on the parts surface |
| `5cf3685` | test(art): re-author potion, sword, humanoid and chest with parts and light |
| `4676428` | docs(rubric): define the six criteria and the scoring harness |
| `38d475d` | test(perf): measure a 256x256 scene with parts and a full light pass |
| (this) | docs(conductor): record Phase 7 verification |

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

Each call writes `.conductor/evidence/art/<asset>.png` (the 1× artifact for scoring pass 1)
and `.conductor/evidence/art/<asset>.debug.png` (the debug sheet for pass 2: profile zoom
with grid and coordinates, 1× panel, posterised silhouette, per-part crops). Outputs are
gitignored; the recipes are the committed source.

## Assets

| asset | size | profile | parts | materials | gloss | anchors | calls | ops | findings | cleanup | sha256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `potion` | 16×16 | tiny | 3 | 3 | matte | `cork_top`, `base_pivot` | 4 | 7 | none | none | `8afddb462fd7300abad64fd6a257b55f58c844b0ceaabc0e4db118f10b99004a` |
| `sword` | 32×32 | small | 5 | 4 | metal, gem, cloth | `grip_pivot`, `blade_tip`, `pivot` | 2 | 15 | BANDING 24, CLUSTER_THIN 4 | none | `74e0dfdf34254e6a371b705cadef7f05649da9ed0f3d037f97a386923589f5a5` |
| `humanoid` | 32×32 | small | 11 | 7 | cloth, metal | `foot_origin`, `hand_weapon` | 4 | 22 | BANDING 28, CLUSTER_THIN 9 | strays −2 px | `ec48a91e0d7c836320185581a0ef0fd31744320fefab0578d722a0830a69acee` |
| `chest` | 48×48 | small | 4 | 4 | metal | `lid_pivot` | 3 | 15 | BANDING 35, CLUSTER_THIN 4 | none | `d5f001d645120108425549de835d320d88481d383cf926f435b871f8cf7576da` |
| `character` | 48×128 | medium | 12 | 8 | metal, cloth | `hand`, `foot_origin` | 4 | 28 | BANDING 51, CLUSTER_THIN 11, JAGGY_LINE 1 | strays −2 px | `3ffcb1cf3ae690f0cda05c3a60b2dc1c306a9c6e9bb325a2ba4ff03d11e8fa5f` |
| `prop` | 64×64 | medium | 4 | 4 | metal, gem | `handle_top`, `flame_core`, `base_pivot` | 5 | 11 | BANDING 25, CLUSTER_THIN 4 | none | `a911379a23a3590abf05abf78c6c7aa97918e1e435b2fced568698454b6c4cde` |
| `scene` | 256×256 | large | 6 | 5 | cloth | `well_center`, `roof_apex`, `rope_hook`, `bucket_hook` | 6 | 15 | BANDING 51, CLUSTER_THIN 4, JAGGY_LINE 2 | strays −4 px | `f652466b18b9268d34934189e8d49dee2d872aebfafcebf1772d4cb151646426` |

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
- **3 of 7** run a cleanup op and report what changed (`humanoid` −2 px, `character`
  −2 px, `scene` −4 px, all `strays`); no cleanup op reports `changed 0`
  (`W_CLEANUP_NOOP` would have required removing it — `chest`'s `seal` was removed for
  exactly that reason);
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
PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<model> pnpm exec tsx scripts/rubric.mjs --asset <asset> --pass 1
PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<model> pnpm exec tsx scripts/rubric.mjs --asset <asset> --pass 2 \
  --artifact .conductor/evidence/art/<asset>.debug.png
```

Blocked reason: **awaiting the primary's vision passes**. The script has been exercised
in this phase only to the extent of its argument and validation paths; it makes no
network call without `PX_RUBRIC_API_KEY` and exits `2` with a clear message in that case.

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
| `pnpm vitest run --coverage` | exit 0 — statements **95.54 %**, branches **86.41 %**, functions **98.40 %**, lines **95.36 %** (threshold 80) |

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
- No new dependency, no threshold lowered, no coverage exclude widened, no `v8 ignore`,
  no lint rule weakened. `PILLOW_SHADE` and `VALUE_COLLISION` were fixed by changing the
  art (part materials split, `form: round` → `bevel`, casts removed), never by
  suppressing the rule.

## Honest self-assessment

The assets are better than the Phase-1 benchmarks but they are not uniformly good, and
the design notes record where they fall short rather than smoothing it over:

- **`scene`** — the stone joints vanish at 1×, so the well reads as smooth concrete, and
  the dirt apron is nearly black and reads as a hole in the frame. The strongest asset
  for silhouette, the weakest for material read.
- **`character`** — reads as a paladin at 1×, but the legs are 46 rows against a 34-row
  helm, the shield is a plain oval with a 1 px rim, and the sword's grip is hidden behind
  its crossguard.
- **`chest`** — the bright iron straps form a "U" that out-shouts the wood; the lock reads
  as a mail slot; the grain is invisible at 1×.
- **`humanoid`** — limbs are attached blocks, the torso is a dark mass, and the sword
  floats beside the hand rather than being gripped.
- **`prop`** — the ring merges with the cap at 1× (it looks set down, not hanging), and
  the glass panes are flat with no reflection.
- **`sword`** — the guard hides the grip; the curve could be stronger.
- **`potion`** — 11 px of body leaves the liquid as one dark mass with a single lit
  surface line.

Worst of the seven, in this author's judgement: **`character`** — it is legible but
stiff, and its proportions are the ones a scorer is most likely to mark down on
`silhouette` and `edge_language`. Best: **`prop`**, where the metal gloss and the
dark-chamber/bright-flame contrast carry the read at every zoom.
