# Phase 5 — Re-authoring: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `6b36e86` · **Head at verification:** `7af131a`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)
**Judge:** the implementing agent, on the owner's instruction, through the agent path in
`docs/rubric.md` — every pass recorded as `scorer: "agent"`, `self_review: true`, with the
verdict carrying `basis: "mixed"` and a caveat naming the self-scored assets.

## What the phase did

Four of the seven assets were re-authored against the criteria the recorded scoring
failed; the three that already passed (potion, chest, prop) were left untouched, which is
what P5.T2.1 asks for when no primitive clearly helps.

| Asset | Change | Why |
| --- | --- | --- |
| humanoid (`9d7509e`) | leg camo from a 1 px checker to a 2×2 lattice on the shadow side; `form: flat → bevel` | `lighting` 2 (symmetric vertical bands), camo speckle near the cluster floor |
| sword (`1bd72c5`) | `ruby` ramp warmed toward the brass; `bevel` | `palette_craft` 3 (the gem's hue shared nothing with the asset) |
| character (`1bd72c5`) | `bevel` | `lighting` 3 from hand-drawn dither fighting the direction |
| scene (`HEAD`) | the gable redrawn: two `polygon` planes, a `stroke` ridge, `texture hatch` shingles at the large profile; the ASCII triangle blocks removed | `lighting` 2, `edge_language` 2, `cluster_discipline` 2 — the staircase and the shingle jitter |

The scene is the only structural redraw: the roof was the one place where the new
primitives replaced hand-placed geometry rather than re-colouring it. `texture` was tried
on the humanoid's camo first and rejected: on a 9×8 part at the small profile its full-fit
rule lands no whole mark, so the op reports `W_CLEANUP_NOOP` and changes nothing. That
finding is recorded in `humanoid.design.md` and constrains where texture is usable.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-13 the weak assets are re-authored with the primitives where they address the failing criterion, and the three passing assets are not regressed | four design notes carry a dated section naming the change and what still does not work; potion, chest and prop recipes and digests are untouched; every asset renders `--strict` with no warning and no error | Pass |
| FR-16 each asset's digest is re-baselined with a reason | `humanoid.sha256`, `sword.sha256`, `character.sha256`, `scene.sha256` updated; the reason is in the commit message and the design note | Pass |

## Diffs are bounded to the change each one makes

`px diff` against the phase base (`6b36e86`):

| Asset | Changed px | Bounds | Reading |
| --- | --- | --- | --- |
| humanoid | 112 | 19×29 at (9,2) | figure-wide: one light pass rebanded every part |
| sword | 25 | 12×12 at (13,19) | the guard, gem and pommel only |
| character | 176 | 27×90 at (12,12) | the figure: bevel bands follow every silhouette |
| scene | 4868 | 161×82 at (47,41) | the gable only; the well, water, bucket and apron are untouched |

## Scores after the re-authoring

Recorded in `test/art/scores.json`; `test/art/rubric.test.ts` recomputes the verdict.

| Asset | Before (A/B) | After (A/B) | Note |
| --- | --- | --- | --- |
| humanoid | 19 / 21 | 20 / 22 | lighting 2 → 3, cluster 4 |
| sword | 21 / 21 | 22 / 21 | palette 3 → 4 |
| character | 19 / 24 | 19 / 24 | bevel helps, dither still holds it back |
| scene | 16 / 24 | 22 / 24 | lighting 2→4, edge 2→4 (sheet), cluster 2→3 |

**Verdict: `fail`, mean 3.90** (was 3.79), with **no criterion below the floor**. The bar is
4.0 and it was not lowered; the remaining gap is the mean, spread over the masonry's
single-pixel joints, the apron's specks and the palettes' uneven ramp steps.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, biome, 88 files / 830 tests, build |
| `pnpm vitest run --coverage` | 0 | 95.79 % statements, 87.21 % branches, 98.33 % functions, 95.60 % lines (gate 80 %) |
| `render --strict` × 4 assets | 0 | no warnings, no error or warning finding |

## Deviations

- **Scoring is self-review**, not the vision model: see the header and `docs/rubric.md`.
  The record's `basis` is `mixed` and its `caveat` names all four assets.
- **One asset kept its previous form of shading** (`character`'s dither) because replacing
  it changes the asset's whole surface; that is recorded as a known weakness rather than
  claimed as done.
