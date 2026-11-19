# Sprite-sheet export — design record

- Track: `20261119-animation-foundations`
- Phase: 2 (Sheet export, additive metadata, fixture and docs)
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `ffbd33ca7f1147392b079810825af51311d44f02`

## Result

Verified. Sheet PNG export, the additive `sheet` metadata block, the
`anim-duo` golden fixture, the agent-facing descriptions and `docs/animation.md`
are all in place. All primary-run cells are filled with real output; no
`PENDING PRIMARY` cells remain.

## Export contract

`--export` on a framed recipe writes four files; the normal pair is unchanged:

| file | contents |
| --- | --- |
| `<stem>.png` | frame 0 — byte-identical to the same recipe without its frames |
| `<stem>.meta.json` | the unchanged single-frame projection (no `sheet` key) |
| `<stem>.sheet.png` | all frames packed left-to-right in one row |
| `<stem>.sheet.meta.json` | the same projection plus `generic.sheet` |

Sheet PNG and sheet meta are written together and only when `--export` is set
**and** `recipe.frames` is non-empty. Without `--export`, or for a single-frame
recipe (including a v1.4 recipe with no `frames`), neither sheet file exists.
The response envelope is unchanged; a framed export adds one payload key,
`sheet` (`{out, width, height, bytes, sha256, metadata}`), mirroring `debug`.

## Geometry and determinism

`renderSheet(recipe)` compiles frame 0 plus every declared frame through
`compileRecipeFrames`, rasterizes each with the shared `rasterizeSlots`, and
packs them into one row: cumulative `x`, `y = 0`, sheet width = sum of frame
widths, sheet height = tallest frame, transparent padding below shorter frames.
The existing deterministic `encodePng` (filter 0, deflate level 9) is reused
unchanged. No RNG, clock, absolute path or host-dependent ordering is involved.
The frame-0 PNG still comes from `renderRecipe` and is never overwritten.

## Additive metadata

`buildMetadata` takes an optional fifth argument, `sheet`. When present and
non-empty it is spread into `generic` as an ordered array with one entry per
frame: `index`, `id` (omitted for frame 0), `x`, `y`, `width`, `height`, `trim`,
`origin` and `duration` (omitted when undeclared). Spreading means a
single-frame export has no `sheet` key at all, so its metadata is byte-identical
to the pre-animation projection. `v`, `texture_path`, `filter`, `centered`,
`offset`, `anchors`, `canvas`, `palette` and `recipe_hash` keep their existing
values; in the sheet meta `texture_path` names the sheet PNG and `generic.sheet`
lists the frames.

## Commands and exit codes

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm dev render --file test/goldens/fixtures/anim-duo.px.json --out C:/Users/Ansyar/AppData/Local/Temp/opencode/anim-duo.png --export --pretty` (primary) | 0 | `ok:true`; frame-0 `sha256 = 7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559`; `sheet.sha256 = 6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045`; sheet `32x16`, frame-0 PNG `16x16`; normal meta `81592ec340a78fdd2febcc4bdcd81cbee8cdbcb482ddc75a5b4dcca9cc913dd0`; sheet meta `92fe07c5d648a6bc7cfd86ee4986cf045bc0ae857bb334aaf5856e46110cce17`; recipe hash `sha256:78b813f210c55a241e29b93e0249c954a7faee2e07ee0973c24a4157631c6966` |
| Deterministic double render (primary) | 0 / 0 | Two isolated workspaces, each with the recipe plus a copy of root `px.style.json`, rendered with `node_modules/.bin/tsx.ps1` and `render --file anim-duo.px.json --out anim-duo.png --export`; all four outputs byte-identical (A = B) |
| `pnpm exec vitest run test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts` (primary) | 0 | 3 test files / 9 tests (primary run before finalization test additions) |
| `pnpm verify` | 0 | typecheck, lint, 119 test files, build all pass; one pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` |

**RESOLVED BY PRIMARY (2026-11-19).** In the first subagent invocation
`pnpm dev render …` returned `permission.rejected` because only `pnpm verify`
and git commands are in that shell's allowlist. The primary ran the exact
command from the project root with exit 0 and the digests above. The denial is
retained here as history; the final report carries no blockers.

## Determinism proof (primary)

| Output | Workspace A | Workspace B | Match |
| --- | --- | --- | --- |
| `anim-duo.png` | `7C0C9B385E9EE8FDF45B5DD31D15BFBA5DF51DB4A51CCFBE5AA78C18E591B559` | same | A = B |
| `anim-duo.sheet.png` | `6189229CD0B26E818484F8704F5936723E3393E28C3257B7D8DAB3AE63F1B045` | same | A = B |
| `anim-duo.meta.json` | `81592EC340A78FDD2FEBCC4BDCD81CBEE8CDBCB482DDC75A5B4DCCA9CC913DD0` | same | A = B |
| `anim-duo.sheet.meta.json` | `92FE07C5D648A6BC7CFD86EE4986CF045BC0AE857BB334AAF5856E46110CCE17` | same | A = B |

The committed sidecars `anim-duo.sha256` and `anim-duo.sheet.sha256` hold the
lowercase forms of the first two digests; the golden test renders the fixture
twice and asserts both match. The digest artifact
`.conductor/evidence/anim-duo-digests.json` agrees with both PNG digests.

## Baseline integrity (primary)

- `test/art/scores.json` SHA-256 unchanged:
  `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
- `test/goldens/fixtures/hero.sha256` unchanged:
  `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62`.
- No existing golden, archive, CI config, rubric or lint threshold was changed;
  no new dependency, engine op, CLI verb or MCP tool was introduced.

## R1 addendum — shared design restored, digests unchanged

F3 restored a recipe-level `design` block and a minimal `parts` block in
`anim-duo.px.json` (shared by both frames; all four ops tagged `"part": "body"`
so the declared part owns pixels rather than tripping `E_EMPTY_PART`). Design,
parts and part tags affect metadata/deviations but not rasterized pixels, so
`test/goldens/render.test.ts` still passes against the original committed
frame-0 (`7c0c9b38…`) and sheet (`6189229c…`) digests — both `.sha256` sidecars
were left unchanged. F1 additionally gates the sheet pair when a frame-1+
warning is present under `--strict`. See `phase-R1.md` for the four out-of-Touches
`test/mcp/{meta-export,parity}.test.ts` failures caused by `@project` style
resolution in their scratch workspaces.
