# Phase 1 verification — Gate Contract and Provenance

- Track: `20261117-gate-instrument-reconciliation`
- Branch: `chore/20261117-gate-instrument-reconciliation`
- Phase base: `312bcfd`
- Date: 2026-11-17
- Covers: FR-1, FR-2, FR-3, FR-11, NFR-4, NFR-5, AC-1, AC-2, AC-3, AC-12

## Task commits (work order T1 → T3 → T2)

| Task | Commit | Subject |
| --- | --- | --- |
| P1.T1 | `be00943` | `docs(rubric): bind publishable 3.5/3.0 gate and mark 4.0 aspiration` |
| P1.T3 | `eb15630` | `chore(art): freeze agent-vision scores as immutable provenance` |
| P1.T2 | `d67ab22` | `test(calibration): bind score record to publishable gate` |

T3 (provenance copy) was executed and committed before T2 (gate-record update), so the
old `threshold_mean: 4` / `min_allowed: 3` record survives byte-for-byte in
`test/art/scores-agent-vision.json`.

## Command results

| Command | Result | Exit code | Notes |
| --- | --- | --- | --- |
| `pnpm vitest run test/unit/calibration/gate.test.ts` | PASS (3 tests) | 0 | After T1 doc edit; parser still reads the target table. |
| `pnpm vitest run test/unit/calibration/gate.test.ts test/art/rubric.test.ts` | PASS (14 tests) | 0 | After T2; new binding test and existing 13 tests pass. |
| `git diff --no-index -- test/art/scores.json test/art/scores-agent-vision.json` (immediately after copy) | no output | 0 | Provenance copy byte-identical to the pre-track record. |
| `git diff -- test/art/scores.json` | only 2 lines | — | Sole change is `threshold_mean` 4→3.5 and `min_allowed` 3→3.0. |
| `pnpm verify` (attempt 1) | FAIL | 1 | Flaky cold-start timeout: `test/smoke/binaries.test.ts` `--help` spawn took 6149ms vs 5000ms test timeout. Unrelated to changed files. |
| `pnpm verify` (attempt 2, warm caches) | PASS | 0 | `tsc --noEmit`, `biome check .`, `vitest run` (119 files, 1025 tests), `tsc -p tsconfig.build.json` all pass. |
| `pnpm vitest run --coverage` | PASS | 0 | 119 files, 1025 tests; coverage 95.09% statements / 85.89% branches / 98.51% functions / 94.87% lines. No threshold or exclude changed. |

Both brief-mandated verification commands exit 0 on the final tree. The single Biome
finding in `test/recipe/version-1-2.test.ts:50` is a pre-existing **warning**
(`lint/style/noNonNullAssertion`), not introduced by this phase and not an error.

## Acceptance criteria

| AC | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| AC-1 | Target table names publishable mean 3.5 / floor 3.0 as binding gate and declares exceptional unreachable with dated evidence | PASS | `docs/rubric.md` target table + new dated `Shipping gate decision (2026-11-17)` paragraph; `gate.test.ts` unreachable/evidence check unchanged and passing. |
| AC-2 | `scores.json` has `threshold_mean: 3.5` and `min_allowed: 3.0`; gate test fails on drift | PASS | `test/art/scores.json` verdict; new `binds the score record to the documented publishable gate` test compares both against the parsed publishable tier. |
| AC-3 | `scores-agent-vision.json` byte-identical to pre-track `scores.json`; `scores-before-intent.json` unchanged | PASS | `git diff --no-index` empty at copy time; `git status --short` showed only the new file; `scores-before-intent.json` never touched. |
| AC-12 | Both `pnpm verify` and `pnpm vitest run --coverage` exit 0 with no threshold/exclude/ignore change | PASS | Command results above; no Vitest/Biome/coverage config edited. |

Requirement coverage: FR-1, FR-2, FR-3 (docs + binding gate test), FR-11 and NFR-4/NFR-5
(provenance immutability, no engine/dependency change) addressed within this phase's scope.

## No-regression table

| Area | Requirement | Result |
| --- | --- | --- |
| Render digests | All 19 committed digests unchanged | PASS — no `test/goldens/**`, `test/benchmarks/*/`, `test/art/*/` asset dir or `.sha256` file touched. |
| Scores / rationales / verdicts | No score removed, softened, or rerolled | PASS — diff of `scores.json` is exactly the two gate numbers; 8 failures and mean 3.39 retained. |
| `scores-before-intent.json` | Immutable | PASS — not modified. |
| `scores-agent-vision.json` | Immutable once copied | PASS — not modified after copy. |
| Engine behavior | No change | PASS — no `src/**` file touched. |
| Dependencies / network | No new runtime dep, no network import in engine/tests/CI | PASS — no manifest or config change. |
| Coverage threshold / exclude | No change | PASS — `vitest` config untouched. |
| Archived specs / primary-owned files | Not edited | PASS — no `spec.md`, `plan.md`, `metadata.json`, `tracks.md`, `conductor/index.md`, `review.md` or `pr.md` change. |

## Final tree

`git diff --stat 312bcfd..HEAD` — 4 files changed, 372 insertions(+), 2 deletions(-):
`docs/rubric.md`, `test/art/scores-agent-vision.json`, `test/art/scores.json`,
`test/unit/calibration/gate.test.ts`. Working tree clean apart from this uncommitted
evidence file.

## Primary verification

| Check | Result |
| --- | --- |
| Worktree | Only this untracked evidence file before acceptance. |
| Commits | 3 commits in `312bcfd..HEAD` (`be00943`, `eb15630`, `d67ab22`), 0 merges. |
| Scope | Exactly the four declared files; no `src/**`, no config, no artifact digest. |
| Digest diff | Empty across `test/goldens/**`, `test/benchmarks/*/`, `test/art/*/` and every `.sha256`. |
| Provenance | `scores-agent-vision.json` equals the base revision of `scores.json` byte-for-byte; `scores-before-intent.json` untouched. |
| Score-record diff | Only `threshold_mean: 4 -> 3.5` and `min_allowed: 3 -> 3.0`; mean 3.39, all 8 failures and every rationale retained. |
| `pnpm verify` | Exit 0 on primary rerun: typecheck, Biome (1 pre-existing warning), 119 files / 1025 tests, build. |
| `pnpm vitest run --coverage` | Exit 0: 1025 tests; 95.09% statements, 85.89% branches, 98.51% functions, 94.87% lines. No threshold or exclude changed. |

Source checks: `docs/rubric.md:176-188` records the dated owner decision that publishable
3.5/3.0 is binding and exceptional 4.0 is unreachable aspiration; `gate.test.ts:123-132`
compares `scores.json` against the parsed publishable tier, while the unchanged
unreachable-tier test at `:151-155` still requires dated evidence. The executor's first
`pnpm verify` attempt hit a cold-start smoke timeout and it re-ran cleanly; the primary's
independent rerun above confirms the final tree.

Squash guard: 3 commits, 0 merges, all reported. Squashed to checkpoint `<checkpoint>` with
`git reset --soft 312bcfd` and one conventional acceptance commit.
