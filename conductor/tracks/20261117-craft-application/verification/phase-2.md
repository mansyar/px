# Phase 2 — Apply validated levers and re-score the gate

**Track:** 20261117-craft-application
**Phase:** 2
**Branch:** feat/20261117-craft-application (phase base 0a861690b86efa53e64ae7addfd32dc702c94038)
**Result:** `blocked` — authoring, rendering, digests and integrity checks are complete;
credentialed scoring of all 14 passes is reserved for the primary agent (NFR-5). Score
and gate-verdict cells below are `PENDING PRIMARY SCORING`.

## Work completed

- Applied the Phase-1 validated **L** lever to all six below-floor assets (chest,
  character, potion, prop, scene, sword): explicit warm/cool 5-stop ramps, one
  top-left bevel/AO/rim `light` op before `auto_outline`, flat `harmonize` removed.
- humanoid (zero below-floor criteria) untouched; all seven v1 originals untouched.
- Regenerated the six `.sha256` sidecars from fresh 1x `--strict` renders.
- Re-rendered faithful A/B artifacts for all seven assets (`.png`, `.8x.png`,
  `.debug.png` under `.conductor/evidence/art-v2/`), all exit 0 with no blocking findings.
- Evidence: `verification/lever-selection.md`, `verification/asset-digests.md`, this file.

## Commands table (what DID run)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `pnpm exec tsx .conductor/evidence/art-v2/gen/apply-lever.ts` | 0 | six recipes re-authored (palette ramps + one light op, harmonize dropped) |
| 2 | `pnpm exec tsx .conductor/evidence/art-v2/gen/try-derive.ts` | 0 | character/scene/sword ramps materialized via project `deriveRamp(base,5)` after hand-authored values produced blocking lint findings |
| 3 | `pnpm exec tsx .conductor/evidence/art-v2/gen/fix-sword.ts` | 0 | brass.t0 brightened, ruby ramp restored; cleared sword's t0 collision |
| 4 | `pnpm exec tsx .conductor/evidence/art-v2/gen/final-render.ts` | 0 | all 7 assets rendered `--debug --strict` (exit 0, no blocking findings), factor-8 upscaled, 6 digests regenerated, humanoid digest verified unchanged |
| 5 | `pnpm verify` | 0 | typecheck, lint, 119 test files / 1028 tests passed, build green; single pre-existing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (known/acceptable) |
| 6 | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | **denied** | shell permission denied — reported in `blockers`; primary must run the scoped 80% coverage gate |
| 7 | `node scripts/rubric-report.mjs` | not attempted | `node` denied for this subagent; reserved for primary after scoring |

## Acceptance-criteria table

| AC | Requirement | Status |
|---|---|---|
| AC-2 | Each lever tied to a Phase-1 measured ≥3 score | **done** — `verification/lever-selection.md` maps all six assets' failing criteria to L's measured `5/4 / 4/3 / 5/4`; H (edge 2 on A) and E (refuted) recorded |
| AC-3 | All 14 passes re-scored on frozen instrument | **PENDING PRIMARY SCORING** — 14 commands in the table below; artifacts ready |
| AC-4 | Gate verdict recomputed honestly from fresh scores | **PENDING PRIMARY SCORING** — scorer writes scores.json and recomputes verdict |
| AC-5 | Untouched assets byte-identical | **done** — `verification/asset-digests.md`; humanoid 1x digest unchanged `fc6be134…732f`, no humanoid v2 or v1 original modified, asserted by passing `assets-v2.test.ts` |
| AC-6 | `pnpm verify` and scoped coverage green | **partial** — `pnpm verify` green (1028 tests); scoped coverage command denied by shell → blocker for primary |
| FR-4 | Lever applied to every below-floor asset | **done** — six assets including prop (plan omission corrected per FR-4) |
| FR-5 | Re-score via scorer only | **PENDING PRIMARY SCORING** |
| FR-7 | Untouched digests verified | **done** — see AC-5 |
| NFR-2 | scores.json machine-generated only | **done** — no score file edited by this phase |
| NFR-3 | No new deps, recipes < ~2000 ops | **done** — no dependency change; op counts unchanged apart from one added light op and removed harmonize |
| NFR-4 | verify + 80% coverage green | **partial** — see AC-6 |

