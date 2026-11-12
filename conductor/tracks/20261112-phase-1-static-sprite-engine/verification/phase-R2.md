# Phase R2 — Review fixes (round 2): verification

Track: `20261112-phase-1-static-sprite-engine`
Branch: `feat/20261112-phase-1-static-sprite-engine`
Result: **PASS**. Both round-2 Mediums are closed in code, not documented away,
and no golden or benchmark hash moved.

## Commands

| Command | Exit | Output |
| --- | --- | --- |
| `pnpm verify` | 0 | `tsc --noEmit` clean, `biome check .` 99 files clean, `vitest run` 41 files / 349 tests passed, `tsc -p tsconfig.build.json` clean |
| `pnpm vitest run --coverage` | 0 | 41 files / 349 tests passed, coverage below |

Test count moved 342 → 349 (seven net new), all green.

## Coverage

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| All files | 94.80% | 87.04% | 100% | 94.56% |
| `src/core` | 97.23% | 91.48% | 100% | 97.10% |
| `src/lint` | 98.20% | 91.79% | 100% | 98.07% |
| `src/core/ops/ramp.ts` | 94.20% | 78.12% | 100% | 93.65% |
| `src/lint/orphan.ts` | 100% | 100% | 100% | 100% |
| `src/lint/thresholds.ts` | 100% | 100% | 100% | 100% |

Gate: 80% statements and branches for `src/core` and `src/lint` — both pass. No
exclude list was widened and no ignore comment was added.

## Contract rows

| Item | Evidence |
| --- | --- |
| AC-12 (`ramp_fill` with N bands gives exactly N−1 role transitions along the light vector) | The rule now ranks painted pixels among the **occupied** projections and takes `band = floor(rank * bands / occupiedCount)`. With `bands ≤ occupiedCount`, the ratio is at most one, the rank step is at most one band, and the rank reaches `occupiedCount - 1`, so every band index 0…bands−1 occurs: **every band holds at least one painted pixel, therefore N bands always produce N−1 transitions, unconditionally**. Fixtures: bands 2 and 3 over an 8×4 block (`hhhhhhss`…, `hhhhbbbb`…) still yield exactly N−1; the new gap fixture (two 3×1 blocks on one row, bands 3) yields `hhb...bss` — two transitions, all three roles. |
| AC-18 (each rule fires on a crafted fixture and is silent on a clean sprite; strict changes the exit code) | `ORPHAN_PIXEL` fires on a lone pixel and on a pixel whose nearest painted pixel is three away horizontally, vertically and diagonally; silent on a 4-way block, a diagonal pair, a 1-px diagonal `line`, `checker_50`, `bayer_25`, a pixel exactly two away, and a later layer that rescues it. `JAGGY_LINE`, `LOW_CONTRAST`, `OUT_OF_BOUNDS` fixtures unchanged and green. Strict exit code 3 is covered by the existing CLI/MCP gate suites, untouched. |
| FR-20 (severities and strict promotion) | `ORPHAN_PIXEL` keeps code, `warning` severity, message shape and the 50-finding cap with a `truncated` marker (stipple fixture: 51 findings, `count` 64). |
| FR-18 (debug sheet, panel B backdrop) | `--backdrop` accepts `#rrggbb`, `#rrggbbaa` with `aa` of `00`/`ff`, and `null`; a non-binary `aa` is `E_USAGE` at the flag and `E_BAD_PARAM` in the sheet, with one shared sentence naming the accepted forms. Panel B stays byte-identical for `#102030` and `#102030ff`. |
| FR-22 (MCP surface) | Reachability now proves both directions: every mapping parameter is declared in `TOOL_DEFINITIONS[name].inputSchema.properties`, and every declared property has a mapping that sends it. |
| FR-23 (envelope, exit codes) | `isUsageError` is gone; `isInternalError` is the only classifier the exit-code decision consults. |

## Fixtures, both sides

`ORPHAN_PIXEL` (`test/lint/rules.test.ts`)

- Silent: lone-less pairs 2 px apart, `dither_fill bayer_25` over 8×8
  transparency, `checker_50`, 1-px diagonal `line`, 4-way block, diagonal pair,
  transparent layer, later-layer rescue.
- Fires: lone pixel at `(2, 3)`, pair at Chebyshev distance 3 in three
  directions, stipple of 64 isolated dots (cap marker at 51, `count` 64).

