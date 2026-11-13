# Phase R4 — Dogfood Fixes

**Track:** 20261113-static-art-quality · **Phase:** R4 · **Date:** 2026-11-13
**Branch:** `feat/20261113-static-art-quality`
**Base:** `a6744fd` (the checkout HEAD when the phase ran; the brief named `3c4b1d8`, which is not in this branch's history)
**Head:** `faa06ca`
**Result:** verified

Two defects that a live agent hit while authoring a lantern, both invisible to a
green 714-test suite. Neither is a new feature: one hint names an impossible
remedy, and one warning describes intended behaviour as a mistake.

## The reproduction

```bash
node dist/cli.js init --file t.px.json --name t --width 48 --height 48 \
  --palette '#14101c,#3a4356,#6b7d99,#a8bcd6,#e6f0ff,#4a2f16,#8a5f22,#c9973c' --derive-ramps \
  --parts '{"flame":{"material":"c4","gloss":"gem"}}'
```

`c4` is `#e6f0ff`, the lightest colour, so its derived ramp has no `highlight`
role and the command correctly fails. Before this phase it said:

> `E_NO_RAMP`: Family "c4" has no "highlight" role for part "flame" to shade with
> hint: Declare the role in the family ramp, or derive ramps from flat colours with `--derive-ramps`.

The flag is already on. The same run then reported, for a cap whose cast shadow
fell on the body:

> `W_PART_OVERWRITE`: Op 4 (light) of layer "base" repainted pixels owned by part "body"
> hint: Order ops so each part finishes before the next one paints, or tag both ops with the same part.

Both sentences were captured by turning the reproduction into a test
(`test/palettes/palettes.test.ts`) and running it before the fix; the first
failure printed the exact hint above.

## R4.T1 — `E_NO_RAMP` names a remedy that works (F20)

**Cause.** `src/core/ops/pass.ts` had one `DERIVE_HINT` for every `E_NO_RAMP`,
and `partRampError` — the one validation raises for a declared material — used
it unconditionally. A derived ramp fills a role only from a *neighbouring*
palette colour, so a colour at either end of the luminance range can never have
that role; derivation is not a fix for that family, it is the cause.

**Fix.** The hint now follows how the ramp was made.

- `pass.ts`: `DERIVE_HINT` is kept verbatim for hand-written ramps. A derived
  ramp gets a different hint built from the missing role:
  `A derived ramp can only take "highlight" from another palette colour, and a
  colour at the end of the luminance range has none in the direction the role
  needs: no palette colour is lighter. Use a material whose colour has such a
  neighbour, or declare the role in the family ramp.`
  The remedies named are the two that exist: another material, or an explicit
  role in the palette. The flag is not mentioned.
- Plumbing, because a recipe on disk stores explicit roles and therefore *is* a
  hand-written ramp after the write: `runInit` tells `parseRecipe` that it just
  derived the palette (`{ derivedRamps: args.deriveRamps }`), which reaches
  `validateReferences`, which passes it to `partRampError`. No flag, no error
  code, no persisted marker — the derived case is only true at the moment of
  derivation, which is exactly when the error can fire.
- `noRampError` (compile-time `ramp_fill`, `auto_shade`, `light`) keeps the
  hand-written advice, since compilation has no derivation in hand.

**Pinned both directions** in `test/palettes/palettes.test.ts`
(`E_NO_RAMP names a remedy that exists (F20)`), through the real CLI:

- the lantern command above: `E_NO_RAMP`, message names `c4` and `highlight`,
  and the hint is asserted **not** to contain `--derive-ramps` (and not
  `derive-ramps` at all, so a rewording cannot smuggle the flag back), while
  naming the real cause (`luminance`, `lighter`);
- the same command with a hand-written half ramp
  (`{"steel":{"ramp":{"base":"#7d8a9a"}}}`): the hint still contains
  `--derive-ramps`.

The pre-existing hand-written assertions elsewhere (`test/parts/schema.test.ts`,
`test/ops/*`, `test/light/*`) still pass unchanged.

## R4.T2 — a cast shadow is not a part overwrite (F21)

**Cause.** Ownership is only recorded as displaced when a write passes an
explicit owner different from the pixel's current one (`SlotCanvas.set`), and
`compile.ts` raises `W_PART_OVERWRITE` from `canvas.displaced`. The form, gloss,
AO and rim stages write with no owner and so were already silent; `castShadow`
alone wrote the caster's index into every destination, including pixels another
part already owned. A shadow that shades the receiving surface therefore looked
exactly like one part painting over another — and the hint it carried is not
actionable for a shadow.

**Fix.** `light` never changes the ownership of an owned pixel: a cast shadow
writes its colour and keeps the receiving part's owner, and only claims space
that was already transparent (which is how a shadow thrown into empty space
still lands in the caster's mask, as before). This fixes the cause rather than
silencing the symptom: `compile.ts` still warns the moment ownership actually
changes, so no rule is suppressed and a geometry op that repaints another part
still warns. The doc block at the top of `light.ts` now states the invariant.

**Pinned both directions** in `test/light/cast.test.ts`:

- `covers an equal owner without taking the pixel from it` (the fixture that
  previously asserted the warning was **retargeted**, as the brief allowed): the
  colour is the caster's `shadow`, the owner row still reads `body`, and
  `W_PART_OVERWRITE` is asserted absent;
- `still reports a draw op that genuinely repaints another part`: two `rect` ops
  over the same pixel assert exactly one `W_PART_OVERWRITE` naming `rock`. This
  is the same behaviour `test/parts/ownership.test.ts` already pins at AC-4.
- `claims pixels that were transparent for the caster` is untouched and still
  passes, so claiming empty space is pinned too.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| targeted | `pnpm vitest run test/palettes/palettes.test.ts` | 1 → 0 | failed before the fix on the absent-flag assertion, then 21 passed |
| targeted | `pnpm vitest run test/light/cast.test.ts` | 1 → 0 | failed before the fix on the owner row, then 15 passed |
| targeted | `pnpm vitest run test/light test/parts test/art-lint` | 0 | 19 files, 188 tests |
| targeted | `pnpm vitest run` | 0 | 76 files, **717 tests** (714 + 3 new) |
| **gate** | `pnpm verify` | **0** | typecheck, biome, 717 tests, build |
| **gate** | `pnpm vitest run --coverage` | **0** | 95.60% statements, 86.62% branches (gate 80%), 98.18% functions |

`pnpm typecheck` and `pnpm build` were denied when run individually by the
sandbox; they run inside `pnpm verify`, which is the configured gate and exited
0.

## Acceptance

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| F20 | The derived-ramp `E_NO_RAMP` hint names a remedy that exists and never names `--derive-ramps` | `test/palettes/palettes.test.ts` → `does not offer --derive-ramps when the ramp was derived` | met |
| F20 | A hand-written ramp keeps the derivation advice | same file → `still offers --derive-ramps when the ramp was written by hand` | met |
| F21 | A `cast` shadow onto a second part raises no `W_PART_OVERWRITE` and keeps the receiving owner | `test/light/cast.test.ts` → `covers an equal owner without taking the pixel from it` | met |
| F21 | A geometry op that genuinely repaints another part still warns | `test/light/cast.test.ts` → `still reports a draw op that genuinely repaints another part`; `test/parts/ownership.test.ts` (AC-4) | met |
| AC-5 | A material whose family lacks `highlight` still fails with `E_NO_RAMP` and the derivation hint | both branches above; `test/parts/schema.test.ts` unchanged | met |
| AC-4 | A pixel taken from another part raises `W_PART_OVERWRITE` | `test/parts/ownership.test.ts` unchanged and green | met |

## Digests

No asset, digest file or rubric record was touched; `git diff` over the phase
range lists only source and test files.

| Asset | SHA-256 | Result |
| --- | --- | --- |
| hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged — `test/goldens` green |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | unchanged — `test/benchmarks` green |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | unchanged — `test/benchmarks` green |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | unchanged — `test/benchmarks` green |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | unchanged — `test/benchmarks` green |
| scene | `ed1ba3866bf5f0400f3f51db53ea06a4ab06dd4f4cd7dc093f62ac584eac9d1a` | unchanged — `test/art` green, file untouched |

Ownership is bookkeeping only and never enters PNG bytes, so F21 could not have
moved a digest; the table is recorded anyway because a phase that changes
rendering behaviour must prove it.

## Commits

| Task | Commit | Subject |
| --- | --- | --- |
| R4.T1 | `18aabc9` | `fix(core): stop offering --derive-ramps when the ramp is already derived` |
| R4.T2 | `a355839` | `fix(core): shade a cast shadow's receiving surface without re-owning it` |
| — | `faa06ca` | `style(core): sort the validate import the F20 plumbing added` |

## Files changed

`src/core/ops/pass.ts`, `src/core/recipe/validate.ts`,
`src/core/recipe/parse.ts`, `src/cli/commands.ts`, `src/core/ops/light.ts`,
`test/palettes/palettes.test.ts`, `test/light/cast.test.ts`.
`src/core/errors.ts` and `src/core/compile.ts` were in `Touches` and needed no
change: the baseline hint is still correct for hand-written ramps, and compile's
displaced check was already honest once the pass stopped re-owning pixels.

## Deviations

The hint lives in `pass.ts`, and the plumbing the brief authorised ("whatever
plumbing tells the hint whether the ramp was derived") runs through validation,
parse and the init command — four files outside `Touches`. Each change is the
smallest that carries one boolean.

## Notes

- `test/art/potion/potion.design.md` says the potion render emits "One `info`
  `W_PART_OVERWRITE` … op 5 (`light`)". That warning no longer exists for the
  same reason as F21, so the sentence is now stale. The file is part of the
  asset record and was explicitly out of bounds, so it is left for the primary
  to sync rather than edited here.
- The style commit exists because `--amend` is forbidden: the import order that
  biome rejects was introduced by the T1 wiring and only surfaced when
  `pnpm verify` first ran the lint step.
- `pass.ts` branch coverage is 71.42% on its own (two `coord` branches in
  `noRampError` that no current fixture takes); the aggregate gate is 86.62%
  branches, no threshold was lowered and no coverage exclusion widened.
- A shadow thrown onto transparency still joins the caster's mask, as the
  existing `claims pixels that were transparent for the caster` fixture
  requires; only pixels another part already owned keep their owner.
