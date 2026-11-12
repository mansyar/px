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
