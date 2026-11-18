# Agent Legibility Verification — Phase 2 Report (finalized)

- **Track:** `20261118-agent-legibility-verification` — Agent Legibility Verification
- **Phase:** 2 — Measure fresh artifacts and remediate documentation gaps
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Branch base (plan.md):** `12037ca4ce76844b3d64f8705992099b297fdf65`
- **Phase base:** `828e279110770cef8ccd5e32429f68e25faa38f2`
- **Covers:** FR-3, FR-4, FR-5, NFR-2, NFR-3, NFR-4, NFR-5, NFR-7, AC-3, AC-4, AC-5, AC-7, AC-8
- **Result:** `verified`

The primary strictly re-rendered and 8×-upscaled all four fresh MCP-first artifacts, ran flash-lite `--dry-run` silhouette diagnostics, confirmed the `scores.json` hash is unchanged, and decided to skip documentation remediation with an explicit reason. The phase subagent prepared the slots and transcribed the primary's observed results; it ran no credentialed scoring and changed no source, test, recipe, fixture, golden or score. Strict exit 3 on humanoid and chest is recorded honestly as a craft/lint-gate failure — these assets are **not** claimed strict-clean. All four meet the silhouette ≥4/5 bar with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL`.

## Commands table

| Layer / purpose | Command | Exit | Summary |
| --- | --- | --- | --- |
| verification | `pnpm verify` | 0 | `typecheck → lint → test → build`: typecheck clean; Biome checked 216 files, no fixes, 1 pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50:7`; 119 test files / 1028 tests passed; build clean. |
| strict render — potion | `pnpm exec tsx D:/Projects/px/src/cli.ts render --file potion.px.json --out potion.png --debug --strict` | 0 | No blocking findings; 10 BANDING info; SHA-256 `f21348ee…`; faithful A view 128×128. |
| strict render — sword | `pnpm exec tsx D:/Projects/px/src/cli.ts render --file sword.px.json --out sword.png --debug --strict` | 0 | No blocking findings; 3 BANDING + 1 CLUSTER_THIN info; SHA-256 `15454e90…`; faithful A view 256×256. |
| strict render — humanoid | `pnpm exec tsx D:/Projects/px/src/cli.ts render --file humanoid.px.json --out humanoid.png --debug --strict` | 3 (`E_LINT_GATE`) | 3 blocking: PILLOW_SHADE (arm), SILHOUETTE_LOSS (arm, torso; base `#3f78b8` 1.16:1 < 1.50:1), plus one W_PART_OVERWRITE; SHA-256 `a7886a15…`; 1× PNG + debug sheet written. |
| strict render — chest | `pnpm exec tsx D:/Projects/px/src/cli.ts render --file chest.px.json --out chest.png --debug --strict` | 3 (`E_LINT_GATE`) | 4 blocking: LOW_CONTRAST (6/120 edge pixels, 5%) + 3 VALUE_COLLISION pairs (bands/body 0.055, bands/lock 0.000, body/lock 0.055); SHA-256 `a18b9624…`; 1× PNG + debug sheet written. |
| 8× upscale (all four) | `node D:/Projects/px/scripts/upscale.mjs <asset>.png --out <asset>.8x.png --factor 8` | 0 | Faithful upscale succeeded for potion, sword, humanoid and chest (including the two that gated). |
| silhouette — potion | `PX_RUBRIC_CREDENTIALS=… node scripts/rubric.mjs --asset potion --pass A --artifact …/potion.8x.png --model gemini-3.5-flash-lite --replace --dry-run --note "agent-legibility silhouette potion"` | score 5 | Dry-run, writes nothing; no retry. |
| silhouette — sword | same command with `--asset sword …/sword.8x.png` | score 4 | Try 2 after one availability retry; same instrument. |
| silhouette — humanoid | same command with `--asset humanoid …/humanoid.8x.png` | score 5 | Try 2 after one availability retry; same instrument. |
| silhouette — chest | same command with `--asset chest …/chest.8x.png` | score 5 | Dry-run, writes nothing; no retry. |
| scores.json hash | SHA-256 before/after | n/a | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged. |

