# Schema 1.4 frames — design record

- Track: `20261119-animation-foundations`
- Phase: 1 (Version-gated frame schema and compile)
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Base: `3b64f8e2098f38a04eb407f7d29d15cf6c09463b`
- Head at verification: `4dd814525ad5403047088bbfddd4b5a7e449e098`

## Accepted versions

`RecipeVersion` and `ACCEPTED_VERSIONS` now list `1`, `'1.0'`, `'1.1'`, `'1.2'`, `'1.3'`, `'1.4'`.
`LATEST_RECIPE_VERSION` deliberately stays `'1.1'` — it controls `px init` write defaults, not the
highest accepted input version. `versionRank` is ordered:
`1`/`'1.0'` = 0, `'1.1'` = 1, `'1.2'` = 2, `'1.3'` = 3, `'1.4'` = 4.

## Frame schema

- `frames` is optional. When present it must be a non-empty array, otherwise `E_BAD_META`.
- `frames` on a version whose rank is below 4 is rejected with `E_BAD_VERSION`; the message and
  hint both name `1.4`. A v1.4 recipe without `frames` behaves exactly like v1.3 apart from the
  version literal.
- Each frame object accepts only `id`, `layers`, `duration`:
  - `id`: required, non-empty (trimmed) string, unique across the recipe. Empty/duplicate ids give
    `E_BAD_META`.
  - `layers`: required `Layer[]`, normalized by the existing `normalizeLayers` so layer ids and
    op ids are validated per frame; bad layers give `E_BAD_LAYER` / `E_DUPLICATE_LAYER` /
    `E_DUPLICATE_OP_ID`. Layer ids may repeat across frames because each frame is its own compile
    unit.
  - `duration`: optional integer, recorded only. It is never interpreted by the compiler or
    linter. A non-integer gives `E_BAD_META`.
- Unknown frame keys give `E_BAD_META`. No new error codes were needed, so `src/core/errors.ts`
  stayed untouched.

## Canonical key position

`canonicalRecipe` emits: `version`, `meta`, `[design]`, `palette`, `[parts]`, `anchors`, `layers`,
`[frames]`. `frames` is appended after `layers` only when present, so every existing recipe has
byte-identical canonical output. A frame emits `id`, `layers`, `[duration]`; `layers` goes through
the same `canonicalLayers` helper as frame 0. Serialization is `JSON.stringify(…, null, 2) + '\n'`.

## Compile reuse

The former body of `compileRecipe` is now the private `compileLayers(recipe, sourceLayers)`. It
reads palette, parts, anchors, profile and design from the shared recipe and allocates fresh
canvases for the given source layers. `compileRecipe(recipe)` still delegates with
`recipe.layers`, so frame 0 is byte-for-byte the legacy result. `compileRecipeFrames(recipe)`
returns `[{ index: 0, compiled: frame0 }, …]` followed by one entry per declared frame
(`{ index: n+1, id: frame.id, compiled }`). No op semantics, no canvas size, no linter threshold
and no dependency changed.

## Lint ordering

`LintFinding.frame` is an optional zero-based frame index. Frame 0 findings carry no `frame` field,
keeping them byte-identical to today. `compareFindings` compares `frame ?? 0` first, then the
existing severity rank, code and row-major coordinate. `lintCompiledFrames` lints each compiled
frame independently, tags findings for frames 1+ with their index, and returns the globally sorted
list. `lintBlocks` is unchanged, so `--strict` still fails on any warning from any frame.

## Digest baselines (before / after)

| Artifact | Before | After | Check |
| --- | --- | --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged | `pnpm verify` golden render tests pass |
| `test/art/scores.json` SHA-256 (AC-10) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | unchanged (file untouched by this phase) | `git status` shows no changes under `test/art/` |
| meta-export / parity assertions | passing | passing | `pnpm verify` unit project |
| `test/art/**`, goldens, CI config | clean | clean | `git status --short` |

The shell permission policy allows only git inspection/commit and the named verification commands,
so the digests above were not recomputed independently; they are preserved because none of the
listed tracked files was modified, and the corresponding golden/parity tests pass.

## Commands and exit codes

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, lint, 119 files / 1034 tests, build all pass |
| `pnpm exec vitest run test/recipe/version-1-4.test.ts test/unit/recipe.test.ts test/unit/compile.test.ts` | 0 (primary) | RESOLVED BY PRIMARY: the subagent shell rejected `pnpm exec`; the primary ran the exact command from the project root — 2 test files / 29 tests pass. `test/recipe/**` is outside every vitest project include, so the executed equivalent assertions live in `test/unit/recipe.test.ts` and `test/unit/compile.test.ts`, which `pnpm verify` also runs |
