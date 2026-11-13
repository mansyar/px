# Rubric view comparison

- Model: `gemini-3.5-flash-lite`
- Assets: chest (48px), humanoid (32px)
- Views: 1x, 8x, debug · repeats per view: 2
- Calls: 13 attempted, 2 rejected

Rule, fixed before the first call: two repeats of the same view must agree
within 1 step or the criterion is excluded; accept 1x only if every included
criterion moves by at most 1 across views and the mean move is below 0.25.

## chest (48px)

| criterion | 1x | 8x | debug | Δ | status |
| --- | --- | --- | --- | --- | --- |
| `silhouette` | 5.0 | 5.0 | 5.0 | 0.0 | included |
| `value_separation` | 4.0 | 4.0 | 4.0 | 0.0 | included |
| `lighting` | 3.0 | 3.0 | 3.0 | 0.0 | included |
| `edge_language` | 4.0 | 3.5 | 3.0 | 1.0 | included |
| `cluster_discipline` | 4.0 | 4.5 | 4.0 | 0.5 | included |
| `palette_craft` | 4.0 | 4.0 | 3.0 | 1.0 | included |

Included criteria: 6 · mean |Δ|: 0.42

## humanoid (32px)

| criterion | 1x | 8x | debug | Δ | status |
| --- | --- | --- | --- | --- | --- |
| `silhouette` | 3.0 | 3.0 | 3.0 | 0.0 | included |
| `value_separation` | 3.0 | 3.0 | 3.0 | 0.0 | included |
| `lighting` | 2.0 | 2.0 | 3.0 | 1.0 | included |
| `edge_language` | 3.0 | 2.5 | 3.0 | 0.5 | included |
| `cluster_discipline` | 3.5 | 4.0 | 2.5 | 1.5 | included |
| `palette_craft` | 3.0 | 2.5 | 3.0 | 0.5 | included |

Included criteria: 6 · mean |Δ|: 0.58

## Refills

A pass that lost its reply is re-scored in the same registered slot; no
other score is touched and no candidate is revised.

- chest · debug · repeat 2

## Decision

**keep 8x and debug**

Blocking criteria (Δ above the tolerance):

- humanoid · `cluster_discipline` Δ 1.5

Mean |Δ| exceeded 0.25 for at least one asset: chest 0.42, humanoid 0.58.

