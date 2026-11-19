# Godot 4 Export Validation — Implementation Plan

> **Branch:** `chore/20261119-godot-export-validation`
> **Base:** `main` @ `0ea5c5357985b365e02b860d872e0de5bca93d84`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Export hero and validate in headless Godot

- **Goal:** Produce the exported hero PNG + `.meta.json` and prove in real Godot 4 that the offset/anchor contract holds, with every command, exit code, hash, and GDScript assertion recorded.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-3, NFR-4, NFR-5, AC-1, AC-2, AC-3, AC-4, AC-8
- **Touches:** gitignored `.conductor/evidence/godot-export/**`, `verification/godot-validation.md`, `verification/phase-1.md`
- **Verification:** `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export --strict` in an isolated workspace; `C:\Godot\godot.exe --headless --path <project> --script validate.gd`; primary hash and `buildMetadata` comparison; `pnpm verify`
- **Status:** in_progress

- [ ] **P1.T1: Export the golden hero fixture** — covers: FR-1
  - [ ] **P1.T1.1:** Copy `test/goldens/fixtures/hero.px.json` and root `px.style.json` into an isolated workspace under `.conductor/evidence/godot-export/export/`.
  - [ ] **P1.T1.2:** Run `render --export --strict`; record exit, stdout/stderr, generated `hero.png` and `hero.meta.json`.
  - [ ] **P1.T1.3:** Confirm PNG SHA-256 equals `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` (golden `hero.sha256`).
- [ ] **P1.T2: Run the headless Godot validator** — covers: FR-2, FR-3, FR-4
  - [ ] **P1.T2.1:** Create `project.godot`, copy the exported PNG/meta and canonical recipe into a gitignored Godot project directory, and author `validate.gd`.
  - [ ] **P1.T2.2:** Assert texture loads at trimmed 8×8; `texture_path`, `filter:false`, `centered:false`; `offset == generic.origin == [-trim.x,-trim.y]`; `anchor + offset == anchor - trim`; hero pivot `(8,8)` maps to local `(4,4)` inside the texture.
  - [ ] **P1.T2.3:** Run `C:\Godot\godot.exe --headless --path <project> --script validate.gd`; record Godot version, exact command, exit code, full stdout/stderr, and a true/false result per assertion. One bounded retry only for transient startup failure.
- [ ] **P1.T3: Verify integrity in the primary process** — covers: FR-5
  - [ ] **P1.T3.1:** Confirm `--export` and Godot import leave the PNG hash unchanged.
  - [ ] **P1.T3.2:** Compare exported metadata with `buildMetadata` output and confirm `generic.recipe_hash` matches canonical recipe bytes.
- [ ] **P1.T4: Write Phase 1 evidence** — covers: NFR-4, AC-8
  - [ ] **P1.T4.1:** Write `verification/godot-validation.md` with commands, exits, hashes, Godot version, assertion table, and the exact artifact paths.
  - [ ] **P1.T4.2:** Write `verification/phase-1.md` with Result, command table, AC table, deviations, and `PENDING PRIMARY` markers for commands only the primary may run.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-godot-export-validation/verification/phase-1.md
-->

## Phase 2: Record the honest decision and bounded stop

- **Goal:** A single decision record states PASS or FAIL from the Phase 1 evidence, with limitations and a follow-up for any real discrepancy — no engine change and no forced outcome.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-5, NFR-6, AC-5, AC-8
- **Touches:** `verification/decision.md`, `verification/phase-2.md`
- **Verification:** primary-run content assertion that the decision matches the recorded assertions and exit codes; `pnpm verify`
- **Status:** pending

- [ ] **P2.T1: Decide the outcome** — covers: FR-6
  - [ ] **P2.T1.1:** Derive PASS only if all Phase 1 assertions and integrity checks are green; otherwise record FAIL with the exact discrepancy.
  - [ ] **P2.T1.2:** State explicitly that no engine, metadata, score, or recipe change was made, and that a real defect requires a separate track.
- [ ] **P2.T2: Record limitations and follow-up** — covers: NFR-5, NFR-6
  - [ ] **P2.T2.1:** List unexercised cases (e.g. empty trim, other Godot versions, GUI import) as limitations, not passes.
  - [ ] **P2.T2.2:** Record any follow-up as prose only — no GitHub issue creation and no merge action.
- [ ] **P2.T3: Write Phase 2 evidence** — covers: AC-5, AC-8
  - [ ] **P2.T3.1:** Write `verification/decision.md` and `verification/phase-2.md` with the decision, evidence links, command table, AC table, and deviations.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-godot-export-validation/verification/phase-2.md
-->

## Phase 3: Final verification snapshot and closeout

- **Goal:** Re-run all configured checks at the final branch HEAD and record that no product code or published evidence changed.
- **Depends on:** Phase 2
- **Covers:** FR-7, NFR-2, NFR-6, AC-6, AC-7, AC-8
- **Touches:** `verification/final-checks.md`, `verification/phase-3.md`
- **Verification:** `pnpm verify`; `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`; `pnpm vitest run --project goldens`; `node scripts/rubric-report.mjs`; `Get-FileHash -Algorithm SHA256 test/art/scores.json`; `git diff --name-only 0ea5c53..HEAD`
- **Status:** pending

- [ ] **P3.T1: Run final checks** — covers: FR-7, NFR-2, NFR-6
  - [ ] **P3.T1.1:** Re-run verify, scoped coverage, goldens, and rubric report at final HEAD; record exit codes and metrics.
  - [ ] **P3.T1.2:** Confirm `scores.json` hash `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` and that the diff contains only Conductor state/verification paths.
- [ ] **P3.T2: Write the closeout record** — covers: AC-6, AC-7, AC-8
  - [ ] **P3.T2.1:** Write `verification/final-checks.md` and `verification/phase-3.md` with the final command table, AC table, scope proof, and Result.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-godot-export-validation/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
