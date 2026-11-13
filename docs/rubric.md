# Art rubric

The seven assets in `test/art/` are scored against six criteria, either by a vision model
or — when no credential is available — by the implementing agent as a labelled
self-review. This document defines the criteria, both scoring paths, the method, and the
record the test suite checks.

**The test suite does not score art.** `test/art/rubric.test.ts` verifies the scores that
were already recorded in `test/art/scores.json`, including which path produced each pass.
Re-scoring, adding an asset or changing a score happens through `scripts/rubric.mjs` (the
model path) or through a labelled agent pass (see *Scoring paths*); nothing in `pnpm
test`, `pnpm verify` or CI can produce or alter a score.

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

## Scoring paths

A pass is one scorer's look at one artifact. Two paths produce passes, and every pass in
`scores.json` names its path in `scorer`:

| `scorer` | how | independence |
| --- | --- | --- |
| `vision-model` | `scripts/rubric.mjs` sends the artifact to a vision model | the two passes may be different models; neither is the author |
| `agent` | the implementing agent views the artifact and scores it against the same anchors | none — it is the author, so the pass is a **self-review** |

### Agent review

Use it when no model credential is available. It is not a lighter rubric: same artifacts,
same six criteria, integers 1–5, one sentence per criterion, same verdict arithmetic. It
carries five rules that keep the record honest.

1. **Same artifacts.** Pass A scores the `8x` nearest-neighbour upscale, pass B the debug
   sheet. A raw 1× PNG is still refused for the reason the method gives below.
2. **Score the image, not the intent.** The design note may tell a pass what the asset is
   meant to be; it may not earn a point for a change the image does not show at 1×.
3. **Two passes, no revision.** Score pass B from the sheet before reading pass A back.
   Where they disagree by more than one point on a criterion, the asset needs a `tiebreak`,
   exactly as on the model path.
4. **Say so in the record.** Each agent pass sets `"scorer": "agent"` and
   `"self_review": true`, and the verdict sets `"basis"` to `self-review` or `mixed`
   together with a `caveat` naming what was self-scored. `mixed` is the normal case: an
   asset that did not change keeps its model scores.
5. **No softening.** The mean and the floor are unchanged and are still recomputed by
   `test/art/rubric.test.ts`. An asset that does not improve keeps the score it had, and a
   re-authored asset is re-scored, never inherited.

What this path cannot buy is independence. A model-scored record is stronger evidence, so
a `self-review` or `mixed` verdict must name the assets its author judged — that is what
`scores.json`'s `caveat` is for, and what review should read first.

## Method

1. Render the asset on the neutral `#808080` backdrop and take the debug sheet from the
   same recipe:
   - `pnpm exec tsx src/cli.ts render --file test/art/<asset>/<asset>.px.json --out .conductor/evidence/art/<asset>.png --debug --strict`
   - the sheet lands next to it as `.conductor/evidence/art/<asset>.debug.png`
2. **Both passes are scored from a faithful nearest-neighbour view**, never from the raw
   1× PNG:
   - pass 1 scores the plain **8× nearest-neighbour upscale** of the 1× render;
   - pass 2 scores the **debug sheet**, which shows the profile zoom, the 1× panel, the
     posterised silhouette and the per-part crops.
   - `pnpm exec tsx scripts/upscale.mjs <asset>` writes the pass-1 artifact to
     `.conductor/evidence/art/<asset>.8x.png` (nearest neighbour, no filtering).

   **Why:** a 16–48 px PNG is resampled by whatever views it before a model sees it, so a
   raw 1× file measures the resampler rather than the art. The first round of scoring
   proved it: the same assets scored pass 1 2.67 vs pass 2 4.33 (potion), 2.83 vs 3.33
   (humanoid) and 2.67 vs 4.17 (scene), and the pass-1 rationales named "blurry" and
   "heavy compression/low-res artifacting" as the fault. A raw 1× PNG below ~32 px is not
   valid evidence and must not be offered as a scoring artifact. The rubric's anchors are
   written against the 1× panel of the debug sheet, so both passes must see pixels the
   anchor can be judged on.
3. Score **twice per asset, independently** — two passes, ideally two different models.
   Each pass is a separate model call with no memory of the other.
