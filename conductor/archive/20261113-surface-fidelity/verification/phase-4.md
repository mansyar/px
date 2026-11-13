# Phase 4 — Texture on Small Parts

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 4 — Texture on Small Parts
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `0ff08c6` (Phase 3 accepted)

## Result

**verified** — `texture` takes `fit: "region"`, which anchors one whole mark on a
pixel the part owns when the lattice cannot place a mark at all, and still
refuses a part thinner than one mark.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/texture/region.test.ts` | 0 | 3 tests |
| full verify | `pnpm verify` | 0 | 837 tests, biome, typecheck, build |

Evidence: `.conductor/evidence/phase4-verify.log`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-10 | a 9×8-class part smaller than one lattice period receives a legal mark | `test/texture/region.test.ts`: 4×4 part at (1,1), `minCluster` 3, density 2 — full fit paints 0, region fit paints one 3×3 mark | met |
| AC-11 | a part with no legal mark reports a warning and paints nothing | `CLEANUP_NOOP_HINTS.texture` already names the cause; the 2×2 fixture paints 0, and `outcome.painted === 0` becomes `W_CLEANUP_NOOP` | met |
| AC-12 | pre-track texture digests unchanged | `fit` is absent by default and normalizes away, so the full-fit path is byte-identical; the art digests in `pnpm verify` pass unchanged | met |

## What changed

- `TextureOp.fit?: 'full' | 'region'` and one `OP_PARAM_ORDER.texture` entry.
- `normalizeTexture` rejects anything else with `E_BAD_PARAM` and omits the field
  when it is `full`, so a plain texture stays compact on disk.
- `applyTexture` gains the fit argument and, after the lattice pass, `regionMark`
  scans for the first owned pixel whose `mark × mark` square is wholly owned and
  paints that one mark. Clipping is still forbidden, which is what keeps the
  cluster floor true.

## Phase 5 dependency

The `"1.2"` schema gate is Phase 5's, so `fit` currently normalizes under 1.1 like
the other texture options. Phase 5 adds the version requirement for new options;
`fit` is listed there to be gated with them.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | pass |
