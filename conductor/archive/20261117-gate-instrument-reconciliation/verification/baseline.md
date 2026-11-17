# Baseline — gate and instrument reconciliation

- Track: `20261117-gate-instrument-reconciliation`
- Date: 2026-11-17
- Gate: **publishable** — mean >= 3.5 and no criterion below 3 on any asset or pass (binding decision in `docs/rubric.md`, 2026-11-17).
- Exceptional 4.0 remains documented as unreachable calibration evidence; it is an aspiration, not the gate.

## Instrument

| Field | Value |
| --- | --- |
| Script | `scripts/rubric.mjs` (the only networked component, human-run, never imported by engine/tests/CI) |
| Primary model | `gemini-4-hydrogen` (Gemini API) |
| Fallback model | `gemini-3.5-flash-lite` — recorded but **not used** |
| Pass A | exact factor-8 nearest-neighbour upscale on `#808080`, `.conductor/evidence/art-v2/<asset>.8x.png` |
| Pass B | engine debug sheet, `.conductor/evidence/art-v2/<asset>.debug.png` |
| Asset set | the seven current `test/art/v2/` assets: potion, sword, humanoid, chest, character, prop, scene |
| Credentials | read in place from the configured vision MCP entry; never printed or written to the repository |

All 14 passes carry `model: "gemini-4-hydrogen"` and `scorer: "vision-model"`. Three passes required a retry after transient 503/429 and fetch failures. Retrying those calls with the same model succeeded, so the baseline is a single-instrument record. No fallback was invoked.

## Verdict

**FAIL at the publishable gate.** Recomputed by `scripts/rubric.mjs` and `test/art/rubric.test.ts`
from the scores actually written: mean **3.25** against 3.5, with **22** criterion scores below 3.
No score was raised and no below-floor finding was removed to reach the gate.

## Per-asset means

| Asset | Pass A | Pass B | Asset mean |
| --- | --- | --- | --- |
| potion | 3.33 | 3.17 | 3.25 |
| sword | 3.67 | 3.17 | 3.42 |
| humanoid | 3.83 | 3.33 | 3.58 |
| chest | 2.50 | 2.50 | 2.50 |
| character | 3.17 | 3.00 | 3.08 |
| prop | 3.67 | 3.67 | 3.67 |
| scene | 3.33 | 3.17 | 3.25 |

## Per-criterion means

| Criterion | Mean |
| --- | --- |
| silhouette | 4.29 |
| value_separation | 3.79 |
| lighting | 2.07 |
| edge_language | 2.64 |
| cluster_discipline | 4.07 |
| palette_craft | 2.64 |

## Instrument and view caveat

Both passes used the same model, so the A/B difference measures view fidelity rather than
model disagreement. Across 42 per-asset criterion pairs the mean absolute A/B delta is **0.21**,
the maximum is **1**, and **0 of 42** differ by more than one point. This is materially steadier
than the earlier cross-instrument comparison (up to 1.33 on an asset mean), which is why a
single frozen instrument is the baseline here.

The 3.25 baseline is **not** a like-for-like continuation of the 3.69 (`scores-before-intent.json`,
`gemini-3.5-flash-lite`) or 3.39 (`scores-agent-vision.json`, `agent-vision`) records: those used
different instruments on the same asset set, while this record re-scores all 14 passes with one
model. Treat 3.25 as the new baseline, not as a measured regression of 0.14 or 0.44.

## Provenance

- `test/art/scores-before-intent.json` — pre-intent record, mean 3.69, unchanged.
- `test/art/scores-agent-vision.json` — phase-1 freeze of the `agent-vision` record, mean 3.39, unchanged.
- `test/art/scores.json` — new schema-3 baseline, mean 3.25, publishable gate.
- `.conductor/evidence/art-v2/` — pass artifacts, scoring logs, and generation summary (gitignored).

## Commands

```text
PX_RUBRIC_CREDENTIALS=<opencode config> node scripts/rubric.mjs --asset <asset> --pass A|B \
  --model gemini-4-hydrogen --artifact .conductor/evidence/art-v2/<asset>.<8x|debug>.png --replace
pnpm vitest run test/art/rubric.test.ts
pnpm verify
```
