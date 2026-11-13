# Phase 3 — Interior Edge Role

- **Track:** `20261113-surface-resolution` — Surface Resolution
- **Phase:** 3 — Interior Edge Role
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-resolution`
- **Base:** `c36a6ea` (Phase 2 accepted)

## Result

**verified** — `auto_outline` takes `seam`, a tone written on the inside of a
boundary between two parts, once per boundary, without moving ownership.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/ops/outline-seam.test.ts` | 0 | 4 tests |
| assets | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed, every digest unchanged |
| full verify | `pnpm verify` | 0 | typecheck, biome, tests, build |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | two adjacent parts gain one interior edge on their shared boundary, silhouette unchanged | boundary pixel takes `steel.outline`, the earlier part's pixel keeps `ink.base`; recipe without `seam` renders byte-identically, so the outer ring is untouched | met |
| FR-5 | drawn once, never over a ridge, no overwrite warning | seam lands on the later-declared side only; owner of the seam pixel is unchanged and no `W_PART_OVERWRITE` is emitted; a one-pixel part keeps its authored tone | met |

## Two bugs the first attempt hid — both now understood

The first attempt failed in a way worth recording, because the second failure
looked like the same bug and was not.

1. **`colorParam` never reads the key you pass it.** Its signature is
   `colorParam(source, opName, opIndex, layer)` — the second argument is the *op
   name* for the error message, and it always reads `source.color`. Passing
   `'seam'` therefore returned the op's `color` (`ink.outline`), so every
   `auto_outline` in the repo silently took `seam: ink.outline` and six asset
   digests changed. The probe (`op.seam` printed after `parseRecipe`) showed
   `seam: "ink.outline"` on a recipe that asked for `steel.outline`, which is how
   the mistake was found rather than guessed at. `seam` now has its own read, and
   the slot is resolved at compile time where an unknown name is already an
   error.
2. **The ridge exemption read the wrong snapshot.** Width was tested against
   `work`, the pass's working copy, but the outer ring claims its border pixels
   for the part it surrounds — so a one-pixel ridge looked two pixels thick and
   lost its exemption. Width now comes from `sourceOwners`, the pre-pass
   snapshot, while the boundary side still comes from `work`.

## Bounded output

The op reports a painted count and a clipped count; no per-pixel list is added,
so `render` output stays bounded (NFR-6).

## Naming deviation

The spec called the option `inner`, but `auto_outline` already has
`where: "outer" | "inner"` — the two would read as the same knob. The option is
`seam`. Same behaviour, one word chosen to avoid a collision; recorded here rather
than silently renamed.

## Not done in this phase

- Schema gating for `seam` — Phase 4's `"1.3"`.
- No asset uses `seam` yet; Phase 5 decides where interior detail blurs.
