# Phase 1 Closeout Audit — CI, Verification Layers, Gate, and Ledger Snapshot

- Track: `20261118-phase1-closeout-audit` (Phase 1 Closeout Audit)
- Phase: 1 — Audit CI, verification layers, gate, and ledger
- Date: 2026-11-18
- Branch: `chore/20261118-phase1-closeout-audit`
- Phase base / audited HEAD: `92dec65f2ff0c136ea30f06c1ced9f7d1e9602bb`
- Branch base (plan.md / metadata.json): `0f866801e9271512d14bed154e60ee1c06c93c4b`
- Result: **VERIFIED — all configured checks and primary-only inputs green**

This record is a read-only audit. It documents observed state; it does not change engine, art, scoring, CI, dependency, or recipe behavior. Code delta for this phase is intentionally empty. Three commands were denied to the phase shell and were run verbatim by the primary; their real results are recorded here and in §7.

---

## 1. CI snapshot — `.github/workflows/ci.yml`

| Item | Observed value |
|---|---|
| Workflow name | `CI` |
| Triggers | `push` on `branches: ["main"]`; `pull_request` (all branches) |
| Concurrency | `group: ci-${{ github.ref }}`, `cancel-in-progress: true` |
| Job | `verify`, display name `verify (${{ matrix.os }})` |
| Matrix | `os: ["ubuntu-latest", "windows-latest"]`, `fail-fast: false`, `runs-on: ${{ matrix.os }}` |

Exact step sequence:

