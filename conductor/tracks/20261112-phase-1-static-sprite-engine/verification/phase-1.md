# Phase 1 Verification — Static Sprite Drawing Engine

- **Track:** 20261112-phase-1-static-sprite-engine
- **Phase:** 1 — Scaffold and Vertical Slice
- **Date:** 2026-11-12
- **Branch:** `feat/20261112-phase-1-static-sprite-engine`
- **Base commit:** `7c2e901`
- **Head commit:** `3729d0e` (this evidence update lands in the commit after it)
- **Result:** PASS — `pnpm verify` exits 0; a recipe authored from scratch
  compiles to a SHA-256-gated PNG and is inspected as ASCII through the CLI.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `tsc --noEmit` (`pnpm typecheck`) | 0 | strict TypeScript, no diagnostics |
| static | `biome check .` (`pnpm lint`) | 0 | 39 files checked, no fixes applied |
| unit | `vitest run` project `unit` | 0 | 6 files: errors, palette, recipe, ops, compile, png |
| integration | `vitest run` project `integration` | 0 | 12 CLI tests over temp directories |
| smoke | `vitest run` project `smoke` | 0 | package contract plus both `src/cli.ts` invocations |
| determinism | `vitest run` project `goldens` | 0 | hero recipe renders twice to the committed hash |
| static | `tsc -p tsconfig.build.json` (`pnpm build`) | 0 | `dist/` ESM output emitted |
| coverage | `pnpm vitest run --coverage` | 0 | statements 93.33%, branches 86.29%, functions 100%, lines 93.13% |
| phase | `pnpm verify` | 0 | typecheck → lint → test (9 files, 84 tests) → build |

Golden hash: `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`
(`test/goldens/fixtures/hero.sha256`), reproduced by two independent renders in
the same run.

### Coverage (scope `src/core/**`, `src/lint/**`)

| Metric | Covered | Total | Percent | Threshold |
| --- | --- | --- | --- | --- |
| Statements | 364 | 390 | 93.33% | 80% |
| Branches | 214 | 248 | 86.29% | 80% |
| Functions | 75 | 75 | 100% | 80% |
| Lines | 353 | 379 | 93.13% | 80% |

`pnpm verify` exit 0; `pnpm vitest run --coverage` exit 0. `src/lint` does not
exist in Phase 1, so the measured scope is `src/core/**`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Minimal recipe parses, renders, and round-trips byte-identical JSON | `test/unit/recipe.test.ts` (byte-identical round trip, key order), `test/goldens/render.test.ts` (fixture stored canonically) | pass |
| AC-2 | Each validation failure returns a distinct code, op index, and hint | `test/unit/recipe.test.ts` (E_BAD_VERSION, E_BAD_CANVAS, E_DUPLICATE_LAYER, E_UNKNOWN_OP with `op_index`, E_MISSING_PARAM, E_UNKNOWN_SLOT with layer and op), `test/unit/errors.test.ts` (every code has a hint), `test/integration/cli.test.ts` (envelope carries code/op_index/hint) | pass |
| AC-3 | Swapping the palette changes every pixel colour while slot identity survives | `test/unit/compile.test.ts` — same slot indices, new RGBA after palette replacement | pass |
| AC-4 | Translucent colour rejected at parse time | `test/unit/recipe.test.ts` and `test/unit/palette.test.ts` — `#00000080` raises E_BAD_ALPHA | pass |
| AC-5 | Each geometry op produces the expected pixels, incl. endpoint-inclusive line | `test/unit/ops.test.ts` (set_pixels, rect clipping, Bresenham octants and endpoint inclusion, corner removal no-op), `test/goldens/fixtures/hero.px.json` + `test/goldens/render.test.ts` (rect, set_pixels, and line in one golden PNG) | pass (Phase 1 op subset) |
| AC-14 | Re-render yields an identical SHA-256; CI matrix agrees across OSes | `test/goldens/render.test.ts` renders twice against one committed hash; `.github/workflows/ci.yml` runs the goldens project on `ubuntu-latest` and `windows-latest` | pass locally; cross-OS agreement is asserted by CI on the PR |
| AC-22 | `pnpm verify` passes and CI is green on both OSes | commands table above (`pnpm verify` exit 0, coverage exit 0); CI workflow has no detect guard | pass locally; CI result pending PR |

