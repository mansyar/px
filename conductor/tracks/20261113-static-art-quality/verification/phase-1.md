# Phase 1 verification — Schema 1.1: Parts and Materials

**Result: verified.** Both gates exit 0 on the final tree, every rendered byte is
unchanged, and the phase is purely additive to the recipe schema: a 1.0 recipe
still loads, renders and serialises byte for byte, while a 1.1 recipe can
declare parts and tag painting ops with them.

| | |
| --- | --- |
| Base SHA | `b327bfff5ab43df2bfab00f96fd8d22ae0d31683` |
| Head SHA | `0d96d6b8ecd105af1c9421a4d6053b0704ea1c00` |
| Branch | `feat/20261113-static-art-quality` |
| Tests | 45 files / 390 tests, all passing |

## Tasks and commits

| Task | Commit | Summary |
| --- | --- | --- |
| P1.T1 | `9784b21` | Accept `version: "1.1"`; type optional `parts` map and `part` on the eight painting ops |
| P1.T2 | `a807e92` | `E_PART_UNKNOWN`, `E_MATERIAL_UNKNOWN`, `E_GLOSS_UNKNOWN`; material resolves against palette families |
| P1.T3 | `5559964` | Derived per-pixel ownership on replay, `E_EMPTY_PART`, `W_PART_OVERWRITE` |
| P1.T4 | `b9096d7` | Canonical part serialisation and the 1.0 byte-identical round trip |
| P1.T5 | `0d96d6b` | `part` through `px draw` / `px_draw`; `parts` on inspect and render envelopes |

## Commands

| Command | Exit | Output |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck ✓, `biome check .` ✓ (105 files), 45 files / 390 tests ✓, `tsc -p tsconfig.build.json` ✓ |
| `pnpm vitest run --coverage` | 0 | 45 files / 390 tests ✓; statements 94.72% (1382/1459), branches 85.90% (841/979), functions 99.10% (221/223), lines 94.55% (1319/1395) — all above the 80% gate |
| `git diff --stat b327bff -- test/goldens test/benchmarks` | 0 | no output: nothing under the golden or benchmark trees was touched this phase |

Per-file coverage of the new surface: `src/core/parts.ts` 100% statements,
`src/core/recipe/validate.ts` 100%, `src/core/compile.ts` 88.52%,
`src/core/recipe/serialize.ts` 92.75%, `src/core/canvas.ts` 90.9%.

## Acceptance criteria

| AC | Requirement | Proving test |
| --- | --- | --- |
| AC-1 | A 1.0 recipe renders byte-identically, hero golden included | `test/parts/serialize.test.ts` — "writes a part-less 1.0 recipe back byte for byte", "keeps the numeric version literal and never writes an empty parts map"; `test/goldens/render.test.ts` — hero renders to `8d9074…27cb` twice |
| AC-2 | An undeclared part name fails `E_PART_UNKNOWN` listing the declared parts | `test/parts/schema.test.ts` — "names the declared parts when an op uses an undeclared name (AC-2)"; `test/parts/surface.test.ts` — "names the declared parts when an op tags an undeclared one" |
| AC-3 | Replaying twice yields identical masks and identical PNG bytes | `test/parts/ownership.test.ts` — "replays to identical masks and identical rasters (AC-3)"; `test/goldens/render.test.ts` for the byte half |
| AC-4 | A declared-but-unpainted part errors; a takeover emits exactly one info warning | `test/parts/ownership.test.ts` — "fails a declared part that owns no pixels (AC-4)", "lets the last writer win, with one info warning naming the displaced part (AC-4)" |
| AC-5 | A family lacking `highlight` still fails `E_NO_RAMP` with the `--derive-ramps` hint | `test/parts/schema.test.ts` — "fails a flat material with E_NO_RAMP and the derive hint (AC-5)" |
| AC-6 | All four gloss profiles accepted, anything else `E_GLOSS_UNKNOWN` | `test/parts/schema.test.ts` — "accepts all four gloss profiles (AC-6)", "rejects an unknown gloss with E_GLOSS_UNKNOWN (AC-6)" |

Supporting schema tests (not the AC itself but the FR-1/FR-2 edges):
`test/parts/schema.test.ts` also proves version acceptance (`1`, `"1.0"`,
`"1.1"` accepted; `2`, `"2.0"`, `"1"`, `true`, `null` → `E_BAD_VERSION`), the
defaults (`gloss` matte, `z` 0), that `part` is accepted on all eight tagged ops
and rejected with `E_BAD_PARAM` on `mirror`, `auto_shade`, `ramp_fill` and
`replace_slot`, that a missing or non-string `part` is `E_BAD_PARAM`, and that a
material naming no family is `E_MATERIAL_UNKNOWN` with the families in the hint.
`test/parts/surface.test.ts` proves the CLI/MCP surface: `px draw` and `px_draw`
take the tag inside an op object, inspect reports
`{name, material, gloss, z, painted, bounds}`, render reports part names, and a
part-less envelope has exactly the keys it had before (`v, ok, command, file,
canvas, regions, legend, summary, layers` — no `parts`).

