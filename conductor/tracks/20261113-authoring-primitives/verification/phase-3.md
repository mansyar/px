# Phase 3 — Texture: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `26fd143` · **Head at verification:** `2c9b7ab`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)

## What the phase adds

A `texture` pass over a declared part: `pattern` one of `stipple`, `hatch`,
`grain`, `brick`, `mottle`; `color` a slot name or one of the four ramp roles,
resolved against the part's material; `density` 1–3; optional `target_layer`.
It reads a snapshot of the layer it points at, masks on the part's ownership, and
writes marks into the active layer with the part as their owner.

### The design that makes the cluster floor structural

The failure this phase answers is `dither_fill` at `large`: a 2 px lattice whose
every pixel is below the profile's 3 px `minCluster`, so `CLUSTER_THIN` correctly
calls the engine's own texture illegal. Rather than teach the linter to exempt a
new op — which would weaken the rule for everything else — the pass is built so
no legal texture can trip it:

| Number | Rule |
| --- | --- |
| mark | `profile.minCluster` px on a side (1 tiny, 2 small/medium, 3 large) |
| gap | `mark × (4 − density)` px: density 3 → 1 mark, 2 → 2, 1 → 3 |
| spacing | `mark + gap` |

So the smallest legal mark is exactly the cluster minimum and the smallest legal
gap is the cluster minimum. Density moves only the gap, never the mark: a denser
texture is closer, not finer, which is what keeps it legal at every density.

A second rule keeps that true at a boundary: **a mark is painted only when every
one of its pixels already belongs to the target part.** A clipped mark would
leave a 1–2 px sliver at the shape's edge, and a sliver is precisely what the
cluster floor forbids. The cost is that texture stops at the mask edge instead of
bleeding across it — the behaviour pixel art wants anyway — and the benefit is
that no mask shape, at any size, can produce a partial mark.

No `textureSpacing` profile field was needed: spacing derives from `minCluster`
and `density` alone, so the profile table keeps one number for grain.

### Determinism

Marks are generated from absolute canvas coordinates in a fixed order; `grain`
keeps two of every three cells and `mottle` offsets each blob by a fixed integer
hash of its cell. That hash is `Math.imul` arithmetic on integers — no RNG, no
clock, no floating transcendentals — so two compiles and two platforms agree.

### Lint

Nothing in `src/lint` changed. `CLUSTER_THIN` is silent because every mark is at
least `minCluster` and marks never touch; `DITHER_NOISE` is silent because a
solid mark cannot form the 2×2 checkerboard tile the rule counts (a mark/bed
`2×2` has `a !== d` on every edge and corner case). `dither_fill` still fails at
`large`, which is the fixture proving the rule was not weakened.

### Report

The pass returns a `CleanupReport` of `op: "texture"` with `changed` (pixels),
`marks` (whole marks) and an empty `coords` — counts, not pixels (NFR-4). A part
smaller than one mark produces zero marks and therefore the existing
`W_CLEANUP_NOOP`, with a texture-specific hint. `px draw`/`px edit` now compile
recipes that contain a texture so that report reaches the caller; recipes with
neither a cleanup pass nor a texture still compile nothing and keep their bytes.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-9 each of five patterns on the same part gives five distinct renders with zero `CLUSTER_THIN` at `large` | `floor.test.ts` sweeps 4 profiles × 5 patterns × 3 densities for `CLUSTER_THIN`/`DITHER_NOISE` and asserts min cluster ≥ `minCluster`; `patterns.test.ts` asserts five distinct flattened grids | Pass |
| AC-10 the same texture renders twice byte-identically, and marks grow between an 8 px and a 256 px canvas at the same density | `patterns.test.ts` — every pattern compiled twice with equal buffers; tiny = 1 px marks three apart, large = 3×3 marks nine apart, both read from rendered slots | Pass |
| AC-11 `dither_fill` below the floor still raises `CLUSTER_THIN` | `floor.test.ts` — `checker_50` over a `large` part yields `CLUSTER_THIN` findings while the same paint region textured yields none | Pass |

## Tasks

