# Review Round 1 — Static Art Quality

**Track:** 20261113-static-art-quality · **Range:** `dbee897..HEAD` · **Date:** 2026-11-13
**Verdict:** BLOCK — 2 High, 4 Medium, 4 Low

The reviewer had no shell in its session, so it read the tree rather than the diff and could not run the gates. Every command it asked for was run by the primary instead, and the results are recorded below: `pnpm verify` exit 0 (689 tests), `pnpm vitest run --coverage` exit 0 (95.57 / 86.51 / 98.40 / 95.40), goldens + smoke exit 0 (11 tests), `git diff dbee897..HEAD -- test/goldens test/benchmarks` empty, and no path outside `src/ test/ docs/ conductor/ scripts/` changed. The scope claim holds; that part of the review was sound.

## Findings and disposition

| # | Sev | Finding | Disposition |
|---|---|---|---|
| F1 | High | `seal` fills holes through `canvas.set` with no owner, so sealed pixels are painted but owned by nobody — invisible to `partStats`, to `px diff`'s per-part table, and to `light`, which skips unowned pixels and leaves flat unlit specks inside a shaded part. Contradicts FR-3's last-writer-owns rule. | R1.T1 — `seal` adopts the winning neighbour's owner; ownership asserted for seal, strays and deband, plus a seal-then-light case proving the repair is lit. |
| F2 | High | No CLI verb or MCP tool can declare `parts`, `material`, `gloss`, `z` or `meta.profile`, and no surface can author an explicit-role palette. `compile` throws `E_PART_UNKNOWN`, so a tool-only agent cannot reach the track's headline feature — and six of seven art codes are inert without parts, so it never sees the new feedback either. | R1.T2 — `parts` and `profile` on `init`/`px_init`, object palette form for explicit roles, documented `part` on `draw`/`edit`, material checked at init, parity case building a parts + light recipe through both surfaces. |
| F3 | Medium | A cast shadow whose offset leaves the canvas is dropped silently; `clipped: false` is hard-coded for the light op, so the spec's "one warning per op" is unreachable. The deviation went unrecorded and the evidence table reframed the silence as a deliberate absence of an error. | R1.T3 — one `W_OUT_OF_BOUNDS` per op with the first dropped coordinate and a `cast_offset` hint; the test that pinned the silence is inverted. |
| F4 | Medium | `outlineWidth` and `toneCount` are read by nothing, while `W_PROFILE_MISMATCH`'s hint and `docs/art-profiles.md` claim they govern outline thickness and tones. | R1.T4 — `outlineWidth` becomes `auto_outline`'s default thickness (explicit width still wins); `toneCount` is removed from the profile, the rows, the hint and the docs, with a note that a tone budget is a rubric judgement. |
| F5 | Medium | A `ramp` family missing one role validates and then shades nothing silently: `E_NO_RAMP` fires only for `flat` families. AC-5 names exactly this case. | R1.T5 — declared parts have their material roles resolved at validation; a missing role raises `E_NO_RAMP` with the `--derive-ramps` hint naming it. |
| F6 | Medium | Six of seven art codes return nothing when a recipe declares no parts, so every pre-track recipe gets zero art feedback. Detection does not need ownership; only attribution does. | R1.T6 — `BANDING`, `PILLOW_SHADE`, `DITHER_NOISE` and `CLUSTER_THIN` run on the flattened grid with no `part` field; `VALUE_COLLISION` and `SILHOUETTE_LOSS` stay part-scoped and now say so in their doc comments and in `docs/lint-thresholds.md`. |
| F7 | Low | Test headers cite AC-21, which does not exist in this track's spec, and two places cite AC-19 for parity when AC-19 is the one-pixel diff case. | R1.T7 — headers repointed at real task ids. |
| F8 | Low | Five assertions compare `PROFILES.small.*` against aliases defined as reads of that same frozen object, so they cannot fail. | R1.T8 — assert the aliases against literals; the literal row and `thresholds.test.ts` remain the real guard. |
| F9 | Low | AC-19 asks for a one-pixel diff; the closest fixture changes two pixels and no coordinate is exposed. | R1.T9 — single-pixel fixture with `count: 1` and a 1×1 bounding box, and the `px_diff` description says a 1×1 box *is* the coordinate. |
| F10 | Low | An unseparable synthesised ramp throws `E_INTERNAL` with no hint, telling an agent the engine is broken when the request is simply unsatisfiable. | R1.T10 — `E_RAMP_UNSEPARABLE` naming the base and the largest step count it can carry. |

## What this review caught that seven phase gates did not

Both Highs are the same shape: a capability was built and tested through the path its author used, and no test walked the path an outside caller would take.

- F1 was invisible because every cleanup test asserted pixels and none asserted ownership. The invariant was true everywhere the tests looked.
- F2 was invisible because `test/mcp/parity.test.ts` states in its own header that parts are not involved. The parity suite was green and the tool surface was missing the feature entirely.

That is the same failure mode as the previous track's `derive_ramps` gap and its inverted exit codes: a phase can pass every gate it writes for itself. Review is the only step positioned to ask "who calls this, and with what?" — which is why the round is worth its cost even when the phases are green.

## Note on the reviewer's method

The read-only reviewer was denied shell access, so its requirements table is a reading of the code rather than an observation of running it. The primary ran the commands and confirmed every gate; the findings stand on the code, and the two Highs were checked by hand in the source before being scheduled for a fix. Recorded because "verified_by: test file, not executed" is weaker evidence than the table's format implies.
