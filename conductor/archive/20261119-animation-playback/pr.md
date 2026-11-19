## Summary

This track adds two additive inspection surfaces for framed recipes: a deterministic `--onion <index>` view that renders a three-panel prev|current|next neighbor strip as a sibling PNG (with transparent boundary panels, no `--out` overwrite, and no normal-render byte change), and an additive `timeline` block on framed `--export` metadata with per-frame millisecond durations, cumulative starts and a total. The flag is discoverable and byte-parity-tested across both CLI and MCP, with no new dependency, encoder, CLI verb, MCP tool or schema change.

## Track

- **ID:** `20261119-animation-playback`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261119-animation-playback/spec.md`](conductor/archive/20261119-animation-playback/spec.md)
- **Plan:** [`conductor/archive/20261119-animation-playback/plan.md`](conductor/archive/20261119-animation-playback/plan.md)
- **Review:** [`conductor/archive/20261119-animation-playback/review.md`](conductor/archive/20261119-animation-playback/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Onion-skin neighbor-strip view | Deterministic prev/current/next sibling PNG with blank boundaries, no normal-render byte change | verified | `3285f28` | Deviation: `vitest.config.ts` adds `test/cli/**/*.test.ts` to the unit project so the new CLI tests run under `pnpm verify`; `test/mcp/reachability.test.ts` temporarily lists `onion` as non-agent until Phase 2. |
| 2: Timeline metadata and agent-facing surfaces | Additive deterministic `timeline`; onion documented across CLI, MCP and docs; envelope unchanged | verified | `8b80d91` | Deviation: `test/mcp/reachability.test.ts` (not in Touches) required by P2.T2.1 to map `onion` to `px_render` and remove the Phase 1 temporary flag. |
| 3: Closeout decision and integrated record | Honest pass/fail with final checks and protected-baseline proof | verified | `c69576e` | All six configured checks pass; protected digests and publishable gate unchanged. |
| R1: Review fixes | Resolve F1 (onion envelope `width` reported frame-0 width) | verified | `7196ab9` | Envelope now reports the emitted strip's width; behavioral regression assertions added. Round-2 re-review: PASS. |

## Requirements

- [x] `FR-1` — `--onion <index>` value flag, framed-only, integer `[0, frames.length]` validation (test: `test/cli/onion.test.ts`, `test/mcp/parity.test.ts`)
- [x] `FR-2` — Deterministic three-panel prev|selected|next sibling PNG with transparent boundaries, no `--out` overwrite (test: `test/render/views.test.ts`, `test/goldens/render.test.ts`)
- [x] `FR-3` — Additive `timeline` on framed `--export`; no key for single-frame (test: `test/mcp/meta-export.test.ts`)
- [x] `FR-4` — Durations in ms, frame 0 omits `duration_ms` and contributes 0, cumulative starts and total (test: `test/mcp/meta-export.test.ts`)
- [x] `FR-5` — Golden onion SHA sidecars, double-render determinism, timeline field-flow (test: `test/goldens/render.test.ts`)
- [x] `FR-6` — CLI help, `px_render` description/schema/`argvFor`, `docs/animation.md`, parity (test: `test/mcp/parity.test.ts`, `test/mcp/reachability.test.ts`)
- [x] `NFR-1` — No byte change to frame-0, hero, anim-duo, sheet, scores, archives or CI (evidence: `verification/decision.md`, git diff)
- [x] `NFR-2` — `pnpm verify` exit 0; scoped coverage ≥80% (evidence: `verification/integrated.md`)
- [x] `NFR-3` — Pure, deterministic functions; no RNG, clock, path or locale (evidence: double-render tests)
- [x] `NFR-4` — No new dependency, encoder, verb, tool or schema; envelope `v:1` additive-only (evidence: diff review, `MCP_TOOLS` = 11)
- [x] `AC-1` … `AC-10` — All acceptance criteria pass (evidence: `verification/integrated.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + lint + typecheck + build | `pnpm verify` | pass — 120 files / 1057 tests | `conductor/archive/20261119-animation-playback/verification/integrated.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass — 95.03% stmts / 85.96% branches / 98.38% funcs / 94.84% lines | `verification/integrated.md` |
| goldens / determinism | `pnpm exec vitest run --project goldens` | pass — 1 file / 6 tests | `verification/phase-3.md` |
| rubric gate | `node scripts/rubric-report.mjs` | pass — mean 3.82 on `gemini-3.5-flash-lite` | `verification/decision.md` |
| protected baseline | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | pass — `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | `verification/decision.md` |
| R1 regression | `pnpm exec vitest run test/mcp/parity.test.ts test/cli/onion.test.ts test/goldens/render.test.ts` | pass — 3 files / 19 tests | `verification/phase-R1.md` |

No media was captured: no capture tooling is appropriate for this CLI/file-diff feature, so golden PNG evidence and verification records are linked instead.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 finding (F1, Low — onion envelope width)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `vitest.config.ts` — added `test/cli/**/*.test.ts` to the unit project; required so the new CLI tests execute under the single `pnpm verify` phase command. Risk: none beyond a wider unit include.
- `test/mcp/reachability.test.ts` — not in the plan's `Touches`, but required by P2.T2.1 to expose `onion` through `px_render` and keep the CLI/MCP reachability ledger accurate. Risk: none; additive to a test-only ledger.
- No protected artifact, score, rationale, golden digest, archive or CI configuration was re-baselined.

## Follow-ups

- none

## Rollback

```bash
# Merge commit (this repository uses merge commits for PRs)
git revert --no-edit -m 1 <merge-commit>
```

No migration, feature flag or data change is involved; reverting the merge restores the prior CLI/MCP surfaces and metadata projection.
