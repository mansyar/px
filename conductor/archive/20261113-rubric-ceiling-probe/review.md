# Review: Rubric Ceiling Probe

- **Track:** `20261113-rubric-ceiling-probe`
- **Type:** `feature`
- **Branch:** `feat/20261113-rubric-ceiling-probe`
- **Range:** `e854197..81eb1b1` (fixes after this range are in Phase R1)
- **Date:** 2026-11-13
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The probe answered its question. Nine candidates fixed by hash before the first
call produced one demonstrated 4-anchor: `palette_craft/hue-ramp` scored 4 on both
passes. `lighting/warm-cool` reached 4 on the plain 8× pass and 3 on the debug
sheet, and all three edge-language treatments landed at 3/3.

Everything the track promised is present and verifiable: the registry with hashes,
the guard that aborts a tampered recipe before any call, the report with all nine
candidates and both rationales each, the docs section, and an unchanged recorded
score file. `pnpm verify` is green at 861 tests.

Three medium/low findings were introduced by this diff and fixed in Phase R1. The
most consequential was that the committed registry stored Windows paths, which
would not resolve on the Ubuntu half of CI.

This host has no `conductor-reviewer` subagent, so the review was performed by the
primary agent on its own diff; that weakens independence and is stated rather than
implied.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `pnpm typecheck && pnpm lint && pnpm build` | pass | `pnpm verify` |
| unit | `pnpm vitest run --project unit` | pass | 861 tests |
| integration | `pnpm vitest run --project integration` | pass | included |
| smoke | `pnpm vitest run --project smoke` | pass | included |
| determinism | `pnpm vitest run --project goldens` | pass | no golden changed |
| coverage | `pnpm vitest run --coverage` | not run | scope is `src/core` and `src/lint`; the diff changes neither |
| probe | `node scripts/calibrate.mjs --probes` | pass | 20 calls, report committed |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1–T2, `scripts/calibrate/ceiling.mjs` | `candidates.json`, 9 hashes | covered |
| FR-2 | P1.T3 | 8× and debug artifacts per candidate | covered |
| FR-3 | P2.T1 | 20 scoring calls, two passes each | covered |
| FR-4 | P2.T3 | `probe.json`, `probe.md` | covered |
| FR-5 | P2.T3 | three verdicts | covered |
| FR-6 | P2.T2 | tampered-recipe abort, exit 1 | covered |
| FR-7 | P4.T1 | `docs/rubric.md`, Ceiling probes | covered |
| FR-8 | all phases | `test/art` and archive diffs empty | covered |
| NFR-1 | P1 | 9/9 hashes match after re-running the generator | covered |
| NFR-2 | P2 | record byte-identical after 20 calls | covered |
| NFR-3 | P3 | 18 + 2 calls, retries capped at 4 | covered |
| NFR-4 | P2 | credential read by reference only | covered |
| NFR-5 | P4 | `pnpm verify` exit 0 | covered |
| AC-1 | P1, P2 | hashes registered then verified per pass | covered |
| AC-2 | P3 | 18 scores recorded | covered |
| AC-3 | P3 | all nine in the report with rationales | covered |
| AC-4 | P3 | per-criterion verdicts | covered |
| AC-5 | P4 | docs repeat verdicts and quote rationales | covered |
| AC-6 | P3 | `git diff test/art/scores.json` empty | covered |
| AC-7 | P4 | no `test/art`, archive or tier change | covered |
| AC-8 | P4 | `pnpm verify` exit 0 | covered |

## Findings

### Critical

- None.

### High

- None.

### Medium

- **F1 — committed artifacts stored Windows-only paths** (fixed in R1)
  - **File:** `conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling/candidates.json`
  - **What:** recipe and artifact paths were written with `path.join` on Windows, so the registry held `.conductor\evidence\…`.
  - **Why:** the file is committed and read on both CI platforms; on Ubuntu the backslashes would be part of the filename, and a probe run there would fail.
  - **Fix:** the generator normalises to `/` before writing; both JSON files verified to contain zero backslashes.
  - **Requirement:** FR-1
  - **Test gap:** none — CI runs the build on both platforms, but no step reads the registry on Linux.

### Low

- **F2 — a merged report did not say what it re-scored** (fixed in R1)
  - **File:** `scripts/calibrate.mjs`
  - **What:** `--merge` replaced candidate entries and summed call counts, but the report carried no record of which candidates came from the re-score.
  - **Fix:** `merged_candidates` lists them.
  - **Requirement:** FR-4

- **F3 — a registry without artifacts threw a `TypeError`** (fixed in R1)
  - **File:** `scripts/calibrate.mjs`
  - **What:** running `ceiling.mjs --no-render` strips artifact paths, and a later probe run dereferenced `undefined`.
  - **Fix:** a named error explains that the generator must run without `--no-render`.
  - **Requirement:** FR-2

- **F4 — `scripts/` remains outside lint, typecheck and the test suite** (accepted debt)
  - **File:** `biome.json`, `tsconfig.json`, `vitest.config.ts`
  - **What:** the probe logic and the generator are exercised only by live runs.
  - **Why:** a regression in verdict arithmetic would be silent until someone read a report.
  - **Fix:** bring `scripts/` into the static layer in a dedicated change.
  - **Requirement:** NFR-5

## Overrides

- None needed.

## Plan compliance

Four phases and 14 tasks, all verified. Phase R1 was appended by this review and
is verified. The diff stays inside the union of the phases' `Touches` plus the R1
additions.

## Out of scope

- Applying the hue-shifted ramp to the seven recorded assets; spec FR-8 excludes
  asset changes, and re-scoring them is a separate decision.
- Raising the lighting or edge-language targets; the evidence does not support it
  on both passes.

## Debt

- F4: `scripts/` unlinted and untypechecked. Accepted; under the Workflow Config's
  `min_severity: medium` it does not qualify for an issue.

## Doc sync

`updated` — `docs/rubric.md` gained the Ceiling probes section and the
`palette_craft` target moved from 3.0 to 4.0 on the demonstrated anchor.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 3 | 3 |
