# Phase 2 Verification — Feedback Tooling

- Track: `20261112-phase-1-static-sprite-engine`
- Phase: 2 — Feedback Tooling
- Date: 2026-11-12
- Branch: `feat/20261112-phase-1-static-sprite-engine`
- Base commit: `9bddbf1`
- Head commit: `f5cc584`

## Result

**Verified.** FR-18, FR-20, NFR-4, AC-16, and AC-18 are met. Both gates exit 0:
`pnpm verify` and `pnpm vitest run --coverage`.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static | `pnpm typecheck` (`tsc --noEmit`) | 0 | Strict TS 7.0.2, no diagnostics |
| Static | `pnpm lint` (`biome check .`) | 0 | 54 files checked, 0 errors |
| Unit + integration + smoke + goldens | `pnpm test` (`vitest run`) | 0 | 14 files, 138 tests |
| Build | `pnpm build` (`tsc -p tsconfig.build.json`) | 0 | `dist/` emitted |
| Gate | `pnpm verify` | 0 | typecheck → lint → test → build |
| Gate | `pnpm vitest run --coverage` | 0 | 138 tests, coverage gate met |

Goldens: `test/goldens/render.test.ts` still matches the committed `hero.sha256` unchanged, so
Phase 2 added no bytes to any rendered PNG.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-16 — debug sheet has all three panels, rulers, and anchor crosshairs at declared coordinates | `src/render/debug/sheet.ts`, `test/lint/debug-sheet.test.ts` (16 tests): panels A/B/C stacked with `a.y < b.y < c.y`; panel A is 8× with a 1px `#808080` grid and `#ffffff`/`#cccccc` checkerboard; dark glyph bands appear above (X ruler) and left of (Y ruler) the panel; anchor `[3,2]` places a black core at the matching cell centre with a two-tone dashed crosshair spanning the panel; out-of-canvas anchors are ignored; panel B is 1× over the default `#808080` backdrop (or `--backdrop` hex, or transparent when `null`); panel C is a black silhouette on white | Pass |
| AC-18 — each lint rule fires on a crafted fixture, silent on a clean sprite, strict changes the exit code | `test/lint/rules.test.ts` (OUT_OF_BOUNDS, ORPHAN_PIXEL), `test/lint/shape.test.ts` (JAGGY_LINE, LOW_CONTRAST), `test/lint/framework.test.ts` (clean sprite → `[]`, ordering, cap), `test/lint/feedback-cli.test.ts` (`--strict` → exit 3, `E_LINT_GATE`, findings retained; info-only → exit 0; no `--strict` → exit 0) | Pass |

## Coverage

Scope: `src/core/**` + `src/lint/**` (unchanged include list, thresholds still 80).

| Metric | Covered / Total | Percent | Gate |
| --- | --- | --- | --- |
| Statements | 558 / 587 | 95.05% | 80 — pass |
| Branches | 327 / 372 | 87.90% | 80 — pass |
| Functions | 105 / 105 | 100% | 80 — pass |
| Lines | 534 / 563 | 94.84% | 80 — pass |

`src/lint` alone: 98.41% statements, 91.66% branches, 100% functions, 98.29% lines.

## Task commits

| Task | Commit |
| --- | --- |
| P2.T1 rule framework | `3025749` |
| P2.T2 `OUT_OF_BOUNDS`, `ORPHAN_PIXEL` | `4dfff27` |
| P2.T3 `JAGGY_LINE`, `LOW_CONTRAST` | `238cf0c` |
| P2.T4 debug sheet, bitmap font | `5361651` |
| P2.T5 `--strict`, `validate`, `--debug` wiring | `f5cc584` |

## Evidence paths

- `src/lint/types.ts`, `src/lint/thresholds.ts`, `src/lint/collector.ts`, `src/lint/index.ts`
- `src/lint/bounds.ts`, `src/lint/orphan.ts`, `src/lint/jaggy.ts`, `src/lint/contrast.ts`
- `src/render/debug/font.ts`, `src/render/debug/pixels.ts`, `src/render/debug/sheet.ts`
- `src/cli/main.ts`, `src/cli/commands.ts`, `src/cli/envelope.ts`, `src/cli/args.ts`
- `test/lint/framework.test.ts`, `test/lint/rules.test.ts`, `test/lint/shape.test.ts`,
  `test/lint/debug-sheet.test.ts`, `test/lint/feedback-cli.test.ts`

## Deviations

| File | Reason |
| --- | --- |
| `vitest.config.ts` | The unit project's include was `test/unit/**` only, so `test/lint/**` tests were not collected at all. Added `test/lint/**/*.test.ts` to that include; no threshold or exclude changed. |
| `src/core/canvas.ts` | `SlotCanvas` now records the first clipped coordinate (`clippedAt`, `clearClipped()`) so `OUT_OF_BOUNDS` findings can carry a `coord`. `set()` still returns false and writes nothing when clipped. |
| `src/core/compile.ts` | Copies `canvas.clippedAt` onto the existing `W_OUT_OF_BOUNDS` warning and resets it per op, so one clipped op reports one coordinate. No new warning codes. |
| `src/core/errors.ts` | Added `coord?` to `PxWarning` and the `E_LINT_GATE` error code with its hint. The warning registry and `E_LINT_GATE` are caller-visible output, not internal plumbing. |

No new dependencies, no threshold lowered, no coverage ignore comment added.

## Notes

- The six pinned decisions hold: exactly four codes with the pinned severities; findings carry
  `code`, `severity`, `message`, and `coord` or `coords`; ordering is severity rank, then code
  alphabetically, then row-major coordinate, then unlocated findings last; each code is capped at
  50 findings plus one `truncated: true` marker carrying the total; rules are pure functions of
  the flattened grid, palette, and layer set.
- `OUT_OF_BOUNDS` is projected from the compiler's existing clipping warnings rather than
  re-derived by scanning, so it cannot disagree with `warnings`.
- `JAGGY_LINE` reports the run, its step lengths, and its axis (`left`/`right`/`top`/`bottom`
  edge); `LOW_CONTRAST` reports the affected share of edge pixels plus up to 50 coordinates.
  Thresholds live in `src/lint/thresholds.ts` (`JAGGY_MIN_RUNS`, `LOW_CONTRAST_MIN_RATIO`,
  `MAX_FINDINGS_PER_CODE`, `MAX_COORDS_PER_FINDING`) as Phase 5 tuning targets.
- Debug sheet: 8× nearest-neighbour panel with embedded 3×5 bitmap glyphs (no font files, no
  dependencies), byte-deterministic across runs, opt-in via `--debug`, written as
  `<name>.debug.png`. Legibility is carried by shape and luminance only, never hue.
- `validate` renders nothing and writes nothing: it parses, validates, lints, and returns
  `bounds` (`null` when empty), `pixel_count`, per-layer painted counts, `findings`, and
  `warnings`.
