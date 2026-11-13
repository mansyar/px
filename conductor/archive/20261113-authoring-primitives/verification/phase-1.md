# Phase 1 — Plane Shading: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `17a1632` · **Head at verification:** `3196bad`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)

## What the phase adds

A part may declare `facing` — one of `front`, `back`, `left`, `right`, `top`,
`bottom`, or a unit `[x, y, z]` — and `light` paints each declared plane with the
ramp role `dot(facing, towardLight)` earns. A part without `facing` is skipped by
the new stage entirely, so every pre-existing recipe keeps its bytes.

### The frame (the load-bearing decision)

Pinned in `src/core/facing.ts`: right-handed, `+x` right, `+y` **up**, `+z`
toward the viewer. A part with no `facing` is viewer-facing `[0, 0, 1]`. Screen
space grows downward, so the pass converts a screen step `(tx, ty)` into the
frame as `(tx, -ty)`; the light lies in the picture plane (`z = 0`), because the
pass models one directional light raking across the artwork rather than a lamp in
front of it. `dot` therefore reduces to `fx*lx + fy*ly`, and a `top-left` light
is `(-1, +1)` in the frame.

That single identity is what makes AC-1 hold: `right` = `[1,0,0]` against
`lx = -1/√2` is negative, so a right-facing plane is *darker* than a front-facing
one. `test/facing/plane.test.ts` asserts the dot products directly as well as the
rendered roles, so an inverted sign cannot pass by producing "a" tone.

### Tone scale

No second scale was introduced. `planeRole` maps the dot onto three equal bands
and returns a `RampRole` (`highlight` / `base` / `shadow`), which is the unit
every later stage already resolves (AO steps a role, cloth dithers a shadow band,
`deband` continues a ramp). A family that exposes only `highlight`/`base`/`shadow`
— including a synthesised one, whose derived roles are `t0`, the middle tone and
`t(n-1)` — therefore supports at most three distinguishable planes.

**Four or more distinct facings on a three-tone family quantise onto the nearest
band and share a tone with a neighbour.** That is stated in the `planeRole`
docstring and pinned by a test rather than left implicit. The alternative — a
fourth tone — would leave the pass unable to name the pixel's role for AO, cloth
and `deband`.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-1 `facing: "right"` under a top-left light is darker than no `facing` | `plane.test.ts` "makes a right-facing part darker than an unshaded one" (`steel.highlight` → `steel.shadow`, plus `planeDot` sign assertions) | Pass |
| AC-2 two parts of the same material at a boundary show distinct tones | `plane.test.ts` "shades two parts of the same material as two different planes" — adjacent 1 px parts, `sbsh` | Pass |
| AC-3 `form: "flat"` with `facing` plane-shades; without it shades nothing | `light.test.ts` — flat + `facing` → all `shadow`; flat without `facing` keeps the painted `highlight` on every pixel | Pass |
| AC-4 unknown facing exits non-zero with `E_FACING_UNKNOWN` and a hint naming legal names | `schema.test.ts` (normalize) and `author.test.ts` via `px init --parts` (exit ≠ 0, `error.code`, hint names all six) | Pass |

## Tasks

| Task | Commit | Files |
| --- | --- | --- |
| P1.T1 — facing in the schema | `a83655b` | `src/core/facing.ts`, `recipe/types.ts`, `recipe/normalize.ts`, `recipe/serialize.ts`, `core/errors.ts`, `test/facing/{helpers,schema.test}.ts`, `vitest.config.ts` |
| P1.T2 — plane tone resolution | `e0b06ee` | `src/core/facing.ts` (`planeDot`, `planeRole`), `test/facing/plane.test.ts` |
| P1.T3 — light integration | `e532929` | `src/core/ops/light.ts`, `test/facing/light.test.ts` |
| P1.T4 — surface and compatibility | `3196bad` | `src/cli/commands.ts`, `src/mcp/tools.ts`, `test/facing/author.test.ts` |

`facing` is authorable three ways, each proven to change rendered bytes:
the recipe file (`schema.test.ts` round-trips both forms), `px init --parts`
(inline JSON and a parts file, `author.test.ts`), and `px_init` (`author.test.ts`
drives `px_init` → `px_draw` → `px_render` and compares `sha256` against a
no-facing run).

## Composition and ownership

- Stage order is `plane → form → gloss → AO → cast → rim`, documented in the
  `light` docstring and asserted by composition: AO steps a plane's `base` to
  `shadow`; rim recolours a plane's silhouette while the interior keeps the plane
  tone; `bevel` lights and darkens the edges *of* the plane rather than replacing
  it.
- The plane stage writes colours only and passes no owner to `canvas.set`, so it
  cannot displace a part. `light.test.ts` asserts the `owners` arrays of a shaded
  and an unshaded compile are equal, that `painted` counts are equal, and that no
  `W_PART_OVERWRITE` is emitted.

## Digests (no digest moved this phase)

`git diff --stat 17a1632 HEAD` touches no file under `test/art` or
`test/goldens`; `test/art/assets.test.ts` and `test/goldens/render.test.ts` both
pass in the commands below.

