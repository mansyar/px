# Phase 1 diagnostic — frozen-instrument craft levers on chest

- Track: `20261117-craft-application` (Craft Application)
- Phase: 1 — Frozen-instrument craft diagnostic (chest)
- Date: 2026-11-17
- Branch: `feat/20261117-craft-application`
- Phase base: `cd43a51f2a6f716f844847616839c046f9dcf713`
- Instrument: `gemini-4-hydrogen` (frozen; NFR-1). No other instrument was used or substituted.
- Status: **A/B artifacts complete; credentialed scoring PENDING PRIMARY** (NFR-5).

## 1. Baseline and the application gap

`test/art/diagnostic/chest/chest-baseline.px.json` is a byte-identical copy of
`test/art/v2/chest/chest.px.json` (verified with `git diff --no-index --stat`, no output).
Its 1x render SHA-256 is `0f5976fc1352e2d00983f662010166d85dec4f37b9f939f9974f69221191c55a`,
exactly the canonical `chest.sha256` in `test/art/scores.json` — golden hash unchanged (FR-7).

Canonical verdict (do not modify): fail, mean 3.25, floor 3.0, 22 below-floor criterion
scores. Chest is the worst asset at 2.50: `lighting 1/1`, `edge_language 2/2`,
`palette_craft 2/2`, with `silhouette 3/3`, `value_separation 4/4`, `cluster_discipline 4/4`.

Root cause established during this phase: the baseline's `harmonize` op re-quantizes every
part to a **single tone** (`bands.t2` 314 px, `body.t3` 440 px, `lid.t1` 282 px, `lock.t3`
72 px) and the flat `derive` lid (`base #000000`, stops 5) erases the remaining hue/value
steps. This is an application gap, not an instrument capability gap. All four candidates
therefore keep `design.values` and the ascii grids **unchanged** (the grids already encode
the declared value plan: light lid, mid bands, dark body/lock) and drop only the
flattening `harmonize` op so the authored ramps survive.

Style file `test/art/diagnostic/chest/px.style.json` was already present and unchanged.
`test/art/diagnostic/chest/make-candidates.mjs` is a deterministic, dependency-free
generator for L/E/C from the authored H recipe (no generated asset is edited by hand).

## 2. Candidates (FR-1)

Shared by H/L/E/C: schema version `1.3`, `meta` 48x48 binary, `design.light = "top-left"`,
`design.hierarchy = [lid, body, bands, lock]`, `design.values =
{bands:3, body:2, lid:4, lock:2}`, materials/parts/anchors, and the four verbatim
48x48 `ascii_blit` ops with their legends. No new dependencies; every recipe is ~400 lines
and 4-7 ops, far below the ~2000-op ceiling (NFR-3).

### Baseline — control

Ops: `ascii_blit` x4 → `auto_outline` (`4-way`, `outer`, `ink.outline`) → `harmonize`.
Palette is the v2 original, including the flat `lid.derive #000000` and derived
bands/body/lock/gorget.

### H — hue-ramp palette

Explicit 5-stop ramps replace the four `derive` families. Shadows step cool, highlights
step warm, with even L* progression; `gorget` stays derived and `ink.outline #0b0a10`
is unchanged. No `light` op, no `harmonize`.

| family | t0 (lightest / warm) | t1 | t2 | t3 | t4 (darkest / cool) |
|---|---|---|---|---|---|
| bands (metal) | `#e6f0f2` | `#c4d9e0` | `#b5ccd8` | `#6f8faf` | `#48658c` |
| body (wood) | `#e0b25e` | `#b8762c` | `#8a4a1c` | `#5a2a12` | `#2a1208` |
| lid (wood, hero) | `#fff2c8` | `#f0cf7d` | `#d9a94e` | `#a87028` | `#6d4014` |
| lock (gold) | `#f7e39a` | `#ecca55` | `#ce9d26` | `#6b420c` | `#1c1418` |

L* steps are monotonic and roughly even (bands 94→82→69→54→39, body 79→59→39→23→12,
lid 97→83→69→51→31, lock 92→81→66→47→25), and the visible base tones satisfy the
style guide's 0.06 luminance separation and 1.5:1 silhouette contrast. Ops:
`ascii_blit` x4 → `auto_outline` (original params). `design.edges` unchanged.

### L — warm-cool directional light

Same explicit warm/cool ramps and ops as H, plus exactly one engine light op inserted
after the four blits (before the original `auto_outline`):

```json
{"op":"light","angle":"top-left","form":"bevel","ao":true,"cast":null,"cast_offset":2,"rim":"edge"}
```

This is a **single** direction consistent with `design.light = "top-left"`: light travels
from the top-left, warm role tones (`t0`/`t1`) land on top/left-facing surfaces, cool role
tones (`t3`/`t4`) on bottom/right-facing surfaces. No second source, no cast shadow.
No `harmonize`.

### E — edge hierarchy

Same explicit ramps as H, no light op. `design.edges` becomes
`{silhouette:"outline", material:"shadow", detail:"highlight"}`, `ink` gains explicit
roles `{outline:"#0b0a10", shadow:"#3a4654", highlight:"#e8ecf0"}`, and the original
`auto_outline` is replaced by a tuned pass:

```json
{"op":"auto_outline","mode":"4-way","where":"outer","color":"ink.outline","seam":"ink.shadow"}
```

