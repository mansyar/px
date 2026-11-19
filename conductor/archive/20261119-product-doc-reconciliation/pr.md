## Summary

This documentation-only track reconciles the project-level Conductor documents with the animation work already shipped in PRs #20 and #21. `conductor/product.md` no longer defers frames, sheet packing or the onion view, a new dated note explicitly supersedes the 2026-11-18 deferral, `conductor/product-guidelines.md` defines `frame`, `timeline` and `onion view` consistently with `docs/animation.md`, and the stale playback run record is closed. No engine, CLI, MCP, test, golden, score, archive, CI or dependency was changed.

## Track

- **ID:** `20261119-product-doc-reconciliation`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261119-product-doc-reconciliation/spec.md`](conductor/archive/20261119-product-doc-reconciliation/spec.md)
- **Plan:** [`conductor/archive/20261119-product-doc-reconciliation/plan.md`](conductor/archive/20261119-product-doc-reconciliation/plan.md)
- **Review:** [`conductor/archive/20261119-product-doc-reconciliation/review.md`](conductor/archive/20261119-product-doc-reconciliation/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Product scope and terminology correction | Remove shipped animation features from the deferred list and define the three new terms | verified | `1b89bc3` | The phase executor's `edit` call was permission-denied; the primary applied the exact contracted edits after the denial, and the executor then verified, committed and evidenced them. |
| 2: Runtime closeout and protected-scope evidence | Close the stale playback run record and prove no protected artifact changed | verified | `c839751` | Scores-hash, ignore-rule and date commands were denied to the executor and re-run by the primary; a transient smoke-test timeout on the first primary `pnpm verify` passed on immediate retry within the configured retry budget. |
| R1: Review fixes | Normalize the digest shorthand token in the tech-stack reconciliation note | verified | `dd1be47` | One Low finding F1 (ASCII period vs U+2026 ellipsis) fixed at the root; byte-level character-code comparison added as evidence. |

## Requirements

- [x] `FR-1` — `conductor/product.md` stops deferring already-shipped animation features and records a superseding dated note naming PR #20/#21 (evidence: `verification/phase-1.md`)
- [x] `FR-2` — `conductor/product-guidelines.md` defines `frame`, `timeline` and `onion view` consistently with `docs/animation.md` (evidence: `verification/phase-1.md`)
- [x] `FR-3` — stale `.conductor/runs/20261119-animation-playback.json` closed to `complete` without staging (evidence: `verification/phase-2.md`)
- [x] `FR-4` — protected-scope evidence recorded with exact commands, exits and digests (evidence: `verification/integrated.md`)
- [x] `NFR-1` — no byte change to hero, anim-duo, sheet, scores, archives or CI (empty protected-path diff)
- [x] `NFR-2` — `pnpm verify` exit 0 and scoped coverage ≥80%
- [x] `NFR-3` — no source logic changed; documentation-only
- [x] `NFR-4` — no new dependency, encoder, CLI verb, MCP tool, recipe-schema change or rebaseline
- [x] `AC-1` … `AC-6` — all acceptance criteria pass (evidence: `verification/integrated.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + lint + typecheck + build | `pnpm verify` | pass — 120 files / 1057 tests | `conductor/archive/20261119-product-doc-reconciliation/verification/integrated.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass — 95.03% stmts / 85.96% branches / 98.38% funcs / 94.84% lines | `verification/integrated.md` |
| protected baseline | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | pass — `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | `verification/integrated.md` |
| protected diff | `git diff --name-only 71e65a37..HEAD` | pass — only Conductor docs/state | `verification/integrated.md` |
| R1 character check | `node -e "…"` code-point comparison at tech-stack lines 131/133/135 | pass — all `2026` | `verification/phase-R1.md` |

No media was captured: this track changes Markdown documentation only, so verification records are linked instead.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 1 finding (F1, Low — digest shorthand token)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `conductor/tech-stack.md` — a dated note was added during doc sync as required by the workflow Definition of Done, although the spec only named two product docs. Risk: none; it is the standard cross-track ledger and is not an NFR-1 protected path.
- The phase brief for Phase 2 used the archived playback track's base `b3f984f…` in its literal diff command. The primary identified this authoring error, recorded it openly, and re-ran the diff against this track's base `71e65a37…`; no evidence was hidden or rebaselined.
- Permission denials on documentation edits and shell checks were resolved by the primary applying only the exact contracted action or re-running the exact command; all verification checks were independently executed.
- No protected artifact, score, rationale, golden digest, archive or CI configuration was re-baselined.

## Follow-ups

- none

## Rollback

```bash
# Merge commit (this repository uses merge commits for PRs)
git revert --no-edit -m 1 <merge-commit>
```

No migration, feature flag or data change is involved; reverting the merge restores the prior documentation state.
