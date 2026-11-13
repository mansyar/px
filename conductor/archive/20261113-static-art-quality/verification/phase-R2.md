# Phase R2 — Review Round 2 Fixes

| Field | Value |
| --- | --- |
| Track | `20261113-static-art-quality` |
| Phase | R2 — review round 2 fixes (F11, F14, F15, F16) |
| Date | 2026-11-13 |
| Branch | `feat/20261113-static-art-quality` |
| Base commit | `8b4d480` |
| Head commit | `c405032` (task commits `709acad` … `c405032`) |
| Result | **verified** |

The round-2 Medium (F11) was fixed at the source rather than documented: the
profile's outline width is now a 1.1 default, and a pre-1.1 recipe keeps the
one-pixel border it always drew. AC-1 is true again by construction, and every
recorded hash — hero golden, the four benchmarks, and the 1.1 scene asset — is
byte-identical to the base commit. No hash was re-recorded.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| phase gate | `pnpm verify` | 0 | `tsc --noEmit` → `biome check .` (154 files, no findings) → `vitest run` (76 files, 714 tests) → `tsc -p tsconfig.build.json` |
| coverage | `pnpm vitest run --coverage` | 0 | statements 95.6%, branches 86.57%, functions 98.18%, lines 95.43% (gate 80%) |
| goldens | covered by the suites above | 0 | `test/goldens`, `test/benchmarks`, `test/art` all green |

`714 = 710 + 4` new cases: the outline version boundary, the two seal tie
fixtures, and the init profile warning. Nothing was removed or skipped.

## Tasks

| Task | Finding | Commit | What changed |
| --- | --- | --- | --- |
| R2.T1 | F11 (Medium) — outline default broke AC-1 | `709acad`, `c405032` | `OpContext` carries the recipe's `version` (widened in `src/core/ops/index.ts`, populated from `recipe.version` in `src/core/compile.ts`). `auto_outline`'s thickness is `op.width ?? outlineDepth(context)`, where `outlineDepth` returns `1` for version `1` / `"1.0"` and `profile.outlineWidth` for `1.1`; an explicit `width` wins in both cases. `docs/art-profiles.md` states the gate in the `outlineWidth` paragraph and in the consumed-by table; the `AutoOutlineOp.width` and `ProfileNumbers.outlineWidth` comments say the same. |
| R2.T2 | F14 (Low) — seal tie-breaks had no fixtures | `4af7b8d` | Two fixtures in `test/art-lint/cleanup.test.ts`: a 2-vs-2 seam tie (four one-tone neighbours split between two parts, `seam_b` declared first) resolves to the **lower canonical owner index** (`seam_a`), and an owned-plus-unowned pair at the same tone and count resolves to the **owned** part. Both assert the adopted tone as well as the owner, and both say why in a comment. |
| R2.T3 | F15 (Low) — init discarded its parse warnings | `bcd59a6` | `runInit` now returns `parsed.warnings` in the init payload. The key is added **only when non-empty**, matching `draw`/`validate`/`render` and the `parts` convention, so a clean init keeps its exact envelope. `px_init`'s `W_PROFILE_MISMATCH` promise is true at init time, on both surfaces (the parity suite asserts `mcpInit` equals `cliInit`). No existing test asserts an exact key list for init — the only exact-key assertion in `test/parts/surface.test.ts` is for `inspect`, so the conditional form was chosen deliberately, not to dodge a test. |
| R2.T4 | F16 (Low) — threshold header cited the wrong task | `e2a753b` | The header no longer cites a task id. Neither id the brief offered produced these constants: this track's `P5.T4.1` is the ramp/silhouette calibration and `P5.T5.1` is the attribution fixtures, while `test/benchmarks/thresholds.test.ts` was added by the *previous* track's Phase 5 calibration (`da41e80`). Dropping the citation says what the file proves — jaggy and contrast fixtures on both the silent and the firing side — and invents no third id. |

## Named tests

| Behaviour | Test |
| --- | --- |
| 1.0 keeps 1 px, 1.1 gets 2 px, same 256 px canvas | `test/ops/outline.test.ts` → *keeps one pixel on a 1.0 recipe and thickens only 1.1, on the same canvas* |
| 1.1 still takes the profile width (32 px vs 160 px) | `test/ops/outline.test.ts` → *takes its depth from the profile in a 1.1 recipe when the op names no width* |
| explicit `width` beats the profile both ways | `test/ops/outline.test.ts` → *lets an explicit width win over the profile in both directions* (both recipes now 1.1, so the case still proves the override) |
| 2-vs-2 seam tie → lower part index | `test/art-lint/cleanup.test.ts` → *breaks a two-against-two seam tie by the lower part index* |
| owned beats unowned at equal counts | `test/art-lint/cleanup.test.ts` → *prefers an owned neighbour over an unowned one at the same tone and count* |
| `px init --profile small` on 256 px reports the mismatch | `test/integration/cli.test.ts` → *reports its own profile warning instead of waiting for the next verb* (also asserts a clean init has no `warnings` key) |

