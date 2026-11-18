# Plan: Gate Publishable Pass

## Phase 1: Re-author the humanoid ramps and re-render faithful artifacts

- **Goal:** one strict-clean humanoid recipe with coherent warm/cool hue-stepped ramps, a new committed digest, and regenerated faithful A/B views, visually reviewed by the primary.
- **Depends on:** none
- **Covers:** FR-3, NFR-3, NFR-7, AC-3, AC-7, AC-9
- **Touches:** `test/art/v2/humanoid/**`, `verification/recipe-changes.md`, `verification/phase-1.md`, gitignored `.conductor/evidence/**`
- **Verification:** `pnpm verify`; two-render digest equality against the new sidecar; generation-summary shows zero blocking findings; primary visual review recorded.
- **Status:** verified

- [x] **P1.T1: Re-author the humanoid palette** — covers: FR-3, NFR-3, AC-3
  - [x] **P1.T1.1:** Rebuild part ramps as warm/cool hue-stepped 5-stop ramps; keep the single top-left `light` before `auto_outline`, all nine parts, hero `torso`, value plan, `design.style=@project`, and design-block invariants.
  - [x] **P1.T1.2:** Keep only existing registered ops; recipe stays well under ~2000 ops.
- [x] **P1.T2: Render strict-clean and regenerate artifacts** — covers: FR-3, AC-3
  - [x] **P1.T2.1:** Copy root `px.style.json` beside the recipe in a temp workspace, render `--strict` twice to the same new digest, update `.sha256`, regenerate faithful `humanoid.8x.png` and `humanoid.debug.png` under `.conductor/evidence/art-v2/`, and record zero blocking findings.
- [x] **P1.T3: Prove byte-identity of all other assets** — covers: AC-7
  - [x] **P1.T3.1:** Diff-check the other five v2 recipes/sidecars and seven v1 originals; record their digests and the scoped humanoid waiver from the prior track in `verification/recipe-changes.md`.
- [x] **P1.T4: Primary visual self-review** — covers: NFR-7, AC-9
  - [x] **P1.T4.1:** Inspect `humanoid.8x.png` and `humanoid.debug.png` directly, compare with the pre-track baseline artifact, record an honest assessment in `verification/phase-1.md` with "no revision needed" or one bounded visual revision request.
  - [x] **P1.T4.2:** If a revision is requested, re-invoke the subagent once for the visual-only change and re-render/re-inspect before allowing Phase 2; no scoring is performed in this phase. No revision was requested.

**Result:** verified — strict-clean new digest `76c4ba9b…`; primary read all four A/B images directly and judged the candidate satisfactory with no revision; five other v2 assets and seven v1 originals byte-identical; `pnpm verify` exit 0.
**Checkpoint:** `6af20cb39ccee6b2131c14e5b7b2022357069baf`
**Evidence:** `conductor/tracks/20261118-gate-publishable-pass/verification/phase-1.md`

## Phase 2: Re-score the two affected passes and recompute the gate

- **Goal:** two machine-written flash-lite passes for humanoid A/B and a scorer-recomputed honest verdict, with the ten unaffected passes untouched.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-4, FR-5, FR-6, NFR-1, NFR-2, NFR-4, NFR-5, NFR-6, AC-1, AC-2, AC-4, AC-5, AC-6, AC-8
- **Touches:** `test/art/scores.json`, `verification/rescore.md`, `verification/phase-2.md`, gitignored `.conductor/evidence/**`
- **Verification:** `pnpm verify`; field-by-field diff shows `unaffected_checked=12 diffs=0` (two of 14 passes are affected); `node scripts/rubric-report.mjs` confirms the recomputed verdict.
- **Status:** verified

- [x] **P2.T1: Record artifact hashes and prepare PENDING evidence** — covers: FR-4, NFR-6
  - [x] **P2.T1.1:** Record the two artifact SHA-256 values and exact render/scorer commands in `verification/rescore.md`; leave scorer result cells PENDING for the primary.
- [x] **P2.T2: Primary-run two-pass credentialed scoring** — covers: FR-1, FR-2, FR-4, FR-6, NFR-1, NFR-2, NFR-5, AC-1, AC-2, AC-4, AC-6
  - [x] **P2.T2.1:** Run `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-publishable-pass humanoid A"` and the matching pass B command against `humanoid.debug.png`, with backoff retry for 503/429/non-JSON, no instrument switch, and no re-rolls.
  - [x] **P2.T2.2:** Confirm all 14 passes carry `model=gemini-3.5-flash-lite` and that only the two humanoid passes changed.
- [x] **P2.T3: Finalize honest verdict evidence** — covers: FR-5, AC-5, AC-8
  - [x] **P2.T3.1:** Fill the machine-written scores and scorer-recomputed verdict into `rescore.md` / `phase-2.md`; verify the twelve unaffected passes are JSON-identical; record `pnpm verify` exit 0.

**Result:** verified — gate PASSED honestly: `result=pass`, mean 3.82, `failures=[]`, both former humanoid A floor findings cleared (edge_language 2→3, palette_craft 2→4), `unaffected_checked=12 diffs=0`, no re-roll. Squash skipped (primary commit `9c1c6ac` in range unreported by subagent).
**Checkpoint:** `8f3d92d` (squash skipped; task commits retained)
**Evidence:** `conductor/tracks/20261118-gate-publishable-pass/verification/phase-2.md`

## Phase 3: Gate decision and bounded-stop record

- **Goal:** an explicit final decision — a quality win on `pass`, or a documented final fail with no further chase.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, AC-5, AC-6
- **Touches:** `verification/gate-decision.md`
- **Verification:** `pnpm verify`; `node scripts/rubric-report.mjs` agrees with `scores.json`.
- **Status:** in_progress

- [ ] **P3.T1: Record the final verdict** — covers: FR-5, AC-5
  - [ ] **P3.T1.1:** Write the verdict, mean, threshold, failures, two target criterion outcomes, commands, artifact digests, and scores.json before/after hashes into `verification/gate-decision.md`.
- [ ] **P3.T2: Record the bounded decision** — covers: FR-6, AC-6
  - [ ] **P3.T2.1:** On `pass`, record the quality win; on `fail`, record an explicit final ACCEPT with the bounded-stop rationale (one candidate, no re-rolls, no cross-instrument transfer). Do not force a pass or edit any score.

<!-- primary appends Result / Checkpoint / Evidence below after acceptance -->

<!--
Review fixes are appended by conductor-review as:

## Phase R<n>: Review Fixes
- **Goal:** ...
- **Depends on:** <last phase>
- **Covers:** ...
- **Touches:** ...
- **Verification:** ...
- **Status:** pending
-->
