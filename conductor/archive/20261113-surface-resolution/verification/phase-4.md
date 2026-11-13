# Phase 4 — Palette Tones and Schema 1.3

- **Track:** `20261113-surface-resolution` — Surface Resolution
- **Phase:** 4 — Palette Tones and Schema 1.3
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-resolution`
- **Base:** `9a27de5` (Phase 3 accepted)

## Result

**verified** — a ramp role can name a tone, `"1.3"` is a known version, and every
option this track added is refused below it with a message naming `"1.3"`.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/recipe/version-1-3.test.ts` | 0 | 8 tests |
| assets | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| full verify | `pnpm verify` | 0 | typecheck, biome, tests, build |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-6 | a six-tone ramp with `base: "t3"` resolves that slot; hex ramps are byte-identical | `buildSlotTable` resolves `wood.base` to `#886c50`, the `t3` value; explicit ramps untouched | met |
| AC-7 | a 1.2 recipe using a 1.3 option is rejected, naming 1.3 | `bands`, `skip`, `seam` and a tone-valued role each throw `E_BAD_VERSION` under 1.2; all pass at 1.3 | met |
| FR-7 | `VALUE_COLLISION` and `E_NO_RAMP` unchanged for hex-only ramps | the gate only fires when a tone reference is present; all asset digests and the existing light tests pass untouched | met |

## The gate had to become ordered

The previous track's gate was `version !== '1.2'`. With 1.3 accepted, that would
have rejected `fit: "region"` — a 1.2 feature — in a 1.3 recipe. The gate is now
`versionRank(version) < 2` / `< 3`, and two tests pin the superset behaviour:
a 1.2 option is accepted at 1.3, and still refused at 1.1.

## Tone resolution

A role whose value matches `t<n>` is resolved to that tone's hex at normalize
time, which was the spec's open question (normalize rather than compile). The
recipe keeps the tone reference, the slot keeps the resolved colour, and a role
naming a tone the family does not declare throws naming both sides.

## Two real failures during the phase

- The new tests initially failed in bulk because the existing test recipes were
  `version: '1.1'` while using `bands` / `seam`: the gate was working. Test
  fixtures and the scene recipe moved to `"1.3"` — the scene's digest is unchanged,
  since the version is not part of the pixels.
- The undeclared-part check had been written *inside* the 1.2 block, so at 1.3 a
  typo would not be caught. It now runs at every version, before the gate.

## Known debt

The pre-existing 1.2 block still carries a copy of the undeclared-part loop that
is now unreachable because the always-on check runs first. Removing it is a
mechanical cleanup, recorded here rather than bundled into this commit.
