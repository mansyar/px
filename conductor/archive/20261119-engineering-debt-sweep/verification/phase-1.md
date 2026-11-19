# Phase 1 Verification — Bring `scripts/` under Biome

- Track: 20261119-engineering-debt-sweep — Engineering Debt Sweep
- Phase: 1 — Bring `scripts/` under Biome
- Date: 2026-11-19
- Branch: `chore/20261119-engineering-debt-sweep`
- Base commit: `cbe85078ac2bb32ac03732a55fad044abd92b506`
- Head commit (code/config changes): `fa69fceafb0b687abb64b6f5a18e492a4bc0dd93`
  (`chore(lint): bring scripts/ under Biome coverage`)
- Evidence docs are committed in the immediately following `docs(verification)` commit.
- Final evidence commit: `docs(verify): finalize phase 1 script coverage evidence` (this
  finalization commit; hash recorded in the phase report JSON).

## Result

**verified** — `pnpm verify` exits 0 with all seven `scripts/**/*.mjs` files now covered by
Biome and zero script findings. No linter rules were weakened, no dependencies added, and
no suppressions introduced. The primary ran every scoped Biome/lint command, the coverage
gate and the smoke checks; all results are recorded below and AC-1 and AC-2 are fully
verified.

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Baseline | `pnpm verify` (unmodified repo) | 0 | typecheck OK; `biome check .` checked 216 files, 0 errors, 1 pre-existing warning; 119 test files / 1028 tests passed; build OK |
| Config | edit `biome.json` to add `scripts/**/*.mjs` to `files.include` | — | single config edit; no rule or dependency change |
| Findings | `pnpm verify` (after include, before fixes) | 1 | `biome check .` checked 223 files: 9 errors, 2 warnings in scripts (see `scripts-coverage.md` §3) |
| Fixes | source formatting/code corrections in 6 of 7 scripts | — | `rubric-report.mjs` was already clean; no suppressions |
| Verification (phase command) | `pnpm verify` | 0 | typecheck OK; `biome check .` checked 223 files, 0 errors, 1 warning (pre-existing, out of scope); 119 test files / 1028 tests passed; build OK |
| Inspection | `git status --short --branch`, `git rev-parse HEAD`, `git log --oneline` (bounded) | 0 | branch and commits confirmed |

Primary-run results (executed by the primary; recorded here by this agent):

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Scoped lint | `pnpm exec biome check scripts/` | 0 | `Checked 7 files in 23ms. No fixes applied.` — all seven `.mjs` files processed, zero errors |
| Lint | `pnpm lint` | 0 | `Checked 223 files in 166ms. No fixes applied. Found 1 warning.` — pre-existing out-of-scope `noNonNullAssertion` at `test/recipe/version-1-2.test.ts:50` |
| Verify | `pnpm verify` | 0 | typecheck clean; lint above; 119 test files / 1028 tests passed; build clean |
| Coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 test files / 996 tests passed; `All files 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines`, all above the 80% gate; benchmarks excluded |
| Smoke | `node scripts/rubric.mjs --help` | 1 | usage output; identical exit to the pre-change baseline (usage exits 1) |
| Smoke | `node scripts/rubric-report.mjs --help` | 1 | usage output; identical exit to the pre-change baseline |
| Smoke | `node scripts/upscale.mjs` (no arguments) | 1 | usage output; identical exit to the pre-change baseline |
| Smoke | `node scripts/rubric-report.mjs` | 0 | `7 assets, 14 passes`, `mean 3.82 · pass · gemini-3.5-flash-lite`, unchanged |
| Hash | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged |
| Smoke (gate report) | existing read-only gate report | — | covered by the primary's coverage run and `node scripts/rubric-report.mjs` result above; no separate output recorded |

