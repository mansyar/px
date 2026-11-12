# Phase 5 — Art Lint and Cleanup

- Track: `20261113-static-art-quality`
- Branch: `feat/20261113-static-art-quality`
- Phase base: `6091d19`
- Head: `0aff339`
- Requirements: FR-19, FR-20, FR-21 · AC-12, AC-15, AC-16, AC-17

## Commits

| Task | Commit | Summary |
| --- | --- | --- |
| P5.T1 | `0a46684` | `feat(lint): report VALUE_COLLISION when two parts share a base tone` |
| P5.T2 | `e40dd9c` | `feat(lint): detect BANDING and PILLOW_SHADE per part` |
| P5.T3 | `22813a8` | `feat(lint): flag DITHER_NOISE and CLUSTER_THIN at the wrong scale` |
| P5.T4 | `c4b8b2d` | `feat(lint): report RAMP_NONMONOTONIC and SILHOUETTE_LOSS per backdrop` |
| P5.T5 | `fb7b22e` | `test(lint): pin part attribution and the severities of every code` |
| P5.T6 | `0aff339` | `feat(ops): add seal, strays and deband cleanup passes` |

## Verification

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | tsc clean, biome 146 files clean, 70 test files / 615 tests passed, build clean |
| `pnpm vitest run --coverage` | 0 | 70 test files / 615 tests passed |

Coverage (v8, gate is 80% on every axis):

| Metric | Value |
| --- | --- |
| Statements | 95.28% (2463/2585) |
| Branches | 86.48% (1516/1753) |
| Functions | 97.97% (338/345) |
| Lines | 95.13% (2349/2469) |

New modules inside the gate: `src/core/bands.ts` 100% stmts, `src/core/ops/cleanup.ts`
95.52%, `src/lint/value.ts` 100%, `src/lint/shading.ts` 96.15%, `src/lint/texture.ts`
97.82%, `src/lint/monotonic.ts` 95.45%, `src/lint/silhouette.ts` 95%. No threshold was
lowered and no path left the coverage `include` list.

## Art codes on the four Phase-1 benchmarks

Recorded from `pnpm vitest run test/benchmarks/benchmarks.test.ts --reporter=verbose`
(the summary line now prints the baseline):

| Asset | Calls | Ops | Painted | set_pixels share | Art codes |
| --- | --- | --- | --- | --- | --- |
| potion | 9 | 18 | 130 of 256 | 2% | none |
| sword | 7 | 20 | 293 of 1024 | 3% | none |
| humanoid | 10 | 37 | 438 of 1024 | 3% | none |
| chest | 7 | 28 | 1202 of 2304 | 1% | none |

The brief expected the art codes to fire on these sprites. They do not: the four
assets declare no parts, so the six part-gated codes cannot fire, and their palettes
are derived ramps that are monotonic by construction, so `RAMP_NONMONOTONIC` is silent
too. The approved harness change is committed anyway — the "zero findings" assertion is
now scoped to the original four codes with a comment, the strict render stays a call
and is asserted to exit 0 or 3, and the summary prints the art-code baseline, so the
day an asset does trip an art code the harness records it instead of failing on a
message nobody asked for.

## Golden digests (unchanged)

| Fixture | SHA-256 |
| --- | --- |
| hero | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` |

No file under `test/goldens/**` and no benchmark recipe was edited.

## Acceptance criteria → named tests

| AC / FR | Test |
| --- | --- |
| FR-19 seven codes, pinned severities | `test/art-lint/attribution.test.ts` › "pins the severity of every code" |
| FR-19 `VALUE_COLLISION` | `test/art-lint/value.test.ts` (fires under 0.06 on material base tones, once per part pair, silent at a full step, same part, unowned neighbour, no parts, missing base role) |
| FR-19 `BANDING` | `test/art-lint/shading.test.ts` (one band at 4+ rows, silent at 2 rows, a one-row gap splits, differing widths silent, no parts silent, unowned row silent) |
| FR-19 `PILLOW_SHADE` | `test/art-lint/shading.test.ts` (4 and 3 shadow sides fire and name the sides, 2 sides silent, one highlighted side flips, under 8 boundary pixels silent, no parts silent) |
| FR-19 `DITHER_NOISE` | `test/art-lint/texture.test.ts` (81 tiles on a 3-tone ramp at tiny, silent on a 5-step ramp at large, tone-count failure, sub-floor lattice silent) |
| FR-19 `CLUSTER_THIN` | `test/art-lint/texture.test.ts` (2-px mark silent at tiny, reported at large, floor exactly silent, 51 pixels capped at 50 coords, one finding per part) |
| FR-19 `RAMP_NONMONOTONIC` | `test/art-lint/monotonic.test.ts` (mid-ramp brightening names the two tones, classic highlight ordering, equal tones, first break only, monotonic 5-step silent, 2-tone and flat skipped) |
| FR-19 `SILHOUETTE_LOSS` | `test/art-lint/silhouette.test.ts` + `test/art-lint/backdrop.test.ts` (grey base fires at 1.00:1, custom backdrop named, profile floor via tiny vs large, no parts silent) |
| AC-12 same shape, different outcome tiny vs large | `test/art-lint/texture.test.ts` CLUSTER fixtures; `test/art-lint/silhouette.test.ts` tiny/large profile fixture |
| AC-15 dither on 3 tones fires, on 5 steps silent | `test/art-lint/texture.test.ts` |
| AC-16 adjacent parts within one ramp step | `test/art-lint/value.test.ts` |
| AC-17 seal closes a 1 px gap and reports coordinates | `test/art-lint/cleanup.test.ts` › "closes a one-pixel hole and reports the coordinate" |
| FR-20 attribution, original codes un-retrofitted | `test/art-lint/attribution.test.ts` (every art code names its part; the four original codes carry no `part` key) |
| FR-21 cleanup ops, reporting, no-op | `test/art-lint/cleanup.test.ts` (seal 1 px and 2x2, 3x3 left alone, border notch left alone, strays at tiny and large, `target_layer`, deband middle run, darkest tone skipped, tone family step, 50-coordinate cap with exact count, `cleanup` present only when a pass ran, `W_CLEANUP_NOOP` on an empty layer, `E_BAD_PARAM` for unknown keys and for `part`) |

Regression guards: `test/lint/*` (four original codes produce exactly today's
findings on every fixture), `test/goldens/render.test.ts`, `test/benchmarks/*` (four
committed digests and the 12-call budget).

## Deviations

| File | Reason |
| --- | --- |
| `test/benchmarks/benchmarks.test.ts` | Approved change: scope the zero-findings assertion to the original four codes, keep the strict render as a call with an exit-code assertion of 0 or 3, and print the art-code baseline. The `call` helper gained an `exit_code` field and tolerates `E_LINT_GATE`, because the strict render can now legitimately exit 3. |
| `src/core/ops/index.ts` | `OpContext` needed the resolved `ProfileNumbers` so `strays` uses the profile minimum; `OpResult` needed the optional `cleanup` report. |
| `src/cli/commands.ts` | The `cleanup` report and the compile warnings a cleanup pass raises had to reach the draw/edit/validate envelopes; recipes without a cleanup op are not compiled, so their responses stay byte-identical. |

No new dependency, no ignore comment, no threshold lowered, no exclude widened, and no
pre-existing test outside the approved benchmark assertions was edited.