| Task | Evidence | Files |
| --- | --- | --- |
| P3.T1 — patterns | `patterns.test.ts` (10 tests): five distinct renders, determinism, density, role colour; `E_PATTERN_UNKNOWN`, `E_MISSING_PARAM`, `E_BAD_PARAM` | `src/core/ops/texture.ts`, `recipe/{types,normalize}.ts`, `core/errors.ts` |
| P3.T2 — cluster floor | `floor.test.ts`: no `CLUSTER_THIN` across 60 profile/pattern/density combinations; every mark ≥ `minCluster`; 30×30 island paints whole 3×3 marks only | `src/core/ops/texture.ts` |
| P3.T3 — lint acceptance | `floor.test.ts`: `DITHER_NOISE`/`CLUSTER_THIN` silent for every pattern at every profile; `dither_fill` still flags | no lint change — proof that none was needed |
| P3.T4 — range and emptiness | `floor.test.ts`: sub-mark part → `W_CLEANUP_NOOP` with 0 marks; `E_NO_RAMP` for a role the material lacks; report is counts with empty `coords` | `src/core/ops/index.ts`, `src/core/compile.ts`, `src/cli/commands.ts`, `test/texture/surface.test.ts` |

`E_NO_RAMP` is raised at compile time by the op, using the shared
`partRampError` hint machinery, because a bare role can only be resolved against
the part's material once the palette and parts are known together.

## Digests (no digest moved this phase)

`git diff --stat 26fd143..HEAD -- test/goldens test/benchmarks test/art` is
empty. No existing op changed; the hero golden and all eight asset digests are
untouched.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, `biome check .` (170 files after formatting), 86 test files / 813 tests passed, build |
| `pnpm vitest run --coverage` | 0 | 86 files / 813 tests passed; statements 95.88 %, branches 87.17 %, functions 98.33 %, lines 95.70 % (gate 80 %, unchanged); `src/core/ops/texture.ts` 100 / 100 / 100 / 100 |

## Deviations

None. Every changed path is inside the phase's declared `Touches`
(`src/core/**`, `src/lint/**` untouched by design, `src/cli/**`, `docs/…` not
needed, `test/texture/**`, `vitest.config.ts`). `src/mcp/**` needed no change:
the tool surface accepts the same op objects, and `test/texture/surface.test.ts`
drives the CLI path end to end.

No new dependency, no threshold lowered, no coverage exclude widened, no
`v8 ignore`, no lint rule weakened, no rule disabled.

## Primary verification

Verified by the primary at `2c9b7ab`.

| Check | Result |
| --- | --- |
| Working tree | clean apart from this untracked file |
| Commits in `26fd143..HEAD` | 2 (`b683230`, `2c9b7ab`), 0 merges |
| Scope | every changed path inside `src/core/`, `src/cli/`, `test/texture/`, `vitest.config.ts` |
| `git diff --stat 26fd143..HEAD -- test/goldens test/benchmarks test/art` | empty |
| `pnpm verify` | exit 0 — typecheck, biome, 86 files / 813 tests, build |
| `pnpm vitest run --coverage` | exit 0 — 95.88 % statements, 87.17 % branches |

### Spot-checks in source

- **The floor is structural, not a lint exemption.** `src/lint` is unchanged in
  the diff, and the same test file asserts `dither_fill` still flags at `large`.
  A rule that had been relaxed to let texture through would fail that assertion.
- **Full-fit is checked per mark, pixel by pixel.** The 30×30 island test counts
  texture pixels and requires a multiple of 9 at `large`; a partially clipped
  mark would break the multiple, so the assertion tests the rule rather than the
  look.
- **The 8 px case is the AC's, not a convenient one.** `patterns.test.ts` uses an
  8 px canvas for the tiny end, which is the engine's minimum canvas size, so the
  claim is about the smallest legal canvas rather than a nearby one.
- **The CLI report is the caller's report.** `surface.test.ts` drives `px draw`
  through `runCli` and reads `cleanup[0]`, so the CLI gate added in
  `commands.ts` is exercised rather than assumed.
