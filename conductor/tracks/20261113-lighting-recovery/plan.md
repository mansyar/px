# Lighting Recovery — Implementation Plan

- **Track:** `20261113-lighting-recovery`
- **Branch:** `feat/20261113-lighting-recovery`
- **Base:** `main` at `a8e9db8`
- **Type:** feature · **Priority:** high

## Approach

Four phases, ordered so each one is measured once and attributable to one cause:
ramps first (cheapest, affects every asset), then lighting (the largest
shortfall), then edge discipline and value steps (both are drawing conventions),
then a single re-score that judges the gate. No phase touches the engine.

## Phase 1: Derived Ramps

- **Goal:** the six redrawn assets carry hue-shifted derived ramps, with geometry
  unchanged and every digest re-baselined deliberately.
- **Depends on:** none
- **Covers:** FR-1, FR-9, AC-2, AC-7, AC-8
- **Touches:** `test/art/{potion,sword,humanoid,chest,character,scene}/*`
- **Verification:** `pnpm exec tsx src/cli.ts render --file <recipe> --strict` per
  asset, then `pnpm vitest run test/art/assets.test.ts`
- **Status:** in_progress

- [ ] **P1.T1: Audit the six palettes** — covers: FR-1
  - [ ] P1.T1.1: Record each family's tone count, hue direction and which
        families are still explicit hex roles.
- [ ] **P1.T2: Derive ramps for potion, sword and humanoid** — covers: FR-1
- [ ] **P1.T3: Derive ramps for chest, character and scene** — covers: FR-1
- [ ] **P1.T4: Re-baseline and document** — covers: AC-8
  - [ ] P1.T4.1: Render each asset `--strict`, write its digest.
  - [ ] P1.T4.2: Record the palette change and its reason in each design note.

## Phase 2: Lighting

- **Goal:** every asset reads as lit by one direction, and the scene's roof no
  longer splits at the ridge.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, AC-1, AC-6
- **Touches:** `test/art/{potion,sword,humanoid,chest,character,scene}/*`,
  `.conductor/evidence/`
- **Verification:** strict renders and the assets test, plus the interim probe
  logs; AC-6 is checked against the extracted `why` text.
- **Status:** pending

- [ ] **P2.T1: Scene roof under one light** — covers: FR-2
  - [ ] P2.T1.1: Continue a single gradient across both planes; express
        orientation as a value offset, not a seam at `x = 128`.
- [ ] **P2.T2: Chest front face gradient** — covers: FR-3
- [ ] **P2.T3: Humanoid and character torso shading** — covers: FR-4
- [ ] **P2.T4: Potion liquid depth** — covers: FR-5
- [ ] **P2.T5: Interim probe** — covers: AC-1, AC-6
  - [ ] P2.T5.1: Score scene and chest, both passes (4 calls), and record the
        `lighting` reasons before continuing.

## Phase 3: Edge Discipline and Value Ladder

- **Goal:** interior detail edges have one deliberate treatment, and adjacent
  materials are separated by at least 0.12 luminance where the floor allows.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-7, AC-3, AC-4
- **Touches:** `test/art/{potion,sword,humanoid,chest,character,scene}/*`
- **Verification:** strict renders, assets test, and a luminance-step report over
  each recipe's part adjacency
- **Status:** pending

- [ ] **P3.T1: Apply the detail-edge convention to potion, sword and chest** —
      covers: FR-6
- [ ] **P3.T2: Apply it to humanoid, character and scene** — covers: FR-6
- [ ] **P3.T3: Raise adjacency steps to 0.12** — covers: FR-7
  - [ ] P3.T3.1: Where the silhouette floor forbids it, record the pair and keep
        the floor.
- [ ] **P3.T4: Re-baseline and document** — covers: AC-8

## Phase 4: Re-score and Verdict

- **Goal:** all fourteen passes are recorded against the approved gate, and the
  result — pass or recorded failure — is written down.
- **Depends on:** Phase 3
- **Covers:** FR-8, FR-10, AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-9, AC-10
- **Touches:** `test/art/scores.json`, `test/art/*/*.design.md`,
  `conductor/tracks/20261113-lighting-recovery/verification/`
- **Verification:** `pnpm verify`, `pnpm vitest run test/art/rubric.test.ts`, the
  report output, and a prop digest comparison
- **Status:** pending

- [ ] **P4.T1: Regenerate artifacts and run 14 passes** — covers: FR-8
  - [ ] P4.T1.1: Retry at most four times on a non-JSON reply; never write a
        partial pass.
- [ ] **P4.T2: Review the reasoning** — covers: AC-6, AC-7
  - [ ] P4.T2.1: `pnpm rubric:report --below 4`; check the scene's lighting text
        and the palette text per asset.
- [ ] **P4.T3: Apply the gate** — covers: AC-5
  - [ ] P4.T3.1: Record each criterion mean against its target; on a miss, write
        the failure and stop — no further art edits in this track.
- [ ] **P4.T4: Evidence** — covers: AC-9, AC-10
  - [ ] P4.T4.1: Write `verification/phase-4.md`, including the prop digest
        comparison as the noise control.

## Verification Strategy

Each phase runs its own command from the workflow's configured layers, then
`pnpm verify` at acceptance (`static`, `unit`, `integration`, `smoke`,
`determinism`). Scoring runs only where the plan says so: four calls in Phase 2,
fourteen in Phase 4.

## Evidence

Phase reports go to `conductor/tracks/20261113-lighting-recovery/verification/`
and are committed. Rendered PNGs, 8x upscales, probe logs and the report output go
to `.conductor/evidence/`, which is gitignored.

## Risks

- **Noise.** A criterion that moves less than 0.33 cannot be distinguished from
  drift; the prop control is measured in the same run to say so explicitly.
- **Over-bright palettes.** The 1.5:1 silhouette floor rules out mid-greys, so the
  0.12 adjacency target may be unreachable for some pairs; those are recorded.
- **Churn.** Three rounds of art have moved the mean 3.71 → 3.69. If the targets
  are missed, this track records the failure and stops rather than iterating.
