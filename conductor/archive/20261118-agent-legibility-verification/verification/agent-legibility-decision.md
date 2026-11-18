# Agent Legibility Verification — Final Decision

- **Track:** `20261118-agent-legibility-verification` — Agent Legibility Verification
- **Phase:** 3 — Record the honest legibility decision
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Phase base:** `b500ae2badc19f84f082063b247f1c049c29de14`
- **Covers:** FR-6, NFR-6, AC-6, AC-8
- **Result:** `verified`

## Decision

**LEGIBILITY METRIC VERIFIED — PASS, with disclosed residual strict-gate gaps.**

The product success metric at `conductor/product.md:29` is met for all four benchmark assets: a fresh, docs-only agent completed each asset within the 12-call budget, with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` findings and a diagnostic silhouette rating of 4/5 or better. The verdict is an honest pass of that metric, **not** a claim that every asset renders strict-clean: humanoid and chest retain craft/lint-gate findings at strict exit 3. Those gaps are disclosed in full below and are not hidden, suppressed, re-rolled, or force-passed.

No follow-up issues were filed, no merge decision was taken, and no forced pass of the strict gate was applied.

## Metric basis

Product metric (`conductor/product.md:29`): a fresh agent, given only tool documentation, completes each benchmark asset (16×16 potion, 32×32 sword, 32×32 humanoid, 48×48 chest) with **zero `OUT_OF_BOUNDS` and `ORPHAN_PIXEL` findings, a silhouette rated 4/5 or better, within 12 tool calls per asset.**

The silhouette figures below are flash-lite `--dry-run` diagnostics recorded in `measurement.md` §3. They are **diagnostic evidence only** and are not comparable to, and never substituted for, the published gate scores in `test/art/scores.json`.

## Per-asset verdict table

| Asset | Calls (≤12) | `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` | Silhouette (dry-run, /5) | Strict exit / findings | Metric verdict |
| --- | --- | --- | --- | --- | --- |
| potion 16×16 (MCP) | 9 | 0 / 0 | 5 | 0 — no blocking findings; 10 BANDING info | PASS — strict clean |
| sword 32×32 (MCP) | 11 | 0 / 0 | 4 | 0 — no blocking findings; 3 BANDING + 1 CLUSTER_THIN info | PASS — strict clean |
| humanoid 32×32 (MCP) | 12 (at limit) | 0 / 0 | 5 | 3 (`E_LINT_GATE`) — PILLOW_SHADE (arm), 2× SILHOUETTE_LOSS (arm, torso; base `#3f78b8` 1.16:1 < 1.50:1); +1 W_PART_OVERWRITE | PASS metric — residual strict-gate gap disclosed |
| chest 48×48 (MCP) | 11 | 0 / 0 | 5 | 3 (`E_LINT_GATE`) — LOW_CONTRAST (6/120 edge pixels, 5%), 3× VALUE_COLLISION (bands/body 0.055, bands/lock 0.000, body/lock 0.055) | PASS metric — residual strict-gate gap disclosed |
| potion 16×16 (CLI parity) | 8 | n/a (parity run, outside the strict/silhouette measurement set) | n/a | n/a — recorded in `agent-runs.md` only | Parity complete — 8/12 calls |

- All four MCP-first call counts are ≤12 (potion 9, sword 11, humanoid 12, chest 11); CLI parity potion 8.
- Zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL` on all four strict renders.
- All four silhouette diagnostics are ≥4 (potion 5, sword 4, humanoid 5, chest 5).

## Residual strict-gate gaps (disclosed, not hidden)

These are craft/lint-gate residuals from the fresh agent's own palette and op-ordering choices within its 12-call budget. `docs/lint-thresholds.md` already supplied the thresholds, so they are not a documentation-coverage gap and no doc fix or re-test was applied (see `measurement.md` §5).

- **humanoid 32×32 — strict exit 3 (`E_LINT_GATE`):** PILLOW_SHADE on the arm; two SILHOUETTE_LOSS findings (arm and torso) where the base `#3f78b8` contrasts 1.16:1 below the 1.50:1 threshold; plus one W_PART_OVERWRITE info. The 1× PNG and debug sheet were still written and the 8× upscale succeeded. **Not claimed strict-clean.**
- **chest 48×48 — strict exit 3 (`E_LINT_GATE`):** LOW_CONTRAST (6 of 120 edge pixels, 5%) and three VALUE_COLLISION pairs (bands/body 0.055, bands/lock 0.000, body/lock 0.055). The 1× PNG and debug sheet were still written and the 8× upscale succeeded. **Not claimed strict-clean.**

Neither gap is an `OUT_OF_BOUNDS` or `ORPHAN_PIXEL` failure, so neither breaks the product metric. Both are recorded verbatim here and in `measurement.md` §2 and `phase-2.md`.

## Bounded-stop statement

The verification stopped at its declared bound. Exactly one docs-only brief was assembled, one fresh-agent run was performed per asset, and at most one documentation revision plus one re-test was permitted — and in fact **zero** documentation fixes and **zero** re-tests were needed. There was no score re-roll, no score-pass fishing, no instrument switch (flash-lite `--dry-run` throughout), no cross-instrument comparison, and no forced pass. The residual strict-gate gaps were accepted and disclosed rather than iterated away. No follow-up issues were filed and no merge decision was taken.

## Evidence and integrity

- Per-asset runs and call counts: `agent-runs.md`.
- Strict renders, findings and hashes: `measurement.md` §2; silhouette diagnostics: `measurement.md` §3.
- `test/art/scores.json` SHA-256 unchanged before and after: `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (`measurement.md` §4; re-confirmed for this phase in `phase-3.md`). The gate record was not edited and no engine, code, recipe, fixture, golden or score file was changed.
- Final decision honesty (FR-6 / AC-6): this is a pass of the documented product metric with the two strict-gate gaps explicitly disclosed — not a fabricated clean sweep and not a forced pass.
