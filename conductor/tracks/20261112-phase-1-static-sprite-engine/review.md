# Review — Phase 1 — Static Sprite Drawing Engine

## Round 1 — 2026-11-12

Read-only reviewer agent, diff range `60582b28cbe0dc9cd8c1f892817872ed2e7b3dc4..HEAD`
(22 commits: five squashed phase checkpoints plus the dogfooding fix, the opencode
registration and the doc sync).

**Verdict: BLOCK.** One High, six Medium, five Low.

### Requirements coverage

58 requirements walked (24 FR, 7 NFR, 22 AC plus edge cases). Coverage was mostly solid:
41 satisfied outright, 16 partial and 1 missing. The gaps were not missing features but
missing *reachability* and *honesty* — a feature that exists on one surface and not the
other, a flag that cannot fire, a claim in an evidence file for a flag that was never
added.

### Findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F1 | High | Exit codes inverted: usage errors exit 2, `E_INTERNAL` exits 1, against FR-23's 0/1/2/3 contract. An agent reading 2 concludes the engine is broken and backs off from a fixable recipe. | R1.T1 |
| F2 | Medium | `validate` is a CLI verb with no MCP tool, so MCP-only agents cannot lint without writing a PNG. The parity suite has one hard-coded parameter set per verb and could not catch the next such gap — that is how `derive_ramps` slipped through. | R1.T2 — user approved `px_validate` as a seventh tool; parity rewritten as a flag-reachability table |
| F3 | Medium | `ORPHAN_PIXEL` uses 4-way adjacency, so a clean 1-px diagonal `line` and `dither_fill checker_50` on transparency are flagged as defects — and fail the strict gate. | R1.T3 |
| F4 | Medium | `pixel_perfect` is provably a no-op (Bresenham never emits the L-turn it removes), yet AC-5 claimed it verified. | R1.T4 — user approved withdrawing the flag over inventing line semantics |
| F5 | Medium | `replaced` returns an index, so replacing index 0 reads as "nothing replaced". | R1.T5 |
| F6 | Medium | `ramp_fill` cannot reach its last colour bucket on thin regions, so a 2×1 region with `bands: 3` yields 1 transition where AC-12 promises 2. | R1.T6 — reject rather than silently under-deliver, so AC-12 stays unconditionally true |
| F7 | Medium | The coverage gate is documented as running in CI but the workflow never runs it. | R1.T7 |
| F8 | Low | The debug backdrop is configurable in code, unreachable from any caller, and claimed in `phase-2.md`. | R1.T8 |
| F9 | Low | `draw` and `edit` discard recipe warnings; `anchor` returns them. | R1.T9 |
| F10 | Low | An unwritable `--out` becomes `E_INTERNAL`, blaming the engine for the caller's path. | R1.T10 |
| F11 | Low | `W_PASS_NOOP` never reaches `findings`, though the spec's edge case says info finding. | R1.T11 — resolved as a warning rather than a fifth lint code, because FR-20's four codes are a closed product surface; deviation recorded |
| F12 | Low | `pnpm-workspace.yaml`, `opencode.json` and the conductor agent file changed with no deviation entry. | R1.T12 |

### What the review got right that the phase verification did not

Every phase passed its own gates, and the track-level integrated verification passed too. The
reviewer still found a High defect, because the gates checked *internal consistency* — does the
code match its tests — and not *the contract* — do those tests assert the documented numbers. The
exit-code tests were green while asserting the inverse of FR-23.

F2 and F3 belong to the same family: both are places where the implementation is coherent with
itself and wrong against the product. They are also the two places where dogfooding and review
each caught something the other did not — dogfooding found `derive_ramps` missing over MCP,
review found `validate` missing over MCP and the lint rule rejecting legitimate art.

### Decisions requiring the user

1. `validate` over MCP: add a seventh tool (approved) rather than documenting the gap.
2. `pixel_perfect`: withdraw it (approved) rather than inventing semantics for a flag the spec
   never pinned.

## Round 2 — 2026-11-13

Reviewer re-reviewed `60582b2..HEAD` with emphasis on `7bd6365`, verifying each round-1 finding
against the code rather than against the new tests.

**Verdict: PASS WITH FINDINGS.** No round-1 fix was cosmetic, nothing previously satisfied
regressed, every golden and benchmark byte is unchanged, and the spec amendments match the
implementation. The High is closed with a real proof: `test/integration/internal-error.test.ts`
injects an engine fault through `renderRecipe` and asserts exit 2, while a missing file stays 1.

Two Mediums survived because R1 narrowed the symptom instead of removing the cause:

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| M1 | Medium | `ramp_fill` derives its guard *and* its denominator from the bounding-box extent, so a region with a **gap** still swallows a band: two 3×1 blocks on one row at x 0–2 and 6–8 with `bands: 3` are accepted (max 9) and paint highlight then shadow, never `base` — one transition where AC-12 promises two, and `phase-R1.md` claimed the promise was unconditional. | R2.T1 — rank painted pixels among *occupied* projections; band from rank; guard on the occupied count |
| M2 | Medium | `ORPHAN_PIXEL` at 8-way still flags every pixel of `bayer_25`, whose lit cells are 2 px apart in both axes. A sanctioned fade over empty space therefore warns per pixel and hard-fails `--strict`. | R2.T2 — Chebyshev radius 2, documented as the sparsest lattice the engine emits, with fixtures on both sides |

