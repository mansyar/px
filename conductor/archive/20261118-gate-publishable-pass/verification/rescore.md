# Phase 2 — Humanoid Re-score Record (`rescore.md`)

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 2 — Re-score the two affected passes and recompute the gate
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Phase base:** `ed9fd6929778b72d7229d7d707b51e0e69c495dd`
**Status:** `verified` — both credentialed passes were run by the primary on
2026-11-18 (flash-lite only, `OK[try 1]` each, no re-roll), the verdict was
scorer-recomputed, and every PENDING cell below is now filled from the primary's
output. The earlier `blocked` boundary is closed.

## 1. Artifacts, render commands and authoritative digests

Both pass artifacts were confirmed to exist under the gitignored evidence tree:

- Pass A (plain, exact 8x nearest-neighbour on `#808080`): `.conductor/evidence/art-v2/humanoid.8x.png`
- Pass B (engine debug sheet): `.conductor/evidence/art-v2/humanoid.debug.png`

Render commands that produced/regenerate these artifacts (recorded in
`phase-1.md` §1 and `.conductor/evidence/art-v2/generation-summary.json`):

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| render (root, documented boundary) | `pnpm exec tsx src/cli.ts render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/render-ws/humanoid-new.png --debug --strict` | 1 | `E_STYLE_MISSING` — style resolves beside the recipe, not cwd; path rule, not a defect |
| render (temp workspace with root `px.style.json` copied beside recipe) | `pnpm exec tsx src/cli.ts render --file humanoid.px.json --out humanoid.png --debug --strict` | 0 | digest `76c4ba9b…`, `ok:true`, info findings only; run twice with identical digest |
| render (generation summary) | `node dist/cli.js render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/art-v2/humanoid.png --debug --strict` | 0 | `recipe_sha256 == committed_sha256`, `blocking_findings: 0`, 35 info findings |
| upscale (generation summary) | `node scripts/upscale.mjs .conductor/evidence/art-v2/humanoid.png --out .conductor/evidence/art-v2/humanoid.8x.png --factor 8` | 0 | faithful plain 8x view for pass A |
| integration | `pnpm verify` (regenerates faithful A/B via `test/art/scoring-artifacts.test.ts`) | 0 | 119 files / 1028 tests; build clean; one pre-existing non-failing Biome warning |

### Authoritative digests (from the phase-brief pre-phase anchors and `phase-1.md` primary verification)

| File | SHA-256 | Provenance |
| --- | --- | --- |
| `test/art/scores.json` (pre-track, before this phase) | `9464B22096CCE322BC95A125BCAFE7194E8FA46045449D223C5687F4CBACF190` | Phase-brief anchor; primary confirmed byte-identical at Phase 1 acceptance |
| `test/art/scores.json` (post-scorer) | `D785D3FD1D3BB36DB8422443B3A8CD162B508AA4B5033FF9ED9753E840B19C82` | Primary scorer output after the two `--replace` calls |
| `test/art/scores.json` (final, committed) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | After the primary's honest metadata-only reconciliation, commit `9c1c6ac` |
| `.conductor/evidence/art-v2/humanoid.8x.png` (pass A) | `FAFF12D17CC020804003BC6696FDAF4E02EDA576FD7CBB7FDD1B0FC0BED854D1` | Phase-brief anchor; primary recorded in `phase-1.md` §Primary verification |
| `.conductor/evidence/art-v2/humanoid.debug.png` (pass B) | `D6738882571E38D36C530CCAC8DCB5D9FC38D0E7A23E2E04D524B1C62595CE42` | Phase-brief anchor; primary recorded in `phase-1.md` §Primary verification |
| `test/art/v2/humanoid/humanoid.sha256` | `76c4ba9beecdbfdd56fd27ad69ea21b2f575092d59a74be9f4eef73409fb9ee1` | Phase-brief anchor; matches `generation-summary.json` `recipe_sha256 == committed_sha256` |

