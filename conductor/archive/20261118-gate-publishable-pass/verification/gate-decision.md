# Gate decision — Phase 3 (Gate Publishable Pass)

**Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
**Phase:** 3 — Gate decision and bounded-stop record
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-publishable-pass`
**Phase base:** `37b362234390a9490930c12477b5a601c4e18520`
**Covers:** FR-5, FR-6, AC-5, AC-6
**Instrument of record:** `gemini-3.5-flash-lite` only (inherited, user-authorized; no instrument switching, no cross-instrument comparison)
**Result:** `verified` — the Phase 3 evidence work is complete and honestly recorded. The publishable gate **PASSED** on the single bounded scoring round; this is a recorded quality win, not a manufactured or forced pass.

## 1. Final verdict (P3.T1)

The verdict in `test/art/scores.json` was recomputed by the scorer
(`scripts/rubric.mjs --replace`) from the two re-scored humanoid passes plus the
twelve unchanged passes — all 14 passes. It is recorded here verbatim; no value
was revised by hand.

| Field | Value | Source |
| --- | --- | --- |
| Result | `pass` | `verdict.result` |
| Mean | **3.82** | `verdict.mean` |
| Threshold (mean) | 3.5 — cleared | `verdict.threshold_mean` |
| Floor (min allowed, per criterion/pass) | 3 — cleared, **zero** failures | `verdict.min_allowed` |
| Below-floor count | 0 | `verdict.failures[]` = `[]` |
| Instrument of record | `gemini-3.5-flash-lite` | `instrument.model` (inherited, user-authorized promotion) |
| Passes scored | 14 (7 assets × 2 views) | `assets[].passes[]` |
| Basis | `independent` | `verdict.basis` |
| Schema | 3 | `schema` |
| Scored at | 2026-11-17 (asset set); humanoid A/B re-scored 2026-11-18 | `scored_at`, `instrument.note` |

The publishable gate (defined in `docs/rubric.md`, shipping-gate decision dated
2026-11-17) requires **both** a mean ≥ 3.5 **and** no criterion below 3 on any
asset/pass. Mean **3.82** clears the threshold and there are **zero** below-floor
criterion scores, so the gate passes honestly on both clauses. This is the
scorer-recomputed verdict; it was not forced, re-rolled, or hand-edited. The
exceptional 4.0/3.5 tier remains documented as unreachable in `docs/rubric.md`
and is not the gate here.

### 1.1 Target criterion outcomes

The two humanoid A findings that opened this track are both cleared on flash-lite:

| Criterion | Before (pre-track) | After (final) | Requirement | Status |
| --- | --- | --- | --- | --- |
| humanoid A `edge_language` | 2 | **3** | ≥ 3 (FR-1 / AC-1) | cleared |
| humanoid A `palette_craft` | 2 | **4** | ≥ 3 (FR-2 / AC-2) | cleared |

Humanoid B's weak criteria are unchanged and all clear the floor
(`lighting=3`, `edge_language=3`, `palette_craft=3`). No criterion on any of the
14 passes scored below 3. Declared design intent was preserved through the
re-author: `design.light=top-left`, hero `torso`, nine parts and the value plan
(Phase 1 evidence). Criterion means: silhouette 4.93, value_separation 3.86,
lighting 3.21, edge_language 3.29, cluster_discipline 4.29, palette_craft 3.36.

## 2. Publishable gate: PASSED

**The publishable gate is PASSED.** Mean 3.82 ≥ 3.5 and there are no below-floor
criterion scores on any asset/pass. The verdict is `pass` with `failures=[]` in
`test/art/scores.json`. No pass was forced, reinterpreted, selected, or
manufactured; the scorer recomputed it from the single bounded scoring round.

For continuity of the record: before this track the verdict was `fail` at mean
3.73, with the 3.5 threshold already cleared and the floor clause binding on
exactly two humanoid A criteria (`edge_language=2`, `palette_craft=2`). This
track removed both floor failures without dropping the mean below threshold, so
the honest recomputation flips the verdict to `pass`.

## 3. Decision: record the quality win (P3.T1 / P3.T2)

**Decision: QUALITY WIN / PASS.** Record the gate as honestly passed and close the
track on the win. There is no bounded-final fail and therefore no ACCEPT-of-fail
decision to make. This closes FR-5 / AC-5 with the scorer-recomputed `pass`, and
FR-6 / AC-6 with an explicit bounded-stop record.

**Bounded-stop record:**

- **Exactly one authored candidate scored.** Phase 1 re-authored the humanoid
  ramps once; the primary's Phase 1 visual gate (NFR-7 / AC-9) read the baseline
  and candidate A/B PNGs directly, judged the candidate satisfactory, and
  requested **no** bounded revision.
- **Exactly one scoring round, no re-rolls.** Both credentialed calls returned
  `OK[try 1]`; there was no re-scoring, no fishing for a better score, and no
  second authored candidate (FR-6 / AC-6).
- **No cross-instrument transfer.** All 14 passes carry
  `model=gemini-3.5-flash-lite`; the frozen instrument was never returned to and
  the `gemini-4-hydrogen` baseline was never mixed in.
- **No hand-edited scores.** All six criterion scores and all `why` rationales
  for humanoid A/B were machine-written by the scorer. The primary's only
  `scores.json` edit was metadata-only (`scored_by`, `instrument.note`,
  `verdict.note`) to record honest state (NFR-2).
- **The track stops here.** The bounded attempt succeeded; no further recipe
  authoring or scoring is warranted. This is the bounded stop on a win.

## 4. Non-comparability and deviations (P3.T2)

- **Instrument of record (inherited, user-authorized).** All scoring uses
  `gemini-3.5-flash-lite` only. It was promoted in a prior track after
  `gemini-4-hydrogen` exhausted its free-tier daily quota (429
  `RESOURCE_EXHAUSTED`); the history is preserved in `scores.json`
  `instrument.note`. No instrument switch or cross-instrument comparison occurs
  here (NFR-1).
- **Scores are NOT comparable to the 3.25 frozen baseline.** The original
  `gemini-4-hydrogen` baseline (mean 3.25) is cited only for provenance. The
  3.82 mean is an honest, independently-scored result on the promoted
  instrument and is never presented as a like-for-like improvement over 3.25.
  The 3.67 (craft-application) and 3.73 (gate-close) figures are prior
  point-in-time records on the same instrument, not part of this gate's verdict.
- **Metadata-only reconciliation (primary).** After the scorer wrote the
  per-pass fields, the primary reconciled only `scored_by`, `instrument.note`
  and `verdict.note` in `test/art/scores.json` (commit `9c1c6ac`). No criterion
  score or rationale was hand-edited.
- **Humanoid byte-identity waiver (inherited).** Phase 1 intentionally changed
  the humanoid v2 recipe, design note and SHA-256 sidecar to apply the hue-stepped
  ramps; this is the scoped waiver carried from the prior track. The five other
  v2 recipes and seven v1 originals remain byte-identical.
- **Diff-count correction (recorded in Phase 2).** The correct count is 12
  unaffected passes (14 total − 2 re-scored): `unaffected_checked=12 diffs=0`.
  The earlier brief/plan value of 10 was carried over from a prior four-pass
  track and was corrected by the primary.

## 5. Reproducibility: commands, digests, evidence paths

### 5.1 Exact scorer commands (primary-run)

Credentials were supplied via `PX_RUBRIC_CREDENTIALS` from the configured
credential file; the key was never printed. Both writes used
`--model gemini-3.5-flash-lite --replace`; the model/note fields and the verdict
were machine-written.

| Command | Run by | Exit | Result |
| --- | --- | --- | --- |
| `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"` | primary | 0 | `OK[try 1]`; six criterion scores machine-written (silhouette 5, value_separation 4, lighting 3, edge_language 3, cluster_discipline 5, palette_craft 4) |
| `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid B"` | primary | 0 | `OK[try 1]`; six criterion scores machine-written (silhouette 5, value_separation 4, lighting 3, edge_language 3, cluster_discipline 4, palette_craft 3) |
| `node scripts/rubric-report.mjs` | primary (read-only) | 0 | 7 assets / 14 passes; `mean 3.82 · pass · gemini-3.5-flash-lite`; agrees with `scores.json` — skipped by this subagent (node denied; reported in §8) |
| `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` |