Lows: a stale "six px tools" hint after `px_validate`; `isUsageError` left as a dead classifier
that invites the old exit-code mapping back; the FR-22 rewrite silently dropped the batching
clause (restored by the primary); `--backdrop` accepting non-binary alpha, contradicting both the
product's alpha rule and the other hint site; and a reachability table that proves argv mapping
but not that the parameter is published in `inputSchema` — the exact shape of the F2 defect.

The last one is the most instructive: R1's fix for F2 built a guard, and round 2 found the guard
checks the wrong side. Two reviews, two different version of the same failure — surface exists,
interface hides it.

## Round 3 — 2026-11-13

**Verdict: PASS WITH FINDINGS** — shippable, with two cosmetic Lows left.

Both Mediums are closed *by construction* rather than by fixture, which is the difference that
matters:

- **M1.** Bands are cut by occupied projections and assigned by rank. For any accepted recipe,
  `bands ≤ occupiedCount` means the bucket step is 0 or 1 and terminates at `bands − 1`, so every
  band holds at least one painted pixel. A missing role cannot degrade silently — `roleSlot`
  returns `undefined` and the op raises `E_NO_RAMP`. There is no remaining path to fewer than
  N−1 transitions short of a hard error, so AC-12 is unconditional without a qualifier in the
  spec.
- **M2.** Radius 2 is justified as the *minimum* rather than a guess: `BAYER_25_CUTOFF = 4` lights
  a Chebyshev-2 lattice, so radius 1 cannot clear the engine's own pattern and radius 3 would
  silence a legitimate speck 3 px from art. Fixtures pin both sides, including the boundary at
  exactly 2 apart.

All five Lows are fixed. L5 earned its keep immediately: the reverse check surfaced four
parameter declarations that were wired but never published.

**Two Lows remain**, both recorded rather than fixed in round 3:

| ID | Finding | Disposition |
| --- | --- | --- |
| F1 | At `occupiedCount === 1` the hint says "pass bands 1 or fewer", but `bands < 2` is rejected with `E_BANDS_RANGE` — an impossible remedy in agent-facing text. | Fixed in R3.T1 |
| F2 | `verification/phase-R2.md` claims "all four light directions" while `bottom-right` is untested. | Fixed in R3.T2 |

### Override: a third fix round

`workflow.md` caps review-fix rounds at two. This track ran three, by explicit decision, and the
reasoning is recorded here rather than left implicit:

- Both remaining items are small, non-design changes to agent-facing text and test
  parametrisation — a hint string and a loop over four values.
- One is correctness-adjacent: a hint that tells an agent to pass a value the validator rejects
  costs that agent a wasted call and teaches it something false about the contract.
- Neither touches behaviour, a contract, a threshold, or a rendered byte; goldens are unaffected
  by construction.
- The alternative — shipping with a false remedy in the error text and an overstated evidence
  file — would have been cheaper and worse.

The cap exists to stop open-ended churn, not to force a shipment with known-wrong text.

### Outstanding

~~AC-14 and AC-22 are still unproven: both need the CI matrix (ubuntu-latest,
windows-latest) on this branch, which has never been pushed.~~ **Proven.** Both jobs passed on
`4a8c734`, including the determinism step on `windows-latest` reproducing the committed golden
digests.

## Post-review — the first push failed, and why it counts

The first CI run on this branch failed, on `windows-latest` only. Not the tests — the *lint*:

```
biome.json  format  ━━━━━━━━━━
  2  │ - "$schema": "https://biomejs.dev/schemas/2.6.7/schema.json",␍
     │ + "$schema": "https://biomejs.dev/schemas/2.6.7/schema.json",
```

Every source file had been checked out CRLF on Windows, because `git` on Windows defaults to
`core.autocrlf=true` and the repository declared nothing. Linux checked out LF and passed. The
later steps in the Windows job were skipped rather than broken, which is why the run's step list
looked worse than the single real fault.

Fixed at the source rather than per-file: `.gitattributes` with `* text=auto eol=lf`, and `*.png
binary` so rendered artifacts and their digests are never translated. Committed as `4a8c734`;
both runners then passed.

This is worth recording because it is the one class of defect none of the thirteen review
findings could have caught, and none of the local gates could either: **local Windows had
`core.autocrlf=false`, so the developer machine was LF and green while every fresh Windows clone
would have been CRLF and red.** The CI matrix exists precisely to observe a checkout the
developer never sees, and it earned its place on the first run.

A repository whose product guarantee is byte identity had not pinned its own line endings. That
is the same mistake as the exit codes, one layer down: a contract assumed rather than encoded.
