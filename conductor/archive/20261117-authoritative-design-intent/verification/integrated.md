# Integrated verification — 20261117-authoritative-design-intent

Branch: `feat/20261117-authoritative-design-intent`
Base: `main @ 77de1e56d5c88c976a13f43d9677b22addaa09d6` (ancestor of HEAD: yes)
Head at verification: `d469249` (after Phase R1 and post-review doc sync)

## Gates at HEAD

| Check | Result |
|---|---|
| `pnpm verify` | exit 0 — typecheck, Biome, 119 files / 1024 tests, build |
| `pnpm vitest run --coverage` | exit 0 — statements 95.09%, branches 85.89%, functions 98.51%, lines 94.87% (80% gate, enlarged include list) |
| `pnpm vitest run --project goldens --project smoke` | exit 0 — 3 files / 11 tests |
| Production dependencies | exactly one: `@modelcontextprotocol/sdk@1.32.2` |
| Performance | 2,000 ops at 256x256 with `light` and `harmonize`: 121.4 ms median of five, budget 500 ms |
| Working tree | clean |

## Phase checkpoints

| Phase | Checkpoint | Result |
|---|---|---|
| 1 Intent Schema and Compatibility | `27d7a2a` | verified |
| 2 Intent-Driven Passes | `57a246f` | verified |
| 3 Brief and Blockout | `758fa53` | verified |
| 4 Critique and Fix | `b90cd20` | verified |
| 5 Re-authoring the Seven Assets | `bc25828` | verified |
| 6 Re-scoring, Budget and Evidence | `c888977` | delivered; **AC-14 failed** |
| R1 Review Fixes | `7bc868d` | verified — coverage scope and rationale fixed |

All seven checkpoint objects exist and are ancestors of HEAD.

## Cross-phase invariants

- Hero digest `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`
  and all four 1.0 benchmark digests are unchanged.
- Every v1 art digest and `test/art/scores-before-intent.json` is unchanged;
  the only file under `test/benchmarks/` touched by this track is
  `performance.test.ts`, which adds the heavier budget case.
- No new runtime dependency; OKLCH, intent parsing, critique and upscaling are
  hand-written or local.
- No coverage threshold lowered, no exclude widened, no `v8 ignore` added. The
  R1 fix added `src/brief/**`, `src/critique/**` and `src/render/views.ts` to
  the include list; each is above 80% statements and branches.
- All new tools (`px_brief`, `px_critique`, `px_fix`) are registered in the same
  commit as their CLI verbs, with bidirectional reachability in
  `test/mcp/reachability.test.ts`; the smoke test pins eleven MCP tools.
- No network import in `src/`; scoring remains a human-run script outside the
  build and runtime.
- Legacy 1.0 and 1.1 recipes render byte-identically; design requires 1.2 and
  is rejected with `E_BAD_VERSION` on older versions.

## Acceptance criteria

AC-1 through AC-13 and AC-15 through AC-17 are satisfied, with evidence in the
per-phase verification files. **AC-14 is not met**: the measured mean is 3.39
against the required 4.0, and eight criterion scores are below the floor of 3.
The record is `test/art/scores.json`, guarded by `test/art/rubric.test.ts`
(10/10 passing), with the pre-track record preserved in
`test/art/scores-before-intent.json`. The analysis and instrument caveat are in
`verification/phase-6-scoring.md`. No score was revised, no pass was selected,
no anchor or bar was changed, and no reroll was attempted.

## Known limitations

- The intent layer changes what the engine knows and what feedback it gives, but
  the measured art did not improve on this instrument: lighting 2.21, value
  separation 3.21 and palette craft 3.21 remain the weak criteria.
- The 4.0 exceptional tier was already calibrated unreachable in
  `docs/rubric.md`; AC-14 is therefore a deliberately hard, currently unmet
  criterion, not a paperwork target.
- Scoring used a different vision instrument from the pre-track record, so the
  3.69 → 3.39 movement is not evidence that the art regressed; it is evidence
  that the gate cannot adjudicate a 0.21 margin.
- `serialize.ts` remains the weakest file by branch coverage; no coverage was
  excluded to hide it.

## Review outcome

Round 1 returned BLOCK with one High (coverage scope) and one Low (critique
rationale). Both were fixed in `7bc868d` and round 2 returned **PASS** with no
findings. The reviewer confirmed the new modules are measured by an unlowered
gate with behavioural tests, no digest or score moved, and all 44 FR/NFR/AC IDs
are covered except AC-14, which remains an honestly recorded failure accepted
by directive rather than a review block.

Verdict: implementation, budgets and review are complete; the quality criterion
AC-14 is recorded as failed and must not be reported as passing.