Full exact command forms are in `measurement.md` §1; all measured values are in §2–§5 of that file.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | Four strict renders with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` or honest failures | `measurement.md` §2 — four strict renders; zero OOB/ORPHAN on all four; humanoid and chest exit 3 (`E_LINT_GATE`) recorded honestly as craft/lint-gate failures | done |
| AC-4 | Four silhouette diagnostics ≥4 or honest failures | `measurement.md` §3 — potion 5, sword 4, humanoid 5, chest 5, all ≥4; dry-run rationale limitation recorded honestly | done |
| AC-5 | Documentation fix and re-test evidence only if documentation-caused; no engine change | `measurement.md` §5 — SKIP with explicit reason (craft choices, not a doc gap; thresholds already in `docs/lint-thresholds.md`); no doc, re-test or engine change | done |
| AC-7 | Final `pnpm verify` exits 0 and code delta is empty except permitted docs | Commands table — `pnpm verify` exit 0; only the two evidence files changed (docs) | done |
| AC-8 | `scores.json` hash unchanged and gate untouched | `measurement.md` §4 — before = after = `E5CC…C828D`; no score, rationale or verdict edit | done |

FR-3/NFR-6 are satisfied by the four strict renders and recorded findings; FR-4/NFR-2/NFR-5 by flash-lite `--dry-run` diagnostics only; FR-5/NFR-3/NFR-7 by the reasoned SKIP with zero fixes; NFR-4 by `pnpm verify` exit 0 and an empty code delta.

## Evidence paths

- `conductor/tracks/20261118-agent-legibility-verification/verification/measurement.md` — exact commands, strict-render findings, silhouette ratings, `scores.json` hash and the SKIP decision.
- `conductor/tracks/20261118-agent-legibility-verification/verification/phase-2.md` — this report.
- `.conductor/evidence/agent-legibility/{potion,sword,humanoid,chest}/` — fresh recipes, 1× renders, debug sheets and 8× upscales (binaries gitignored).
- `conductor/tracks/20261118-agent-legibility-verification/verification/agent-runs.md` — Phase 1 transcripts and call counts.

## Blockers (RESOLVED BY PRIMARY — history preserved)

| # | Blocker | Resolution |
| --- | --- | --- |
| 1 | Strict render and 8× upscale of all four fresh recipes | **RESOLVED BY PRIMARY** — exit codes, findings and SHA-256 prefixes recorded in `measurement.md` §2. |
| 2 | Flash-lite `--dry-run` silhouette diagnostics for all four assets | **RESOLVED BY PRIMARY** — ratings 5/4/5/5 recorded in `measurement.md` §3; two availability retries on the same instrument. |
| 3 | Confirm `scores.json` SHA-256 unchanged | **RESOLVED BY PRIMARY** — before and after both `E5CC…C828D` (`measurement.md` §4). |
| 4 | Decide documentation remediation and, if justified, apply one fix and one re-test | **RESOLVED BY PRIMARY** — SKIP with explicit reason (`measurement.md` §5); zero fixes, zero re-tests. |
| 5 | Supply observed results for finalization | **RESOLVED BY PRIMARY** — results supplied in the appended brief section and transcribed into `measurement.md` and this file. |

No open blockers remain.

## Deviations

- **Strict-gate failures on two assets:** humanoid and chest returned strict exit 3 (`E_LINT_GATE`) on craft/lint findings (palette base contrast, adjacent value separation, op ordering). They are recorded honestly and are **not** claimed strict-clean; no finding was suppressed or re-rolled.
- **Skipped documentation fix:** no `docs/agent-tool-guide.md` was added. The failures were judged craft choices, not a documentation-coverage gap, so NFR-7's one-fix/one-re-test budget was not consumed; this is an explicit reasoned skip, not an unrecorded omission.
- **Dry-run rationale limitation:** the silhouette `--dry-run` path prints only the six integer scores and never the judge rationale (`scripts/rubric.mjs:387-394`); no rationale was invented.
- No engine, op, linter, rubric, config, recipe, `scores.json`, fixture or source file was touched. The code delta is intentionally empty except these two evidence files.

## Notes

- All five Phase 1 runs stayed within the 12-call budget; strict render and silhouette outcomes are now measured and recorded for the four MCP-first assets.
- No credentialed scoring, score write, cross-instrument comparison or forced pass occurred; flash-lite `--dry-run` was used throughout and the credential was never printed.
- `pnpm verify` exit 0 at finalization (119 files / 1028 tests; one pre-existing non-failing Biome `noNonNullAssertion` warning; build clean).
- The CLI-parity potion artifact is documented in `agent-runs.md` but was outside the primary-only measurement command list; no separate strict/silhouette row was added for it.

## Primary verification (conductor-implement)

- Date: 2026-11-18; branch `chore/20261118-agent-legibility-verification`; phase base `828e279110770cef8ccd5e32429f68e25faa38f2`.
- Working tree clean; range `828e279..HEAD` contains exactly the single reported commit `adab995` and exactly two files, both within Phase 2 Touches (`verification/measurement.md`, `verification/phase-2.md`). No merge or unreported commit; squash eligible.
- Zero `PENDING PRIMARY` cells remain in either evidence file; both report Result `verified`; all five prior blockers marked RESOLVED BY PRIMARY.
- Primary independently ran the strict renders: potion/sword exit 0; humanoid/chest exit 3 (`E_LINT_GATE`) with the exact craft findings disclosed; no `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` finding on any asset. Dry-run silhouettes potion 5 / sword 4 / humanoid 5 / chest 5, all ≥4. Scores hash unchanged `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
- Documentation remediation skipped with an explicit reason (craft failures, thresholds already documented); no `docs/agent-tool-guide.md`, no re-test, no score re-roll, no instrument switch.
- Primary re-ran `pnpm verify` at HEAD: exit 0 (119 files / 1028 tests; one pre-existing non-failing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; build clean) and `node scripts/rubric-report.mjs` exit 0 (mean 3.82 pass).
- AC-3, AC-4, AC-5, AC-7 and AC-8 satisfied with honest strict-gate failures disclosed; subagent status verified, blockers [].

