# Integrated Verification — Track Level

Run by the primary agent on 2026-11-12 after all five phases were individually accepted.
This closes the loop across phases, which individual phase evidence cannot do.

## The track as a whole

| Phase | Checkpoint | Contract |
| --- | --- | --- |
| 1 — Scaffold and Vertical Slice | `4e00fe3` | Recipe model, canvas, PNG encoder, CLI slice |
| 2 — Feedback Tooling | `689c638` | Linter, strict gate, annotated debug sheet |
| 3 — Full Op Surface | `5c455ae` | Complete static op set, post-passes, op addressing |
| 4 — Engine Metadata, MCP Parity, Palettes | `dca204b` | Meta export, inspector, MCP server, curated palettes |
| 5 — Calibration | `da41e80` | Four benchmarks, threshold docs, performance proof |

All five checkpoint objects exist in history (`git cat-file -t` → commit).

## Full gate run at HEAD

| Check | Command | Result |
| --- | --- | --- |
| Static + unit + integration + build | `pnpm verify` | exit 0 — 324 tests in 38 files, Biome clean on 95 files |
| Coverage gate | `pnpm vitest run --coverage` | exit 0 — 94.71% stmts, 86.95% branches, 100% funcs, 94.48% lines |
| Smoke + determinism layers | `pnpm vitest run --project smoke --project goldens` | exit 0 — 11 tests in 3 files |

## Cross-phase invariants

These are the properties that only make sense to assert once, over the whole track.

- **Determinism held across all five phases.** The hero golden hashes to
  `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` and was never
  re-baselined. Phases 2-5 added diagnostics, ops, metadata and benchmarks without moving a single
  byte of that render — which is the evidence that new features did not disturb the pixel
  pipeline.
- **Runtime dependency budget: one.** `pnpm list --prod --depth 0` reports
  `@modelcontextprotocol/sdk@1.32.2` and nothing else. NFR-2 holds at the end of the track, not
  just at the start.
- **Both binaries build and run.** `dist/cli.js` and `dist/mcp/server.js` exist after
  `pnpm build`, and `node dist/cli.js --help` returns the documented envelope with exit 0,
  including the runtime probe reporting Node 24 pinned and supported.
- **Coverage scope grew with the product without the gate being weakened.** The include list went
  from `src/core` to `src/core` + `src/lint` + `src/meta` + `src/palettes`; the threshold stayed
  at 80% and final numbers are well above it.
- **No threshold was ever lowered and no coverage ignore comment was added**, across five phases.
  This is worth stating explicitly because it is the cheapest way to fake a green track.

## Known limitations carried into the PR

- `src/core/recipe/serialize.ts` is the weakest covered file (91.48% statements / 80% branches).
  Exercised heavily in practice; the gap is test depth, not risk.
- AC-21's 12-call budget is measured by replaying transcripts authored after the art existed. It
  proves the surface is *sufficient*. Whether a fresh agent discovers a good sprite inside 12
  calls is measured separately by the dogfooding exercise, not by the benchmark suite.
- The humanoid benchmark is 4/5 on silhouette (arms merge into the torso in flat black), which
  meets AC-21's floor of 4/5 but is not a 5/5 asset.
- `pnpm exec px` cannot resolve the package's own bin (pnpm does not link self-bins), so any
  consumer — including the opencode MCP config — must use `node dist/cli.js` and
  `node dist/mcp/server.js`.

## Verdict

The track's functional requirements are implemented, its non-functional requirements are
measured rather than assumed, and the determinism guarantee survived every phase. Approved to
proceed to documentation sync and review.
