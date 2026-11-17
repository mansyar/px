# Review — Gate and Instrument Reconciliation

## Round 1

- Range: `0fd23f7fda645b0c24f696af988f7901507b49ea..HEAD`
- Reviewer: read-only `conductor-reviewer`
- Verdict: **PASS WITH FINDINGS — shippable** (one Medium, one Low)
- Date: 2026-11-17

The contract holds: the publishable tier is binding in both docs and tests, the exceptional 4.0 tier stays documented-unreachable, and the baseline is a single instrument. All 14 passes are faithful `gemini-4-hydrogen` scores matching the scoring and retry logs; the verdict recomputes to mean 3.25 with 22 below-floor scores. Provenance records, the 19 digests, the manifest and lockfile are byte-identical; one production dependency and no network imports in `src/`, `test/` or CI. The gate failure is the intended result and is not treated as a defect.

| Finding | Severity | Resolution |
| --- | --- | --- |
| F1 — three stale `tiebreak` reasons in `test/art/scores.json` claim a two-point pass disagreement, but all A/B deltas in this single-instrument baseline are 0-1; `baseline.md` agrees. Verdict math is unaffected. | Medium | Phase R1.T1: remove stale tiebreaks and add a test that each tiebreak corresponds to a real >1-point disagreement. |
| F2 — `baseline.md` and `integrated.md` give different prose counts for transient 503/429 responses. | Low | Phase R1.T2: replace with one precise statement in both documents. |

NFR-3/AC-12 were marked partial only because the reviewer's shell was denied the scoped coverage command; the primary ran it at checkpoint `61690df` with exit 0 (116 files / 995 tests, 94.97% statements / 85.69% branches), and will re-run after the fixes.

### What this review caught

Both findings are record-accuracy problems, not engine defects. They matter because the whole point of this chore is a trustworthy measurement: a tiebreak that adjudicates a disagreement which never existed makes the baseline look less stable than it is, and two different retry counts make the provenance look hand-maintained. Strict mode requires both to be fixed rather than tracked.

## Round 2

- Range: `0fd23f7fda645b0c24f696af988f7901507b49ea..HEAD`, emphasis on `e736ac2`
- Date: 2026-11-17
- Verdict: **PASS WITH FINDINGS — shippable** (one Low)

F1 closed at the cause: `scores.json` has zero tiebreak keys and the diff contains only their deletion; `rubric.test.ts:250-268` now pins any future tiebreak to a real >1-point pass disagreement. F2 closed: both evidence documents use the same precise retry sentence. No score, rationale, verdict, digest, manifest, lockfile, threshold or budget changed; the verdict still recomputes to fail / 3.25 / 22 failures. `pnpm verify` and the rubric test pass; the primary ran the scoped coverage command at the R1 head with exit 0.

| Finding | Severity | Resolution |
| --- | --- | --- |
| L1 — `verification/phase-R1.md` cited pre-squash task commits `22e6063`/`ec4a43c` instead of the real checkpoint `e736ac2`. | Low | Fixed by the primary in the evidence file: Head and both task rows now name `e736ac2` as the squashed checkpoint. |

No further fix round is warranted: the remaining finding was an evidence typo in primary-owned Conductor state, corrected in place. NFR-3/AC-12 were marked partial by the reviewer only because its shell denied the scoped coverage command; the primary's exit-0 run at the R1 head is recorded in `verification/phase-R1.md`.
