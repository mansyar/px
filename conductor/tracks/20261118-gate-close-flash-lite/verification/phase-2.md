# Phase 2 Verification — Publishable Gate Close

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 2 — Re-score the four affected passes and recompute the verdict
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Phase base:** `1190aca9ca7811e780bb621a7f9872afe1d7812c`
**Result:** `blocked`

## 1. Goal / status

Machine-re-score the four affected passes (`humanoid` A/B, `scene` A/B) on
`gemini-3.5-flash-lite` with `--replace` and recompute the verdict honestly.
Covers FR-4, NFR-1, NFR-2, NFR-5, AC-4. Blocked at P2.T2: credentialed scoring
and the verdict recomputation are primary-only. All four scorer rows remain
PENDING and `test/art/scores.json` is untouched by this subagent.

## 2. Commands

| Layer | Command | Run by | Exit | Summary |
| --- | --- | --- | --- | --- |
| static | `git status --short --branch` | subagent | 0 | clean tree on `feat/20261118-gate-close-flash-lite` |
| static | `git log --oneline --max-count=3` | subagent | 0 | confirmed phase base `1190aca` |
| integration | `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing lint warning at `test/recipe/version-1-2.test.ts:50` |
| hash | `Get-FileHash -Algorithm SHA256 -Path … (four artifacts)` | subagent | denied | `permission.rejected: shell` — per-file artifact SHA-256 left PENDING-primary; see `rescore.md` §3 |
| scoring | `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid A"` | primary | PENDING | not run by subagent |
| scoring | `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid B"` | primary | PENDING | not run by subagent |
| scoring | `node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene A"` | primary | PENDING | not run by subagent |
| scoring | `node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene B"` | primary | PENDING | not run by subagent |
| report | `node scripts/rubric-report.mjs` | primary | PENDING | read-only verdict report, primary-run |

`pnpm verify` emitted one warning in `test/recipe/version-1-2.test.ts:50`
(`lint/style/noNonNullAssertion`) that predates this phase; it is not a failure
and was not touched.

## 3. Scorer rows (PENDING)

| Asset / pass | Artifact | Model | Status |
| --- | --- | --- | --- |
| humanoid A | `.conductor/evidence/art-v2/humanoid.8x.png` | gemini-3.5-flash-lite | PENDING |
| humanoid B | `.conductor/evidence/art-v2/humanoid.debug.png` | gemini-3.5-flash-lite | PENDING |
| scene A | `.conductor/evidence/art-v2/scene.8x.png` | gemini-3.5-flash-lite | PENDING |
| scene B | `.conductor/evidence/art-v2/scene.debug.png` | gemini-3.5-flash-lite | PENDING |

No criterion score or rationale has been hand-edited; all per-pass fields and
the verdict are written by `scripts/rubric.mjs` when the primary runs the four
commands in §2.

## 4. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / AC-4 | four affected passes machine-re-scored with flash-lite `--replace` | §3 PENDING; `rescore.md` §4 | blocked |
| NFR-1 | flash-lite only, no instrument switch | §3 model column | satisfied pending scores |
| NFR-2 | no hand-edited scores/rationales | `scores.json` untouched | satisfied pending scores |
| NFR-5 | credentialed scoring primary-run only | §2 run-by column | satisfied |
| FR-5 / AC-5 | honest recomputed verdict | §5 pending primary | blocked (Phase 3 owns final decision) |
| NFR-4 / AC-7 | `pnpm verify` exit 0 | §2 integration row | done |

## 5. Verdict

Unchanged pre-track record in `test/art/scores.json`: `fail`, mean 3.67,
failures = humanoid A/B `lighting=2`, scene A `lighting=2`. Recomputation is
pending the primary's four scorer runs. No pass is forced; scores are not
compared to the 3.25 frozen baseline.

## 6. Task status

| Task | Status | Commit |
| --- | --- | --- |
| P2.T1 — record faithful artifact digests | partial | recorded with this evidence commit |
| P2.T2 — primary-only machine re-scoring | blocked | primary runs four commands from §2 |
| P2.T3 — no score fabrication / finalize verdict | blocked | primary runs, then re-invokes subagent once |

## 7. Evidence paths

- `conductor/tracks/20261118-gate-close-flash-lite/verification/rescore.md`
- `conductor/tracks/20261118-gate-close-flash-lite/verification/phase-2.md`
- `.conductor/evidence/art-v2/generation-summary.json`
- `.conductor/evidence/art-v2/humanoid.{8x,debug}.png`, `.conductor/evidence/art-v2/scene.{8x,debug}.png`

## 8. Deviations / notes

- Per-file SHA-256 of the four faithful PNGs could not be computed: the shell
  denied the file-hash command and node is out of scope for this subagent. Left
  PENDING-primary in `rescore.md` §3 rather than fabricating values; listed in
  the blockers array.
- `node scripts/rubric.mjs`, `node scripts/rubric-report.mjs` and any edit to
  `test/art/scores.json` were deliberately not attempted — primary-only, and
  the credential must never be exposed to a subagent.
- No `plan.md`, `spec.md`, `metadata.json`, `tracks.md`, product doc, `review.md`
  or `pr.md` was edited by this subagent.
