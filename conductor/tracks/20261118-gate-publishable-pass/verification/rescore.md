# Phase 2 — Humanoid Re-score Record (`rescore.md`)

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 2 — Re-score the two affected passes and recompute the gate
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Phase base:** `ed9fd6929778b72d7229d7d707b51e0e69c495dd`
**Status:** `blocked` (first invocation) — this subagent prepared the PENDING
evidence; the two credentialed scorer commands and the node diff/report commands
are primary-only. Re-invoke once with the primary's output to fill the PENDING
cells and finalize.

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
| `.conductor/evidence/art-v2/humanoid.8x.png` (pass A) | `FAFF12D17CC020804003BC6696FDAF4E02EDA576FD7CBB7FDD1B0FC0BED854D1` | Phase-brief anchor; primary recorded in `phase-1.md` §Primary verification |
| `.conductor/evidence/art-v2/humanoid.debug.png` (pass B) | `D6738882571E38D36C530CCAC8DCB5D9FC38D0E7A23E2E04D524B1C62595CE42` | Phase-brief anchor; primary recorded in `phase-1.md` §Primary verification |
| `test/art/v2/humanoid/humanoid.sha256` | `76c4ba9beecdbfdd56fd27ad69ea21b2f575092d59a74be9f4eef73409fb9ee1` | Phase-brief anchor; matches `generation-summary.json` `recipe_sha256 == committed_sha256` |

These digests are transcribed from the authoritative table supplied in the brief and
corroborated by the Phase 1 primary verification and `generation-summary.json`. This
subagent did not independently recompute per-file hashes: general shell hashing is
outside the permitted shell scope, and no read/grep/glob tool computes SHA-256.
`test/art/scores.json` was **not** edited, staged, or committed by this subagent.

## 2. Exact primary-only scorer commands (do NOT run as subagent)

```
node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"
node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"
```

Instrument of record: `gemini-3.5-flash-lite` only — never switch instruments, never
compare to the retired `gemini-4-hydrogen` 3.25 baseline, no re-rolls, no hand-edited
scores or rationales. Exactly two passes are re-scored; the ten unaffected passes
remain untouched. On 503/429/non-JSON the primary retries with backoff, never by
switching instruments.

## 3. Machine-written scores — PENDING PRIMARY

Only the scorer may write these six criterion scores per pass and the per-pass
metadata. No value below is hand-edited by this subagent.

| Criterion | Humanoid A | Humanoid B |
| --- | --- | --- |
| silhouette | PENDING PRIMARY | PENDING PRIMARY |
| value_separation | PENDING PRIMARY | PENDING PRIMARY |
| lighting | PENDING PRIMARY | PENDING PRIMARY |
| edge_language | PENDING PRIMARY | PENDING PRIMARY |
| cluster_discipline | PENDING PRIMARY | PENDING PRIMARY |
| palette_craft | PENDING PRIMARY | PENDING PRIMARY |
| `model` (machine-written) | PENDING PRIMARY | PENDING PRIMARY |
| `note` | PENDING PRIMARY | PENDING PRIMARY |
| `artifact_path` | `.conductor/evidence/art-v2/humanoid.8x.png` | `.conductor/evidence/art-v2/humanoid.debug.png` |
| artifact SHA-256 (authoritative) | `FAFF12D1…54D1` | `D6738882…E42` |

Target criteria under observation: pass A `edge_language` (pre-track 2) and
`palette_craft` (pre-track 2). All six criteria on both passes must be recorded
honestly, including any regression on pass B.

## 4. Scorer-recomputed verdict — PENDING PRIMARY

| Field | Value |
| --- | --- |
| `result` | PENDING PRIMARY (`pass` or honest `fail`) |
| `mean` | PENDING PRIMARY |
| `threshold_mean` | 3.5 (gate definition, unchanged) |
| `min_allowed` | 3 (floor clause, unchanged) |
| `failures` | PENDING PRIMARY |
| recompute command | `node scripts/rubric-report.mjs` (primary-only) |
| diff check | PENDING PRIMARY — expect `unaffected_checked=10 diffs=0` |

No verdict is claimed or forced here. A `fail` is accepted honestly as the bounded
final outcome (FR-5) with no second candidate and no cross-instrument transfer (FR-6).

## 5. Notes

- Pre-track gate record: `fail`, mean `3.73`, exactly two floor failures, both
  humanoid A (`edge_language=2`, `palette_craft=2`); mean already clears 3.5, the
  floor clause alone binds.
- Phase 1 visual gate (NFR-7 / AC-9) is closed: primary read all four A/B images
  directly and judged the candidate satisfactory with **no bounded visual revision
  requested**. This is the single bounded scoring round.
- The primary re-invokes this phase once with scorer output, the diff result, and the
  `rubric-report` output; the PENDING cells are then filled, Result set to `verified`,
  and the phase committed as `docs(verify): finalize phase 2 re-score and verdict`.