## Evidence paths

- `test/goldens/fixtures/hero.px.json`, `test/goldens/fixtures/hero.sha256`,
  `test/goldens/render.test.ts`
- `test/unit/recipe.test.ts`, `test/unit/errors.test.ts`, `test/unit/palette.test.ts`,
  `test/unit/ops.test.ts`, `test/unit/compile.test.ts`, `test/unit/png.test.ts`
- `test/integration/cli.test.ts`, `test/smoke/binaries.test.ts`
- `src/core/recipe/*`, `src/core/{palette,canvas,compile,errors}.ts`,
  `src/core/ops/*`, `src/render/*`, `src/cli/*`, `src/cli.ts`

No binary evidence was retained; the PNG is reproduced by the goldens test and
its hash is committed.

## Deviations

| File | Reason |
| --- | --- |
| `src/probe.ts` | Outside the declared `Touches`. Holds `RESPONSE_VERSION = 1` and the Node-major probe used by the CLI envelope and `--help`; created during scaffold environment verification and kept as the single source of the response version. |
| `src/types/node.d.ts` | **Resolved deviation.** Superseded by `@types/node ^24.19.2` (devDependency only, so NFR-2's single runtime dependency is untouched); the file no longer declares any globals and `tsconfig.json` now sets `"types": ["node"]`. Its physical deletion was blocked by this subagent's shell permissions (`git rm` and `Remove-Item` both denied); only the empty module stub remains and it should be removed by the primary. |
| `pnpm-workspace.yaml` | Not in the brief's file list. pnpm 12 moved build-script approval to `allowBuilds`; this file allows the `esbuild` postinstall that `tsx` needs and pins the `@biomejs` release-age exclusions pnpm itself wrote. |

## Notes

- Phase 1 intentionally implements only `set_pixels`, `rect`, and `line`; other
  op names are rejected with E_UNKNOWN_OP plus the accepted list.
- `src/mcp` and `src/lint` are not created; `px-mcp` is declared as a bin for the
  Phase 4 server. The smoke layer therefore asserts the package contract for
  both bins and executes the `px` entry directly via `tsx` rather than claiming
  an MCP handshake that does not exist yet.
- Coverage is measured and gated: `pnpm vitest run --coverage` exits 0 with
  branches at 86.29% against the 80% threshold. No threshold was lowered, no
  coverage exclude/ignore was widened, and no `v8 ignore` comment was added.
  The added tests exercise real behaviour: malformed palette families, invalid
  family names, non-object layers and missing layer ids, non-array ops, a
  non-object recipe root, an empty palette in slot validation, coordinate
  payloads, non-Error causes, an L-turn removed by pixel-perfect corner
  removal, and an undeclared slot reaching `compileRecipe` programmatically.
  `compileRecipe`'s previously unreachable `target === undefined` guard was
  removed by building each compiled layer in one pass.
- Determinism is pinned by one committed hash. Per the workflow, a mismatch is a
  failure, never a refresh; any re-baseline must be deliberate and documented.

## Primary verification

Verified independently by the primary agent at checkpoint `4e00fe3`.

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Tree state | `git status --porcelain` | 0 | only primary config edits (`conductor/workflow.md`, `.opencode/agents/conductor-phase.md`); no stray code |
| Scope | `git diff --name-only 7c2e901..HEAD` | 0 | every path within `Touches` or a declared deviation |
| Phase | `pnpm verify` | 0 | typecheck, lint 38 files, 84 tests across 9 files, build |
| Coverage gate | `pnpm vitest run --coverage` | 0 | statements 93.33%, branches 86.29%, functions 100%, lines 93.13% |
| Squash guard | `git rev-list --count 7c2e901..HEAD` | 0 | 10 commits, 0 merges, all reported by the subagent |

The first acceptance attempt **failed the coverage gate** at branches 79.36% against the
80% threshold. One rework round closed it by adding tests for real branches; no threshold
was lowered, no coverage exclude widened, and no `v8 ignore` comment added. The failure is
recorded rather than erased, because the gate exists to catch exactly that.

`src/types/node.d.ts` was deleted by the primary. `@types/node ^24.19.2` replaced it
because the MCP SDK's own `.d.ts` files import from `node:http`, `node:stream`, and
`node:process`, so Phase 4 cannot typecheck with hand-written declarations.

