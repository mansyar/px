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

## Round 2

Range: `77de1e56d5c88c976a13f43d9677b22addaa09d6..HEAD`, emphasis on `7bc868d`
(`git diff 020f544..7bc868d`). Verdict: **PASS** — no findings.

F1 closed at the cause: `vitest.config.ts` now includes `src/brief/**`,
`src/critique/**` and `src/render/views.ts` in coverage with all four 80%
thresholds unchanged, no `exclude` field and no ignore comment. Each new file
clears both metrics with behavioural tests: `brief/templates.ts` 92.85/81.25,
`critique/index.ts` 97.93/89.55, `render/views.ts` 100/81.81. The stale
`phase-4.md:71` claim was corrected to name the historical exclusion and its
fix rather than deleting the disagreeing line. F2 closed: the `edge_language`
rationale names the emitted `auto_outline` pass and a test asserts it does not
say `harmonize`.

No regressions: authoritative defaults, tone-only harmonize, no-write views,
applyable and stale-checked fixes, eleven MCP tools with bidirectional
reachability, one runtime dependency, no network import, and all digests and
the score record untouched. AC-14 remains a recorded, directive-accepted
failure (mean 3.39) and is not a review block.

Checks: `pnpm verify` pass (119 files / 1024 tests), coverage pass (95.09%
statements / 85.89% branches), goldens+smoke pass (11 tests), and the fix-round
diff over `test/goldens test/benchmarks test/art` is empty. The reviewer's only
`needs` item was a denied `git rev-parse HEAD`; HEAD was recovered from
`git log` and required no action.

Shippable from the code-review standpoint. The quality criterion is a separate,
honestly recorded product result and is addressed by a follow-on track.
