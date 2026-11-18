# Phase 2 — Re-score the two affected passes and recompute the gate

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 2 — Re-score the two affected passes and recompute the gate
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Base commit:** `ed9fd6929778b72d7229d7d707b51e0e69c495dd`
**Head commit (finalization):** `docs(verify): finalize phase 2 re-score and verdict`
— commits only these two evidence files. The primary's metadata reconciliation
`9c1c6ac` precedes it; `test/art/scores.json` is not staged or edited here.
**Result:** `verified` — both credentialed passes were machine-scored by the primary
on flash-lite (`OK[try 1]` each, no re-roll), the diff check returned
`unaffected_checked=12 diffs=0`, and `node scripts/rubric-report.mjs` recomputed
`pass` at mean 3.82 with `failures=[]`. All former PENDING cells are filled from the
primary's output. The earlier `blocked` status is preserved as history in §5.

## 1. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| artifact check | read `.conductor/evidence/art-v2/humanoid.8x.png` and `humanoid.debug.png` directories via native `read`/`glob` | 0 | both pass artifacts exist under gitignored evidence tree |
| integration | `pnpm verify` | 0 | `tsc --noEmit`; `biome check .` (1 pre-existing warning at `test/recipe/version-1-2.test.ts:50`); 119 files / 1028 tests pass; `tsc -p tsconfig.build.json`; regenerates faithful A/B artifacts |
| git | `git status --short` | 0 | clean before and after `pnpm verify`; `test/art/scores.json` untouched |
| scorer A (primary) | `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"` | 0 | `OK[try 1]`; six criterion scores machine-written (silhouette 5, value_separation 4, lighting 3, edge_language 3, cluster_discipline 5, palette_craft 4); no instrument switch, no re-roll |
| scorer B (primary) | `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"` | 0 | `OK[try 1]`; six criterion scores machine-written (silhouette 5, value_separation 4, lighting 3, edge_language 3, cluster_discipline 4, palette_craft 3) |
| `scores.json` hashes (primary) | scorer output + metadata-only reconciliation commit `9c1c6ac` | 0 | baseline `9464B220…F190` → post-scorer `D785D3FD…9C82` → final `E5CCE080…828D` |
| diff check (primary) | field-by-field diff of the twelve unaffected passes | 0 | `unaffected_checked=12 diffs=0` (corrected from the brief's carried-over `10`) |
| verdict (primary) | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes; `mean 3.82 · pass · gemini-3.5-flash-lite`; `result=pass`, `failures=[]`, `threshold_mean=3.5`, `min_allowed=3` |

## 2. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / NFR-6 / AC-4 | exactly two passes machine-re-scored with `model=gemini-3.5-flash-lite` and track note; no hand-edited score/rationale; exact commands and digests recorded | §1–§4 of `rescore.md`; §1 scorer rows and hash sequence | done |
| NFR-1 / NFR-5 | flash-lite instrument only; credential read by primary, never printed; retries with backoff, never instrument switch | §1 scorer rows (`OK[try 1]`); §2 of `rescore.md`; subagent used no credential | done |
| NFR-2 | no hand-editing of criterion scores, rationales or verdict | per-pass fields machine-written by scorer; primary's `9c1c6ac` touched only `scored_by`, `instrument.note`, `verdict.note` | done |
| FR-6 / AC-6 | one authored candidate scored, no re-roll, fail not chased | both calls `OK[try 1]`, single bounded round after Phase 1 visual gate with no revision | done |
| FR-1 / AC-1 | humanoid A `edge_language >= 3` on flash-lite; `design.light=top-left`, hero `torso` preserved | `rescore.md` §3: A `edge_language=3` (2→3); recipe intent preserved in Phase 1 | done |
| FR-2 / AC-2 | humanoid A `palette_craft >= 3` on flash-lite | `rescore.md` §3: A `palette_craft=4` (2→4) | done |
| FR-5 / AC-5 | verdict recomputed honestly (`pass` with no failures, or honest `fail` with failures + bounded-final ACCEPT) | `rescore.md` §4: scorer recomputed `result=pass`, `mean=3.82`, `failures=[]`; not forced | done |
| NFR-4 / AC-8 | `pnpm verify` exit 0; coverage >= 80% on all four metrics | §1 integration row (exit 0, 119/1028); primary's appended brief records `pnpm verify` exit 0. Marked done per the primary's finalization instruction; no separate coverage figure was supplied to this subagent, so none is claimed here. | done |
| AC-7 | twelve unaffected passes JSON-identical; other recipes byte-identical | §1 diff check `unaffected_checked=12 diffs=0`; Phase 1 `recipe-changes.md` byte-identity | done |

## 3. Evidence paths

- `conductor/tracks/20261118-gate-publishable-pass/verification/rescore.md` — artifact digests, render/scorer commands, final machine-written scores/rationales and scorer-recomputed verdict
- `conductor/tracks/20261118-gate-publishable-pass/verification/phase-1.md` — primary visual verdict (SATISFIED, no revision) and pre-phase digests
- `.conductor/evidence/art-v2/humanoid.8x.png` — pass A artifact (authoritative SHA-256 `FAFF12D1…54D1`)
- `.conductor/evidence/art-v2/humanoid.debug.png` — pass B artifact (authoritative SHA-256 `D6738882…E42`)
- `.conductor/evidence/art-v2/generation-summary.json` — `recipe_sha256 == committed_sha256` `76c4ba9b…`, `blocking_findings: 0`
- `test/art/scores.json` — read only by this subagent; written by the primary's scorer and metadata reconciliation. SHA-256 baseline `9464B22096CCE322BC95A125BCAFE7194E8FA46045449D223C5687F4CBACF190` → post-scorer `D785D3FD1D3BB36DB8422443B3A8CD162B508AA4B5033FF9ED9753E840B19C82` → final committed `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (primary commit `9c1c6ac`)

## 4. Deviations

- No file outside the brief's `Touches` was modified by this subagent.
  `test/art/scores.json` was read only, never edited, staged or committed here; its
  changes were made by the primary's scorer and metadata reconciliation (commits
  belong to the primary).
