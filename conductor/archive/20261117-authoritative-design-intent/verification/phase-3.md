# Phase 3 Verification — Brief and Blockout

- Track: `20261117-authoritative-design-intent`
- Phase: 3 — Brief and Blockout
- Date: 2026-11-17
- Branch: `feat/20261117-authoritative-design-intent`
- Base: `8510a45`
- Head: `5e8d2c5`
- Result: **verified**

## Commands

| Command | Exit code | Notes |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck + biome + 110 files / 957 tests + build; one pre-existing lint warning in `test/recipe/version-1-2.test.ts:50` (out of Touches) |
| `pnpm vitest run --coverage` | 0 | 110 files / 957 tests; statements 94.79% (3660/3861), branches 85.50% (2430/2842), functions 98.33% (473/481), lines 94.56% (3462/3661); all configured 80% gates pass |
| `git diff --stat 8510a45 HEAD -- test/goldens test/benchmarks test/art` | 0 | Empty — no digest, recipe or score fixture changed |

Both verification commands were re-run on the final phase head after all three task commits; they also exited 0 after each commit. No command was amended, pushed, merged, rebased or reset.

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-7 — `px brief <subject> --size N` emits a design scaffold and writes nothing | Pass | `test/brief/verb.test.ts`: CLI verb and `px_brief` MCP tool return the same scaffold (`subject`, `size`, `canvas`, a valid closed `design` block, `parts`, `hero`); the design is accepted by `normalizeDesign`; unknown subject returns `E_SUBJECT_UNKNOWN` whose hint enumerates `character, prop, scene`; a temp-directory snapshot before/after the call is byte-identical (stdout only). `test/brief/templates.test.ts` checks each local template has parts with material, proportion range, hero part and value hierarchy 1–5. |
| NFR-5 — templates are local, no scoring/network dependency | Pass | `test/brief/no-network.test.ts` scans every module under `src/brief/` and asserts no `node:http` / `node:https` / `node:net` import and no import of the scoring scripts. Templates are hand-written constants in `src/brief/templates.ts`; no new dependency was added. |
| AC-8 — judgement views never move a committed digest | Pass | `test/brief/views.test.ts`: for both `--blockout` and `--values 5`, the normal render is produced first, then the view; the recipe file, the normal `--out` PNG and `normalDigest(dir)` are byte-identical before/after. The view is written to a sibling (`<stem>.blockout.png` / `<stem>.values5.png`) and reported as `payload.out` with a `payload.view` descriptor; `test/design/compatibility.test.ts` re-renders all 12 committed fixtures against their pinned digests inside both verification commands. |

## View details

- Blockout uses the existing compiled slot grid and `rasterizeSlots` + `encodePng` from `src/render/`; three flat bands (`highlight`, `base`, `shadow`) are assigned per part from `rankProjections` over `bands=3` and resolved to that part's material ramp slots. No outline, AO or texture slot can appear — the test asserts the emitted colours are a subset of `#e0e0e0`, `#8c8c8c`, `#4a4a4a`.
- `--values N` (2 ≤ N ≤ 8, otherwise `E_BAD_PARAM`) posterises by relative luminance with the fixed documented mapping `0.2126*R + 0.7152*G + 0.0722*B` on sRGB bytes, `bucket = clamp(floor(luma*N), 0, N-1)`, `grey = round(255*bucket/(N-1))`; transparency is preserved.
- Views are not verbs and are rejected in combination with each other, `--debug` or `--export` (`E_USAGE`), and no recipe is written for them.

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

`git diff --stat 8510a45 HEAD -- test/goldens test/benchmarks test/art` is empty. `test/art/scores.json` was not touched.

## Deviations

Both files are outside this phase's `Touches` and were changed by the minimum amount required:

- `src/core/errors.ts` (P3.T1) — added the `E_SUBJECT_UNKNOWN` code to the closed `ErrorCode` union and its hint text to `ERROR_HINTS`, required by FR-9's unknown-subject error and the pinned hint requirement.
- `test/smoke/mcp-stdio.test.ts` (P3.T2) — the exact expected sorted MCP tool list grew from eight to nine entries with `px_brief`, required by the nine-tool reachability decision.

## Notes

- Three conventional commits: `1acbb05` (T1 templates + NFR-5), `f8e11ec` (T2 brief verb + `px_brief` + nine-tool reachability), `5e8d2c5` (T3 blockout/values views + AC-8). No amend.
- Reachability is bidirectional across nine tools: every `inputSchema` parameter has an argv mapping and every mapped flag is declared; the `px_render` tool now declares and forwards `--blockout` / `--values`.
- No new runtime dependency; `package.json` and the lockfile are untouched. Views reuse the existing renderer rather than adding a second rasteriser.
- The closed `Design` schema from Phase 1 was not expanded; the brief scaffold exposes a valid `design` block plus separate planning fields (`parts`, `hero`) in the flat CLI/MCP envelope.

## Primary verification

Independent check at the phase head `5e8d2c5` before the squash:

| Check | Result |
| --- | --- |
| Scope filter outside Touches | Empty; two declared deviations are `src/core/errors.ts` (new `E_SUBJECT_UNKNOWN`) and `test/smoke/mcp-stdio.test.ts` (nine-tool list) |
| `git log --merges 8510a45..HEAD` | Empty; three reported commits |
| `git diff --stat 8510a45..HEAD -- test/goldens test/benchmarks test/art` | Empty — all twelve digests and the rubric record untouched |
| `pnpm verify` | Exit 0: 110 files / 957 tests, build clean, one pre-existing warning at `test/recipe/version-1-2.test.ts:50` |
| `pnpm vitest run --coverage` | Exit 0: statements 94.79% (3660/3861), branches 85.50% (2430/2842), functions 98.33%, lines 94.56% |

Design spot-checks: `test/brief/no-network.test.ts` statically rejects `node:http`, `node:https`, `node:http2`, `node:net`, scoring-script imports and non-local imports from `src/brief/**`, which makes NFR-5 a test rather than a promise; `test/brief/views.test.ts` captures the normal-render digest and both recipe and `--out` bytes before invoking `--blockout` or `--values 5`, then asserts all three unchanged and checks that only the three shading roles appear in the blockout; `src/mcp/tools.ts:47,64,350` registers, declares and dispatches `px_brief` as the ninth tool.

Squashed to checkpoint `758fa53`.
