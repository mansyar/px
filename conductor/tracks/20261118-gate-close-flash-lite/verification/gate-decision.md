# Gate decision — Phase 3 (Publishable Gate Close)

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 3 — Record the honest gate decision
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Phase base:** `d331c00834aaa577cc3c8c12d07c0e5ce9d928d5`
**Covers:** FR-5, NFR-6, AC-5
**Instrument of record:** `gemini-3.5-flash-lite` only (no instrument switching, no cross-instrument comparison)
**Result:** `verified` — this phase's evidence work is complete and honestly recorded; it does **not** mean the publishable gate passed (the honest fail is accepted below).

## 1. Recomputed verdict (P3.T1)

The verdict in `test/art/scores.json` was recomputed by the scorer
(`scripts/rubric.mjs` via `--replace`) from the four re-scored passes plus the ten
unchanged passes — all 14 passes, 84 criterion scores. It is recorded here
verbatim; no value was revised by hand.

| Field | Value | Source |
| --- | --- | --- |
| Result | `fail` | `verdict.result` |
| Mean | **3.73** | `verdict.mean` |
| Threshold (mean) | 3.5 — cleared | `verdict.threshold_mean` |
| Floor (min allowed, per criterion/pass) | 3 — **binds** | `verdict.min_allowed` |
| Below-floor count | 2 | `verdict.failures[]` |
| Instrument of record | `gemini-3.5-flash-lite` | `instrument.model` (inherited, user-authorized promotion) |
| Passes scored | 14 (7 assets × 2 views) | `assets[].passes[]` |
| Basis | `independent` | `verdict.basis` |
| Schema | 3 | `schema` |
| Scored at | 2026-11-17 | `scored_at` |

The publishable gate (defined in `docs/rubric.md`, shipping-gate decision dated
2026-11-17) requires **both** a mean ≥ 3.5 **and** no criterion below 3 on any
asset/pass. Mean 3.73 clears the threshold, but two criterion scores remain at 2,
so the **floor clause binds, not the mean**: the gate is `fail`. This is the
scorer-recomputed verdict; it was not forced, re-rolled, or hand-edited.

### 1.1 What the re-score changed

