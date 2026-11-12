# Phase 1 — Static Sprite Drawing Engine

Phase 1 of `px`: a deterministic pixel-art engine that compiles declarative `.px.json` recipes
into byte-identical PNGs, engine-ready metadata, and symbolic feedback an agent can act on
without a vision model.

## What it does

- **Recipes, not rasters.** A sprite is a layered list of ops against a named palette, stored as
  canonical, git-diffable JSON. Compact tuples are accepted on input and normalised on write.
- **Indexed slot canvas.** Layers are `Int16Array` slot grids; RGBA is resolved only at export,
  which is what makes palette swaps, `auto_shade`, `auto_outline` and `replace_slot` exact
  rather than heuristic.
- **Full static op surface.** `set_pixels`, `line`, `rect`, `ellipse`, `polygon`, `flood_fill`,
  `dither_fill` (`checker_50`, `bayer_25`), `ascii_blit`, `mirror`, erase via `color: null`,
  and the post-passes `auto_outline`, `auto_shade`, `ramp_fill`, `replace_slot`.
- **Feedback loop.** Four lint codes with pinned severities, deterministic ordering and a
  50-per-code cap; `inspect` returns ASCII matrices for many regions in one call plus a legend;
  `--debug` renders an annotated sheet with an 8× ruled grid, a 1× backdrop panel and a
  silhouette pass.
- **Two surfaces, one engine.** CLI verbs and seven MCP tools over stdio, sharing one command
  layer. Parity is tested envelope-for-envelope, artifacts included.
- **Engine metadata.** `render --export` writes a generic block plus a Godot 4 block: trim
  bounds, origin offset, anchors, palette manifest and a recipe hash.

## Determinism

Byte-identical output is the core promise, not a side effect:

- PNGs use `node:zlib` with a hand-written chunk writer, filter 0, a single IDAT, and no
  timestamp — the same bytes on every run.
- A golden hero fixture is rendered twice per run and compared to a committed SHA-256
  (`8d907415…f027cb`), unchanged across all five phases and three review rounds.
- CI runs the suite on **ubuntu-latest and windows-latest** to catch zlib drift across platforms.

## Dogfooding

The engine was used to author sprites through its own interfaces, from an empty directory,
counting calls the way an agent would:

| Asset | Surface | Calls | Findings | Result |
| --- | --- | --- | --- | --- |
| 32×32 sword | CLI | 10 | 1 info (`JAGGY_LINE` on a deliberate taper) | `45ee0d1…e2261` |
| 48×48 chest | MCP | 9 | 0 | `08dd54d…9fea19` |

The first MCP attempt failed outright: `px_init` exposed no `derive_ramps`, so a flat palette
produced positional slots only and every ramp-dependent op was unreachable over MCP while
working over the CLI — `px_render` wrote a blank canvas and reported success. Fixed in
`de38123` with three regression tests.

The 12-call budget these numbers are measured against means "a correct sprite is *expressible*
in ≤12 calls", not "a cold agent discovers good art in 12". Reaching art worth shipping took
many more iterations than that; the benchmark transcripts prove sufficiency, not discovery.

## Review history

Three rounds, all recorded in `conductor/tracks/20261112-phase-1-static-sprite-engine/review.md`:

1. **BLOCK** — one High (exit codes inverted against FR-23: usage errors told an agent the
   engine was broken, and engine faults told it to fix its recipe) plus six Mediums.
2. **PASS WITH FINDINGS** — the High was genuinely closed with a fault-injection test, but two
   Mediums survived because the fixes narrowed the symptom: `ramp_fill` could still swallow a
   band when the region had a gap, and `ORPHAN_PIXEL` still flagged `bayer_25`, which is the
   engine's own sanctioned pattern.
3. **Confirming** — see the verdict recorded on the PR.

Two spec amendments came out of review, both user-approved and both narrowing scope honestly
rather than bending the code to the document: `px_validate` is a seventh MCP tool, and
`pixel_perfect` was withdrawn because it was provably a no-op on Bresenham output.

## Requirements

24 functional, 7 non-functional, 22 acceptance criteria — all covered, with the mapping in
`spec.md` and the per-phase evidence under `verification/`.

## Testing

`pnpm verify` (typecheck → lint → test → build) and `pnpm vitest run --coverage` both gate every
phase. 349 tests across 41 files: unit suites per op and per lint rule, CLI integration tests,
an MCP stdio smoke test, golden hashes, four benchmark sprites with a replay harness, and a
performance test asserting 256×256 with 2,000 ops well under the 250 ms budget (measured 32.6 ms).

Coverage: 94.8% statements, 87.04% branches, 100% functions, gated at 80% on new code over
`src/core`, `src/lint`, `src/meta` and `src/palettes`.

## Known limitations

- Binary alpha only. Translucent output is rejected at parse time; dithered falloff is the
  pixel-art idiom, and RGBA8 export leaves room for per-layer alpha in Phase 2.
- The 32×32 humanoid scores 4/5 on silhouette (arms merge into the torso in flat black) — the
  honest weak point of the benchmark set, recorded rather than proxied.
- `serialize.ts` carries the lowest branch coverage in the codebase (80%).
- No animation, sprite-sheet packing, tilemaps or GUI yet — Phase 2 and beyond.

## Try it

```bash
pnpm install && pnpm build
node dist/cli.js init --name demo --width 32 --height 32 --palette pico-8 --derive-ramps
node dist/cli.js draw --file demo.px.json --ops '[{"op":"rect","x":8,"y":8,"w":16,"h":16,"color":"c3.base"}]'
node dist/cli.js render --file demo.px.json --out demo.png --debug --strict
```

`pnpm exec px` does not resolve — pnpm does not link a package's own bins. `opencode.json`
registers `node dist/mcp/server.js` for the same reason, so the MCP server needs `pnpm build`
after source changes.