## Golden hashes

| Golden | Expected | Observed |
| --- | --- | --- |
| Hero render | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged — `test/goldens` green |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | unchanged — `test/benchmarks` green |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | unchanged — `test/benchmarks` green |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | unchanged — `test/benchmarks` green |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | unchanged — `test/benchmarks` green |
| scene (asset) | `ed1ba3866bf5f0400f3f51db53ea06a4ab06dd4f4cd7dc093f62ac584eac9d1a` | unchanged — `test/art` green, file untouched |

`git diff --stat 8b4d480..HEAD -- test/art test/goldens test/benchmarks` reports
only `test/benchmarks/thresholds.test.ts` (7 insertions, 5 deletions — the
header comment). No `.sha256`, `.png`, `.px.json`, `scores.json` or `.calls.json`
moved, so the digests are unchanged by observation, not by assertion alone.

## AC notes

- **AC-1 is true again, and the fix is the gate, not the fixture sizes.** The
  hero and the four benchmarks are 16–48 px, so they would have kept rendering
  the same bytes even with the bug present; the boundary test uses a 256 px
  canvas (profile `large`, `outlineWidth` 2) and varies only the declared
  version, which is the sole difference the observed 1 px vs 2 px can come from.
- **The scene keeps its 2 px border.** `test/art/scene/scene.px.json` declares
  `"version": "1.1"`, so it takes `profile.outlineWidth` exactly as it did after
  R1 and its digest does not move. If the gate had been written the other way
  round, this test would have failed — the digest is the check on the gate.
- **FR-13 is unchanged in intent.** The profile still recommends a depth for
  recipes at that scale; what changed is that the recommendation is scoped to
  the schema that introduced the profile mechanism, which is what the R2 FR-13
  amendment says.
- **No threshold lowered, no exclude widened, no `v8 ignore`.** Coverage moved
  only by the added branches being exercised (branches 86.5 → 86.57).
- **No new dependency**, no lockfile change, no generated file edited.

## Deviations

| File | Reason |
| --- | --- |
| `src/core/ops/index.ts` (`OpContext`), `src/core/compile.ts` | The brief expected this: the version has to reach the op, so `OpContext` gained a required `version` field and `compile` populates it from `recipe.version`. `compile.ts` is the only construction site. |
| `src/core/recipe/types.ts`, `src/core/ops/outline.ts`, `src/core/profile.ts` | Comments only. Each one described the outline default as unconditional, which is the exact reading that caused F11; they now name 1.1. `src/core/profile.ts` is a one-line comment edit landed as `c405032` because T1 was already committed and amending is not allowed. |
| `test/ops/helpers.ts` | `RecipeOptions` gained `version?: RecipeVersion` (default `1`, the pre-profile schema) so the ops harness can build a 1.1 recipe without parts. |

## Notes

- R2.T1's boundary test is deliberately built from four separate one-pixel
  writes rather than a single `rect`, because `rect` + a 2 px border at 256 px
  would leave the second ring adjacent to the canvas edge and the assertions
  would not distinguish "no second ring" from "clipped second ring".
- R2.T3's `tidy` case (`init-clean.px.json`) was initially written as
  `quiet.px.json` and failed with `E_FILE_EXISTS` against a fixture an earlier
  case in the same file creates; that is a test-isolation bug, not an envelope
  regression, and the name is now unique.
- The four new cases raise the suite from 710 to 714 tests; nothing else in the
  suite changed its expectations, which is itself evidence that the only
  behaviour change is the gated default (no 1.1 fixture or 129–256 px art asset
  depended on the pre-track behaviour).

## Evidence paths

- Source: `src/core/ops/index.ts`, `src/core/compile.ts`, `src/cli/commands.ts`,
  `src/core/recipe/types.ts`, `src/core/ops/outline.ts`, `src/core/profile.ts`
- Tests: `test/ops/outline.test.ts`, `test/ops/helpers.ts`,
  `test/art-lint/cleanup.test.ts`, `test/integration/cli.test.ts`,
  `test/benchmarks/thresholds.test.ts`
- Docs: `docs/art-profiles.md`
