# Phase 4 — Re-score and Verdict

- **Track:** 20261113-lighting-recovery
- **Phase:** 4
- **Date:** 2026-11-13
- **Branch:** feat/20261113-lighting-recovery
- **Base:** 4d2889c
- **Head:** 6ada08f
- **Result:** verified — gate **missed**, stop rule applied

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| score | `node scripts/rubric.mjs --asset <a> --pass A --artifact <a>.8x.png` (7 assets) | 0 | 7 passes recorded, 2 retried after malformed replies |
| score | `node scripts/rubric.mjs --asset <a> --pass B --artifact <a>.debug.png` (7 assets) | 0 | 7 passes recorded, 1 retried |
| report | `node scripts/rubric-report.mjs` | 0 | criterion means below |
| unit | `pnpm vitest run test/art/rubric.test.ts` | 0 | 10 passed |
| unit | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| full | `pnpm verify` | 0 | typecheck, lint, 858 tests, build |

Pass A used the plain 8x view and pass B the debug sheet, per the record's
definition. Three replies were rejected for malformed JSON and retried inside the
four-attempt limit; no partial pass was written.

## Gate

| ID | Criterion | Target | Result | Verdict |
| --- | --- | --- | --- | --- |
| AC-1 | lighting mean | >= 3.5 | **3.07** | miss |
| AC-2 | palette_craft mean | >= 3.6 | **3.36** | miss |
| AC-3 | edge_language mean | >= 3.5 | **3.07** | miss |
| AC-4 | value_separation mean | >= 3.7 | **3.79** | met |
| AC-5 | overall mean >= 4.0, no criterion under 3.5 | 4.0 | **3.69** | miss |
| AC-6 | no scene lighting reason says "split"/"arbitrar" | — | neither word in either pass | met |
| AC-7 | at most two assets' palette reasons mention flat ramps | <= 2 assets | **12 of 14 passes** across all seven assets | miss |
| AC-8 | strict-clean renders, digests re-baselined with reasons | — | six strict renders 0; six digests + notes | met |
| AC-9 | 28 + 10 tests, `pnpm verify` 0 | — | 28, 10, 0 | met |
| AC-10 | prop digest byte-identical | — | 0 changed prop files since f6e3609 | met |

## Per-asset means

| Asset | Mean | silhouette | value | lighting | edge | cluster | palette |
| --- | --- | --- | --- | --- | --- | --- | --- |
| potion | 4.08 | 5.00 | 4.00 | 3.50 | 3.00 | 5.00 | 4.00 |
| prop (control) | 4.00 | 5.00 | 4.00 | 3.00 | 3.50 | 4.50 | 4.00 |
| chest | 3.75 | 5.00 | 4.00 | 3.00 | 3.00 | 4.00 | 3.50 |
| sword | 3.67 | 5.00 | 4.00 | 3.00 | 3.00 | 4.00 | 3.00 |
| scene | 3.67 | 5.00 | 4.00 | 3.00 | 3.00 | 4.00 | 3.00 |
| character | 3.42 | 4.50 | 3.00 | 3.00 | 3.00 | 4.00 | 3.00 |
| humanoid | 3.25 | 4.00 | 3.50 | 3.00 | 3.00 | 3.00 | 3.00 |

The record's own tripwire also flags one judgement: humanoid pass B,
cluster_discipline 1.

## Reading of the result

- The gate was **not met**; art iteration stops here per the approved stop rule.
- Moves against the redraw baseline (3.69): palette 3.21 -> 3.36 (+0.15), lighting
  2.79 -> 3.07 (+0.28), edge 3.14 -> 3.07 (-0.07), value 3.57 -> 3.79 (+0.22),
  mean 3.69 -> 3.69.
- The control prop moved 3.92 -> 4.00 (+0.08), so none of those criterion moves is
  distinguishable from the 0.33 single-asset noise floor. The honest reading is
  that this track did not move the score: it changed how the pixels are built, not
  how they are judged.
- Prop `lighting` scored 3.00 in this run, the same as five of the six edited
  assets, which is consistent with the instrument's flat-shading complaint being
  partly about its own anchors rather than about these drawings.

## Note on the record

`test/art/scores.json` `verdict.note` was refreshed by hand to describe this run;
the `verdict.result`, `mean`, `failures`, and every pass score were written by the
scorer and the record test. No score was edited.

## Deviations

- None in the phase contract. The earlier probe artifact deviation is recorded in
  Phase 3 and does not affect this record.
