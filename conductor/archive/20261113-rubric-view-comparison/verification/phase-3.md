# Phase 3 — Run and Record: Verification

**Status:** verified
**Date:** 2026-11-13

## Claim

Twelve scoring calls plus one refill produced a complete six-criterion comparison
for both assets, and the harness's verdict is `keep 8x and debug`.

## Run

```sh
node scripts/calibrate.mjs --views
```

Twelve attempts, one rejected: `chest · debug · repeat 2` exhausted its retries on
a malformed reply, which excluded all six chest criteria and returned
`inconclusive`. That is a lost reply, not an unstable criterion, so the slot was
re-scored in place:

```sh
node scripts/calibrate.mjs --views --asset chest --view debug --repeat 2 --merge-views
```

One call; recorded in the report under **Refills**, with no other score touched.
Totals: 13 attempted, 2 rejected.

## Results

| asset | view | mean |Δ| | worst criterion |
| --- | --- | --- |
| chest (48 px) | 1x / 8x / debug | 0.42 | `edge_language` 1.0, `palette_craft` 1.0 |
| humanoid (32 px) | 1x / 8x / debug | 0.58 | `cluster_discipline` 1.5, `lighting` 1.0 |

Only `silhouette` and `value_separation` were identical across all three views on
both assets. `1x` was not uniformly worse: chest `edge_language` scored 4 at 1×
against 3.0 on the debug sheet.

**Decision (computed by the harness from the registered rule): keep 8x and debug.**
Blocking: `humanoid cluster_discipline Δ 1.5` exceeds the one-step tolerance, and
both mean |Δ| values exceed 0.25.

## Record

`git diff --exit-code test/art/scores.json` — no output, exit 0.

Committed copies: `verification/views/artifacts.json`, `verification/views/views.json`,
`verification/views/views.md`.

## Covers

FR-3, FR-4, AC-2, AC-3, AC-4, AC-6.
