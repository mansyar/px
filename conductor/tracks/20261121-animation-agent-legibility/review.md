# Review: Animation Agent Legibility Verification

- **Track:** `20261121-animation-agent-legibility`
- **Type:** chore
- **Branch:** `chore/20261121-animation-agent-legibility`
- **Range:** `4cc05bad23f3a11cd680922da0b15ba868d27842..f4797c6beccda146c3cdcad77ed409d4b803c9aa`
- **Date:** 2026-11-21
- **Verdict:** `BLOCK` (round 1 — two mechanically-fixable Medium findings; reviewer proposed PASS WITH FINDINGS)

## Summary

Evidence-only chore. The four hard gates are substantiated by committed artifacts:
strict validation reported zero `OUT_OF_BOUNDS`/`ORPHAN_PIXEL` on both recipes,
export produced a 64×16 sheet PNG plus sheet metadata with `timeline`
(`total_ms: 360`), all five artifact pairs are byte-identical across runs
(independently confirmed by the primary with SHA-256 and by the reviewer with
`git diff --no-index`), and the three-surface parity matrix covers six
subcommands × twelve flags. AC-1..AC-10 are covered. No Critical or High
findings. Two Medium findings concern evidence integrity, not the verdict
arithmetic: F1 — stale/unreachable verification-point hashes and a stale scope
diff in the final report; F2 — the spec claims more frame subcommands were
exercised by the fresh agent than the transcripts show. Both are mechanically
fixable within Conductor state; a single Review Fixes round (R1) is appended.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm verify` | pass | 123 files / 1111 tests; `verification/integrated.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | 120 files / 1079 tests; 94.89/85.81/98.3/94.69%; gate 80% |
| lint | `pnpm lint` (via `pnpm verify`) | pass | one pre-existing non-blocking warning at `test/recipe/version-1-2.test.ts:50` |
| typecheck | `pnpm exec tsc --noEmit` (via `pnpm verify`) | pass | — |
| build | `pnpm exec tsc -p tsconfig.build.json` (via `pnpm verify`) | pass | — |
| determinism | SHA-256 × 10 (primary) + `git diff --no-index` × 5 (reviewer) | pass | all pairs identical; absolute digests match `determinism.md:70-99` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `verification/docs-brief.md:22-31` | covered |
| FR-2 | P2.T1 | `verification/agent-runs.md:13-23`, both `calls.md` | covered (F2 — scope overstated in spec) |
| FR-3 | P2.T1 | `verification/agent-runs.md:29-77` | covered |
| FR-4 | P2.T2.1 | `verification/determinism.md:12-44` | covered |
| FR-5 | P2.T2.2 | `verification/determinism.md:46-76` | covered |
| FR-6 | P2.T3 | `verification/determinism.md:78-102` | covered |
| FR-7 | P1.T2 | `verification/parity-matrix.md:25-78` | covered |
| FR-8 | P3.T1 | `verification/agent-legibility.md:10-57` | covered (F1 — stale hashes) |
| NFR-1 | P1.T1, P2.T1, P3.T1 | `git diff --name-only 4cc05bad..HEAD` | covered |
| NFR-2 | P3.T2 | `git diff --name-only` (all paths under `conductor/`) | covered (F1 — stale count) |
| NFR-3 | P3.T1 | `verification/agent-legibility.md:12-16,75-77` | covered |
| NFR-4 | P3.T2.2 | no dependency manifest in diff | covered |
| AC-1 | P1.T1 | `verification/docs-brief.md`, `phase-1.md:31` | covered |
| AC-2 | P2.T1 | `verification/agent-runs.md`, `phase-2.md:32` | covered (F2) |
| AC-3 | P2.T1 | `verification/agent-runs.md:29-77` | covered |
| AC-4 | P2.T2.1 | `verification/determinism.md:20-44` | covered |
| AC-5 | P2.T2.2 | `verification/artifacts/run-1/flame.sheet.meta.json` (`timeline`) | covered |
| AC-6 | P2.T3 | `verification/determinism.md:86-102` + digests | covered |
| AC-7 | P1.T2 | `verification/parity-matrix.md`, `phase-1.md:32` | covered |
| AC-8 | P3.T1 | `verification/agent-legibility.md`, `phase-3.md:32` | covered (F1) |
| AC-9 | P3.T2.1 | `git diff --name-only` (all paths under `conductor/`) | covered (F1 — stale count) |
| AC-10 | P3.T2.2 | no dependency manifest | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Stale/unreachable verification-point hashes and scope diff in evidence**
  - **File:** `verification/agent-legibility.md:7,61` (also `phase-1.md:79`, `phase-2.md:83`, `phase-3.md:143`, `integrated.md:6`)
  - **What:** The final report records pre-squash working-state hashes as HEAD (`e50a92f…`, `74cfde8…`, `fce7b0e…`, `a283113…`) that are not reachable commits; `integrated.md:6` records `0fabc98` though committed later at `97e47b0`. The "verbatim" scope diff at `phase-3.md:52-82` states 25 files / 1921 insertions, but the HEAD diff is 27 files / 1978 insertions after `integrated.md` and `review.md` were added.
  - **Why:** AC-8/AC-9 are evidenced by these records; a reader cannot reproduce the stated verification point and the scope output understates the committed diff. The substantive conclusion (all paths under `conductor/`) still holds, so the verdict is unaffected.
  - **Fix:** Relabel transient hashes as pre-squash working states paired with reachable phase-checkpoint SHAs (`f42e931`, `21929ac`, `02ed637`); label the scope diff as a verification-point snapshot and record the reproducible command plus the invariant (all paths under `conductor/`, no dependency manifest) rather than a brittle count that grows with each Conductor-state commit.
  - **Requirement:** AC-8, AC-9
  - **Test gap:** none (static evidence; primary re-checks recorded hashes against `git log` after the fix).

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All three phases have `Result: verified`, `Checkpoint`, and `Evidence`; all 7 tasks are `[x]` and were implemented. The final diff stays within the union of phase Touches plus Conductor-state commits (integrated evidence, doc-sync stub). No task was dropped. R1 fix phase appended below.

## Out of scope

Engine, CLI, MCP, human docs, goldens, rubric, lint thresholds, CI, and dependency manifests — explicitly excluded by spec NFR-2. The empty-`ops` flame art and advisory 9-call count are disclosed follow-ups, not defects in this track.

## Debt

- Empty-ops flame art (`pixel_count: 0`) — disclosed follow-up; strict gate was structurally exercised but not against real findings; no in-track fix (evidence-only scope).
- Pre-existing `noNonNullAssertion` Biome warning at `test/recipe/version-1-2.test.ts:50` — predates this track; non-blocking.

## Doc sync

`none` — evidence-only chore; no product/guideline/tech-stack change. See `review.md` stub committed at `f4797c6`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK (fixes pending) | 0 | 0 | 2 | 0 | 0 |
