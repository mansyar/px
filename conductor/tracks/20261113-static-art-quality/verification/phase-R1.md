# Phase R1 — Review Round 1 Fixes

| Field | Value |
| --- | --- |
| Track | `20261113-static-art-quality` |
| Phase | R1 — review round 1 fixes (F1–F10) |
| Date | 2026-11-13 |
| Branch | `feat/20261113-static-art-quality` |
| Base commit | `a8ed916` |
| Head commit | `f35552b` (task commits `2c1ca53` … `f35552b`) |
| Result | **verified** |

Every finding in the round-1 review is closed by code and by test. The two High
severities (F1, F2) were fixed at the source, not narrowed. Phase 7's failing
art-quality criterion is untouched: no score, asset or rubric record was edited.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm typecheck` (`tsc --noEmit`) | 0 | clean |
| static | `pnpm lint` (`biome check .`) | 0 | 154 files, no findings |
| unit/integration/smoke/goldens/benchmarks | `pnpm test` (`vitest run`) | 0 | 76 files, 710 tests |
| build | `pnpm build` (`tsc -p tsconfig.build.json`) | 0 | no output |
| coverage | `pnpm vitest run --coverage` | 0 | statements 95.6%, branches 86.5%, functions 98.17%, lines 95.43% (gate 80%) |
| phase gate | `pnpm verify` | 0 | typecheck → lint → test → build, all clean |

## Findings

| Finding | Sev | Fix | Named test(s) |
| --- | --- | --- | --- |
| F1 — `seal` paints unowned pixels | High | `seal` now resolves the adopted tone's owner (winning neighbour's part; majority owner on a tie, lower index last) and writes it through `canvas.set(x, y, fill, owner)`, mirroring outer `auto_outline`. Per-part counts, `px diff` and `light` now see sealed pixels; `strays` follows the same ownership when removing. | `test/art-lint/cleanup.test.ts` → *gives a sealed pixel to the part whose tone it adopted*, *adopts the majority owner when two parts share the winning tone*, *keeps the owner of a pixel deband recolours*, *clears the owner of a pixel strays erases*, *shades a sealed pixel instead of skipping it* |
| F2 — parts and role palettes not authorable through a tool | High | `px init` gains `--parts` (inline JSON or a file path) and `--profile`; `--palette` accepts the object form (`{"steel":{"ramp":{…}}}` / `{"leaf":{"colors":[…]}}`); `px_init` documents parts and `E_PART_UNKNOWN`, `px_draw`/`px_edit` document `"part"`; an unknown material fails at init with `E_MATERIAL_UNKNOWN`; the MCP schema and argv mapping publish the new parameters. | `test/mcp/parity.test.ts` → *declares parts, draws them and lights them identically*; `test/mcp/reachability.test.ts` → the exhaustive *reaches every CLI flag…*, *declares in the published schema…* and *reaches every declared schema property…* cases, whose `MAPPINGS` rows now cover the object palette, `parts` and `profile`; `test/integration/cli.test.ts` → `init: parts, profiles and role palettes` |
| F3 — clipped cast shadow silent | Medium | The light pass records every destination outside the canvas, reports the count and first dropped coordinate, and `applyOp` returns `clipped: true` with a `cast_offset` hint, so exactly one `W_OUT_OF_BOUNDS` per op is emitted. The old silence test is inverted. | `test/light/cast.test.ts` → *drops only the destinations that leave the canvas and says so once* |
| F4 — profile numbers read by nothing | Medium | `outlineWidth` is now `auto_outline`'s default thickness (an explicit `"width"` wins; `large` gives 2 px where `small` gives 1 px); `toneCount` is removed from `ProfileNumbers`, the four rows, the mismatch hint and the docs table, with a note that a tone budget is rubric judgement. | `test/ops/outline.test.ts` → `auto_outline thickness` (5 cases); `test/profiles/profile.test.ts` → row literals; `test/art/scene/scene.sha256` re-recorded (see Deviations) |
| F5 — incomplete ramp skips silently | Medium | Recipe validation resolves roles for every declared part's material through `buildSlotRoles` and raises `E_NO_RAMP` (via `partRampError`, keeping the `--derive-ramps` hint) naming the missing shading role. Keyed on declared parts, so part-less recipes are untouched. | `test/parts/schema.test.ts` → *rejects a half-built ramp at validation, naming the missing role (AC-5)*, *reports the first missing shading role in ramp order*, *accepts a complete ramp, and leaves undeclared families alone* |
| F6 — four art rules silent without parts | Medium | `BANDING`, `PILLOW_SHADE`, `DITHER_NOISE` and `CLUSTER_THIN` judge the flattened grid as one unnamed region when no parts are declared, omitting `part`; `VALUE_COLLISION` and `SILHOUETTE_LOSS` stay part-scoped (documented). | `test/art-lint/shading.test.ts` → *reports a band on plain artwork, without naming a part*, *reports pillow shading on plain artwork, without naming a part*; `test/art-lint/texture.test.ts` → *reports dither noise on plain artwork, without naming a part*, *reports thin clusters on plain artwork, without naming a part*; `docs/lint-thresholds.md` "Part scope" |
| F7 — retired requirement ids in headers | Low | Benchmark headers cite P7.T1.1 / P7.T2.1; parity and `src/mcp/tools.ts` cite P6.T2.2. | header review |
| F8 — tautological alias assertions | Low | `profile.test.ts` pins the compatibility row to literals `3, 3, 2, 2, 1.5` and no longer imports the aliases that read the same frozen row. | `test/profiles/profile.test.ts` → *repeats the constants every 32 px asset was calibrated against* |
| F9 — one-pixel diff case missing | Low | Added a single-pixel fixture (`identical: false`, `changed: {count: 1, bounds {x, y, w: 1, h: 1}}`, per-part 1/0) and `px_diff`'s description states a 1×1 box is the coordinate. | `test/ergonomics/diff.test.ts` → *pinpoints a one-pixel edit: a 1x1 box is the coordinate itself* |
| F10 — separability failure reported as an engine bug | Low | Added `E_RAMP_UNSEPARABLE` with a hint naming the base and its real step ceiling (`largestSeparableSteps`), registered in `ERROR_HINTS`; the refusal is now an input limit the caller can act on. | `test/palettes/ramp-extremes.test.ts` → *never returns two tones at the same luminance*, *names the largest step count a base can carry*; `test/palettes/synthesis.test.ts` → *refuses a ramp it cannot separate as an input limit, not an engine fault*; `test/palettes/probe.test.ts` sweeps greys and an RGB grid |

## Golden hashes

| Golden | Expected | Observed |
| --- | --- | --- |
| Hero render | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged — `test/goldens` green |
| Benchmark digests (4) | potion `9529870…`, sword `4050e84…`, humanoid `03e7170…`, chest `cda5bbe…` | unchanged — `test/benchmarks` green, including the replay-to-committed-recipe and committed-PNG-hash cases |

## Deviations

| File | Reason |
| --- | --- |
| `test/art/scene/scene.sha256` | T4's intended behaviour change (the `large` profile now gives `auto_outline` a 2 px default) alters the 256 px dogfood scene's border, so its recorded digest was updated to the real render. The hero golden and the four Phase-1 benchmark digests are untouched. |
| `test/ergonomics/stats.test.ts`, `test/ergonomics/diff.test.ts` | T5 fails an incomplete ramp at validation, and these fixtures declared parts against flat or base-only families. Their palettes became complete tone/role ramps (`ink.tN`, `steel` shadow/base/highlight); assertions and slot names were adjusted with them. |
| `test/art-lint/{helpers,silhouette,texture,value}.test.ts`, `test/light/{ao,cast,form,gloss,rim}.test.ts`, `test/parts/{helpers,ownership,serialize}.test.ts`, `test/integration/cli.test.ts` | Same T5 rule: fixtures with partial ramps became complete ramps or were rewritten to assert the new `E_NO_RAMP` gate; deliberate "graceful skip" cases that no longer exist became gate assertions or raw `lint()` contexts. |

## Notes

- **F10 premise did not reproduce.** `synthesizeRamp('#010101', 6)` succeeds on this
  tree: the repair's lift always rescues a clamped ramp, so the old `E_INTERNAL`
  throw was unreachable defensive code. The error was still converted to
  `E_RAMP_UNSEPARABLE` with a dynamic hint (base + `largestSeparableSteps` ceiling),
  and `test/palettes/probe.test.ts` sweeps every 5th grey and a coarse RGB grid at
  3–6 steps to prove a refusal is never reported as an engine fault. The branch
  remains defensive; `largestSeparableSteps` is exported and tested directly so the
  hint's number is verified.
- The sweep file is named `test/palettes/probe.test.ts`: it began as a scratch
  probe to establish the F10 premise, and this subagent's shell permissions do not
  allow `rm`/`git mv`. Its content and header are a proper regression test; renaming
  it to `separation.test.ts` is cosmetic and safe for the primary to do.
- T10 landed as two commits (`ba8d818`, `f35552b`): the second exports the ceiling
  helper and covers it, after coverage showed the hint path unexercised.
- T5's cascade touched 18 files: the rule is correct (`E_NO_RAMP` at validation),
  but every existing fixture that declared a part against a partial ramp had to
  become valid or assert the new error. No threshold, exclude or `v8 ignore` was
  added anywhere.
- The benchmark harness already accepted exit 0 or 3 before R1.T6, and the four
  benchmarks still render to their committed hashes with only the original four
  codes asserted empty.

## Evidence paths

- `test/art-lint/cleanup.test.ts`, `test/mcp/parity.test.ts`,
  `test/mcp/reachability.test.ts`, `test/light/cast.test.ts`,
  `test/ops/outline.test.ts`, `test/profiles/profile.test.ts`,
  `test/parts/schema.test.ts`, `test/art-lint/shading.test.ts`,
  `test/art-lint/texture.test.ts`, `test/ergonomics/diff.test.ts`,
  `test/palettes/ramp-extremes.test.ts`, `test/palettes/synthesis.test.ts`,
  `test/palettes/probe.test.ts`, `test/integration/cli.test.ts`
- Source: `src/core/ops/cleanup.ts`, `src/core/ops/index.ts`,
  `src/core/ops/light.ts`, `src/core/ops/outline.ts`, `src/core/ops/pass.ts`,
  `src/core/recipe/validate.ts`, `src/core/profile.ts`, `src/core/errors.ts`,
  `src/core/recipe/{types,normalize}.ts`, `src/palettes/synthesize.ts`,
  `src/cli/{args,commands,main}.ts`, `src/mcp/tools.ts`, `src/lint/{view,shading,texture}.ts`
- Docs: `docs/art-profiles.md`, `docs/lint-thresholds.md`