| # | Step | Command / action |
|---|---|---|
| 1 | Checkout | `actions/checkout@v4` |
| 2 | pnpm setup | `pnpm/action-setup@v4` with `version: 12` |
| 3 | Node setup | `actions/setup-node@v4` with `node-version: "24"`, `cache: "pnpm"` |
| 4 | Install | `pnpm install --frozen-lockfile` |
| 5 | Typecheck | `pnpm typecheck` |
| 6 | Lint | `pnpm lint` |
| 7 | Test | `pnpm test` |
| 8 | Coverage gate | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` |
| 9 | Build | `pnpm build` |
| 10 | Determinism (golden hashes) | `pnpm vitest run --project goldens` |

Tool pins vs `package.json` `engines`:

| Tool | CI pin | Manifest | Match |
|---|---|---|---|
| Node | `"24"` (`setup-node@v4`) | `engines.node: ">=24 <25"` | Yes — CI major 24 is inside the declared range; host is v24.x |
| pnpm | `12` (`pnpm/action-setup@v4`) | no `engines.pnpm` field declared | CI pins a concrete major; manifest is silent (no conflict) |
| Lockfile | `--frozen-lockfile` | `pnpm-lock.yaml` committed | Yes — install is locked, not resolved fresh |

`pnpm verify` in this repo chains `typecheck → lint → test → build`; CI runs the same four as individual steps (5, 6, 7, 9), plus the separate coverage gate (8) and determinism layer (10).

---

## 2. Verification-layer → command → CI-equivalent mapping

Source: `conductor/workflow.md` (Workflow Config and Verification Strategy) and `vitest.config.ts` (project definitions).

| Layer | Workflow Config command | CI equivalent | Result (this audit) |
|---|---|---|---|
| static | `pnpm typecheck && pnpm lint && pnpm build` | steps 5 (`pnpm typecheck`), 6 (`pnpm lint`), 9 (`pnpm build`) | PASS — run via `pnpm verify`; typecheck clean, lint warning only, build clean |
| unit | `pnpm vitest run --project unit` | step 7 `pnpm test` (`vitest run`) + step 8 coverage projects | PASS — included in the 119-file / 1028-test `pnpm verify` run |
| integration | `pnpm vitest run --project integration` | step 7 + step 8 coverage projects | PASS — included in the 119-file / 1028-test `pnpm verify` run |
| smoke | `pnpm vitest run --project smoke` | step 7 + step 8 coverage projects | PASS — included in the 119-file / 1028-test `pnpm verify` run |
| determinism | `pnpm vitest run --project goldens` | step 10 (identical command) | PASS — 1 test file / 2 tests, hashes match |
| coverage (separate gate) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | step 8 (identical command) | PASS — primary-run (phase shell denied); exit 0, all four metrics above the 80% gate |

Coverage scope confirmation (`vitest.config.ts`): five projects are defined — `unit`, `integration`, `smoke`, `goldens`, `benchmarks`. The configured coverage command selects the first four and deliberately excludes `benchmarks`, so v8 instrumentation does not inflate the wall-clock NFR-7 measurement (NFR-7 stays enforced uninstrumented by `pnpm verify`). Coverage thresholds are `lines/functions/branches/statements: 80`; the `include` list is `src/core/**`, `src/lint/**`, `src/meta/**`, `src/palettes/**`, `src/brief/**`, `src/critique/**`, and `src/render/views.ts`. Workflow Config declares `coverage.enforced_by: separate-step`, `runs_in: [ci, phase-acceptance]` — consistent with CI step 8 being a dedicated step outside `pnpm verify`.

---

## 3. Final-check commands table

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static + unit + integration + smoke | `pnpm verify` | **0** | typecheck clean; lint checked 216 files, 1 pre-existing warning (`lint/style/noNonNullAssertion` at `test/recipe/version-1-2.test.ts:50:7`), no fixes; test 119 files / 1028 tests passed; `tsc -p tsconfig.build.json` build clean |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | **0** (primary-run; phase shell denied) | Statements 95.02% (3969/4177), Branches 85.72% (2625/3062), Functions 98.33% (530/539), Lines 94.82% (3758/3963); gate 80% — all four above threshold; benchmarks excluded |
| determinism | `pnpm vitest run --project goldens` | **0** | 1 test file passed; 2 tests passed; golden SHA-256 hashes match |
| rubric report | `node scripts/rubric-report.mjs` | **0** (primary-run) | `rubric report — 7 assets, 14 passes`; mean `3.82 · pass`; criterion means silhouette 4.93, value_separation 3.86, lighting 3.21, edge_language 3.29, cluster_discipline 4.29, palette_craft 3.36 (14 passes each); zero below-floor failures; `scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| ledger / PR state | `gh pr list --state open --json number,title,headRefName,url` | **0** (primary-run) | Output `[]` — zero open PRs |

All configured checks are green. Three commands were run verbatim by the primary because the phase shell denied them (§7); their real results are above. No check failed.

---

## 4. Gate snapshot — `test/art/scores.json` (read live)

| Field | Value |
|---|---|
| Schema / rubric | `schema: 3`, `docs/rubric.md` |
| `verdict.result` | `pass` |
| `verdict.mean` | `3.82` |
| `verdict.threshold_mean` | `3.5` |
| `verdict.min_allowed` (floor) | `3` |
| `verdict.failures` | `[]` — zero below-floor criterion scores |
| `verdict.basis` | `independent` |
| Instrument | `scripts/rubric.mjs`, model `gemini-3.5-flash-lite`, `fallback_used: true` (promoted from `gemini-4-hydrogen` after its free-tier quota was exhausted) |
| Asset set / passes | 7 assets (`potion`, `sword`, `humanoid`, `chest`, `character`, `prop`, `scene`), 2 passes each (A exact 8x nearest-neighbour / B engine debug sheet) = 14 passes |
| Gate | `publishable 3.5/3.0` |

Criterion means computed across all 14 passes:

| Criterion | Mean | Sum / 14 |
|---|---|---|
| silhouette | 4.93 | 69 / 14 |
| value_separation | 3.86 | 54 / 14 |
| lighting | 3.21 | 45 / 14 |
| edge_language | 3.29 | 46 / 14 |
| cluster_discipline | 4.29 | 60 / 14 |
| palette_craft | 3.36 | 47 / 14 |

Cross-check: total 321 across 84 criterion scores → 321 / 84 = 3.82, matching `verdict.mean`. Lowest criterion mean is `lighting` 3.21, above the 3.0 floor.

Rubric report (primary-run; phase shell denied general `node`):

| Command | Exit | Result |
|---|---|---|
| `node scripts/rubric-report.mjs` | 0 | `rubric report — 7 assets, 14 passes`; `record: mean 3.82 · pass · scored by scripts/rubric.mjs with gemini-3.5-flash-lite, run by the primary; two passes per asset (A on the exact 8x nearest-neighbour upscale, B on the engine debug sheet); gate-publishable-pass re-score of two affected passes (humanoid A/B) with the twelve unaffected passes left byte-identical`. Criterion means silhouette 4.93, value_separation 3.86, lighting 3.21, edge_language 3.29, cluster_discipline 4.29, palette_craft 3.36 (14 passes each); zero below-floor failures; `scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`. |

Historical vs current: `mean 3.25` (`gemini-4-hydrogen` baseline), `3.67` (craft-application, floor fail), and `3.73` (gate-close, floor fail) are prior point-in-time records on a different instrument or earlier passes. They are preserved as provenance in `scores-before-intent.json` / `scores-agent-vision.json` and are not comparable to the current `3.82`. The current gate verdict is the publishable tier, not the documented-but-unreachable 4.0 exceptional tier.

---

## 5. Ledger snapshot

| Item | Observed | Evidence |
|---|---|---|
| Registry `[x]` lines | 14 / 14 archived tracks | `conductor/tracks.md` lines 5, 7, 9, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33 |
| Current track registry line | 1 `[~]` — `20261118-phase1-closeout-audit` (in progress) | `conductor/tracks.md` line 35; expected while this track is active |
| Active tracks other than current | 0 | no other `[~]` / open line in `conductor/tracks.md` |
| Archive directories | 14 | `conductor/archive/` listing matches the 14 `[x]` entries one-for-one |
| Open PRs | 0 (primary-run) | `gh pr list --state open --json number,title,headRefName,url` exited 0 with output `[]` |

Note on "zero active tracks": at track start the registry held 14 `[x]` lines and no in-progress line. The single `[~]` now present is this track itself, which is necessarily active while Phase 1 is audited; there are zero active tracks besides it. No PR was merged or closed during this audit, and no run file was closed by this phase (closure belongs to the primary's phase-acceptance step).

Primary read-only cross-check: `git status --porcelain` empty; `git diff --name-only 92dec65f2ff0c136ea30f06c1ced9f7d1e9602bb..HEAD` lists exactly the two evidence files; at cross-check time the single reported commit was `473a1f6` (no merges or unreported commits); determinism layer `pnpm vitest run --project goldens` exited 0 (1 file / 2 tests, hashes match). Finalization adds one more commit to the same two evidence files.

---

## 6. Notes

- **Historical vs current.** `scores.json` verdict `pass` / 3.82 is the current, binding publishable-gate result. The 3.25 / 3.67 / 3.73 numbers in `conductor/tech-stack.md` dated notes are historical point-in-time records, not the current gate. This audit reads them as history and does not rewrite them.
- **Not in scope.** No engine, CLI, MCP, op, linter, rubric, CI-config, or dependency change; no score, rationale, verdict, recipe, sidecar, golden, or `scores.json` edit; no instrument call by this phase; no PR merge/close; no doc reconciliation (Phase 2) and no closeout declaration (Phase 3).
- **Primary-run history.** Scoped coverage, `node scripts/rubric-report.mjs`, and the open-PR listing were denied to the phase shell and were run verbatim by the primary on 2026-11-18; their real results are recorded in §§3–5 and §7. Every configured check is now green; no check failed.
- **Artifacts.** No binary artifacts were produced; `.conductor/evidence/` was not modified by this phase.

---

## 7. Primary-run resolution log (history)

The phase shell denied three commands; the primary ran each verbatim and handed back the real results. These are retained for provenance, not as open blockers.

| Command | Why primary ran it | Exit | Real result |
|---|---|---|---|
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | phase shell returned `permission.rejected: shell` | 0 | Statements 95.02% (3969/4177), Branches 85.72% (2625/3062), Functions 98.33% (530/539), Lines 94.82% (3758/3963); gate 80%, all above; benchmarks excluded |
| `node scripts/rubric-report.mjs` | primary-only; phase shell denies general `node` | 0 | 7 assets, 14 passes; mean 3.82 · pass; criterion means 4.93 / 3.86 / 3.21 / 3.29 / 4.29 / 3.36; zero below-floor failures; `scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| `gh pr list --state open --json number,title,headRefName,url` | primary-only; phase shell denies general `gh` | 0 | `[]` — zero open PRs |