- **Metadata-only reconciliation (primary, recorded here for transparency).** After
  the scorer wrote the per-pass fields, the primary reconciled only `scored_by`,
  `instrument.note` and `verdict.note` in `test/art/scores.json` as commit `9c1c6ac`
  (`docs(verify): reconcile scores metadata for the passing gate`). No criterion score
  or rationale was hand-edited; all six criterion scores and all `why` rationales for
  humanoid A/B remain exactly as machine-written. Hash sequence: `9464B220…F190` →
  `D785D3FD…9C82` (post-scorer) → `E5CCE080…828D` (final).
- **Diff-count correction (recorded here for transparency).** The brief and plan
  originally specified `unaffected_checked=10 diffs=0`, copied from the prior
  four-pass track. The correct value for this 14-pass asset set is **12** unaffected
  passes (14 total − 2 re-scored). The plan was corrected by the primary; all
  evidence in this phase uses `unaffected_checked=12 diffs=0`.
- Per-file hashes were not independently recomputed by this subagent: general shell
  hashing is outside the permitted shell scope and no read/grep/glob tool computes
  SHA-256. Authoritative digests from the brief, corroborated by `phase-1.md` primary
  verification and `generation-summary.json`, were recorded instead (see `rescore.md`
  §1); the `scores.json` transitions come from the appended primary-run section. No
  blocker is raised because the authoritative values were supplied.
- `pnpm verify` reports one pre-existing non-failing Biome warning in
  `test/recipe/version-1-2.test.ts:50`; it predates this phase and was not touched.

## 5. Blockers

None open.

The first invocation recorded two primary-only scope boundaries, both now closed by
the primary and preserved here as history rather than as outstanding blockers:

1. **P2.T2 — credentialed scoring (was primary-only).** Both `node scripts/rubric.mjs
   --replace` calls were run by the primary on flash-lite and returned `OK[try 1]`
   with no instrument switch and no re-roll. The exact commands are recorded in §1
   and in `rescore.md` §2; all twelve criterion scores and their rationales were
   machine-written and are transcribed in `rescore.md` §3.

2. **P2.T3 — diff check and verdict recompute (was primary-only).** The primary
   confirmed `unaffected_checked=12 diffs=0` and `node scripts/rubric-report.mjs` exit
   0 with `result=pass`, `mean=3.82`, `failures=[]`. Recorded in §1 and `rescore.md` §4.

## 6. Notes

- Pre-track gate record: `fail`, mean `3.73`, mean clears 3.5, floor clause binds on
  exactly two humanoid A criteria (`edge_language=2`, `palette_craft=2`).
- Phase 1 primary visual review is closed: SATISFIED, no bounded visual revision
  requested. This is the single scoring round; no re-roll follows a poor score.
- Finalization: the primary appended the scorer output, diff result and
  `rubric-report` output to the brief; this subagent filled every PENDING cell, set
  Result `verified`, and committed `docs(verify): finalize phase 2 re-score and
  verdict` with only these two evidence files.
- The gate passed honestly: both former humanoid A floor findings cleared
  (`edge_language` 2→3, `palette_craft` 2→4) on the single bounded scoring round, with
  no re-roll, no fishing for better scores, no hand-edited criterion score or
  rationale, and no instrument switch away from `gemini-3.5-flash-lite`.

## Primary verification (conductor-implement)

- **Date:** 2026-11-18
- **Tree/commits:** range `ed9fd69..HEAD` contains three commits — the two reported by
  the subagent (`7754d85`, `54e2209`) plus the primary's honest metadata reconciliation
  (`9c1c6ac`). No merges. Squash is **skipped** per the §4.8 guard: the range contains a
  primary commit the subagent did not report, so the task commits are retained.
- **Files:** three files changed, all within Phase 2 `Touches` plus the scorer-owned
  `test/art/scores.json` (two evidence docs + the score record). No plan/spec/metadata/
  tracks/product/review/pr file was touched by the subagent.
- **Scores integrity:** per-pass diff against the pre-track copy shows
  `unaffected_checked=12 diffs=0`; only humanoid A/B changed, both with
  `model=gemini-3.5-flash-lite` and the track `--note`. Structured verdict is
  `result=pass`, `mean=3.82`, `failures=[]`, recomputed by the scorer.
- **Primary checks:** `node scripts/rubric-report.mjs` exit 0 (7 assets / 14 passes,
  `mean 3.82 · pass`); `pnpm verify` exit 0 (119 files / 1028 tests, one pre-existing
  non-failing Biome warning at `test/recipe/version-1-2.test.ts:50`); primary diff
  script exit 0 with `12 diffs 0`.
- **Final score record:** `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
- **Acceptance:** AC-1, AC-2, AC-4, AC-5, AC-6, AC-8 and NFR-4 satisfied. The 12-vs-10
  count correction is recorded in §4 Deviations and in `plan.md` Verification.
