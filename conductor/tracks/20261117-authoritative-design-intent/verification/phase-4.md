# Phase 4 Verification — Critique and Fix

- Track: `20261117-authoritative-design-intent`
- Phase: 4 — Critique and Fix
- Date: 2026-11-17
- Branch: `feat/20261117-authoritative-design-intent`
- Base: `d4c457a`
- Head: `6760e79`
- Result: **verified**

## Commands

| Command | Exit code | Notes |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck + biome + 114 files / 980 tests + build; one pre-existing lint warning in `test/recipe/version-1-2.test.ts:50` (out of Touches) |
| `pnpm vitest run --coverage` | 0 | 114 files / 980 tests; statements 94.86% (3692/3892), branches 85.42% (2450/2868), functions 98.34% (474/482), lines 94.63% (3492/3690); all configured 80% gates pass |
| `git diff d4c457a..HEAD --stat -- test/benchmarks test/goldens test/art` | 0 | Empty — no digest, recipe or score fixture changed |

Both verification commands were re-run on the final phase head after all five task commits; they also exited 0 after each task commit. No command was amended, pushed, merged, rebased or reset. No coverage threshold was lowered, no exclusion widened, no `v8 ignore` added, and no lockfile or dependency manifest changed (`test/critique/bounded.test.ts` asserts the single runtime dependency is `@modelcontextprotocol/sdk`).

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-9 — every ranked finding has an applicable op, rationale and delta, and applying it changes the render | Pass | `test/critique/gap-report.test.ts` checks six named criteria, descending-gap ordering with contiguous zero-based indices, a complete `{op, why, expected_delta}` fix per finding (each `op` accepted by `normalizeOp` with no further information) and deterministic output. `test/critique/fix.test.ts` applies every ranked fix in turn (each `px fix` re-renders and returns a different `after_sha256`), checks the op is appended to a named layer without rewriting earlier ops or digests, and pins `E_FIX_STALE` (absent finding / changed picture) and `W_FIX_NOOP` (applied but byte-identical). |
| AC-10 — stagnation appears only after the configured unchanged-call count, and clears when the picture changes | Pass | `test/critique/stagnation.test.ts` emits a signal only when caller-supplied `--streak` >= `CRITIQUE_STAGNATION_CALLS` (4) **and** caller-supplied `--previous` equals the current fingerprint; a changed picture with the same streak produces no signal; no sidecar file appears and repeated identical invocations give identical results. |
| AC-11 — every verb and parameter is reachable through MCP in both directions | Pass | `test/mcp/reachability.test.ts` publishes eleven tools, asserts every CLI flag has at least one tool mapping, every mapped parameter is declared in `inputSchema.properties`, and every declared property is exercised by a mapping. The new tools' exact property sets are asserted (`px_critique`: file/previous/streak/strict; `px_fix`: file/finding/sha256/strict) and their argv forwarding is tested. `test/smoke/mcp-stdio.test.ts` checks the exact sorted eleven-name list over a real stdio handshake. |
| AC-15 — 256×256 critique caps at 20 fixes and reports the true total | Pass | `test/critique/bounded.test.ts` checks `boundFindings` caps 25 findings to 20 with `fixes_total: 25` and `truncated: true`, that 20 or fewer findings are not truncated, and a 256×256 CLI critique returns six criteria with contiguous indices and complete ops. |
| NFR-4 — bounded response | Pass | `CRITIQUE_MAX_FIXES = 20`; `fixes_total` is the uncapped count and `truncated` flags a cap. No unbounded array is emitted by the report. |
| NFR-5 — no network or vision dependency | Pass | The critique engine is pure and symbolic: it reads only the compiled canvas, lint findings and the local `getTemplate` brief data. Numbers in `intended`/`observed`/`gap` are diagnostic proxies, not rubric scores; `src/critique/index.ts` documents this in comments and each criterion's text makes the proxy explicit. No network, vision model or new dependency was introduced. |

## Source-checked claims