The artifact/recipe digests are transcribed from the authoritative table supplied in
the brief and corroborated by the Phase 1 primary verification and
`generation-summary.json`; the two `scores.json` hash transitions are transcribed from
the appended primary-run section of the brief. This subagent did not independently
recompute per-file hashes: general shell hashing is outside the permitted shell scope,
and no read/grep/glob tool computes SHA-256. `test/art/scores.json` was **read only** —
never edited, staged, or committed by this subagent; the primary's scorer and
metadata-only reconciliation wrote it (commits are the primary's).

## 2. Exact primary-only scorer commands (do NOT run as subagent)

```
node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"
node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"
```

Instrument of record: `gemini-3.5-flash-lite` only — never switch instruments, never
compare to the retired `gemini-4-hydrogen` 3.25 baseline, no re-rolls, no hand-edited
scores or rationales. Exactly two passes were re-scored; the twelve unaffected passes
remain untouched. On 503/429/non-JSON the primary retries with backoff, never by
switching instruments. Both calls succeeded on the first attempt with no retry.

## 3. Machine-written scores — FINAL

Both passes were scored by the primary with `scripts/rubric.mjs` on
`gemini-3.5-flash-lite` (`OK[try 1]` for each). All six criterion scores per pass and
the per-pass metadata were machine-written by the scorer and transcribed here from
`test/art/scores.json`; none was hand-edited.

| Criterion | Humanoid A | Humanoid B |
| --- | --- | --- |
| silhouette | 5 | 5 |
| value_separation | 4 | 4 |
| lighting | 3 | 3 |
| edge_language | 3 | 3 |
| cluster_discipline | 5 | 4 |
| palette_craft | 4 | 3 |
| `model` (machine-written) | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` |
| `note` | `gate-publishable-pass humanoid A` | `gate-publishable-pass humanoid B` |
| `artifact_path` | `.conductor/evidence/art-v2/humanoid.8x.png` | `.conductor/evidence/art-v2/humanoid.debug.png` |
| artifact SHA-256 (authoritative) | `FAFF12D17CC020804003BC6696FDAF4E02EDA576FD7CBB7FDD1B0FC0BED854D1` | `D6738882571E38D36C530CCAC8DCB5D9FC38D0E7A23E2E04D524B1C62595CE42` |

### Machine-written rationales (verbatim from `scores.json`, not hand-edited)

Pass A:

- silhouette — "The knight's helmet, upright stance, and large sword create an instantly recognisable humanoid figure even without colour."
- value_separation — "Most armor pieces are clearly distinguished by value differences, though some adjacent tones are quite close."
- lighting — "Shading generally implies a top-down or ambient light source, but lacks a cohesive directional shadow strategy across all components."
- edge_language — "Outlines are consistently bold, but interior detail edges and material boundaries blend together without distinct treatment."
- cluster_discipline — "The sprite maintains clean pixel clusters with virtually no distracting single-pixel confetti or irregular noise."
- palette_craft — "The steel blues and warm gold accents create a coherent metallic look, though gradients step a bit abruptly."

Pass B:

- silhouette — "The character and sword are immediately legible as a humanoid warrior even without color."
- value_separation — "Most body parts and equipment are clearly distinguished by value contrast, though some adjacent tones are quite close."
- lighting — "Lighting lacks a single unified directional source, appearing somewhat flat and ambiguous across different masses."
- edge_language — "The outline is generally consistent, but internal details and material edges lack distinct varied treatment."
- cluster_discipline — "Pixel clusters are well-sized and structured, avoiding noisy single-pixel artifacts."
- palette_craft — "The palette is coherent and themed for armor and steel, but the ramps could be smoother and more intentional."

Target criteria both cleared the floor on pass A: `edge_language` 2→3 and
`palette_craft` 2→4. No criterion scored below 3 on either pass (FR-1/FR-2/AC-1/AC-2).

## 4. Scorer-recomputed verdict — FINAL

| Field | Value |
| --- | --- |
| `result` | `pass` |
| `mean` | `3.82` |
| `threshold_mean` | 3.5 (gate definition, unchanged) |
| `min_allowed` | 3 (floor clause, unchanged) |
| `failures` | `[]` |
| recompute command | `node scripts/rubric-report.mjs` (primary) — exit 0; 7 assets / 14 passes |
| diff check | `unaffected_checked=12 diffs=0` |
| criterion means | silhouette 4.93, value_separation 3.86, lighting 3.21, edge_language 3.29, cluster_discipline 4.29, palette_craft 3.36 |

Recomputed by the scorer, not forced. Mean 3.82 clears the 3.5 threshold and there
are zero below-floor criterion scores, so the gate passes honestly (FR-5/AC-5). No
second candidate, no re-roll and no cross-instrument transfer (FR-6/AC-6).

## 5. Notes

- Pre-track gate record: `fail`, mean `3.73`, exactly two floor failures, both
  humanoid A (`edge_language=2`, `palette_craft=2`); mean already clears 3.5, the
  floor clause alone binds.
- Phase 1 visual gate (NFR-7 / AC-9) is closed: primary read all four A/B images
  directly and judged the candidate satisfactory with **no bounded visual revision
  requested**. This is the single bounded scoring round.
- Finalization (single re-invocation): the primary supplied the scorer output, the
  diff result (`unaffected_checked=12 diffs=0`) and the `rubric-report` output; all
  PENDING cells were filled and Result set to `verified`.
- The primary reconciled only metadata — `scored_by`, `instrument.note` and
  `verdict.note` — in `test/art/scores.json` (commit `9c1c6ac`), after the scorer wrote
  the per-pass fields. No criterion score or rationale was hand-edited.
- Diff-count correction: the brief/plan originally said `10` (carried over from the
  prior four-pass track); the correct count here is `12` unaffected passes
  (14 total − 2 re-scored). All evidence uses `12`.