4. Run the scorer once per pass:
   ```sh
   PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<id> node scripts/rubric.mjs \
     --asset <asset> --pass A --artifact .conductor/evidence/art/<asset>.8x.png
   PX_RUBRIC_API_KEY=... PX_RUBRIC_MODEL=<id> node scripts/rubric.mjs \
     --asset <asset> --pass B --artifact .conductor/evidence/art/<asset>.debug.png
   ```
   Any OpenAI-compatible endpoint works: set `PX_RUBRIC_ENDPOINT` to the full
   chat-completions URL or to the base URL (the script appends `/chat/completions`), which
   covers Gemini's `https://generativelanguage.googleapis.com/v1beta/openai`.
   `PX_RUBRIC_CREDENTIALS=<path>` reads the key, base URL and model from an existing
   opencode config's `agent-vision` MCP entry (`VISION_API_KEY`, `VISION_BASE_URL`,
   `VISION_MODEL_NAME`) in place — the credential is never copied into the repository, an
   argument, or a log. `--dry-run` scores without writing, for checking an instrument.
   The script validates the reply (six criteria, integer 1–5, non-empty rationale),
   refuses to overwrite an existing pass without `--replace`, writes the schema-3 record and
   recomputes its verdict, and refuses to rewrite a pre-schema-3 record. It exits `2` with a
   clear message when no credential is configured, and `1` when the reply is unusable. It is
   the only networked component in the repository.
5. Where the two passes disagree by more than one point on a criterion, a human breaks the
tie and records it in the asset's `tiebreak` block:
   `{"party": "human|pass1|pass2", "criterion": "<name>", "score": <1-5>, "reason": "..."}`.

Steps 3–4 are the `vision-model` path. The `agent` path in *Scoring paths* uses the two
artifacts from step 1–2 and records through the same file and the same checks.

## Target vector

The gate is a mean across six criteria, so the per-criterion targets have to add
up to it — and for the whole life of the 4.0 gate they did not. The 2026-11-13
vector named lighting 3.5, edge language 3.5, palette craft 3.6 and value
separation 3.7 while assuming silhouette 4.7 and cluster discipline 4.5: a sum of
23.5 against the 24.0 that a 4.0 mean requires, and 23.16 (mean 3.86) once cluster
discipline measured 4.07. An asset could satisfy every target and still fail.

`test/unit/calibration/gate.test.ts` parses this table. When the status is
`reachable` it requires the targets to sum to the gate and each target to clear
the floor. When the status is `unreachable` it requires a dated evidence
reference instead, so an unreachable gate can only be documented deliberately,
never drift into the document.

| quantity | value |
| --- | --- |
| publishable mean | **3.5** |
| publishable floor | **3.0** |
| exceptional mean | **4.0** |
| exceptional floor | **3.5** |
| exceptional status | **unreachable** (calibrated 2026-11-13) |
| evidence | `.conductor/evidence/calibration/report.md` (2026-11-13) |

| criterion | target |
| --- | --- |
| `silhouette` | 5.0 |
| `value_separation` | 4.0 |
| `lighting` | 3.0 |
| `edge_language` | 3.0 |
| `cluster_discipline` | 4.0 |
| `palette_craft` | 3.0 |

The targets above are the highest score each criterion actually reached under the
calibrated stimuli, not aspirations: a build that satisfies all six sums to 22.0,
a mean of 3.67. They clear the publishable tier (6 × 3.5 = 21.0) and cannot clear
the exceptional tier (24.0): lighting, edge language and palette craft never
exceeded 3 on any variant, so a 3.5 floor is out of reach for them.

The two tiers were adopted by owner decision on 2026-11-13 on the evidence in the
Calibration section. `test/unit/calibration/gate.test.ts` requires the publishable
tier to be arithmetically reachable and each target to clear its floor, and
requires an unreachable exceptional tier to be declared with dated evidence — so
either tier can only drift if someone edits this table knowingly.

## Calibration

Calibrated 2026-11-13 on `gemini-3.5-flash-lite`, over the chest
(`test/art/chest/chest.px.json`) as the base asset. For each criterion a `low`
variant removes the property under test and a `high` variant keeps it; every
variant is scored twice, pass A on the plain 8× upscale and pass B on the debug
sheet, exactly as the method above requires. `separates` needs Δ ≥ 2 on the pass
mean with Δ ≥ 1 on each pass; a criterion whose high variant never exceeds 3 is
recorded as having no 4-anchor.

The harness is `pnpm rubric:calibrate` (`scripts/calibrate.mjs`), the variants
come from `scripts/calibrate/variants.mjs`, and the report is written to
`.conductor/evidence/calibration/report.md`. Rules use `node` only; no
credential is stored in the repository.

| criterion | low A/B | high A/B | Δ | verdict | 4-anchor |
| --- | --- | --- | --- | --- | --- |
| `silhouette` | 1/1 | 5/5 | 4.00 | separates | yes |
| `value_separation` | 3/3 | 4/4 | 1.00 | ambiguous | yes |
| `lighting` | 1/1 | 3/3 | 2.00 | separates | no |
| `edge_language` | 3/3 | 3/3 | 0.00 | ambiguous | no |
| `cluster_discipline` | 1/1 | 4/4 | 3.00 | separates | yes |
| `palette_craft` | 2/1 | 3/3 | 1.50 | ambiguous | no |