1. **Complete fix ops.** `src/critique/index.ts` builds each `fix.op` as a fully specified raw JSON op with snake_case keys (`auto_outline`: mode/where/color/selective/width/target_layer; `light`: angle/form/ao/cast/cast_offset/rim/bands/band_scale; `deband`; `replace_slot`: from/to). `src/cli/commands.ts` (T2) resolves the target layer, calls `normalizeOp(rawOp, layer.ops.length, layer.id)` and appends the result — no placeholders, tuples or extra information required. `test/critique/gap-report.test.ts` validates all emitted ops with `normalizeOp`.
2. **Stagnation has no hidden state.** `stagnationFor(fingerprint, streak, previous)` in `src/critique/index.ts` returns a signal only when both caller values are present, `--previous` is a valid 64-hex digest equal to the fingerprint and `streak >= CRITIQUE_STAGNATION_CALLS`. `src/cli/args.ts` declares `streak`/`previous` as ordinary value flags; `src/cli/commands.ts` forwards them per invocation. There is no counter, module-level mutable state, sidecar file or recipe field; `test/critique/stagnation.test.ts` snapshots the temp directory around repeated calls.
3. **Bidirectional reachability covers both new tools.** `test/mcp/reachability.test.ts` MAPPINGS rows cover `finding`, `sha256`, `streak` and `previous` on `px_critique`/`px_fix` (plus `strict` for each), and the bidirectional tests iterate every CLI flag and every published schema property. `test/smoke/mcp-stdio.test.ts` fixes the exact eleven-tool list.

## Digest proof

All twelve committed digests were read from their `.sha256` files at verification time (not from remembered prefixes); the two art sets are distinct.

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

`git diff d4c457a..HEAD --stat -- test/goldens test/benchmarks test/art` is empty. `test/art/scores.json` was not touched.

## Deviations

Two files are outside this phase's `Touches` and were changed by the minimum amount required:

- `src/core/errors.ts` (P4.T1) — added `E_FIX_STALE` to the closed `ErrorCode` union with its error hint, and `W_CRITIQUE_EMPTY` / `W_FIX_NOOP` to the `WarningCode` union (warnings intentionally have no `ERROR_HINTS` entry because that map is `Record<ErrorCode, string>`). Required by FR-12 and the empty-canvas edge case.
- `test/smoke/mcp-stdio.test.ts` (P4.T1–T5) — the exact expected sorted MCP tool list grew from nine to eleven entries with `px_critique` and `px_fix`, required by the FR-14 parity decision.

## Notes

- Five conventional commits: `37b0fe6` (T1 gap report), `768a343` (T2 fix verb + stale detection), `91ce8f2` (T3 stagnation), `7a3a58e` (T4 bounded response), `6760e79` (T5 tool parity and bidirectional reachability). No amend.
- The six criteria keep their exact names `silhouette, value_separation, lighting, edge_language, cluster_discipline, palette_craft`. Ranking is descending absolute shortfall, then criterion name, then op name. A met criterion produces an observation with no finding; an empty/transparent canvas produces only `W_CRITIQUE_EMPTY` and an empty fix list.
- `px fix` re-resolves the current report before applying, so a finding index generated against an older picture is rejected with `E_FIX_STALE` (naming the finding and current digest). Fixes append to a layer; existing ops, committed digests and `test/art/scores.json` are never rewritten.
- `src/critique/**` is intentionally not in the v8 coverage include list, matching the established Phase 3 pattern for new feature modules; the `edgeClassCounts` diagnostic wrapper added to `src/core/ops/intent-edges.ts` is inside the include list and covered.

## Primary verification

Independent check at the accepted checkpoint `b90cd20`, not taken from the executor's report:

| Check | Result |
| --- | --- |
| Tree before acceptance | Only the untracked evidence file; five task commits in `d4c457a..HEAD`, zero merges |
| Scope | No changed path outside `src/`, `test/`, `conductor/`, `vitest.config.ts`; exactly the two declared deviations (`src/core/errors.ts`, `test/smoke/mcp-stdio.test.ts`) |
| Digest diff | `git diff d4c457a..HEAD -- test/goldens test/benchmarks test/art` empty; `test/art/scores.json` untouched |
| `pnpm verify` | Exit 0, 114 files / 980 tests, build clean |
| `pnpm vitest run --coverage` | Exit 0, statements 94.86%, branches 85.42%, functions 98.34%, lines 94.63% (gate 80%) |

Source checks made by the primary rather than inferred from test names: `src/critique/index.ts` builds each `fix.op` as a complete raw op with `expected_delta` strings for all six criteria and exposes `fixes_total`/`truncated` on the bounded response; `stagnationFor(fingerprint, streak, previous)` is documented as "caller-supplied streak and previous fingerprint, nothing retained"; `test/mcp/reachability.test.ts` maps `finding`, `sha256`, `streak` and `previous` for the two new tools and asserts the exact published property sets in both directions.

The five reporting commits were squashed to `b90cd20` (`feat(critique): rank whole-image gaps and apply bounded, stale-checked fixes`).
