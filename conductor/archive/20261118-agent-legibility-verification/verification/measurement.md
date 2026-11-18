# Agent Legibility Verification — Phase 2 Measurement

- **Track:** `20261118-agent-legibility-verification` — Agent Legibility Verification
- **Phase:** 2 — Measure fresh artifacts and remediate documentation gaps
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Phase base:** `828e279110770cef8ccd5e32429f68e25faa38f2`
- **Covers:** FR-3, FR-4, FR-5, NFR-2, NFR-3, NFR-4, NFR-5, NFR-7, AC-3, AC-4, AC-5, AC-7, AC-8
- **Result:** `verified`

All measurement commands were executed by the **primary** on 2026-11-18; the values below are transcribed from the appended primary-run results in `.conductor/runs/20261118-agent-legibility-verification/phase-2-brief.md` (lines 60–84). The phase subagent did not run any credentialed scoring or write any score, recipe, fixture, golden or source file. No value below was inferred or fabricated: where a field was not captured by the primary, that is stated explicitly.

## §1 Exact commands

Strict renders and upscales ran **from each asset's own directory** (`.conductor/evidence/agent-legibility/<asset>/`), whose sibling `px.style.json` already existed. `<asset>` ∈ {`potion`, `sword`, `humanoid`, `chest`}. Silhouette diagnostics ran **from the repo root** (`D:/Projects/px`) because their paths are relative to it.

| # | Purpose | Exact command | CWD |
| --- | --- | --- | --- |
| 1 | Strict render (per asset) | `pnpm exec tsx D:/Projects/px/src/cli.ts render --file <asset>.px.json --out <asset>.png --debug --strict` | `.conductor/evidence/agent-legibility/<asset>/` |
| 2 | Faithful 8× upscale (per asset) | `node D:/Projects/px/scripts/upscale.mjs <asset>.png --out <asset>.8x.png --factor 8` | `.conductor/evidence/agent-legibility/<asset>/` |
| 3 | Silhouette diagnostic (per asset, writes nothing) | `PX_RUBRIC_CREDENTIALS=C:\Users\Ansyar\.config\opencode\opencode.json node scripts/rubric.mjs --asset <asset> --pass A --artifact .conductor/evidence/agent-legibility/<asset>/<asset>.8x.png --model gemini-3.5-flash-lite --replace --dry-run --note "agent-legibility silhouette <asset>"` | `D:/Projects/px` |
| 4 | Confirm `scores.json` SHA-256 | `Get-FileHash -Algorithm SHA256 test/art/scores.json` (or equivalent SHA-256 tool) | `D:/Projects/px` |
| 5 | Verification | `pnpm verify` | `D:/Projects/px` |

Command 3 constraints (NFR-2, NFR-5) were honoured: `--dry-run` always, `--model gemini-3.5-flash-lite` only, no cross-instrument comparison, no score/rationale/verdict write, and the credential was never printed. The two availability retries (sword, humanoid) stayed on the same instrument.

## §2 Strict-render findings (FR-3, AC-3)

Strict-render exit codes and blocking findings from command 1; upscale exit codes from command 2. The Phase 1 transcript notes in `agent-runs.md` were not treated as a substitute for these observed strict renders.

| Asset | Strict-render exit | Upscale exit | Findings (blocking + info) | `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` | Render SHA-256 (first 8) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| potion 16×16 | 0 | 0 | Blocking: none. Info: 10 BANDING | 0 / 0 | `f21348ee` | pass — strict clean |
| sword 32×32 | 0 | 0 | Blocking: none. Info: 3 BANDING + 1 CLUSTER_THIN | 0 / 0 | `15454e90` | pass — strict clean |
| humanoid 32×32 | 3 (`E_LINT_GATE`) | 0 | Blocking: 3 — PILLOW_SHADE (arm); SILHOUETTE_LOSS (arm, torso; base `#3f78b8` 1.16:1 < 1.50:1). Plus one W_PART_OVERWRITE | 0 / 0 | `a7886a15` | fail — craft/lint-gate failure, recorded not hidden |
| chest 48×48 | 3 (`E_LINT_GATE`) | 0 | Blocking: 4 — LOW_CONTRAST (6/120 edge pixels, 5%); 3 VALUE_COLLISION pairs (bands/body 0.055, bands/lock 0.000, body/lock 0.055) | 0 / 0 | `a18b9624` | fail — craft/lint-gate failure, recorded not hidden |

