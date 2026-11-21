# Phase R1 Evidence — Review Fixes (F1, F2)

- Track: `20261121-animation-agent-legibility` — Animation Agent Legibility Verification
- Phase: R1 — Review Fixes
- Date: 2026-11-21
- Branch: `chore/20261121-animation-agent-legibility`
- Phase base: `6d950f9` (review-fixes phase added to plan)
- Track base: `4cc05bad23f3a11cd680922da0b15ba868d27842`
- Review HEAD: `f4797c6beccda146c3cdcad77ed409d4b803c9aa`
- Result: **verified** — all F1/F2 edits are complete and GREEN. The `spec.md`
  edit (F2 item 1) was initially permission-denied to the phase executor
  (`spec.md` is primary-owned) and was applied by the primary; the denied
  verification command was re-run by the primary. See `## Primary verification`.

This is an evidence-only chore. No `src/`, `docs/`, golden, rubric, lint-threshold,
CI or dependency-manifest file was touched.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| RED self-check (read) | native `read`/`grep` on each target line | 0 | Confirmed all stale strings present before editing (details below). |
| Hash reachability | `git log --all --oneline --max-count=30` | 0 | Confirmed `f42e931`, `21929ac`, `02ed637`, `f4797c6`, `97e47b0`, `4cc05ba` reachable. |
| Hash reachability (alt) | `git cat-file -t f42e931fe6ada10c19701e4f4efead82b6ae588d` | denied | Permission-denied; not required — reachability already confirmed via `git log --all --oneline`. Not retried. |
| Snapshot check | `git diff --stat 4cc05bad23f3a11cd680922da0b15ba868d27842..f4797c6` | 0 | 27 files / 1978 insertions — matches the review-time count written into `agent-legibility.md:61`. |
| Verification | `pnpm verify && git log --all --oneline \| Select-String "f42e931\|21929ac\|02ed637\|f4797c6\|97e47b0"` | denied | Exact brief command; permission-denied (`Permission denied: shell`) because it contains `&&` and a pipe. Not retried or rephrased per the brief's permission-denied rule; handed to the primary. |
| Hash listing (component already run) | `git log --all --oneline --max-count=30` | 0 | Confirmed the five named checkpoints/review hashes are reachable (see above). |

## RED → GREEN self-check

RED (before editing, each target line read and confirmed stale):

- `agent-legibility.md:7` — `- Verification point (base / head): \`4cc05bad…\` .. \`e50a92f9f99e1202c21aba5c1ca4377dff60d27c\`` (pre-commit working state presented as HEAD).
- `agent-legibility.md:61` — `… shows every committed path under \`conductor/\`; verbatim output is recorded in \`phase-3.md\`.` (stale verbatim claim).
- `phase-1.md:79` — `the phase base \`7519bf0\` and HEAD \`fce7b0e\` …`.
- `phase-2.md:83` — `\`10d3bcd\` and HEAD \`a283113\` …`.
- `phase-3.md:143` — `Primary independently re-ran at the final HEAD (\`74cfde8\`):`.
- `phase-3.md:50-84` — `## Verbatim scope diffs`, `final committed state`, `(verbatim)`, and `verbatim output below` (frozen snapshot presented as current HEAD).
- `integrated.md:6` — `- Verification point: \`0fabc98\` (all three phases accepted and squashed)`.
- `spec.md:133-135` — `the subject was chosen to exercise frame add/edit/set-duration/export within a small canvas budget.` (overstates fresh-agent calls).
- `calls.md` (both runs) — agent invoked only read brief, `frame --help`, mkdir, `init`, `frame add` ×3 (durations at add time), `frame list`, write.

GREEN (after editing, re-read with native grep):

- All seven F1 target locations re-read and corrected (exact before→after below). Hash reachability confirmed for every reachable SHA; every transient hash explicitly labelled a working state.
- Scope claim is now a reproducible command plus the all-paths-under-`conductor/` invariant, not a bare stale count.
- F2 item 2 (follow-up) added to `agent-legibility.md`; `Verdict: PASS` unchanged.
- F2 item 1 (`spec.md:133-135`) remains **RED / blocked** — edit permission denied. Primary must apply it.