The three original below-floor `lighting=2` findings that opened this track —
`humanoid` A ("shading direction is inconsistent across the helmet, body, and
sword elements"), `humanoid` B ("shading direction is inconsistent across the
different masses"), and `scene` A ("a flat roof split down the middle with
different tones and conflicting shadow directions") — are **cleared**: all four
changed passes now score `lighting=3` (see §6.2). This satisfies the track's
lighting goal (FR-1 / FR-2, AC-1 / AC-2).

However, the humanoid A recipe change regressed two other criteria on that pass:
`edge_language` 3 → 2 and `palette_craft` 3 → 2. Those two regressions are the
entire residual failure set. The gate is not passed because lifting lighting on
humanoid traded two below-floor lighting failures for two below-floor
edge/palette failures; it did not eliminate below-floor findings.

## 2. Publishable gate: NOT passed

**The publishable gate is NOT passed.** Mean 3.73 clears the 3.5 threshold, but
the floor clause requires no criterion < 3 on any asset/pass, and two criterion
scores on humanoid pass A are 2. The verdict therefore remains `fail` in
`test/art/scores.json`. No pass is claimed, forced, reinterpreted, or selected to
change the verdict.

## 3. Remaining below-floor findings (P3.T1)

These are the two machine-written failing scores in `verdict.failures[]`, with the
scorer's rationale quoted verbatim from the corresponding pass in `scores.json`.
None was removed, softened, or revised upward.

| Asset | Pass | Criterion | Score | Scorer rationale (verbatim) |
| --- | --- | --- | --- | --- |
| humanoid | A | `edge_language` | 2 | "The heavy black outlines are mostly consistent, but internal details lack deliberate and distinct edge treatments." |
| humanoid | A | `palette_craft` | 2 | "The colors feel somewhat arbitrary with harsh ramps and hues that do not harmonize effectively for the subject." |

Both failures sit on the same pass (humanoid A). No other criterion fell below
the floor on any of the 14 passes. Compared with the pre-track record (three
below-floor lighting scores) this is a change in which criteria fail, not a
reduction to zero — the gate is honestly still `fail`.

## 4. Decision: ACCEPT the honest fail (P3.T1)

**Decision: ACCEPT the honest fail** at mean 3.73 with the two remaining
floor failures listed in §3, and record it as the track outcome. This closes
FR-5 / AC-5 with an explicit accept decision. No pass was forced, no score was
re-rolled, and no criterion score or rationale was hand-edited.

**User authorization.** The directive that opened this track was **"Close on
flash-lite"** — close the thread honestly on the flash-lite instrument of record,
accepting an honest fail if the gate is not reached. That directive is the
invest-vs-accept decision at the gate: proceed to completion by **accepting and
documenting the honest fail**, rather than opening a new invest track or forcing
a pass inside this one. Consistent with the prior track's gate decision
(`conductor/archive/20261117-craft-application/verification/gate-decision.md`),
the accept outcome is recorded rather than a `pass` manufactured.

**Why a pass is not reached within this track's authorized scope:**

- **The humanoid recipe change fixed lighting but regressed edge/palette.** The
  validated warm/cool lever applied in Phase 1 lifted humanoid A/B lighting to 3,
  but the same pass A regressed `edge_language` and `palette_craft` to 2. A second
  re-authoring pass to recover those two criteria is real design work, not a
  scoring formality.
- **Further re-authoring is outside this plan's three phases.** Phase 1
  re-authored the two recipes; Phase 2 re-scored and recomputed the verdict;
  Phase 3 only records the decision. Re-opening recipe authoring would start a
  fourth phase / new track, which this brief does not authorize.
- **Score fishing would violate NFR-2.** Re-rolling the scorer or hand-editing
  scores/rationales to fish for a pass is explicitly prohibited. The floor
  clause is allowed to bind; the honest verdict stands as `fail`.

**Follow-up (future track, out of scope here).** A future track could re-author
humanoid A specifically to restore `edge_language ≥ 3` and `palette_craft ≥ 3`
without losing `lighting ≥ 3`, then re-score all passes of that asset on
flash-lite. That work is deliberately not performed here.

## 5. Deviations and non-comparability (P3.T2)

- **Humanoid byte-identity waiver.** Phase 1 explicitly released the
  byte-identity protection that `humanoid` held in the prior track
  (`20261117-craft-application`, FR-7): its v2 recipe, design note and SHA-256
  sidecar were intentionally changed to lift lighting. This waiver is authorized
  by the user's "Close on flash-lite" directive and applies only to humanoid. The
  five other v2 assets (`potion`, `sword`, `chest`, `character`, `prop`) and all
  seven v1 originals remain byte-identical (FR-6 / AC-6; evidence in
  `verification/recipe-changes.md` §2–§3).
- **Flash-lite instrument of record (inherited, user-authorized).** All scoring
  in this track uses `gemini-3.5-flash-lite` only. This is the instrument promoted
  in the prior track after `gemini-4-hydrogen` exhausted its free-tier daily
  quota (429 `RESOURCE_EXHAUSTED`); no instrument switch or cross-instrument
  comparison occurs here, in keeping with NFR-1 and the spec's Out-of-Scope list.
- **Scores are NOT comparable to the 3.25 frozen baseline.** The original
  `gemini-4-hydrogen` baseline (mean 3.25) is cited only directionally. The 3.73
  mean is an honest, independently-scored result on the promoted instrument, not
  a like-for-like improvement figure, and is never mixed into this gate evidence
  to manufacture a pass or a comparison claim.
- **`verdict.note` reconciliation (metadata only).** Phase 2's primary updated
  the stale free-text `verdict.note` / `scored_by` metadata to match the
  machine-recomputed fields (`fail` / 3.73 / 2 failures). No criterion score or
  rationale was touched (NFR-2 permits metadata edits to record honest state).

## 6. Reproducibility: commands, digests, evidence paths

### 6.1 Exact scoring commands (primary-run)

Credentials were supplied from the configured credential file via
`PX_RUBRIC_CREDENTIALS`; the key was never printed or exposed to this subagent.
All four writes used `--model gemini-3.5-flash-lite --replace`; the model/note
fields and the verdict were machine-written.

| Command | Run by | Exit | Result |
| --- | --- | --- | --- |
| `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid A"` | primary | 0 | 4/3/3/2/4/2 (try 4 after 3 transient retries) |
| `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid B"` | primary | 0 | 4/3/3/3/4/3 (try 1) |
| `node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene A"` | primary | 0 | 5/4/3/3/4/3 (try 1) |
| `node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene B"` | primary | 0 | 5/4/3/3/4/3 (try 1) |
| `node scripts/rubric-report.mjs` | primary (read-only) | primary-run | confirms mean 3.73 / fail / 2 below-floor; skipped by this subagent (node denied) |
| `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing lint warning at `test/recipe/version-1-2.test.ts:50` |

Criterion order in the score rows: `silhouette / value_separation / lighting /
edge_language / cluster_discipline / palette_craft`. All four changed passes now
score `lighting=3`; humanoid A is the sole pass with any below-floor criterion.

### 6.2 Artifact digests

Per-file SHA-256 of the four faithful scoring artifacts (from `rescore.md` §3):

| Artifact | SHA-256 |
| --- | --- |
| `.conductor/evidence/art-v2/humanoid.8x.png` | `46A6D3A220A83E87D96C75095D14ACC57D5B40869890CF8A1985B2EED69C8A1A` |
| `.conductor/evidence/art-v2/humanoid.debug.png` | `1A9C1847C1030FEF4BA5F8A0AF77554AB4B541BF67DF6ACB884BA3FDFAAC391A` |
| `.conductor/evidence/art-v2/scene.8x.png` | `477601A09A16563FE01BC0FCCC06659D7CC8A454A83D812CF6ACE7C37F5685AB` |
| `.conductor/evidence/art-v2/scene.debug.png` | `931E132002ADFDEA9594921C7A025038B5D9CAC1582249D0ACF059DCCF2A77EC` |

Source PNG / recipe digests (from `.conductor/evidence/art-v2/generation-summary.json`,
`recipe_sha256 === committed_sha256`; these are the source/recipe hashes, not the
`.8x.png` / `.debug.png` hashes above — labelled to avoid conflation):

| Asset | `recipe_sha256` = `committed_sha256` |
| --- | --- |
| humanoid | `27fd32e616389b767d112ae68992ae2912eeca57cf8cd9f7daa7a70aacea0c2a` |
| scene | `f48e72d7ecfda015c5de9623ed2e732cc648a2675d7b0b950406af7f42457a24` |

`test/art/scores.json` SHA-256:

| State | SHA-256 |
| --- | --- |
| Baseline (pre-track) | `E930EC6D0CBEC27144CA9E020C9B1603BC183E7CFFF7BF9FAE87C54A5F50AC07` |
| Immediately after the four scorer writes | `F3127641F9B9136730F4DB62D0745E76225D9DCD57FF14BC8C2FEC8AB28B1F5D` |
| Final (after primary's metadata-only `verdict.note` / `scored_by` honesty fix) | `0D992F3A9B9112C4F7383F75784C9F6C0EA918348DFD7C6193946E9A79CED56C` |

The ten unaffected passes were confirmed byte-identical to the pre-track record
(`unaffected_checked=10 diffs=0`), so only the four intended passes changed.

### 6.3 Evidence paths

- `conductor/tracks/20261118-gate-close-flash-lite/verification/gate-decision.md` (this file)
- `conductor/tracks/20261118-gate-close-flash-lite/verification/rescore.md`
- `conductor/tracks/20261118-gate-close-flash-lite/verification/phase-2.md`
- `conductor/tracks/20261118-gate-close-flash-lite/verification/recipe-changes.md`
- `conductor/tracks/20261118-gate-close-flash-lite/verification/phase-1.md`
- `test/art/scores.json` (machine-written by primary; not edited by this subagent)
- `.conductor/evidence/art-v2/generation-summary.json`
- `.conductor/evidence/art-v2/humanoid.{8x,debug}.png`, `.conductor/evidence/art-v2/scene.{8x,debug}.png`
- `docs/rubric.md` (publishable tier 3.5/3.0; shipping-gate decision 2026-11-17)
- `conductor/archive/20261117-craft-application/verification/gate-decision.md` (prior honest-fail ACCEPT decision)

## 7. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-5 / AC-5 | Honest recomputed verdict recorded | §1; fail / 3.73 / 2 failures, from scorer output | done |
| FR-5 / AC-5 | Explicit accept decision on honest fail, remaining floor failures listed, no forced pass | §3, §4 | done |
| NFR-6 | Deviations, non-comparability, exact commands, digests and evidence paths recorded | §5, §6 | done |
| NFR-2 | No hand-edited scores/rationales; no re-roll or score fishing | §1, §3, §4, §5; scorer wrote all fields | done |

## 8. Verification commands (this phase)

| Command | Run by | Exit | Summary |
| --- | --- | --- | --- |
| `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing lint warning at `test/recipe/version-1-2.test.ts:50` |
| `node scripts/rubric-report.mjs` | primary (read-only) | primary-run | confirms recorded verdict matches `scores.json`; not run by this subagent (node denied to subagent — reported to primary) |

## 9. Notes

- This is an evidence-only phase: no recipe, score, sidecar, spec, plan, metadata,
  product doc, `review.md` or `pr.md` was edited. Only this evidence file was
  written, within `Touches`.
- `Result: verified` records that Phase 3's evidence work is complete and
  honestly documented; it does not assert the publishable gate passed. The gate
  is `fail` and the fail is accepted, as recorded in §4.

## Primary verification (conductor-implement)

- **Date / branch:** 2026-11-18; `feat/20261118-gate-close-flash-lite`
  (phase base `d331c00834aaa577cc3c8c12d07c0e5ce9d928d5`).
- **Tree:** clean; the single subagent commit `ea25585` changes only
  `verification/gate-decision.md`, exactly within Touches. No recipe, score,
  spec, plan, metadata or product doc was touched.
- **Command re-run by primary:** `node scripts/rubric-report.mjs` → exit 0;
  output "7 assets, 14 passes / mean 3.73 · fail / instrument gemini-3.5-flash-lite"
  — matches §1–§3 and `scores.json`.
- **`pnpm verify` re-run by primary:** exit 0 (119 files / 1028 tests, one
  pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50`).
- **Acceptance:** P3.T1/P3.T2 satisfied — the honest fail (mean 3.73 ≥ 3.5 but
  two below-floor scores on humanoid A) and the explicit ACCEPT decision are
  recorded with rationales, deviations, exact commands and digests; no forced
  pass, no re-roll, no hand-edited score/rationale.
- **Squash guard:** range `d331c00..HEAD` contains exactly the one reported
  commit, no merge or unreported/user commit — eligible for §4.8 squash.
- **Result: verified** (evidence complete; gate honestly not passed).
