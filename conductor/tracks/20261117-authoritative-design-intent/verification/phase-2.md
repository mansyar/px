# Phase 2 Verification — Intent-Driven Passes

- Track: `20261117-authoritative-design-intent`
- Phase: 2 — Intent-Driven Passes
- Date: 2026-11-17
- Branch: `feat/20261117-authoritative-design-intent`
- Base: `b43132c`
- Head: `23f5c3a`
- Result: **verified**

## Commands

| Command | Exit code | Notes |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck + biome + 106 files / 936 tests + build; one pre-existing lint warning in `test/recipe/version-1-2.test.ts:50` (out of Touches) |
| `pnpm vitest run --coverage` | 0 | 106 files / 936 tests; statements 94.76% (3659/3861), branches 85.46%, functions 98.33%, lines 94.53% (all gates 80) |
| `pnpm vitest run test/intent-passes` | 0 | 5 files / 14 tests — the new intent-pass suite |
| `pnpm vitest run test/design/compatibility.test.ts` | 0 | 13 tests — renders all 12 committed fixtures and compares SHA-256 to the committed digest |
| `git diff --stat b43132c HEAD -- test/goldens test/benchmarks test/art` | 0 | Empty — no digest, recipe or score fixture changed |
| `git status --short` | 0 | Clean at phase head |

Both verification commands were also run after each of the four task commits and exited 0.

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-4 — light default / override / deviation in one test | Pass | `test/intent-passes/ac4.test.ts`: declared `design.light` equals a restated explicit angle, differs from an override, declared/restated record no deviation, and the override records exactly `{op_index:2, field:'angle', declared:'bottom-right', actual:'top-left'}`. |
| AC-5 — three distinguishable edge treatments from an entry snapshot | Pass | `test/intent-passes/edges.test.ts`: silhouette→`steel.outline`, material→`wood.shadow`, detail→`steel.highlight` (three distinct rendered slots), plus the opposite-material probe. Classification reads the `rect`-phase snapshot before any pixel is written, priority silhouette > material > detail; documented in `src/core/ops/intent-edges.ts`. Without a design block, legacy `auto_outline` pixels are unchanged. |
| AC-6 — harmonize changes colours across all parts, geometry/ownership byte-identical | Pass | `test/intent-passes/harmonize.test.ts`: before/after painted-slot mask and `owners` arrays equal, `cleanup` report length equal, and both `body` and `trim` have recoloured pixels. Fixture includes a cast shadow (`cast: 'body'`), `auto_outline`, `seal`, then `harmonize`. A part-less/faceless recipe yields `W_HARMONIZE_NOOP`. CLI `px_draw` and the existing `px_draw` MCP tool both reach the op; no new MCP tool or dependency. |

## Digest proof

| Set | Asset | Committed SHA-256 | Result |
| --- | --- | --- | --- |
| golden | hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged |
| benchmarks (1.0) | potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | unchanged |
| benchmarks (1.0) | sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | unchanged |
| benchmarks (1.0) | humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | unchanged |
| benchmarks (1.0) | chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | unchanged |
| art (1.3 author-written) | potion | `2ea4173c7b8e27cc6723e4acd4fffc38a412f7d32bc65308dd4bfb7fe6622a3e` | unchanged |
| art (1.3 author-written) | sword | `722fc7dbac870e31e34c8359a6a623b57a96396d900aba81489d8161b9290ee2` | unchanged |
| art (1.3 author-written) | humanoid | `ebb87295b32deeb2ab5233ce45ba82eaded2513763717e6736196639ada368cb` | unchanged |
| art (1.3 author-written) | chest | `07193f4570790b3d5c4df8cf2a8bcf9339b3e63f70dbc36f5d36a101d06906b6` | unchanged |
| art (1.3 author-written) | character | `18e12c69b28b73d87faf2e5a843f7516364d61cc4e6eab6e8c7ed229c27d039b` | unchanged |
| art (1.3 author-written) | prop | `9c6bd6d9d13da48e29332f8076cb27330eebcc6400f83f7aaa5663916a879c31` | unchanged |
| art (1.3 author-written) | scene | `ab2567d4e976355272d13476d58604d50d402bf38b6a643f4cb74ea7b31280c5` | unchanged |

`test/design/compatibility.test.ts` renders every committed fixture and asserts equality with the committed digest file; it passes at the phase head. `git diff b43132c HEAD -- test/goldens test/benchmarks test/art` is empty. `test/art/scores.json` was not touched.

## Deviations

The brief's pinned closed edge vocabulary (`none`, `outline`, `shadow`, `highlight`) contradicts the phase-1 design test fixtures, which used the free-form tokens `hard`, `crease`, `soft` in their `edge_vocabulary` and `edges.*`. These five files live outside this phase's `Touches` but had to be updated so the closed vocabulary could be enforced without breaking the test suite (recorded here per the brief's deviation rule):

- `test/design/authoring.test.ts` — `hard`/`soft` → `outline`/`highlight`.
- `test/design/canonical.test.ts` — same token substitution.
- `test/design/intent.test.ts` — vocabulary and design edges switched to the closed set; the unknown-edge test's hint assertion now expects `none, outline, shadow, highlight`.
- `test/design/schema.test.ts` — same token substitution (shape-only fixtures).
- `test/design/style.test.ts` — same token substitution.
- `test/light/op.test.ts` — outside Touches; the default-angle assertion was updated because `normalizeLight` no longer injects `top-left` into the recipe (compile still defaults to `top-left` at render time without a design). Required to keep AC-2 legacy rendering byte-identical while allowing a design light to be the default.

The brief itself states the closed vocabulary is authoritative and that a contradiction with the spec should be reported `blocked`. The spec (FR-4/FR-6) does not enumerate the values; it only requires rejecting unknown treatments, so enforcing the brief's closed set is consistent with the spec. The contradiction was with phase-1 *test fixtures*, not the spec, so it was resolved by updating those fixtures rather than blocking.

## Notes

- Four conventional commits: `0d5b319` (T1 defaults + deviations), `de466fa` (T2 edges + AC-4/AC-5), `ba5b5c4` (T3 value targets), `23f5c3a` (T4 harmonize). No amend.
- No new runtime dependency; `package.json` untouched. Harmonize is reachable via `px_draw` / the existing `px_draw` MCP tool only — no new MCP tool.
- `LightOp.angle` is now optional; normalization no longer injects `top-left`. Compile resolves `op.angle ?? design.light ?? 'top-left'`, so recipes without a design render byte-identically.
- Edge vocabulary is enforced in two places: `parseProjectStyle` validates `edge_vocabulary` entries, and `normalizeEdges`/`validateIntent` reject any `design.edges.*` outside `EDGE_TREATMENTS`, naming the value and the legal set in `E_INTENT_EDGE`.
- Value targets map `design.values[part]` (1–5) onto the family's numbered tone ladder (lightest→darkest), falling back to `[highlight, base, shadow]` when no numbered tones exist; ties go darker. Missing design keeps prior behaviour.
- Harmonize writes only pixels that were painted in the entry snapshot, with no owner argument, so geometry, ownership, cast shadows and cleanup output are untouched; a no-op emits `W_HARMONIZE_NOOP`.