- No `OUT_OF_BOUNDS` or `ORPHAN_PIXEL` finding on any of the four fresh assets, so AC-3 is satisfied with the two craft failures listed honestly rather than hidden.
- Strict exit 3 (`E_LINT_GATE`) is a craft/lint-gate failure, not a render crash: for humanoid and chest the 1× PNG and debug sheet were still written and the 8× upscale succeeded (exit 0).
- Faithful A views: potion 128×128, sword 256×256. The primary did not supply view dimensions for humanoid or chest; none are claimed here.

## §3 Silhouette diagnostics (FR-4, NFR-2, NFR-5, AC-4)

Values from command 3. These are **diagnostic evidence only** — not comparable to the published gate and never written to `test/art/scores.json`.

| Asset | Rubric exit | Silhouette rating (/5) | Rationale | Retry events | Status |
| --- | --- | --- | --- | --- | --- |
| potion 16×16 | not captured by primary (score obtained) | 5 | Not printed by the dry-run path — see limitation below | none | pass (≥4) |
| sword 32×32 | not captured by primary (score obtained) | 4 | Not printed by the dry-run path — see limitation below | 1 availability retry (try 2) | pass (≥4) |
| humanoid 32×32 | not captured by primary (score obtained) | 5 | Not printed by the dry-run path — see limitation below | 1 availability retry (try 2) | pass (≥4) |
| chest 48×48 | not captured by primary (score obtained) | 5 | Not printed by the dry-run path — see limitation below | none | pass (≥4) |

**Rationale limitation (recorded honestly):** the `--dry-run` path prints only the six integer scores and never the judge rationale (confirmed at `scripts/rubric.mjs:387-394`). No rationale was invented or reconstructed; the rating numbers are the complete diagnostic output available in this mode. All four assets meet the silhouette ≥4/5 product metric, so AC-4 is satisfied.

## §4 `scores.json` hash (AC-8)

| Check | Value |
| --- | --- |
| Before-hash (Phase 1 supplied) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| After-hash | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| Unchanged? | Yes |

No score, rationale, verdict, recipe, fixture or source file was modified. AC-8 is satisfied.

## §5 Documentation remediation — conditional (FR-5, NFR-3, NFR-7, AC-5)

**Decision: SKIP** — no `docs/agent-tool-guide.md` was created, and no re-test was needed.

- **Doc added:** no.
- **Source help material:** n/a (no fix applied).
- **Re-test:** not needed — zero fixes applied, so NFR-7's one-revision/one-re-test maximum was not consumed.
- **Skip reason:** the strict-gate failures are craft choices (palette base contrast, adjacent value separation, op ordering) made by the fresh agent within its 12-call budget, and the lint thresholds were already supplied in `docs/lint-thresholds.md`; they are not a documentation-coverage gap. The docs-only brief already proved legible enough for all four assets to score silhouette ≥4 with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL`.

`docs/agent-tool-guide.md` remains primary-owned and was not touched by the subagent. AC-5 is satisfied by this explicit, reasoned skip with no engine change.

## §6 Notes

- The CLI-parity potion artifact (`.conductor/evidence/agent-legibility/cli-parity/`) is recorded in `agent-runs.md` but was not in the primary-only command list, which names `potion`, `sword`, `humanoid`, `chest` only; no strict/silhouette row was added for it.
- No measurement value in this file was claimed by the phase subagent; all observed results came from the primary's appended run record.
- No credentialed scoring, strict render, upscale, documentation edit, score edit or source edit was performed by this subagent.