## Deviations

1. `character`, `scene`, `sword` ramps were initially hand-authored in the chest-L
   palette style; three of these produced blocking strict-render lint findings
   (VALUE_COLLISION / SILHOUETTE_LOSS / LOW_CONTRAST). They were re-materialized from
   the project's own `deriveRamp(base, 5)` using each original derive base — the same
   warm-highlight/cool-shadow stepping — which renders strict-clean. Sword needed two
   small manual tone adjustments (brass.t0 brightened to clear a t0 plane collision;
   ruby restored from a near-black derive to a legible dark-red ramp). This stays
   within the validated L lever and Touches.
2. `prop` was re-authored even though plan P2.T2.1 omitted it, because FR-4 requires
   every below-floor asset and prop scored lighting 2/2 on both passes.
3. The scoped coverage command (`pnpm exec vitest run --coverage …`) was denied by the
   shell; no workaround was attempted. Recorded as a blocker for the primary.
4. Temporary artifact-authoring scripts were written under `.conductor/evidence/art-v2/gen/`
   (gitignored evidence area); they are not inputs to the build or tests. No file
   outside Touches was modified in tracked source.

## Scoring commands (primary-only, exact)

Run these in order on the frozen instrument `gemini-4-hydrogen`. Each writes
`test/art/scores.json` via `--replace`; the scorer recomputes the verdict.

```
node scripts/rubric.mjs --asset potion --pass A --artifact .conductor/evidence/art-v2/potion.8x.png --model gemini-4-hydrogen --replace --note "craft-application potion A"
node scripts/rubric.mjs --asset potion --pass B --artifact .conductor/evidence/art-v2/potion.debug.png --model gemini-4-hydrogen --replace --note "craft-application potion B"
node scripts/rubric.mjs --asset sword --pass A --artifact .conductor/evidence/art-v2/sword.8x.png --model gemini-4-hydrogen --replace --note "craft-application sword A"
node scripts/rubric.mjs --asset sword --pass B --artifact .conductor/evidence/art-v2/sword.debug.png --model gemini-4-hydrogen --replace --note "craft-application sword B"
node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-4-hydrogen --replace --note "craft-application humanoid A"
node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-4-hydrogen --replace --note "craft-application humanoid B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/art-v2/chest.8x.png --model gemini-4-hydrogen --replace --note "craft-application chest A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/art-v2/chest.debug.png --model gemini-4-hydrogen --replace --note "craft-application chest B"
node scripts/rubric.mjs --asset character --pass A --artifact .conductor/evidence/art-v2/character.8x.png --model gemini-4-hydrogen --replace --note "craft-application character A"
node scripts/rubric.mjs --asset character --pass B --artifact .conductor/evidence/art-v2/character.debug.png --model gemini-4-hydrogen --replace --note "craft-application character B"
node scripts/rubric.mjs --asset prop --pass A --artifact .conductor/evidence/art-v2/prop.8x.png --model gemini-4-hydrogen --replace --note "craft-application prop A"
node scripts/rubric.mjs --asset prop --pass B --artifact .conductor/evidence/art-v2/prop.debug.png --model gemini-4-hydrogen --replace --note "craft-application prop B"
node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-4-hydrogen --replace --note "craft-application scene A"
node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-4-hydrogen --replace --note "craft-application scene B"
```

After scoring, run `node scripts/rubric-report.mjs`, confirm schema 3 / 14 passes /
instrument unchanged / verdict recomputed, and re-invoke this phase with the results
appended under "APPENDED: primary 14-pass scoring results" to finalize AC-3/AC-4.
