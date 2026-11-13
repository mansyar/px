# Phase 2 — Plane Ownership

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 2 — Plane Ownership
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `433f2a9` (Phase 1 accepted)
- **Head:** recorded in the phase checkpoint

## Result

**verified with an amendment** — two adjacent planes of one material no longer
collide when they wear different tones, a genuine collision still reports once,
and the seam-by-construction idiom is enforced by a fixture. FR-5/AC-5 were
withdrawn by the owner before implementation and replaced by FR-20/AC-17.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/art-lint` | 0 | 80 tests, including 3 new plane cases |
| art records | `pnpm vitest run test/art` | 0 | 118 tests across art-lint + art |
| full verify (typecheck, biome, test, build) | `pnpm verify` | 0 | 833 tests, 172 files linted |

Evidence: `.conductor/evidence/phase2-verify.log`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | two facing planes of one material lint clean; the same pair with matching tones still reports | `value.test.ts` "compares the plane each part paints" and "still reports two planes that wear the same tone" | met |
| AC-6 | a colliding plane pair reports exactly one finding naming both parts | same test asserts length 1 and both names in the message | met |
| AC-17 | two facing planes with a one-pixel ridge part report no collision and compile without an overwrite warning; a ridge inside the step still reports | `value.test.ts` "accepts a seam drawn as its own part" plus the step-collision case | met |

## What changed

- `src/lint/view.ts` — `PartView` carries `facing`, so a rule can tell a plane
  from a viewer-facing part.
- `src/lint/value.ts` — a part that declares a facing is compared by the tone it
  actually paints: its dominant slot in the render. `light_dir` lives on the op,
  so the rule cannot re-derive the role; the render is the evidence. Parts without
  a facing keep the material base tone, so every earlier finding is unchanged.
- The finding message appends `(plane-resolved)` when either side's tone came from
  a plane, so an agent can tell the two comparisons apart.

## Design note: why the seam is not tolerated in the engine

The probe that motivated FR-5 was two planes writing the same pixel. The shipped
scene does not do that: the left plane ends at x=127, the right starts at x=129,
and x=128 belongs to a one-pixel ridge stroke with its own tone. A double-written
pixel is ambiguous ownership, not a legitimate ridge, so the owner withdrew the
tolerance rather than making the engine permissive where an authoring mistake is
most likely.

The fixture also pins the constraint that makes the idiom work: a ridge tone has
to clear one synthesis step from both planes. A near-black ridge sits 0.020 from
the shadow plane and correctly reports — which is why the scene gives its ridge a
distinct tone instead of the material's `outline`.

## Deviations

- **Spec amendment (owner-approved):** FR-5 and AC-5 withdrawn; FR-20 and AC-17
  added. Recorded in `spec.md` under Amendments.
- `Touches` were narrowed from `src/core/parts.ts` / `test/lint/**` to
  `src/lint/**` / `test/art-lint/**`, because the withdrawn requirement was the
  only reason to touch the compile write path. No file outside the amended
  `Touches` was modified.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | pass |
| `pnpm vitest run test/art-lint test/art` | 0 | 118 tests pass |
