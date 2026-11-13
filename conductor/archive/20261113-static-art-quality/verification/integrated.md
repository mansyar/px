# Integrated Verification — Static Art Quality

**Track:** 20261113-static-art-quality
**Date:** 2026-11-13
**Branch:** feat/20261113-static-art-quality

## Gates at HEAD

| Gate | Result |
|---|---|
| `pnpm verify` (typecheck, Biome, 689 tests, build) | exit 0 |
| `pnpm vitest run --coverage` | exit 0 — statements 95.57%, branches 86.51%, functions 98.40%, lines 95.40% (gate 80%) |
| `pnpm vitest run --project goldens --project smoke` | exit 0 — 3 files, 11 tests |
| Hero golden | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` — unchanged since Phase 1 of the previous track |
| Phase-1 benchmark digests (potion, sword, humanoid, chest) | all four unchanged |
| Production dependencies | one (`@modelcontextprotocol/sdk`) — NFR-2 holds |
| Performance (NFR-7) | 181.1 ms median at 256×256 with 2,000 ops and a full `light` pass, against a 500 ms budget |

## Phase checkpoints

| Phase | Checkpoint | Status |
|---|---|---|
| 1 Schema 1.1 — parts and materials | `f238f92` | verified |
| 2 Lighting pass | `afce9a6` | verified |
| 3 Scale profiles | `13cbd95` | verified |
| 4 Palette intelligence | `b290764` | verified |
| 5 Art lint and cleanup | `841c09c` | verified |
| 6 Agent ergonomics | `2c7513f` | verified |
| 7 Benchmarks and rubric | — | **failed on AC-20** |

## Cross-phase invariants held

- **Non-breaking.** Every 1.0 recipe renders byte-identically: the hero golden and all four Phase-1 benchmark digests never moved across seven phases, and `test/goldens/**` and `test/benchmarks/*/` were never edited.
- **One runtime dependency.** Palette synthesis is hand-written OKLCH; no colour library was added.
- **No threshold was lowered** and no coverage exclude was widened. Coverage scope grew (parts, profiles, meta, palettes) while the gate stayed at 80%.
- **Determinism.** `light`, cleanup ops, synthesis and swap are all deterministic functions of the recipe; no RNG, no clock, no network. `scripts/rubric.mjs` is the only networked file in the repo and is imported by nothing.
- **Backwards-compatible envelopes.** Responses gain keys only when the recipe uses parts or cleanup; part-less responses are asserted byte-identical to their pre-track shape.

## Acceptance criteria

Satisfied: AC-1 … AC-19.

**AC-20 not met.** Seven assets scored blind, two faithful passes each: mean 3.79 against a 4.0 bar, with four criteria below 3 (humanoid lighting; scene lighting, edge_language and cluster_discipline). Potion 4.25, chest 4.17 and prop 4.33 clear the bar; sword 3.50, humanoid 3.34, character 3.58 and scene 3.33 do not. Recorded in `test/art/scores.json`, guarded by `test/art/rubric.test.ts`, analysed in `verification/phase-7-scoring.md`.

The failures are consistent across both rounds and point at missing authoring capability rather than missing effort: no interior-plane shading for broad faces, no stroke primitive that cleans its own stair-steps, no texture that survives the `large` profile's cluster floor. The user accepted shipping with AC-20 recorded unmet and a follow-up track taking on those primitives.

## Known limitations

- `src/core/recipe/serialize.ts` remains the weakest module by branch coverage.
- The rubric instrument is noisier than the spec assumed (±1.33 on an asset mean, up to 3 points on a single criterion), so it can rank assets but cannot adjudicate a 0.2 gap.
- Binary alpha only; no animation, sprite sheets or tilemaps — all out of scope for this track.
- No CLI verb or MCP tool can declare parts or author explicit-role palettes: parts are authored by writing the recipe, which is consistent with the recipe-as-source-of-truth model but is friction for an agent working only through tools. Noted for review.