## Per-finding disposition

### F1 — stale/unreachable hashes and scope diff — FIXED

1. `verification/agent-legibility.md:7`
   - Before: `Verification point (base / head): \`4cc05bad…\` .. \`e50a92f…\``
   - After: `Verification point (base): \`4cc05bad23f3a11cd680922da0b15ba868d27842\`; Phase 3 checkpoint: \`02ed63732c522eebe7f4ce8876751ef75096d334\` (report authored at pre-commit working state \`e50a92f9f99e1202c21aba5c1ca4377dff60d27c\`; final HEAD is re-confirmed at completion/review).`
2. `verification/agent-legibility.md:61`
   - Before: `git diff --stat …..HEAD shows every committed path under conductor/; verbatim output is recorded in phase-3.md.`
   - After: `Scope is confirmed by the reproducible command \`git diff --name-only 4cc05bad…HEAD\`, which lists only \`conductor/\` paths with no dependency manifest; the count grows with each Conductor-state commit (review-time snapshot: 27 files / 1978 insertions at HEAD \`f4797c6beccda146c3cdcad77ed409d4b803c9aa\`).`
3. `verification/phase-1.md:79`
   - Before: `HEAD \`fce7b0e\``
   - After: `phase checkpoint \`f42e931...\` (pre-squash working state \`fce7b0e\`)`
4. `verification/phase-2.md:83`
   - Before: `HEAD \`a283113\``
   - After: `phase checkpoint \`21929ac...\` (pre-squash working state \`a283113\`)`
5. `verification/phase-3.md:143` (now line 149)
   - Before: `final HEAD (\`74cfde8\`)`
   - After: `phase checkpoint \`02ed637...\` (pre-commit working state \`74cfde8\`)`
6. `verification/phase-3.md:50-84`
   - Before: `## Verbatim scope diffs` + `final committed state` + `(verbatim)` + two `verbatim output below` cells.
   - After: `## Scope diffs (Phase-3 verification-point snapshot)` plus a one-line note that the block is a Phase-3 verification-point snapshot (25 files / 1921 insertions), that later Conductor-state commits (`integrated.md`, `review.md`, R1 evidence) increase the count, and that the durable claim is the reproducible command plus the all-paths-under-`conductor/` invariant. The verbatim block was retained, only relabeled/annotated.
7. `verification/integrated.md:6`
   - Before: `Verification point: \`0fabc98\` (all three phases accepted and squashed)`
   - After: `Verification point: \`0fabc98\` (pre-commit working state with all three phases accepted and squashed); recorded at reachable commit \`97e47b0\``

No hash was invented. Reachable: `4cc05bad`, `f42e931`, `21929ac`, `02ed637`,
`97e47b0`, `f4797c6` (all seen in `git log --all --oneline`). Transient hashes
`e50a92f`, `fce7b0e`, `a283113`, `74cfde8`, `0fabc98` are explicitly labelled
pre-squash/pre-commit working states.

### F2 — spec overstates fresh-agent-exercised subcommands — PARTIAL

1. `spec.md:133-135` — **BLOCKED (permission denied)**. Required after-text (primary to apply):
   > - **Assumption:** The benchmark asset is a 16×16 four-frame flame; within a
   >   small canvas budget the fresh agent exercised `frame add` (with durations
   >   supplied at add time), `frame list`, and `init`. The remaining `frame`
   >   subcommands (`edit`, `set-duration`, `remove`, `move`) are covered only by the
   >   three-surface documentation-parity matrix (FR-7/AC-7); `render --export` was
   >   performed by the verifier in Phase 2, not by the fresh agent.
   - Matches both `artifacts/run-1/calls.md` and `artifacts/run-2/calls.md`.
2. `verification/agent-legibility.md` — **FIXED**. Added follow-up item 5 recording that the fresh-agent run covered add/list/init only, that edit/remove/set-duration/move are documentation-and-parity-checked but unobserved in a fresh-agent run, and that export was verifier-run. Non-gating; `Verdict: PASS` unchanged (confirmed by re-read).

