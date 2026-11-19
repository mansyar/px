# Onion neighbor-strip view — Phase 1 evidence

Track: `20261119-animation-playback` · Phase: 1 · Base: `3f41fbed3e91479672ebb435c7e918d514e8c79b`
Branch: `feat/20261119-animation-playback`

## Contract verified

`px render --file <framed.px.json> --out <name>.png --onion <index>`

- Produces sibling `<name>.onion<index>.png` via `viewPath`, never `--out`.
- Composites three full canvases left-to-right: `prev | selected | next`.
- Neighbors outside the frame range are fully transparent blank panels, so the
  strip is deterministic at both boundaries.
- Reuses the already-computed `compileRecipeFrames(effective)` list; frame 0 is
  byte-identical to the legacy single-compiled render.
- Keeps the single-compiled `renderView` / `renderDebugSheet` contracts intact:
  `renderOnion` is a separate frames-aware function with its own dispatch, and
  `renderView` throws `E_INTERNAL` if handed an onion spec.
- Normal render bytes, the recipe, and the committed normal digests are unchanged.

## Validation

- `--onion` is a value flag (`VALUE_FLAGS`, `ParsedArgs.onion`, `setValueFlag`).
- Index must be a non-negative integer in `[0, frames.length]` (where
  `frames.length` is the recipe's `frames` array length; this equals the last
  valid compiled frame index). Non-integer, negative and out-of-range values
  fail with `E_BAD_PARAM`, naming the valid range, before any file is written.
- A recipe with no `frames` fails with `E_BAD_PARAM` naming the need for frames.
- The existing `view !== undefined && (debug || export)` guard covers onion, so
  `--onion` combined with `--debug` or `--export` fails with `E_USAGE`.
- Combining onion with `--blockout` or `--values` fails with `E_USAGE`.

## Golden evidence

`anim-duo` is 16x16 with one extra frame; the strip is 48x16.

| sidecar | SHA-256 |
| --- | --- |
| `test/goldens/fixtures/anim-duo.onion0.sha256` | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` |
| `test/goldens/fixtures/anim-duo.onion1.sha256` | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` |

The golden test renders each index twice and asserts identical digests, 48x16
geometry, blank boundary panels, and that the selected center panel equals the
committed frame-0 render byte for byte.

## Protected digests (unchanged, never refreshed)

| file | SHA-256 |
| --- | --- |
| `hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| `anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` |
| `anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |

Confirmed by `git status --short`: none of these files are modified.

## Test inventory

- `test/render/views.test.ts` — onion sibling paths, `parseOnionIndex`, strip
  geometry, blank boundaries, byte-for-byte panel equality, determinism.
- `test/cli/onion.test.ts` (new) — CLI sibling PNG, blank panels, no-overwrite of
  `--out`/recipe, `--debug`/`--export` rejection, invalid-index and no-frames
  errors.
- `test/goldens/render.test.ts` — double-render golden digests and geometry.

## Verification

`pnpm verify` — exit 0. Typecheck clean; Biome clean except one pre-existing
warning in `test/recipe/version-1-2.test.ts` (non-null assertion, untouched);
120 test files / 1052 tests pass; build succeeds.

The secondary command `pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts`
was rejected by the shell permission layer. `pnpm verify` runs the full suite,
including all Phase 1 tests, and is the authoritative green result.
