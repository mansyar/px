# Gate and Instrument Reconciliation

## Summary

This chore settles a contradiction the project had been carrying: track specs kept a hard 4.0 quality gate while `docs/rubric.md` documented that tier as unreachable. The publishable tier — mean >= 3.5 with no criterion below 3 — is now the binding shipping gate, and 4.0 stays recorded as an aspiration with calibration evidence. A single reproducible baseline replaces the mix of vision instruments and observer scores used before: 14 faithful passes over the seven v2 assets, all scored by `scripts/rubric.mjs` with `gemini-4-hydrogen`, two views each (exact 8x nearest-neighbour and the engine debug sheet).

**The measured publishable gate fails: mean 3.25 against 3.5, with 22 criterion scores below 3.** That failure is the honest result this track set out to establish. No score was raised, no failing criterion removed, and no reroll performed. Two earlier records are preserved as provenance: `scores-before-intent.json` (3.69) and `scores-agent-vision.json` (3.39). They used different instruments, so the 3.69 -> 3.25 movement is not claimed as a measured regression.

## Track

- ID: `20261117-gate-instrument-reconciliation`
- Type: chore, priority high
- Branch: `chore/20261117-gate-instrument-reconciliation`
- Base: `main @ 0fd23f7`
- Artifacts: `conductor/archive/20261117-gate-instrument-reconciliation/` (at merge)

## What happened

| Phase | Checkpoint | Outcome |
| --- | --- | --- |
| Gate Contract and Provenance | `e3ab807` | Publishable 3.5/3.0 bound in `docs/rubric.md` and `test/unit/calibration/gate.test.ts`; both prior score records frozen byte-for-byte. |
| Frozen Instrument and Baseline | `6f64349` | Instrument object recorded in schema-3 `scores.json`; 14 passes scored with one Gemini API model; honest verdict and `verification/baseline.md`. |
| Verification and No-Regression | `61690df` | 19 digests, manifest, lockfile and network boundary unchanged; both gates green. |
| Phase R1 review fixes | `e736ac2` | Removed three stale human tiebreaks that claimed disagreements this baseline does not contain; added a CI guard; aligned retry provenance prose. |

Coverage is measured with the benchmarks project excluded because v8 instrumentation inflates the wall-clock NFR-7 result. NFR-7 continues to be enforced uninstrumented by `pnpm verify`; the exclusion lives in the CI invocation only — `package.json` and `pnpm-lock.yaml` are byte-identical to base.

## Requirements

FR-1 .. FR-12, NFR-1 .. NFR-6 and AC-1 .. AC-12 are covered. The two review findings were record-accuracy issues, both closed at the cause. AC-14-style art-quality failure is intentionally recorded, not repaired here.

- [x] Binding publishable gate in docs and tests
- [x] Two prior score records preserved as provenance
- [x] Single instrument, 14 faithful passes, no hand-adjusted scores
- [x] Verdict recomputed from the record (fail / 3.25 / 22 failures)
- [x] 19 digests, manifest and lockfile unchanged
- [x] No network-capable import in engine, tests or CI
- [ ] Measured quality reaches the publishable gate — mean 3.25, 22 below-floor scores

## Verification

| Check | Result |
| --- | --- |
| `pnpm verify` | exit 0, 119 files / 1028 tests |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | exit 0, 116 files / 996 tests, 94.97% statements / 85.69% branches / 98.33% functions / 94.77% lines, 80% thresholds unchanged |
| `pnpm vitest run test/art/rubric.test.ts` | exit 0, 13 tests including the tiebreak validity guard |
| Digests | 19 unchanged (1 hero, 4 v1 benchmarks, 7 v1 art, 7 v2 art) |
| Dependency | one production dependency, `@modelcontextprotocol/sdk@1.32.2`; manifest and lockfile unchanged |
| Review | Round 1 PASS WITH FINDINGS (1 Medium, 1 Low), Round 2 PASS WITH FINDINGS (1 Low evidence typo, corrected) |

## Media

Debug sheets for two of the seven scored assets, attached to this PR:

- prop: https://github.com/user-attachments/assets/9b4757a2-fb22-4ab9-b257-28cb3df3ca69
- character: https://github.com/user-attachments/assets/a840315b-7157-4d7d-a654-480d4dfa78d2

They are inputs to the baseline, not new art produced by this track.

## Deviations and risks

- Coverage is scoped in CI only; the `package.json` coverage script remains `vitest run --coverage` so the manifest stays byte-identical.
- `gemini-3.5-flash-lite` is recorded as fallback but was not used; three transient 503/429 and fetch failures were retried with the same model.
- A/B spread on the same model is modest (mean absolute difference 0.21, max 1, no pair above 1) but the instrument still samples one vision model on one date.
- The pre-existing Biome warning at `test/recipe/version-1-2.test.ts:50` is out of scope and non-failing.

## Follow-ups

- Decide what to do with the failed publishable gate on the same frozen instrument: accept 3.25 as current quality, or invest in lighting, edge language and palette craft — the three weakest criteria.
- Re-score only with the recorded instrument and both faithful views; do not compare across instruments as if they were the same ruler.

## Rollback

Revert this commit to restore the previous 4.0 hard-gate contract. `scores-before-intent.json` and `scores-agent-vision.json` remain in history as provenance; no engine or asset bytes changed.