Three distinct edge states: dark silhouette ring (`ink.outline`), mid-tone material
seams between parts (`ink.shadow`), and the art's own interior tone steps left untouched
(no black interior outline — detail stays at the part's highlight/shadow roles).
Goal is a clean **3**, not a forced 4. A previously attempted `where:"inner"` detail
ring was removed because it overwrote every transparent-facing edge pixel and produced
four `PILLOW_SHADE` warnings; the final recipe is strict-clean.

### C — combination

H's ramps + L's directional light + E's hierarchy. The light op uses `rim:"none"`
(the hierarchy now owns the edges, and a second rim pass double-counted edge shadows
as `PILLOW_SHADE`):

```json
{"op":"light","angle":"top-left","form":"bevel","ao":true,"cast":null,"cast_offset":2,"rim":"none"}
{"op":"auto_outline","mode":"4-way","where":"outer","color":"ink.outline","seam":"ink.shadow"}
```

`design.edges` and `ink` roles are the same as E. Strict-clean.

## 3. Faithful A/B artifacts (FR-2, NFR-6)

All binaries live in the gitignored `.conductor/evidence/craft-application/`.
Pass A = NN-upscaled 8x view; pass B = `--debug` sheet (grid, colour preview, silhouette,
per-part previews). Every render below exited 0 with `--strict` (no blocking finding;
only `BANDING`/`CLUSTER_THIN` at `info`, plus the inherited no-op `auto_outline` warning
on baseline/H/L).

| View | A (8x) | B (debug) |
|---|---|---|
| baseline | `chest-baseline.8x.png` (384x384) | `chest-baseline.debug.png` (462x633) |
| H | `chest-H.8x.png` (384x384) | `chest-H.debug.png` (462x633) |
| L | `chest-L.8x.png` (384x384) | `chest-L.debug.png` (462x633) |
| E | `chest-E.8x.png` (384x384) | `chest-E.debug.png` (462x633) |
| C | `chest-C.8x.png` (384x384) | `chest-C.debug.png` (462x633) |

### Render digests (SHA-256, 1x PNG / debug sheet)

| Recipe | 1x render | Debug sheet |
|---|---|---|
| baseline | `0f5976fc1352e2d00983f662010166d85dec4f37b9f939f9974f69221191c55a` | `a4ec58a4f352b1c1b42b21fc7dce9671e8d1ce6525edbee1349fdf0e8896d141` |
| H | `7dbabcea2370dfa88ada92aa3437dc8556e9a4f9565e7b0cc8236b53c543e25a` | `bf6348d609b269ffed2de9f4d803f83ef0db2399008812eaa536897e43e53aa4` |
| L | `1bca726e94fa32cf9830a1234bfc631e8054eb649170fb815b1cde4019750354` | `8faeb76fa6ec2c37bedde3fb8cd334c164d72b272d912d41f95b7275842a4d01` |
| E | `5b20c43a58dacd1e9857d4fd50677dced0ffda66688768d7700f82b4c120cf73` | `0a9106479027b0590326da5063d1b4ab0e5f362accbeb8c9c8083913b73daebb` |
| C | `b7f09c4967b42b802d031b0bb2d460cd21aee8a15140aca5109dffa7a6023235` | `a4aec891316dca5816b392026bd9c70011328ada204aa69f05e1f3c761b519ac` |

Upgrades were made with `pnpm exec tsx scripts/upscale.mjs <png> --out <...>.8x.png --factor 8`
(factor 8, 384x384 output). The baseline 1x digest is the canonical golden hash; no
golden file or `scores.json` was touched.

## 4. Scoring table (FR-3) — PENDING PRIMARY

Credentialed scoring is primary-only (NFR-5). The subagent did **not** run
`node scripts/rubric.mjs` (shell denies `node`, no credential; a permission denial is not
retryable). All ten exact commands are listed in section 6. When the primary appends the
stdout, replace each `PENDING PRIMARY SCORING` cell with six integer scores in criterion
order `silhouette / value_separation / lighting / edge_language / cluster_discipline /
palette_craft`, compute deltas against baseline, and fill the lever verdict.

| Candidate | Lever | Scores A / B | Δ vs baseline (A / B) | Clears >=3 on both passes? |
|---|---|---|---|---|
| baseline | control | PENDING PRIMARY SCORING | — | — |
| H | hue-ramp palette | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING |
| L | warm-cool directional light | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING |
| E | edge hierarchy | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING |
| C | combined | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING | PENDING PRIMARY SCORING |

Baseline reference (already recorded, unchanged): `3/4/1/2/4/2` on both passes.

## 5. Lever verdict (FR-6) — PENDING PRIMARY

Hypotheses only, carried over from the ceiling probe on a **different** instrument
(`gemini-3.5-flash-lite`): hue-ramp reached `palette_craft 4/4`; warm-cool lighting
reached `lighting 4/3` (not validated); edge treatments capped at `3/3` (not validated).
They are deliberately recorded as hypotheses and must not be reported as results here.

Fill after scoring:

- H moved `palette_craft`: __ ; lighting: __ ; edge_language: __
- L moved `lighting`: __ ; palette_craft: __ ; edge_language: __
- E moved `edge_language`: __ ; lighting: __ ; palette_craft: __
- C moved each weak criterion: __
- Validated levers (all three weak criteria >=3 on **both** passes, floor applies per
  asset/pass): __
- Not validated / reasons: __
- Honest verdict for the publishable gate (mean >=3.5 and no criterion <3): __

A lever that clears 3 on one pass only is **not** validated. An `edge_language` result of
exactly 3 is acceptable. No pass may be forced.

## 6. Exact credentialed-scoring commands for the primary (NFR-5)

Each `--dry-run` writes nothing. Run with the frozen instrument credential (never print
the credential).

```sh
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-baseline.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic baseline A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-baseline.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic baseline B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-H.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic H A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-H.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic H B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-L.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic L A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-L.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic L B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-E.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic E A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-E.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic E B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-C.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic C A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-C.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic C B"
```

Expected stdout for each: six integer criterion scores in the order above; no file is
written under `--dry-run`.
