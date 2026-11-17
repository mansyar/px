# Review — 20261117-authoritative-design-intent

## Round 1

Range: `77de1e56d5c88c976a13f43d9677b22addaa09d6..HEAD`
Verdict: **BLOCK** — 1 High, 1 Low.

All 44 FR/NFR/AC IDs were walked against code and tests. Authoritative semantics,
harmonize's tone-only writes, no-write brief/views, critique fix applyability, MCP
parity and score integrity were confirmed sound. AC-14 is recorded as failed and was
not treated as a finding; the instrument, views, anchors and bar are unchanged, and
the pre-track record is preserved byte-for-byte.

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| F1 | High | The coverage `include` list was never enlarged, so `src/brief/**`, `src/critique/**` and `src/render/views.ts` are absent from coverage while AC-17/NFR-3, `plan.md` and `phase-4.md` claim the opposite. The gate passes only because the new modules are not measured. | R1.T1 — add the modules, add real tests to reach 80% statements **and** branches, correct the claims |
| F2 | Low | `edge_language` fix rationale names `harmonize`, but the emitted op is `auto_outline`. | R1.T2 — make the rationale name the op actually applied |

Checks run by the reviewer: `pnpm verify` exit 0, `pnpm vitest run --coverage` exit 0
(on the too-narrow include list), goldens+smoke exit 0, digest and dependency diffs
clean. The reviewer's three `needs` commands were run by the primary: `27d7a2a`,
`758fa53` and `b90cd20` each contain both the CLI verb and `src/mcp/tools.ts`, so
FR-14's same-commit parity requirement holds.

What this review caught that six phase gates did not: a green coverage number can be
true of the measured files and still false as evidence. Each phase wrote its own
"Coverage" line from the same unchanged include list, so the claim "enlarged include
list" in P6.T2.2 was never checked against `vitest.config.ts`. AC-17 was satisfied by
arithmetic, not by scope.
