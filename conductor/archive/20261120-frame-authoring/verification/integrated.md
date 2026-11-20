# Integrated Verification — 20261120-frame-authoring

- Track: `20261120-frame-authoring` — Frame Authoring for CLI and MCP
- Branch: `feat/20261120-frame-authoring`
- Date: 2026-11-20
- Head: `4754714f508c1e734e858ab03b11711f22c19dc0`
- Result: **pass**

## Full configured verification strategy

Run on the complete track branch after all four phases were accepted, not as a
repeat of a single phase.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (aggregate) | `pnpm verify` | 0 | typecheck, lint (one pre-existing warning), 123 files / 1105 tests, build |
| unit | `pnpm vitest run --project unit` | 0 | 114 files / 1017 tests |
| integration | `pnpm vitest run --project integration` | 0 | 3 files / 39 tests |
| smoke | `pnpm vitest run --project smoke` | 0 | 2 files / 11 tests |
| determinism | `pnpm vitest run --project goldens` | 0 | 1 file / 6 tests, no re-baseline |
| coverage (separate gate) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 120 files / 1073 tests; 94.89% stmts, 85.81% branches, 98.3% funcs, 94.69% lines |

Combined command (all stages exit 0):

```
pnpm verify && pnpm vitest run --project unit && pnpm vitest run --project integration && pnpm vitest run --project smoke && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens
```

New code in scope for the 80% gate: `src/core/recipe/frames.ts` measures
88.33% statements / 80% branches / 96.96% functions / 87.61% lines.

The single `lint/style/noNonNullAssertion` warning at
`test/recipe/version-1-2.test.ts:50` predates the track and is non-blocking.

## Acceptance coverage

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-1..AC-8 | CLI add/edit/remove/list/set-duration/move with validation | `verification/phase-2.md`, `test/integration/frame.test.ts` |
| AC-9 | CLI/MCP byte parity for all six operations | `verification/phase-3.md`, `test/mcp/frame.test.ts` |
| AC-10 | Guardrails reject invalid mutations before write | `verification/phase-1.md`, `test/unit/frames.test.ts`, `test/integration/frame.test.ts` |
| AC-11 | Deterministic op normalization | `verification/phase-1.md`, `test/unit/frames.test.ts` |
| AC-12 | Export sheet + `timeline.total_ms` | `verification/phase-2.md`, `test/integration/frame.test.ts` |

All five verification layers pass; no blocking findings.