| Asset | Digest on disk (unchanged from `17a1632`) |
| --- | --- |
| hero (golden) | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| potion | `8afddb462fd7300abad64fd6a257b55f58c844b0ceaabc0e4db118f10b99004a` |
| sword | `e049713712b02e5c21a3d43e28e41c63a7ed96d091e466fa370fb440dd71599e` |
| humanoid | `9395073a13bbe91d728b641156e3df7ac7e661926168c94efe2608160734fb9e` |
| chest | `d5f001d645120108425549de835d320d88481d383cf926f435b871f8cf7576da` |
| character | `77bec28003d7b3e9f4f69447ff9e1c868e7581a8de358d5b3622af20fb60aa1e` |
| prop | `a911379a23a3590abf05abf78c6c7aa97918e1e435b2fced568698454b6c4cde` |
| scene | `ed1ba3866bf5f0400f3f51db53ea06a4ab06dd4f4cd7dc093f62ac584eac9d1a` |

Note for the primary: the brief's truncated prefixes for potion (`9529870a…`),
sword (`4050e845…`), humanoid (`03e71701…`), chest (`cda5bbed…`) and character
match neither the files at `17a1632` nor at head. `prop` and `scene` do match, and
no asset file differs between base and head, so this looks like a stale list in
the brief rather than a moved digest. Worth re-reading those four before Phase 5
re-baselines anything.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, `biome check .` (160 files, no findings), 80 test files / 767 tests passed, build |
| `pnpm vitest run --coverage` | 0 | 80 files / 767 tests passed; statements 95.68 %, branches 86.84 %, functions 98.22 %, lines 95.51 % (gate 80 %, unchanged) |

## Deviations

- `vitest.config.ts` (one line, `test/facing/**/*.test.ts` in the unit project)
  is in the P1.T1 commit rather than P1.T4: without it the tests added by T1–T3
  are not collected by any project, so the commits that introduce them would
  ship tests that never run. Thresholds and the coverage include list are
  untouched.
- No new dependency, no threshold lowered, no coverage exclude widened, no
  `v8 ignore`, no lint rule weakened, no rule disabled.

## Primary verification

Verified by the primary at `3196bad`, independently of the report above.

| Check | Result |
| --- | --- |
| Working tree | clean apart from this untracked file |
| Commits in `17a1632..HEAD` | 4 (`a83655b`, `e0b06ee`, `e532929`, `3196bad`), 0 merges |
| Scope | every changed path inside `src/core/`, `src/cli/`, `src/mcp/`, `test/facing/`, `vitest.config.ts` or `conductor/`; nothing outside |
| `git diff --stat 17a1632..HEAD -- test/goldens test/benchmarks test/art` | empty — no digest file touched |
| `pnpm verify` | exit 0 — typecheck, `biome check .` (160 files), 80 files / 767 tests, build |
| `pnpm vitest run --coverage` | exit 0 — 95.68 % statements, 86.84 % branches, 98.22 % functions, 95.51 % lines |

### Spot-checks in source

- **The sign is right, and it is decided in one place.** `towardLight('top-left')`
  is the screen vector `(-1, -1)`; `towardLightVector` maps it into the pinned
  frame as `(-1/√2, +1/√2, 0)`. So `planeDot('right', 'top-left') = -1/√2`
  (dark) while `planeDot('front', …) = 0` (middle band). Verified by reading
  `src/core/facing.ts` rather than by trusting the test name, and asserted twice
  in `plane.test.ts` — once on the dots, once on the rendered roles, so an
  inverted sign cannot pass by producing "a" tone.
- **A colour pass stays a colour pass.** `light.test.ts` compares the `owners`
  and `painted` arrays of a shaded and an unshaded compile and asserts no
  `W_PART_OVERWRITE`. This is the invariant the previous track's High finding
  broke, so it is checked rather than assumed.
- **`flat` is genuinely two behaviours, not one.** With `facing`, a flat part is
  plane-shaded; without it, every painted tone survives untouched. Both halves of
  AC-3 are separate tests, because a `flat` that swallowed plane shading would
  still look green against a single assertion.
- **Reachable from a tool-only caller.** `author.test.ts` drives `px init
  --parts` (inline and file path) and `px_init` → `px_draw` → `px_render`, each
  compared by SHA-256 against a no-facing run. `facing` is therefore not a
  schema-only feature.

### Correction: this brief's digest list was wrong, not the digests

The brief's do-not-regress list mixed two asset sets, and the subagent was right
to flag it instead of quietly passing. The correct picture:

| Set | Assets | Digests |
| --- | --- | --- |
| `test/benchmarks/` (Phase 1 originals, never re-authored) | potion, sword, humanoid, chest | `9529870a…`, `4050e845…`, `03e71701…`, `cda5bbed…` |
| `test/art/` (the rubric assets, re-authored last track) | all seven | potion `8afddb46…`, sword `e0497137…`, humanoid `9395073a…`, chest `d5f001d6…`, character `77bec280…`, prop `a911379a…`, scene `ed1ba386…` |

The brief quoted benchmark prefixes for four assets and art prefixes for two
(`prop`, `scene`), which is why half of them "matched neither base nor head".
Every digest on disk is unchanged, confirmed both by reading the `.sha256` files
and by the empty diff above. Future briefs quote the set, not a prefix, and
Phase 5 re-baselines `test/art/` only.

## Accepted deviations

| Item | Reason |
| --- | --- |
| `vitest.config.ts` landing in the P1.T1 commit | The file is inside the phase's declared Touches; only its commit placement is early. Accepted, because the alternative ships `test/facing/**` tests that no project collects — tests that pass by never running. |
| Digest list in `.conductor/runs/…/phase-1-brief.md` | Primary error, corrected above; no code or recipe affected. |

