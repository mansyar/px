# Surface Resolution — Review

- **Track:** `20261113-surface-resolution`
- **Branch:** `feat/20261113-surface-resolution` → `feat/20261113-surface-fidelity`
- **Reviewer:** single-agent review (no separate reviewer subagent available)
- **Round:** 1
- **Verdict:** **changes requested** — the engine work is sound, the phase-5 bar is not met

## Summary

Four of five phases verified: `light` bands and part selection, `auto_outline`
seam, tone-valued ramp roles, and the ordered `"1.3"` gate. Phase 5 applied those
controls to the assets, re-baselined every digest with a reason, and re-scored all
seven at **3.71** against a 4.0 bar. Nothing was lowered to make it pass.

## Findings

### High

**H1 — AC-8 not met.** Fourteen independent passes score mean 3.71; `scene` pass A
records `cluster_discipline` 2, so the "no criterion below 3" floor is also
missed. Evidence: `verification/phase-5.md`, `test/art/scores.json`.

**H2 — AC-9 not met.** `lighting` and `edge_language` were required to rise by 0.6
(3.14 and 3.36). Neither moved outside noise: `lighting` remained 3 on every
asset, `edge_language` remained 3 and fell to 2 on the scene's plain view. The
phase's own hypothesis — that the engine gap was the cause — is therefore
falsified by its own measurement, which is recorded rather than papered over.

### Medium

**M1 — the scene's lighting was not addressed.** The plan's first task was to give
the wall drum real bands and restore a lit mouth. `form: "round"` raised
`PILLOW_SHADE` on the wall, so the scene kept `bevel`; a later experiment
(`form: "round"`, `bands: 3`, `ao: false`) rendered clean and still scored
`lighting` 3, and was not adopted. The scene remains unlit and the phase's largest
intended win did not happen.

**M2 — dead validation loop.** The pre-existing 1.2 gate still contains a copy of
the undeclared-part check that is unreachable, because the always-on check runs
first. Recorded in `verification/phase-4.md`; not fixed here.

### Low

**L1 — option naming deviation.** The spec called the interior edge option `inner`;
it shipped as `seam` because `auto_outline` already has `where: "inner"`. Documented
in the phase evidence.

**L2 — four bands share a role.** `bands: 4` paints both middle bands as `base`
until tone-valued roles are used by the art; no asset uses four bands, and the
limit is pinned by a test.

## Checks run

| Check | Result |
| --- | --- |
| `pnpm verify` | exit 0 (typecheck, biome, tests, build) |
| `pnpm vitest run test/art/assets.test.ts` | 28 passed |
| `pnpm vitest run test/art/rubric.test.ts` | 10 passed, verdict recomputed |
| New tests | bands 6, part selection 4, seam 4, 1.3 gate 8 |
| Thresholds | untouched — coverage 80, rubric bar 4.0 |

## What is worth keeping

The engine half is additive and gated: with no new options, every pre-track digest
is byte-identical, which is asserted in tests and by `assets.test.ts`. `bands`,
`parts`/`skip`, `seam` and tone-valued roles are each independently tested,
including their error paths, and the 1.3 gate is ordered so 1.2 features keep
working in 1.3 documents.

## Required before merge

1. Decide whether a 3.71 track merges with AC-8/AC-9 open, or waits for art work
   that reaches the bar. This review does not assume either.
2. Either fix M2 or file it as tracked debt.
3. The stacked base (`feat/20261113-surface-fidelity`) must merge first or be
   retargeted; its own review is separate.

## Merge decision

**Owner decision, 2026-11-13:** merged as-is with **AC-8 and AC-9 recorded as
open**. The engine work is additive, gated at 1.3 and digest-invariant when the new
options are absent; the 3.71 score is carried as documented debt. M1 (the unlit
scene) and M2 (the dead 1.2 loop) remain open.

## Note on process

This review was performed by the same agent that implemented the track, because no
independent reviewer subagent is configured in this workspace. Findings H1 and H2
come from the instrument, not from the author's judgement, which is the only
reason a self-review is defensible here.