Criterion order in the score rows: `silhouette / value_separation / lighting /
edge_language / cluster_discipline / palette_craft`. The field-by-field diff of
the twelve unaffected passes returned `unaffected_checked=12 diffs=0` — only
humanoid A/B changed.

### 5.2 Artifact and score-record digests

Per-file SHA-256 of the two faithful scoring artifacts (authoritative values from
the phase brief, corroborated by `phase-1.md` primary verification):

| Artifact | SHA-256 |
| --- | --- |
| `.conductor/evidence/art-v2/humanoid.8x.png` (pass A) | `FAFF12D17CC020804003BC6696FDAF4E02EDA576FD7CBB7FDD1B0FC0BED854D1` |
| `.conductor/evidence/art-v2/humanoid.debug.png` (pass B) | `D6738882571E38D36C530CCAC8DCB5D9FC38D0E7A23E2E04D524B1C62595CE42` |

`test/art/v2/humanoid/humanoid.sha256` (recipe digest, strict-clean, two
identical renders):
`76c4ba9beecdbfdd56fd27ad69ea21b2f575092d59a74be9f4eef73409fb9ee1`.

`test/art/scores.json` SHA-256 transitions:

| State | SHA-256 |
| --- | --- |
| Pre-track (baseline) | `9464B22096CCE322BC95A125BCAFE7194E8FA46045449D223C5687F4CBACF190` |
| Immediately after the two scorer writes | `D785D3FD1D3BB36DB8422443B3A8CD162B508AA4B5033FF9ED9753E840B19C82` |
| Final committed (after primary's metadata-only reconciliation) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |

These digests are authoritative values from the brief and Phase 1/2 primary
verification; this subagent did not independently recompute per-file SHA-256
(general shell hashing is outside the permitted shell scope and no
read/grep/glob tool computes SHA-256). `test/art/scores.json` was **read only** —
never edited, staged, or committed by this subagent.

### 5.3 Evidence paths

- `conductor/tracks/20261118-gate-publishable-pass/verification/gate-decision.md` (this file)
- `conductor/tracks/20261118-gate-publishable-pass/verification/rescore.md` — artifact digests, commands, machine-written scores and scorer-recomputed verdict
- `conductor/tracks/20261118-gate-publishable-pass/verification/phase-2.md` — re-score commands, diff result, primary verification
- `conductor/tracks/20261118-gate-publishable-pass/verification/phase-1.md` — primary visual verdict (SATISFIED, no revision) and pre-phase digests
- `conductor/tracks/20261118-gate-publishable-pass/verification/recipe-changes.md` — byte-identity of the other assets
- `test/art/scores.json` — machine-written by the primary's scorer; read only by this subagent
- `.conductor/evidence/art-v2/generation-summary.json` — `recipe_sha256 == committed_sha256`, `blocking_findings: 0`
- `.conductor/evidence/art-v2/humanoid.{8x,debug}.png` — faithful scoring artifacts
- `docs/rubric.md` — publishable tier 3.5/3.0; exceptional 4.0/3.5 tier unreachable
- `conductor/archive/20261118-gate-close-flash-lite/verification/gate-decision.md` — prior honest-fail ACCEPT decision (contrast)

## 6. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-5 / AC-5 | Verdict recomputed honestly (`pass`, no failures) and recorded verbatim | §1; `result=pass`, `mean=3.82`, `failures=[]`, scorer-recomputed, not forced | done |
| FR-5 / AC-5 | Target criteria cleared; pass is a recorded quality win | §1.1, §2, §3 (edge_language 2→3, palette_craft 2→4) | done |
| FR-6 / AC-6 | One candidate scored, no re-roll, no cross-instrument transfer, no second authored candidate; bounded stop on the win | §3 (bounded-stop record); `OK[try 1]` both calls, single visual gate with no revision | done |
| NFR-1 / NFR-2 | Flash-lite only; no hand-edited scores/rationales; metadata-only reconciliation documented | §1, §4, §5.1 | done |
| NFR-6 / AC-5 | Exact commands, artifact/score digests and evidence paths recorded | §5 | done |

## 7. Verification commands (this phase)

| Command | Run by | Exit | Summary |
| --- | --- | --- | --- |
| `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` |
| `node scripts/rubric-report.mjs` | primary (read-only) | 0 | agrees with `scores.json`: 7 assets / 14 passes, `mean 3.82 · pass`, `gemini-3.5-flash-lite`; not run by this subagent (node denied — see §8 and blocker) |

## 8. Blockers

- **P3 verification — `node scripts/rubric-report.mjs` (primary-run, expected boundary).** This
  subagent attempted the command and the shell tool returned
  `Permission denied: shell`. Per the brief this command is designated
  primary-run; it was already run by the primary in Phase 2 with exit 0 and is
  recorded in `phase-2.md` §1/§4 and the Phase 2 "Primary verification" section
  (7 assets / 14 passes, `mean 3.82 · pass`, agreeing with `scores.json`). The
  primary re-runs it at phase acceptance. No workaround was attempted.

## 9. Notes

- This is an evidence-only phase: no recipe, score, sidecar, spec, plan,
  metadata, track registry, product doc, `review.md` or `pr.md` was edited. Only
  this evidence file was written, within `Touches`.
- `Result: verified` records that Phase 3's evidence work is complete and the
  quality win is honestly documented. The publishable gate is `pass` with
  `failures=[]`, as recorded in §1–§3 — no pass was forced, re-rolled, or
  manufactured, and no caveat was invented to diminish the win.

## Primary verification (conductor-implement)

- Date: 2026-11-18. Branch `feat/20261118-gate-publishable-pass`, phase base `37b362234390a9490930c12477b5a601c4e18520`.
- Tree clean; range contains exactly one subagent-reported commit (`0fbfb9d`) and one file in Touches (`verification/gate-decision.md`, 219 lines). No merge or user commit: squash guard eligible.
- `node scripts/rubric-report.mjs` exit 0 (primary-run): 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite`, zero below-floor criteria — agrees with `test/art/scores.json` (SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`).
- Primary re-ran `pnpm verify` exit 0: typecheck clean, Biome clean with one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`, 119 test files / 1028 tests passed, build clean.
- AC-5 / AC-6 satisfied: honest quality win recorded (`failures=[]`), bounded stop with one candidate, one bounded scoring round (`OK[try 1]` both calls), no re-roll, no instrument switch, no hand-edited score or rationale, no comparability claim against the 3.25 hydrogen baseline.
- Subagent status verified; its only blocker was the node-denied read-only rubric report, resolved above by the primary.

