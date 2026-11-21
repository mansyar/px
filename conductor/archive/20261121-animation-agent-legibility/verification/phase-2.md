# Phase 2 — Run the fresh-agent benchmark and verify determinism

- Track: `20261121-animation-agent-legibility`
- Phase: 2
- Date: 2026-11-21
- Branch: `chore/20261121-animation-agent-legibility`
- Base / head (verification point): `10d3bcdb14ad4834e7f38d8156356b5583844c21`
- Covers: FR-2, FR-3, FR-4, FR-5, FR-6, NFR-4, AC-2, AC-3, AC-4, AC-5, AC-6

## Result

**verified** — every hard gate passes. Both fresh-agent recipes strictly
validate with zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL`, both export a sheet
PNG and sheet metadata with a `timeline` block, and all three required artifact
pairs are byte-identical (SHA-256) across the two runs. `pnpm verify` exits 0.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Evidence (run 1) | `pnpm exec tsx src/cli.ts validate --file .../run-1/flame.px.json --strict` | 0 | `ok:true`, `findings:[]`, `warnings:[]`; OUT_OF_BOUNDS 0, ORPHAN_PIXEL 0. |
| Evidence (run 2) | `pnpm exec tsx src/cli.ts validate --file .../run-2/flame.px.json --strict` | 0 | `ok:true`, `findings:[]`, `warnings:[]`; OUT_OF_BOUNDS 0, ORPHAN_PIXEL 0. |
| Evidence (run 1) | `pnpm exec tsx src/cli.ts render --file .../run-1/flame.px.json --out .../run-1/flame.png --export` | 0 | 4 files written; sheet 64×16; sheet meta has `timeline`. |
| Evidence (run 2) | `pnpm exec tsx src/cli.ts render --file .../run-2/flame.px.json --out .../run-2/flame.png --export` | 0 | 4 files written; sheet 64×16; sheet meta has `timeline`. |
| Determinism | `pnpm exec tsx -e "…createHash('sha256')…"` (6 digests) | 0 | Recipe, sheet PNG and timeline metadata digests identical across runs. |
| Static+unit+integration+smoke+determinism | `pnpm verify` | 0 | typecheck, lint (1 pre-existing warning), 123 files / 1111 tests, build. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | Two fresh-agent runs complete a 16×16 four-frame flame recipe without prior context. | `agent-runs.md` — run 1 brief-only, run 2 brief + replay; both 16×16, 4 frames. | PASS |
| AC-3 | Report records a tool-call count and ordered sequence for each run. | `agent-runs.md` — verbatim 9-call transcripts for both runs, copied from each `calls.md`. | PASS |
| AC-4 | Each recipe reports zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL` under strict validation. | `determinism.md` §1 — both exit 0, `findings:[]`, `warnings:[]`. | PASS |
| AC-5 | Each run produces a sheet PNG and sheet metadata containing a `timeline` block. | `determinism.md` §2 — `flame.sheet.png` + `flame.sheet.meta.json` (`timeline`, `total_ms: 360`). | PASS |
| AC-6 | Recipe JSON, sheet PNG and timeline metadata bytes are identical between runs. | `determinism.md` §3 — all three SHA-256 pairs identical. | PASS |

NFR-4 is satisfied: no new runtime dependency was introduced; the benchmark
used only the already-shipped CLI surface. NFR-3 is satisfied: call counts are
advisory and did not affect the verdict.

## Evidence paths

- `conductor/tracks/20261121-animation-agent-legibility/verification/agent-runs.md`
- `conductor/tracks/20261121-animation-agent-legibility/verification/determinism.md`
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json`
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/calls.md`
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.px.json`
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/calls.md`
- `.../run-1/flame.png`, `.../run-1/flame.meta.json`, `.../run-1/flame.sheet.png`, `.../run-1/flame.sheet.meta.json`
- `.../run-2/flame.png`, `.../run-2/flame.meta.json`, `.../run-2/flame.sheet.png`, `.../run-2/flame.sheet.meta.json`

## Deviations

None. All writes are inside the phase `Touches` paths. No recipe, transcript,
source file, doc, golden, rubric, threshold, manifest or CI file was changed.

## Notes

- `pnpm verify` emitted one Biome warning (`lint/style/noNonNullAssertion` in
  `test/recipe/version-1-2.test.ts:50`) but exited 0; it is pre-existing and
  unrelated to this evidence-only track. No fix was attempted.
- Both recipes have empty `ops` (`pixel_count: 0`), so strict validation emits
  no findings of any kind. This is recorded honestly; the artifacts were not
  enriched or repaired. Whether a richer flame should be authored is a
  follow-up consideration, not an in-track fix.
- Both `flame.meta.json` and `flame.sheet.meta.json` contain a `timeline`
  block; AC-5's "sheet metadata" is taken to be `flame.sheet.meta.json`, whose
  digests are recorded alongside `flame.meta.json` for completeness.

## Primary verification

- `pnpm verify` re-run by primary: exit 0 (typecheck, Biome with one pre-existing
  non-blocking warning at `test/recipe/version-1-2.test.ts:50`, 123 files /
  1111 tests, build).
- Strict validation re-run by primary on both recipes: both `ok:true`,
  `findings:[]`, `warnings:[]`, `pixel_count:0` — zero `OUT_OF_BOUNDS` and zero
  `ORPHAN_PIXEL`.
- SHA-256 digests recomputed by primary: recipe `bb80778c…`, sheet PNG
  `f69146f2…`, sheet metadata `d7b75d7c…` — all three pairs identical across
  runs.
- Diff scope: clean tree; all 15 changed files between the phase base
  `10d3bcd` and phase checkpoint `21929ac...` (pre-squash working state `a283113`) are under this track's `verification/` Touches;
  no `src/`, `docs/`, golden, rubric, threshold, manifest, or CI file changed.
- AC-2..AC-6 checked against `spec.md`: all pass on the structural hard gates.
  The empty-ops caveat is recorded above and must be carried into the Phase 3
  verdict as a follow-up, not silently omitted.
- Result: **verified**.