The three smoke invocations that exit 1 are usage-only calls whose exit code is identical to
the pre-change baseline; they are not regressions.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-1 | `pnpm exec biome check scripts/` processes all four files with zero errors. | Primary ran `pnpm exec biome check scripts/` → exit 0, `Checked 7 files in 23ms. No fixes applied.` The brief says "four files" but the include covers **seven** `.mjs` files (four top-level helpers plus three under `scripts/calibrate/`); all seven pass. The deviation is accepted by the primary. | verified |
| AC-2 | `pnpm verify` exit 0 and scoped coverage ≥80% on all four metrics. | `pnpm verify` exit 0 (typecheck, lint, 119 test files / 1028 tests, build). Primary coverage run exit 0: 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines — all four metrics above the 80% gate. | verified |
| FR-1 | Add `scripts/**/*.mjs` to Biome includes and fix all findings without disabling rules. | `biome.json` include list; `scripts-coverage.md` §2–§3: 9 errors + 1 script warning fixed with source-only changes, no rules disabled. | done |
| NFR-1 | No new dependency and no lint-rule weakening; source formatting/code corrections only. | `biome.json` diff is one `files.include` entry; no `package.json` or rule changes; no `biome-ignore` added. | done |
| NFR-2 | `pnpm verify` exit 0. | final `pnpm verify` exit 0. | done |
| NFR-3 | Changes limited to allowed paths. | `git diff --name-only` within `biome.json`, `scripts/**/*.mjs`, and this track's evidence; no run-state, archived, or product files touched. | done |

AC-3 through AC-6 belong to later phases of this track and are out of scope for Phase 1.

## Evidence paths

- `conductor/tracks/20261119-engineering-debt-sweep/verification/scripts-coverage.md`
- `conductor/tracks/20261119-engineering-debt-sweep/verification/phase-1.md` (this file)

## Deviations

- **Brief baseline said `scripts/` has exactly four helpers; the include covers seven `.mjs`
  files.** `glob scripts/**/*` found four top-level helpers plus `scripts/calibrate/views.mjs`,
  `variants.mjs` and `ceiling.mjs`. All seven are within the assigned `scripts/**/*.mjs`
  Touches path and all were fixed; recorded in `scripts-coverage.md` §1.1 and AC-1.
- **One pre-existing warning left untouched:** `test/recipe/version-1-2.test.ts:50:7
  lint/style/noNonNullAssertion` is outside Touches and predates this phase. It is not a
  new finding and was not suppressed or edited.
- **Stray untracked duplicate `conductor/runs/` removed by the primary (outside phase
  scope).** A path-typo duplicate untracked `conductor/runs/` directory existed alongside
  the brief's `.conductor/runs/`; the primary removed it during finalization. No tracked
  file was affected and it was not part of this phase's Touches.

## Notes

- The strict `checkJs` probe baseline of 158 type errors is recorded out of scope in
  `scripts-coverage.md` §1.3; no typing changes were attempted.
- `test/art/scores.json` (SHA-256 `E5CCE080…828D`) was not edited; `pnpm rubric:calibrate`
  was not run.
- The dead `materialOf` helper in `ceiling.mjs` was removed (single occurrence confirmed by
  grep) rather than underscore-prefixed, so the warning was fixed at the source without a
  suppression.
- Finalization complete: the primary replaced every pending-primary cell with the real
  results above; AC-1 and AC-2 are now fully verified. The primary also confirmed the tree
  is clean after this phase's two commits, that range `cbe85078..HEAD` is exactly those two
  commits and nine files (all within Touches), and that no score, recipe, archived or
  product file changed.

## Primary verification (conductor-implement)

- Date: 2026-11-19; branch `chore/20261119-engineering-debt-sweep`; phase base `cbe85078ac2bb32ac03732a55fad044abd92b506`.
- Tree clean; range `cbe85078..HEAD` contains exactly the three commits reported by the phase subagent (`fa69fce`, `e0e4920`, `c935b90`) with no merge or unreported commit.
- Changed paths are exactly nine: `biome.json`, seven `scripts/**/*.mjs`, and this track's two verification files — all within Touches.
- `grep -c 'PENDING PRIMARY'` returns 0 in both evidence files; Result is `verified`.
- Primary re-confirmed `test/art/scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged.
- Primary-run checks (executed before finalization, transcribed into the evidence table): scoped Biome check exit 0 / 7 files; `pnpm lint` exit 0 / 223 files / 1 pre-existing warning; `pnpm verify` exit 0 / 119 files / 1028 tests; scoped coverage exit 0 with 95.02% / 85.72% / 98.33% / 94.82%; three script smoke checks exit 1 as in baseline; rubric report exit 0, mean 3.82 pass.
- AC-1 and AC-2 satisfied; phase subagent report status `verified`, blockers [].
- Squash guard eligible: all commits in range were reported by the subagent and none is a merge or user commit.
