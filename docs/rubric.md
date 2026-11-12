# Art rubric

The seven assets in `test/art/` are scored by a vision model against six criteria.
This document defines the criteria, the scoring method, and the record the test suite
checks.

**The test suite does not score art.** `test/art/rubric.test.ts` verifies the scores that
were already recorded in `test/art/scores.json`. Re-scoring, adding an asset or changing
a score requires `scripts/rubric.mjs` and a model credential; nothing in `pnpm test`,
`pnpm verify` or CI can produce or alter a score.

## Criteria

Each criterion is scored with an integer from **1 to 5**. 2 and 4 sit between the
anchors. Anchors are written so they can be checked against the artifact at 1× (the
debug sheet's second panel), not against the recipe.

| criterion | 1 | 3 | 5 |
| --- | --- | --- | --- |
| `silhouette` | reads as an unidentifiable blob at 1× | recognisable only after being told what it is, or only with colour | identifiable at 1× with no colour information |
| `value_separation` | parts merge into one mass | parts separate, but one adjacent pair is within one step | every part distinguishable in a 16-level posterisation |
| `lighting` | light comes from two or more directions, or shading contradicts the form | one direction, but one mass is shaded against it | one direction everywhere; every mass reads lit and shadowed consistently |
| `edge_language` | outline noise; edges switch treatment row to row with no reason | outline is consistent but detail edges are indistinguishable from silhouette | silhouette, material and detail edges each have a deliberate, consistent treatment |
| `cluster_discipline` | single-pixel confetti; clusters too small to read | some clusters under the profile minimum but they are accents | no cluster smaller than the profile minimum except deliberate 1 px highlights |
| `palette_craft` | palette is arbitrary; hues and values fight | coherent but flat: one hue dominates, ramps do not step evenly | ramps step evenly, shadows run cool and highlights warm, hues are chosen for the subject |

Criterion names are fixed. `scores.json` records them verbatim so the test can assert
each one without a mapping table.

## Method

1. Render the asset at 1× on the neutral `#808080` backdrop and take the debug sheet
   from the same recipe:
   - `pnpm exec tsx src/cli.ts render --file test/art/<asset>/<asset>.px.json --out .conductor/evidence/art/<asset>.png --debug --strict`
   - the sheet lands next to it as `.conductor/evidence/art/<asset>.debug.png`
2. Score **twice per asset, independently** — two passes, ideally two different models.
   Pass 1 scores the 1× PNG; pass 2 scores the debug sheet (which shows the 8×/4×/2×
   zoom, the posterised silhouette and the per-part crops). Each pass is a separate
   model call with no memory of the other.
3. Run the scorer once per pass:
   ```sh
   PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<id> node scripts/rubric.mjs --asset <asset> --pass 1
   PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<id> node scripts/rubric.mjs \
     --asset <asset> --pass 2 --artifact .conductor/evidence/art/<asset>.debug.png
   ```
   The script validates the reply (six criteria, integer 1–5, non-empty rationale),
   refuses to overwrite an existing pass without `--replace`, and appends to
   `test/art/scores.json`. It exits `2` with a clear message when no credential is
   configured, and `1` when the reply is unusable. It is the only networked component in
   the repository.
4. Where the two passes disagree by more than one point on a criterion, a human breaks
   the tie and records it in the asset's `tiebreak` block:
   `{"party": "human|pass1|pass2", "criterion": "<name>", "score": <1-5>, "reason": "..."}`.

## Acceptance

AC-20 is met when, across the seven assets and both passes:

- every asset has exactly two passes;
- all six criteria are integer 1–5 in every pass;
- the mean of all recorded scores is **≥ 4.0**;
- no criterion on any asset is below **3**;
- every score carries a non-empty rationale.

If the assets cannot reach 4.0, the failing criterion is recorded and the bar is not
lowered: the honest outcome is a named weakness, not a softer rubric.

## Record shape

`test/art/scores.json`:

```json
{
  "v": 1,
  "assets": {
    "potion": {
      "passes": [
        {
          "pass": 1,
          "model": "<model id>",
          "date": "YYYY-MM-DD",
          "artifact": ".conductor/evidence/art/potion.png",
          "criteria": {
            "silhouette": { "score": 4, "rationale": "one sentence" },
            "value_separation": { "score": 4, "rationale": "one sentence" },
            "lighting": { "score": 4, "rationale": "one sentence" },
            "edge_language": { "score": 4, "rationale": "one sentence" },
            "cluster_discipline": { "score": 4, "rationale": "one sentence" },
            "palette_craft": { "score": 4, "rationale": "one sentence" }
          }
        }
      ],
      "tiebreak": { "party": "human", "criterion": "lighting", "score": 4, "reason": "..." }
    }
  }
}
```

`tiebreak` is optional and appears only when the passes disagree. Scores are never
written by hand: the script is the only writer, and `--replace` is the only way to change
a recorded pass.