`ramp_fill` (`test/ops/ramp-fill.test.ts`)

- Legal and unchanged: bands 2 and 3 over the 8×4 block, legal domain, the four
  light directions (each asserted on its first role row), transparency,
  determinism, flat-family `E_NO_RAMP`.
- New: gap region (x 0–2 and 6–8, bands 3) → `hhb...bss`, two transitions, all
  three roles; occupied-count guard (2 occupied positions, bands 3) →
  `E_REGION_TOO_THIN`, message `occupies only 2 light-axis positions … supports at
  most 2`, hint `bands 2 or fewer`, location `{layer: 'base', op_index: 1}`.

`--backdrop` (`test/integration/cli.test.ts`, `test/lint/debug-sheet.test.ts`)

- Accepted: plain, `#102030`, `#102030ff` (same panel hash as `#102030`),
  `null`.
- Rejected: `#10203040` exits 1 with `E_USAGE`, message and hint both saying the
  alpha is binary; the sheet throws for the same value.

## Determinism

No golden or benchmark fixture was touched (`git diff --name-only` for the
phase lists only the files above). `test/goldens` still matches
`test/goldens/fixtures/hero.sha256` =
`8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`, and the
four benchmark hashes are unchanged. No golden or benchmark recipe uses
`ramp_fill`, and the new band arithmetic is identical for fully occupied blocks
(`rank` equals the old projection, `occupiedCount` equals the old axis length),
which is why the existing band rows keep their exact strings.

## Tasks

| Task | Commit | Summary |
| --- | --- | --- |
| R2.T1 | `2151f80` | `ramp_fill` bands by occupied light-axis positions; guard counts them; E_REGION_TOO_THIN hint reworded. |
| R2.T2 | `46069d0` | `ORPHAN_PIXEL` searches Chebyshev radius 2 via a documented threshold constant; `bayer_25` fixture added, stipple fixture moved to four-pixel spacing. |
| R2.T3 | `8119f43` | Unknown-tool hint is count-free; grep found no other hard-coded surface count. |
| R2.T4 | `feae7a3` | `isUsageError` deleted with its unit test, not kept as an alias. |
| R2.T5 | `9e7595b` | Both backdrop entry points reject non-binary alpha and share one hint sentence. |
| — | `5a0ae89` | Formatter-only follow-up (no amend allowed). |
| R2.T6 | `388df77` | Reachability proves schema and argv agree in both directions. |

## Deviations

1. **Extra `style:` commit** (`5a0ae89`). The ramp and rules-test edits were
   committed before `biome check` saw them; amending is forbidden, so the two
   formatting-only hunks landed as their own commit. No behaviour change.
2. **Schema keys are snake_case, not camelCase.** [`src/mcp/tools.ts`](../../../src/mcp/tools.ts)
   declares `derive_ramps`, `op_index`, `regions` — the same keys `argvFor` reads
   — so the reachability assertions compare the exact key on both sides. The
   brief's "camelCase" wording does not match the shipped surface; the contract
   it protects (schema and runtime agree) is what the test enforces.
3. **Reachability table restructured** from one row per flag to one row per
   (flag, tool) pair. The reverse check immediately found declarations with no
   proof: `px_init`'s `name`, `px_edit`'s `layer` and `out`, `px_anchor`'s `out`,
   and `strict` on the six tools that only had a `px_validate` row. Four rows and
   six `strict` rows were added; no production code changed.
4. **`E_REGION_TOO_THIN` message and baseline hint reworded** from "light axis
   is N positions long" to "occupies only N light-axis positions", because the
   limit is the occupied count, not the extent. The `supports at most N` and
   `bands N or fewer` fragments the existing fixture asserts are preserved.
5. **One extra fixture beyond the brief**: the debug sheet's own resolver is
   tested for the translucent backdrop, not only the CLI flag, because the flag
   validated nothing and the sheet is the second documented entry point.

## For the primary (not edited here)

- `plan.md`: R2.T1.1–T6.1 can be checked; R2 phase status → complete.
- `review.md`: M1 and M2 can be marked resolved in round 2, with the four Lows
  (stale hint, dead classifier, backdrop alpha, reachability direction) closed.
- `spec.md`: optionally say AC-12 counts *occupied* light-axis positions and
  FR-20 documents the orphan radius, so the spec states the invariant the code
  now guarantees.
