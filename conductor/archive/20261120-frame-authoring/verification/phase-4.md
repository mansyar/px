# Phase 4 Verification — Documentation and integrated verification

- Track: `20261120-frame-authoring`
- Phase: 4 — Documentation and integrated verification
- Date: 2026-11-20
- Branch: `feat/20261120-frame-authoring`
- Base commit: `f11e93d783457ef00ec4fe29b2d0199ff1bf6b33`
- Head commit: `3f4cb2990cd6d588f65d527519ad7c90953e9473`
- Result: **verified** (subagent blocked only by shell permission; primary resolved below)

## Summary

P4.T1 is implemented: `docs/animation.md` now documents the full `px frame`
authoring surface (`add`, `edit`, `remove`, `list`, `set-duration`, `move`) and
its `px_frame` MCP equivalent, including exact flags, frame 0 immutability,
selector/index semantics, `--ops`-over-`--from` precedence, duration clearing,
and the mapping to `render --export` sheet + timeline. A minimal worked example
mirrors the command sequence already exercised by the committed integration and
MCP tests. Two pre-existing sentences that claimed "no new CLI verb / MCP tool"
were scoped to export-only and view-only so they no longer contradict the new
authoring commands; this is still within the single file in `Touches`.

The subagent's shell permission layer rejected the required verification command
(`permission.rejected`, "Permission denied: shell"), so the subagent correctly
reported `blocked` without retrying or working around it. The primary agent ran
the exact command; all three stages exited 0. See "Primary verification" below.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static (typecheck, lint, unit, build) | `pnpm verify` | 0 | tsc --noEmit; Biome (one pre-existing warning); 123 files / 1105 tests; tsc build |
| Determinism (goldens) | `pnpm vitest run --project goldens` | 0 | 1 file / 6 tests pass; no re-baseline |
| Unit + integration + smoke + goldens with coverage gate (80%) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 120 files / 1073 tests; all files 94.89% stmts, 85.81% branches, 98.3% funcs, 94.69% lines |
| **Exact combined command** | `pnpm verify && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | All three stages pass |

The single pre-existing non-blocking `lint/style/noNonNullAssertion` warning at
`test/recipe/version-1-2.test.ts:50` is tolerated. The new module
`src/core/recipe/frames.ts` measures 88.33% statements / 80% branches /
96.96% functions / 87.61% lines, above the 80% gate.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-7 | `px_frame` exposes the same operations, semantics and output as `px frame` | `docs/animation.md` "Authoring frames" parameter table + byte-identical-output claim; grounded in committed `test/mcp/frame.test.ts` (AC-9 parity) | Documented; all five layers pass |
| FR-10 | Authored frames are consumed unchanged by `render --export` sheet + timeline | `docs/animation.md` "Minimal worked example"; grounded in committed `test/integration/frame.test.ts` (AC-12) | Documented; all five layers pass |
| NFR-3 | Backwards compatible with v1.4 recipes/exports; bad input leaves recipe unchanged | `docs/animation.md` "Selectors and invariants" (reject before write) and existing "Legacy v1.2/v1.3" section | Documented; all five layers pass |
| AC-9 | Each `px_frame` call yields the same recipe bytes as the CLI equivalent | `docs/animation.md` states identical `v:1` envelope and byte-identical recipes; grounded in committed `test/mcp/frame.test.ts` | Documented; all five layers pass |
| AC-12 | `render --export` emits sheet PNG + `sheet.meta.json` with additive `timeline.total_ms` = sum of durations | `docs/animation.md` "Minimal worked example" and "What `render` writes" (four files, additive `timeline` in both metas) | Documented; all five layers pass |

## Evidence paths

- `docs/animation.md` — public authoring documentation (committed at `3f4cb29`).
- `test/integration/frame.test.ts` — pre-existing end-to-end CLI frame tests, including the AC-12 export scenario (not modified).
- `test/mcp/frame.test.ts` — pre-existing AC-9 CLI/MCP byte-parity tests (not modified).
- `conductor/tracks/20261120-frame-authoring/verification/phase-1.md`, `phase-2.md`, `phase-3.md` — earlier layer results (not modified).

## Deviations

None. All edits are confined to `docs/animation.md`, which is the sole path in
`Touches`. The evidence file is the only other file written.

## Notes

- No code, tests, Conductor state, product docs, or plan/spec/metadata files were modified.
- No runtime dependency added; single-dependency budget unchanged (`@modelcontextprotocol/sdk` 1.32.2).
- The documentation was verified for factual accuracy against the committed tests and against the CLI help text in `src/cli/main.ts` and the `px_frame` schema in `src/mcp/tools.ts`; it introduces no new behavioral claims.
- Commit SHA `3f4cb29` is the verified-state head for the documentation change.

## Primary verification

The primary agent independently re-ran the exact Phase 4 verification command on
a clean working tree with only `docs/animation.md` changed since the phase base:

```
pnpm verify && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens
```

All three stages exited 0. Diff scope against phase base
`f11e93d783457ef00ec4fe29b2d0199ff1bf6b33` is `docs/animation.md` plus this
evidence file; no code, tests, Conductor state, or dependencies changed.
Result: **verified**.