The instrument responds to gross destruction: an unidentifiable blob, an unlit
surface and single-pixel confetti each drop to 1. It does not respond to the
subtler removals that the criteria name — a chest with its values collapsed but
its hues intact, a chest with reasonless outline switching, and a chest with
warring hues all still scored 3. That is the finding this calibration records:
**the judge discriminates the bottom of the scale, not the top.**

A first round with milder stimuli (a desaturated chest, a chest with outlines
removed, light confetti) scored those variants 3–4 and is kept at
`.conductor/evidence/calibration/v1/`; it is the reason the stimuli were
strengthened, not evidence of separation.

The consequences, stated plainly:

- No criterion above 3 has ever been demonstrated on this asset class. Scores of
  4 and 5 are awarded (silhouette 5/5, cluster discipline 4/4, value separation
  4/4), so the top anchors exist; the two that matter most for rendered form —
  lighting and palette craft — never reach them.
- A 4.0 mean would require near-perfect scores on the four criteria that reach 4
  and 5, with edge language at 5, which it never reached. The gate is not
  reachable by improving art of this kind.
- The gate was split into two tiers by owner decision on 2026-11-13:
  **publishable** at a 3.5 mean with a 3.0 floor, **exceptional** at 4.0 with a
  3.5 floor. The recorded verdict was not re-scored; the decision changes what the
  numbers mean, not the numbers.

Scores recorded before 2026-11-13 are **forward only**: they are not re-scored
against the calibrated stimuli, and archived tracks keep the numbers they were
reviewed with.

## Acceptance

AC-20 is met when, across the seven assets and both passes:

- every asset has exactly two passes;
- all six criteria are integer 1–5 in every pass;
- **publishable:** the mean is ≥ 3.5 and no criterion on any asset is below 3;
- **exceptional:** the mean is ≥ 4.0 and no criterion on any asset is below 3.5;
- every score carries a non-empty rationale.

**Status (2026-11-13): neither tier is met by the current record.** The mean is
3.69, but humanoid pass B scores cluster discipline 1, below the publishable
floor. The exceptional tier is unreachable with these criteria: lighting, edge
language and palette craft never exceeded 3 on any calibrated variant, so the
highest attainable mean is 3.67. Both facts are recorded; no recorded score and
no threshold was changed to clear either tier.

## Record shape

`test/art/scores.json`:

Every pass carries `scorer`; a `vision-model` pass also carries `model`, the instrument
id, so the record names what measured it. An `agent` pass carries `"self_review": true`. The
verdict carries `basis` (`independent`, `self-review` or `mixed`) and, whenever it is not
`independent`, a `caveat` naming the assets that were judged by their author.

```json
{
  "schema": 3,
  "rubric": "docs/rubric.md",
  "scored_by": "<one sentence naming which paths produced the passes>",
  "scored_at": "YYYY-MM-DD",
  "criteria": ["silhouette", "value_separation", "lighting", "edge_language", "cluster_discipline", "palette_craft"],
  "verdict": {
    "result": "pass | fail",
    "mean": 4.0,
    "threshold_mean": 4.0,
    "min_allowed": 3,
    "basis": "independent | self-review | mixed",
    "caveat": "required when basis is not independent: name the self-scored assets",
    "failures": [{ "asset": "potion", "pass": "A", "criterion": "lighting", "score": 2 }]
  },
  "assets": [
    {
      "asset": "potion",
      "artifact": "16x16",
      "passes": [
        {
          "pass": "A",
          "scorer": "vision-model",
          "self_review": true,
          "artifact_path": ".conductor/evidence/art/potion.8x.png",
          "view": "plain 8x nearest-neighbour on #808080",
          "subject": "potion bottle",
          "scores": {
            "silhouette": { "score": 5, "why": "one sentence" },
            "value_separation": { "score": 4, "why": "one sentence" },
            "lighting": { "score": 4, "why": "one sentence" },
            "edge_language": { "score": 3, "why": "one sentence" },
            "cluster_discipline": { "score": 5, "why": "one sentence" },
            "palette_craft": { "score": 4, "why": "one sentence" }
          }
        }
      ],
      "tiebreak": { "party": "human", "criterion": "lighting", "score": 4, "reason": "..." }
    }
  ]
}
```

`self_review` is present only on `agent` passes. `tiebreak` is optional and appears only when
a pass pair disagrees by more than one point on a criterion.

On the model path the
script is the only writer of a pass and `--replace` is the only way to change one; on the
agent path the implementing agent appends its own passes, marked as self-review. Neither
path may write a score to fit a target, and a re-authored asset is re-scored rather than
inherited.