## Golden hashes

Nothing under `test/goldens/**` or `test/benchmarks/**` changed
(`git diff --stat b327bff -- test/goldens test/benchmarks` is empty), and the
hash files still hold:

| Asset | SHA-256 | Verified by |
| --- | --- | --- |
| hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | `test/goldens/render.test.ts` |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | `test/benchmarks/benchmarks.test.ts` |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | same |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | same |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | same |

## Deviations

None. Every edit landed inside the phase `Touches` paths (`src/core/**`,
`src/cli/**`, `test/parts/**`, `vitest.config.ts`); no file outside them was
modified, and `src/mcp/**` needed no change because `part` travels inside the
op objects the existing tools already forward.

## Notes on the decisions as implemented

- **Version typing.** `RecipeVersion = 1 | '1.0' | '1.1'` and
  `ACCEPTED_VERSIONS = [1, '1.0', '1.1']`; the loader never rewrites the literal.
  `RECIPE_VERSION = 1` is kept for `px init`, so a fresh recipe is still a 1.0
  file until it declares a part.
- **Parts shape.** `parts` sits between `palette` and `anchors` and is optional.
  Absent normalises to `{}` and canonical writing drops an empty map again, so
  the 1.0 fixtures keep their exact bytes. A part writes `material`, always
  `gloss`, and `z` only when non-zero.
- **Part contract.** `Part { material, gloss, z }`, `GLOSS_PROFILES =
  ['matte','metal','gem','cloth']`, `gloss` defaults `matte`, `z` defaults 0 and
  is parsed, validated and exposed only — no shading reads it until Phase 2.
  Materials resolve against `SlotTable.familyNames`; there is deliberately no
  second `materials` map.
- **Ownership.** `SlotCanvas` carries a parallel `Int16Array` of part indices
  (`UNOWNED = -1`), `set(x, y, slot, owner?)` records displaced owners into
  `displaced` once per op so a takeover warns once regardless of pixel count.
  `color: null` writes `UNOWNED` through the same path, so erasing clears both
  colour and ownership. `mirror` and `auto_outline` carry the source owner
  forward; `replace_slot`, `auto_shade`, `ramp_fill` and the cleanup passes leave
  ownership alone because they remap colours, not pixels.
- **Masks are derived, never stored.** `compileRecipe` computes `parts` after
  replay via `flattenOwners` + `partStats`; nothing is serialised, cached or
  written into the recipe. `painted` and `bounds` describe the *final* owner of
  each flattened pixel, so a pixel painted by one part and re-painted opaquely by
  another counts once, for the winner — consistent with "one owner per pixel".
  `bounds` is typed `PartBounds | null` so an empty part is representable even
  though a successful compile rejects one.
- **Warnings.** `W_PART_OVERWRITE` is emitted in op order at most 50 times, then
  a single `"N W_PART_OVERWRITE warnings; showing the first 50"` marker — the
  same cap value as `MAX_FINDINGS_PER_CODE`, reusing the existing warning
  channel. No lint code was added; the lint surface stays at four codes until
  Phase 5.
- **Envelopes.** `parts` is appended to the inspect payload after `layers` and
  to the render payload after `findings`, only when the compiled recipe has
  declared parts, so a part-less envelope's key list is unchanged.

## Left for Phase 2

- `z` is inert: it is parsed, validated, sorted and exposed, but no pass consults
  it yet. Ties at equal `z` therefore resolve identically for now, and Phase 2
  must decide the declaration-order tiebreak when AO and cast shadow start
  reading it.
- `E_NO_RAMP` is still raised only when a pass needs a role, never at parse time,
  so a declared material whose family lacks `highlight` parses cleanly and fails
  when `auto_shade` (or the coming `light` pass) reaches for it.
- `partStats` uses per-part sums over the flattened buffer rather than
  incremental bookkeeping; Phase 2's `light` pass should read the same
  `CompiledPart[]` rather than add a second notion of ownership.
- The ownership buffers are per layer and flattened on demand, so a pass that
  needs neighbours' owners (AO, cast shadow) can use `snapshotOwners` as
  `auto_outline` already does without a new cache.
