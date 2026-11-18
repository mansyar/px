# Agent Legibility Verification - Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A bounded verification of the product success metric at `conductor/product.md:29`: a fresh agent, given only tool documentation, must complete the four benchmark assets (16×16 potion, 32×32 sword, 32×32 humanoid, 48×48 chest) within 12 tool calls each, with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` findings and silhouette rated 4/5 or better. This track delivers an evidence record, MCP-first tool-surface coverage plus a CLI parity check, and — only if failures are documentation-caused — one bounded documentation revision and re-test. It makes no engine, art, scoring, or dependency changes.

## Problem / Motivation

All 15 tracks are archived, the publishable gate passes at mean 3.82 with zero below-floor criteria, and recorded benchmark transcripts use 7–10 calls with clean strict renders and silhouette 5/5 on the canonical assets. What remains unmeasured is the "fresh agent, docs only" condition: calibration explicitly records judge calls (28 attempted, 6 rejected), not an authoring/inspection split, and there is no README or agent tool guide — only CLI `--help` JSON, MCP tool descriptions, and three `docs/*.md` files. Without verification, Phase 1's agent-legibility claim rests on fixtures authored with full project context rather than on the documented tool contract alone.

## Goals & Success Metrics

- **Goal:** Determine whether a fresh, docs-only agent can reproduce the four benchmark assets against the published call, lint and silhouette bar using MCP tools first, with a CLI parity check.
- **Metric:** `verification/agent-legibility.md` records, for each asset, the ordered call transcript and count, strict-render lint findings, a silhouette diagnostic, and an honest per-asset verdict. Documentation gaps are fixed once and re-tested once if they cause failure.

## Scope

### In Scope

- Assemble a docs-only brief from CLI `--help` JSON, MCP tool descriptions, `docs/art-profiles.md`, `docs/lint-thresholds.md`, and the silhouette anchors in `docs/rubric.md`; explicitly exclude source, tests, benchmark transcripts, v2 recipes, scores, and archived verification.
- Launch a fresh subagent with that brief to author all four assets via px tools, recording each call and its arguments; MCP-first with a bounded CLI parity check.
- Primary re-renders each fresh recipe with `--strict` and records lint findings.
- Primary runs `node scripts/rubric.mjs --dry-run --model gemini-3.5-flash-lite` on each fresh render to record silhouette as diagnostic evidence only.
- If a failure is documentation-caused, add one concise `docs/agent-tool-guide.md` derived from existing help and re-test once; otherwise record honest gaps.
- Record the final honest decision and bounded-stop statement.

### Out of Scope

- Engine, CLI, MCP, op, linter, rubric, CI, or workflow configuration changes.
- New dependencies.
- Changes to `test/art/scores.json`, fixtures, v1/v2 digests, or goldens; credentialed writes to scores; cross-instrument score comparison.
- Phase 2 features (animation, onion-skinning, sprite-sheet packing, tilemaps, GUI, translucent alpha, RNG, npm publish).
- GitHub issues, archived artifact edits, merge decisions, or any scoring-pass fishing.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A docs-only brief is assembled with an inventory of included and explicitly excluded sources. | must |
| FR-2 | Four fresh-agent asset runs produce ordered call transcripts and counts, MCP-first. | must |
| FR-3 | Each fresh artifact is strictly re-rendered by the primary and lint findings are recorded. | must |
| FR-4 | Each fresh artifact receives a silhouette diagnostic via flash-lite `--dry-run`, recorded only in evidence. | must |
| FR-5 | A bounded documentation revision and one re-test occur only when failures are documentation-caused. | should |
| FR-6 | An honest final decision records a pass or a documented fail with follow-ups. | must |
| FR-7 | A CLI parity check is recorded alongside the MCP results. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Docs-only isolation: no source, test, recipe, score, or transcript leakage into the fresh agent; brief contents are recorded. |
| NFR-2 | No score, rationale, or verdict edits; dry-run only; flash-lite only; no cross-instrument comparison. |
| NFR-3 | No new dependencies or engine/tool changes; any doc fix derives from existing help material. |
| NFR-4 | Final `pnpm verify` exits 0 and no code delta exists except permitted documentation. |
| NFR-5 | Credentialed scorer runs are primary-only via environment variable; the key is never printed; 503/429/non-JSON failures are retried with backoff and otherwise recorded as blocked. |
| NFR-6 | Exact commands, paths, digests, and transcripts are recorded in verification evidence; binaries remain gitignored under `.conductor/evidence/`. |
| NFR-7 | At most one documentation revision and one re-test cycle; no score re-roll, fishing, or forced pass. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A brief inventory exists and excludes all forbidden sources. | FR-1 |
| AC-2 | Four transcripts exist with call counts and tool surfaces; all counts are ≤12 or honest failures are listed. | FR-2, FR-7 |
| AC-3 | Four strict renders exist with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` findings or honest failures are listed. | FR-3 |
| AC-4 | Four silhouette diagnostics are ≥4 or honest failures are listed. | FR-4, FR-6 |
| AC-5 | Documentation fix and re-test evidence is present only if failures are documentation-caused; no engine change occurred. | FR-5 |
| AC-6 | The final decision is honest: pass, or documented fail with follow-ups; no forced pass. | FR-6 |
| AC-7 | Final `pnpm verify` exits 0 and the code delta is empty except permitted docs. | NFR-3, NFR-4 |
| AC-8 | `test/art/scores.json` hash is unchanged and the gate is untouched. | NFR-2 |

## Edge Cases

- The fresh agent refuses or cannot finish: record an honest blocked/fail state and never fabricate a transcript.
- The scorer returns 503, 429, quota exhaustion, or non-JSON: retry with backoff; if unavailable, record an honest blocked state rather than switching instruments or inventing scores.
- A call budget is exceeded: record the failure; do not re-roll or silently discount calls.
- A documentation fix is applied but the re-test still fails: accept the fail with follow-ups rather than iterate further.
- MCP tools are unavailable to the fresh agent: fall back to CLI, record the deviation explicitly, and do not claim MCP coverage.
- Fresh artifacts differ from canonical v2 assets: this is expected; never overwrite fixtures, sidecars, goldens, or scores.

## Dependencies

- **Tracks:** `20261118-gate-publishable-pass` and `20261118-phase1-closeout-audit` (both complete and merged).
- **External:** credential at `C:\Users\Ansyar\.config\opencode\opencode.json` (`mcp.agent-vision.environment`); local px MCP server declared in `opencode.json`.

## Open Questions & Assumptions

- **Assumption:** A fresh subagent can be given a bounded docs-only brief and is trusted to self-record its calls; the primary cross-checks artifacts and hashes where possible.
- **Assumption:** CLI `--help` JSON plus MCP tool descriptions plus `docs/*.md` constitute the tool documentation available today; no README exists.
- **Assumption:** Flash-lite dry-run silhouette scores are diagnostic only and are not comparable to published gate scores.
- **Assumption:** One bounded documentation revision is sufficient if a failure is documentation-caused.

## References

- `conductor/product.md:29,96,98` — success metric and Phase 1 closeout notes.
- `docs/rubric.md`, `docs/art-profiles.md`, `docs/lint-thresholds.md`.
- `opencode.json` — local px MCP server declaration.
- Benchmark transcripts under `test/art/` and the v2 asset set under `test/art/v2/`.
- `test/art/scores.json` — published gate record (mean 3.82, pass).
- `conductor/archive/20261118-phase1-closeout-audit/verification/` — closeout audit evidence.
