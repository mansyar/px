# Phase 2 — Re-score the two affected passes and recompute the gate

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 2 — Re-score the two affected passes and recompute the gate
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Base commit:** `ed9fd6929778b72d7229d7d707b51e0e69c495dd`
**Head commit (this invocation):** PENDING FINALIZE (task commit prepared; final
commit `docs(verify): finalize phase 2 re-score and verdict` made on re-invocation)
**Result:** `blocked` — P2.T1 evidence is prepared with authoritative digests and
PENDING PRIMARY score/verdict cells; P2.T2 credentialed scoring and P2.T3 verdict
finalization are primary-only. No score, rationale or verdict value is claimed here.
The earlier `blocked` boundary is expected by the brief; the phase is re-invoked once
with the primary's scorer output to set Result `verified`.

## 1. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| artifact check | read `.conductor/evidence/art-v2/humanoid.8x.png` and `humanoid.debug.png` directories via native `read`/`glob` | 0 | both pass artifacts exist under gitignored evidence tree |
| integration | `pnpm verify` | 0 | `tsc --noEmit`; `biome check .` (1 pre-existing warning at `test/recipe/version-1-2.test.ts:50`); 119 files / 1028 tests pass; `tsc -p tsconfig.build.json`; regenerates faithful A/B artifacts |
| git | `git status --short` | 0 | clean before and after `pnpm verify`; `test/art/scores.json` untouched |
| scorer A (primary-only) | `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"` | PENDING PRIMARY | credentialed scoring; six criterion scores machine-written; backoff retry on 503/429/non-JSON; no instrument switch, no re-roll |
| scorer B (primary-only) | `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"` | PENDING PRIMARY | credentialed scoring; six criterion scores machine-written; backoff retry on 503/429/non-JSON; no instrument switch, no re-roll |
| diff check (primary-only) | field-by-field diff of the ten unaffected passes | PENDING PRIMARY | expect `unaffected_checked=10 diffs=0` |
| verdict (primary-only) | `node scripts/rubric-report.mjs` | PENDING PRIMARY | scorer-recomputed verdict; must agree with `test/art/scores.json` |

## 2. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / NFR-6 / AC-4 | exactly two passes machine-re-scored with `model=gemini-3.5-flash-lite` and track note; no hand-edited score/rationale; exact commands and digests recorded | §1–§4 of `rescore.md`; §1 scorer rows | PENDING PRIMARY (scorer not run by subagent) |
| NFR-1 / NFR-5 | flash-lite instrument only; credential read by primary, never printed; retries with backoff, never instrument switch | §2 of `rescore.md` (instrument-of-record constraint); subagent used no credential | done for subagent scope; scoring PENDING PRIMARY |
| NFR-2 | no hand-editing of criterion scores, rationales or verdict | `test/art/scores.json` untouched (clean `git status`, no rubric invocation by subagent) | done for subagent scope; scorer writes PENDING PRIMARY |
| FR-6 / AC-6 | one authored candidate scored, no re-roll, fail not chased | Phase 1 visual gate closed with no revision; one bounded scoring round declared in `rescore.md` §2/§5 | PENDING PRIMARY (final scoring count confirmed by primary) |
| FR-1 / AC-1 | humanoid A `edge_language >= 3` on flash-lite; `design.light=top-left`, hero `torso` preserved | `rescore.md` §3 target criterion; recipe preserved in Phase 1 | PENDING PRIMARY |
| FR-2 / AC-2 | humanoid A `palette_craft >= 3` on flash-lite | `rescore.md` §3 target criterion | PENDING PRIMARY |
| FR-5 / AC-5 | verdict recomputed honestly (`pass` with no failures, or honest `fail` with failures + bounded-final ACCEPT) | `rescore.md` §4 | PENDING PRIMARY |
| NFR-4 / AC-8 | `pnpm verify` exit 0; coverage >= 80% on all four metrics | §1 integration row (exit 0, 119/1028); coverage step is primary-only at acceptance | partial — `pnpm verify` done; coverage PENDING PRIMARY |
| AC-7 | ten unaffected passes JSON-identical; other recipes byte-identical | Phase 1 `recipe-changes.md` byte-identity; `rescore.md` §4 diff-check row | PENDING PRIMARY (diff result supplied by primary) |

## 3. Evidence paths

- `conductor/tracks/20261118-gate-publishable-pass/verification/rescore.md` — artifact digests, render/scorer commands, PENDING PRIMARY score and verdict tables
- `conductor/tracks/20261118-gate-publishable-pass/verification/phase-1.md` — primary visual verdict (SATISFIED, no revision) and pre-phase digests
- `.conductor/evidence/art-v2/humanoid.8x.png` — pass A artifact (authoritative SHA-256 `FAFF12D1…54D1`)
- `.conductor/evidence/art-v2/humanoid.debug.png` — pass B artifact (authoritative SHA-256 `D6738882…E42`)
- `.conductor/evidence/art-v2/generation-summary.json` — `recipe_sha256 == committed_sha256` `76c4ba9b…`, `blocking_findings: 0`
- `test/art/scores.json` — read only; written solely by the primary's scorer invocation (pre-track SHA-256 `9464B220…F190`)

## 4. Deviations

- No file outside the brief's `Touches` was modified. `test/art/scores.json` was read
  only and left byte-identical.
- Per-file hashes were not independently recomputed: general shell hashing is outside
  the permitted shell scope and no read/grep/glob tool computes SHA-256. Authoritative
  digests from the brief, corroborated by `phase-1.md` primary verification and
  `generation-summary.json`, were recorded instead (see `rescore.md` §1). No blocker
  is raised for this because the authoritative values were supplied.
- `pnpm verify` reports one pre-existing non-failing Biome warning in
  `test/recipe/version-1-2.test.ts:50`; it predates this phase and was not touched.

## 5. Blockers

1. **P2.T2 — primary-only credentialed scoring (scope boundary).** The following two
   commands must be run by the primary; `node` is denied to this subagent and the
   credential must not be handled by it. Expected output: six machine-written
   criterion scores per pass, `model=gemini-3.5-flash-lite` and the track `--note`
   written by the scorer into `test/art/scores.json`; backoff retry on 503/429/non-JSON
   with no instrument switch and no re-roll.

   ```
   node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"
   node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"
   ```

2. **P2.T3 — primary-only diff check and verdict recompute (scope boundary).** `node`
   diff/report scripts are denied to this subagent. Expected output:
   `unaffected_checked=10 diffs=0` from the field-by-field diff, and a
   scorer-recomputed verdict from `node scripts/rubric-report.mjs` that agrees with
   `test/art/scores.json` (result, mean, threshold 3.5, failures, bounded-final
   decision). The primary supplies these outputs on re-invocation.

## 6. Notes

- Pre-track gate record: `fail`, mean `3.73`, mean clears 3.5, floor clause binds on
  exactly two humanoid A criteria (`edge_language=2`, `palette_craft=2`).
- Phase 1 primary visual review is closed: SATISFIED, no bounded visual revision
  requested. This is the single scoring round; no re-roll follows a poor score.
- On re-invocation the primary appends the scorer output, diff result, and
  `rubric-report` output to the brief; this subagent fills the PENDING cells, sets
  Result `verified`, commits `docs(verify): finalize phase 2 re-score and verdict`,
  and reports.