## Scope diff vs phase base `6d950f9`

`git diff --stat 6d950f9` → 5 tracked files changed, 27 insertions(+), 12
deletions(-); `git status --short` adds one untracked file. All six paths are
under `conductor/tracks/20261121-animation-agent-legibility/verification/`:
`agent-legibility.md`, `phase-1.md`, `phase-2.md`, `phase-3.md`, `integrated.md`
(edited) and `phase-R1.md` (new). `spec.md` is unchanged by this subagent because
the edit was denied. No path outside Touches was modified; no dependency manifest
changed.

## Acceptance-criteria mapping

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-8 | Report records verdict + artifact paths | `agent-legibility.md` `Verdict: PASS` unchanged; follow-up 5 added | Pass |
| AC-9 | No diff outside Conductor state | Scope diff above; all paths under `conductor/` | Pass |
| FR-2 / AC-2 | Fresh-agent run truthfully recorded | Follow-up 5 + `calls.md` transcripts + corrected `spec.md` assumption | Pass (primary applied spec edit) |

## Deviations

- `verification/phase-3.md` command-table cells (lines 24-25) were also changed
  from `verbatim output below` to `snapshot below` for internal consistency with
  the F1 item-6 relabel. Same file, same section, within the exhaustive Touches
  list; no scope expansion.

## Blockers

- `edit` on `conductor/tracks/20261121-animation-agent-legibility/spec.md` —
  Permission denied (`Permission denied: edit`). Needed for F2 item 1: correct
  the `spec.md:133-135` assumption that the flame exercised
  `frame add/edit/set-duration/export` to match both `calls.md` transcripts.
  Expected result: the exact after-text quoted above. Primary owns `spec.md` and
  must apply this edit; not retried or worked around.
- `git cat-file -t f42e931fe6ada10c19701e4f4efead82b6ae588d` — Permission denied
  (`Permission denied: shell`). Needed only as an alternative hash-reachability
  check; expected `commit`. Non-gating: `git log --all --oneline` already confirmed
  reachability. Not retried.
- `pnpm verify && git log --all --oneline | Select-String "f42e931|21929ac|02ed637|f4797c6|97e47b0"` —
  Permission denied (`Permission denied: shell`). Needed as the brief's exact
  verification command; expected `pnpm verify` exit 0 plus five matching hash
  lines. Not retried or rephrased; primary must run it. Non-gating for the
  evidence edits (documentation-only), but required for formal verification
  sign-off.

## Notes

- The `git diff --stat 4cc05bad..f4797c6` snapshot (27 files / 1978 insertions)
  was independently reproduced and matches the count written into
  `agent-legibility.md:61`.
- `Verdict: PASS` was confirmed unchanged after all edits via native grep.
- No product or design decision was made; no runtime dependency was added.

## Primary verification

The primary resolved the executor's two denials:

1. **F2 `spec.md` edit (primary-owned).** Applied exactly as specified:
   `spec.md:133-135` now states the fresh agent exercised only `frame add`
   (durations at add time), `frame list`, and `init`; `edit`/`set-duration`/
   `remove`/`move` are covered only by the FR-7/AC-7 parity matrix; `render
   --export` was verifier-run in Phase 2. File now matches both `calls.md`
   transcripts.
2. **Denied verification command.** The primary re-ran the exact command:
   `pnpm verify` → exit 0 (typecheck, Biome with one pre-existing non-blocking
   warning at `test/recipe/version-1-2.test.ts:50`, 123 files / 1111 tests,
   build); `git log --all --oneline` filtered for the five checkpoints returned
   all five reachable commits: `f42e931`, `21929ac`, `02ed637`, `f4797c6`,
   `97e47b0`. The alternative `git cat-file` check was unnecessary because
   reachability was confirmed.

Scope after primary edit: 7 files (6 executor + `spec.md`), all under
`conductor/tracks/20261121-animation-agent-legibility/`. Result: **verified**;
F1 and F2 both fixed.
