## Summary

This evidence-only chore verifies that a fresh agent can author a valid framed animation using only the documented CLI/MCP frame-authoring surface. It records a docs-only brief and a three-surface parity matrix, runs two fresh-agent authoring sequences (one replay), validates strict zero-finding exports with byte determinism, and issues a mechanical `PASS` verdict from four hard gates. No engine, CLI, MCP, docs, golden, rubric, CI, or dependency changes were made ΓÇö all artifacts live under the track's Conductor verification directory.

## Track

- **ID:** `20261121-animation-agent-legibility`
- **Type:** chore
- **Spec:** [`conductor/archive/20261121-animation-agent-legibility/spec.md`](conductor/archive/20261121-animation-agent-legibility/spec.md)
- **Plan:** [`conductor/archive/20261121-animation-agent-legibility/plan.md`](conductor/archive/20261121-animation-agent-legibility/plan.md)
- **Review:** [`conductor/archive/20261121-animation-agent-legibility/review.md`](conductor/archive/20261121-animation-agent-legibility/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Build the docs-only brief and parity matrix | Produce a sole-material brief and 6├ù12 three-surface parity matrix | verified | `f42e931` | `--help --json` unsupported (E_USAGE); plain `--help` emits JSON verbatim. Parity notes record three doc/help imprecisions (not fixed ΓÇö evidence-only). |
| 2: Run the fresh-agent benchmark and verify determinism | Two 9-call agent runs, strict validation, export, SHA-256 determinism | verified | `21929ac` | Both recipes have empty `ops` (`pixel_count: 0`), disclosed honestly. All five artifact SHA-256 pairs identical across runs. |
| 3: Record the verdict and confirm scope | Final PASS verdict + scope boundary | verified | `02ed637` | Verdict derived mechanically from four hard gates; call count (9) advisory per NFR-3. |
| R1: Review fixes | Resolve F1 (stale hashes/scope) and F2 (spec overstatement) | verified | `4cebbfd` | Transient hashes relabeled with reachable checkpoints; spec corrected to add/list/init only. Independently re-reviewed PASS. |

## Requirements

- [x] `FR-1` ΓÇö docs-only brief built from six consulted sources (evidence: `verification/docs-brief.md`)
- [x] `FR-2` ΓÇö 16├ù16 four-frame flame authored by a fresh agent from docs only (evidence: `verification/artifacts/run-1/`)
- [x] `FR-3` ΓÇö tool-call sequence recorded in order (evidence: `verification/agent-runs.md`, both `calls.md`)
- [x] `FR-4` ΓÇö strict validation reports zero `OUT_OF_BOUNDS`/`ORPHAN_PIXEL` (evidence: `verification/determinism.md`)
- [x] `FR-5` ΓÇö `render --export` produces sheet PNG + timeline metadata (`total_ms: 360`)
- [x] `FR-6` ΓÇö byte determinism: recipe, sheet PNG, timeline metadata identical across two runs
- [x] `FR-7` ΓÇö three-surface parity matrix: 6 subcommands ├ù 12 flags (evidence: `verification/parity-matrix.md`)
- [x] `FR-8` ΓÇö final verdict report with artifact index and follow-ups (evidence: `verification/agent-legibility.md`)
- [x] `NFR-1` ΓÇö evidence confined to the track verification directory
- [x] `NFR-2` ΓÇö no engine/CLI/MCP/docs/golden/CI changes
- [x] `NFR-3` ΓÇö verdict from hard gates only; call count advisory
- [x] `NFR-4` ΓÇö no new runtime dependency
- [x] `AC-1`ΓÇô`AC-10` ΓÇö all covered (see `review.md` requirements table)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit/integration/smoke/goldens + typecheck/lint/build | `pnpm verify` | pass | `conductor/archive/20261121-animation-agent-legibility/verification/integrated.md` (123 files / 1111 tests) |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | 120 files / 1079 tests; 94.89% stmts, 85.81% branches, 98.3% funcs, 94.69% lines |
| strict validation | `pnpm exec tsx src/cli.ts validate --file <recipe> --strict` (both runs) | pass | zero findings/warnings, `pixel_count: 0` disclosed |
| byte determinism | `Get-FileHash -Algorithm SHA256` + `git diff --no-index` (five artifact pairs) | pass | recipe `bb80778cΓÇª`, sheet `f69146f2ΓÇª`, sheet meta `d7b75d7cΓÇª` identical across runs |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (F1 stale/unreachable hashes and scope diff; F2 spec overstatement)
- **Accepted/deferred:** 0 blocking (four non-gating follow-ups recorded: empty-ops art, advisory call count, three doc/help imprecisions, one pre-existing Biome warning)

## Deviations and risks

- Fresh-agent runs used the replay strategy permitted by FR-6: run 1 authored from the brief, run 2 replayed the identical 9-call sequence. Both are recorded in full; call count (9) is advisory, not gating.
- The flame recipe has empty `ops`; strict validation exercised the gate but not against real pixel findings. Disclosed as a follow-up; the verification objective (authoring workflow legibility) does not depend on painted pixels.
- Doc/help imprecisions found by the parity matrix (flat CLI `flags` omits six frame flags; `strict` declared differently; `--help --json` unsupported; docs imply `list` accepts `--out`) are recorded, not fixed (evidence-only scope).

## Follow-ups

- none (no blocking follow-ups; non-gating observations above are recorded in `agent-legibility.md`)

## Rollback

```bash
# Merge commit (fill in after merge)
git revert --no-edit -m 1 <merge-commit>
```

Evidence-only: removing this track's commits and archive entry fully reverts it. No data migration, feature flag, or runtime state involved.
