# Phase 1 Verification — Intent Schema and Compatibility

- Track: `20261117-authoritative-design-intent`
- Phase: 1 — Intent Schema and Compatibility
- Date: 2026-11-17
- Branch: `feat/20261117-authoritative-design-intent`
- Base: `1b65490`
- Head: `002594963a5a71cc17d1588a83e5568a90b7ca17`
- Result: **verified**

## Commands

| Command | Exit code | Notes |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck + biome + 101 files / 922 tests + build; one pre-existing lint warning in `test/recipe/version-1-2.test.ts:50` (out of Touches) |
| `pnpm vitest run --coverage` | 0 | 101 files / 922 tests; statements 94.70%, branches 85.60%, functions 98.27%, lines 94.47% (all gates 80) |
| `git diff --stat 1b65490 HEAD -- test` | 0 | Only new files under `test/design/` plus the `test/mcp/reachability.test.ts` extension; no digest, score or fixture changed |
| `git status --short` | 0 | Clean |

Both verification commands were also run after each of the five task commits and exited 0.

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 — design writes canonically after meta before palette and contributes to the hash | Pass | `canonicalRecipe` emits `version, meta, design, palette, parts?, anchors, layers`; `DESIGN_FIELDS` fixes inner order, edge classes and value keys are sorted; `test/design/canonical.test.ts` proves byte-stable round trip and hash sensitivity. Recipes without design emit no key. |
| AC-2 — legacy recipes render byte-identically | Pass | `test/design/compatibility.test.ts` parses all 12 committed fixtures with an explicitly supplied base directory, asserts no design block, byte-stability where the committed text is canonical, and equality of rendered SHA-256 with the committed digest. `git diff` confirms no `.sha256` file changed. |
| AC-3 — missing style file / unknown ramp errors name the style file | Pass | `E_STYLE_MISSING` message contains `join(baseDir, 'px.style.json')` and hint explains creation; `E_INTENT_RAMP` hint lists allowed ramps and the resolved style path. `test/design/style.test.ts`, `test/design/intent.test.ts`. |

FR-15 is covered by `test/design/authoring.test.ts` (inline and file `--design`, help publication, `px_init` object parameter) and the bidirectional `test/mcp/reachability.test.ts` extension. FR-17 is covered by `test/design/schema.test.ts`: design under `1`, `1.0` or `1.1` raises `E_BAD_VERSION`, the hint says to set `1.2`, and no version promotion occurs.

## Digest proof

All 12 committed fixtures were rendered in the final verification run and matched their committed `.sha256` file. None was modified.

| Set | Asset | Committed SHA-256 | Result |
| --- | --- | --- | --- |
| golden | hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged |
| benchmarks (1.0) | potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | unchanged |
| benchmarks (1.0) | sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | unchanged |
| benchmarks (1.0) | humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | unchanged |
| benchmarks (1.0) | chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | unchanged |
| art (1.3 author-written) | potion | `2ea4173c7b8e27cc6723e4acd4fffc38a412f7d32bc65308dd4bfb7fe6622a3e` | unchanged |
| art (1.3 author-written) | sword | `722fc7dbac870e31e34c8359a6a623b57a96396d900aba81489d8161b9290ee2` | unchanged |
| art (1.3 author-written) | humanoid | `ebb87295b32deeb2ab5233ce45ba82eaded2513763717e6736196639ada368cb` | unchanged |
| art (1.3 author-written) | chest | `07193f4570790b3d5c4df8cf2a8bcf9339b3e63f70dbc36f5d36a101d06906b6` | unchanged |
| art (1.3 author-written) | character | `18e12c69b28b73d87faf2e5a843f7516364d61cc4e6eab6e8c7ed229c27d039b` | unchanged |
| art (1.3 author-written) | prop | `9c6bd6d9d13da48e29332f8076cb27330eebcc6400f83f7aaa5663916a879c31` | unchanged |
| art (1.3 author-written) | scene | `ab2567d4e976355272d13476d58604d50d402bf38b6a643f4cb74ea7b31280c5` | unchanged |

The brief's listed art prefixes (`8afddb46`, `e0497137`, `9395073a`, `d5f001d6`, `77bec280`, `a911379a`, `ed1ba386`) do not match the digests committed at the phase base `1b65490`. The invariant enforced here is that **committed digests do not move**: the compatibility test reads each committed digest file at runtime, and no `.sha256` file changed relative to the base. `test/art/scores.json` was not touched.

## Deviations

None. All edits stayed inside the brief's `Touches` paths plus this evidence file.

## Notes

- The art fixtures are version `1.3`, not `1.1` as the brief's label says, and use author-written `derive` palettes that intentionally expand on read. The byte-stability assertion is therefore limited to the golden hero and the 1.0 benchmark set; the render-digest assertion covers all 12 fixtures.
- `px.style.json` is parsed with a closed key set: `allowed_ramps`, `edge_vocabulary`, `default_light`, `min_contrast`, `value_rules`. Only `default_light` is consumed as a default (fills an omitted `design.light`); the other four are declared constraints exposed on the parse result. Applying `min_contrast` or `value_rules` as extra render gates is not specified by FR-3/FR-4 and was deliberately not invented here.
- No runtime dependency was added; `package.json` is untouched.
- `resolveDesign` takes an explicit base directory. CLI commands pass the recipe directory (`dirname(resolve(cwd, file))`) for reads and the caller `cwd` for init, so CLI and MCP resolve identically without ambient cwd.

## Primary verification

Independent check at the phase head `0025949`, before the squash:

| Check | Result |
| --- | --- |
| `git status --porcelain` | Only the untracked `verification/` directory (primary-owned) |
| `git log --oneline 1b65490..HEAD` | Five commits, all reported; `git log --merges` empty |
| Scope filter outside `src/core/`, `src/cli/`, `src/mcp/`, `test/design/`, `test/mcp/`, `vitest.config.ts`, `conductor/` | Empty |
| `git diff --stat 1b65490..HEAD -- test/goldens test/benchmarks test/art` | Empty — no digest, recipe or score fixture changed |
| `pnpm verify` | Exit 0: typecheck, Biome 189 files (one pre-existing warning at `test/recipe/version-1-2.test.ts:50`, outside Touches), 101 files / 922 tests, build |
| `pnpm vitest run --coverage` | Exit 0: statements 94.70% (3490/3685), branches 85.60% (2308/2696), functions 98.27%, lines 94.47% |

Design spot-checks: `normalize.ts:1836-1845` rejects a `design` block below version rank 2 with `E_BAD_VERSION` and a hint naming `"1.2"` — it does not promote the version, the exact failure the previous track caught in review; `serialize.ts` writes the top-level order `version, meta, design, palette, …`; `test/mcp/reachability.test.ts` asserts both directions (every CLI flag published as a parameter, every declared schema property emitted by a mapping), including `design`.

**Digest correction:** the phase brief's seven `test/art/` prefixes were stale — they came from an earlier track state. The digests committed at the phase base are the seven `1.3` values recorded above, and all twelve committed digests (hero, four `test/benchmarks/`, seven `test/art/`) are unchanged. This is a primary brief error, not an engine change; future briefs must read the committed digest files rather than a remembered list.

Squashed to checkpoint `27d7a2a`.
