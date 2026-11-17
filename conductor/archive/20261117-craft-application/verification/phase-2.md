# Phase 2 — Apply validated levers and re-score the gate

**Track:** 20261117-craft-application
**Phase:** 2
**Branch:** feat/20261117-craft-application (phase base 0a861690b86efa53e64ae7addfd32dc702c94038)
**Result:** `verified` — authoring, rendering, digests, integrity checks and all 14
credentialed scoring passes are complete. The scorer-recomputed gate verdict is
**fail** (mean 3.67 clears 3.5, but 3 below-floor criterion scores remain: humanoid A/B
lighting=2, scene A lighting=2). The floor clause binds, not the mean. A fail verdict
does not fail this phase; Phase 3 owns the gate decision.

**Instrument of record:** the frozen `gemini-4-hydrogen` exhausted its free-tier daily
quota (HTTP 429 `RESOURCE_EXHAUSTED`, 20 requests/day, reset ~18h43m). The USER
explicitly authorized switching the instrument of record to `gemini-3.5-flash-lite`
("New instrument of record" option). All 14 passes were scored on flash-lite with
retry/backoff for transient non-JSON replies; per-pass `model` fields are machine-written
as `gemini-3.5-flash-lite`. Scores are not comparable to the gemini-4-hydrogen baseline.

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
| 5 | `pnpm verify` | 0 | typecheck, lint, 119 test files / 1028 tests passed, build green; single pre-existing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (known/acceptable) — re-run green on 2026-11-18 after the guard edit |
| 6 | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 (primary) | scoped 80% coverage gate exit 0 — statements 94.97%, branches 85.69%, functions 98.33%, lines 94.77%; 116 files / 996 tests. My own re-run was shell-denied; primary's recorded result stands. |
| 7 | `node scripts/rubric-report.mjs` | n/a | primary ran the 14 scorer calls and recorded the verdict directly in `test/art/scores.json` (schema 3 / 14 passes / verdict `fail` mean 3.67 / 3 failures); no separate report command needed |
| 8 | edit `test/art/rubric.test.ts` lines 205/207 | 0 | guard updated: `instrument.model` expects `gemini-3.5-flash-lite`, `fallback_used` expects `true`; lines 206 (`fallback_model`) and 212 (date `2026-11-17`) left unchanged |
| 9–22 | 14 × `node scripts/rubric.mjs --asset <a> --pass <A\|B> ... --model gemini-3.5-flash-lite --replace` | 0 (primary) | all 14 passes scored on the promoted instrument of record; exact commands in "Scoring commands" below (originally listed with gemini-4-hydrogen, executed with gemini-3.5-flash-lite after the user-authorized switch) |

## Acceptance-criteria table

| AC | Requirement | Status |
|---|---|---|
| AC-2 | Each lever tied to a Phase-1 measured ≥3 score | **done** — `verification/lever-selection.md` maps all six assets' failing criteria to L's measured `5/4 / 4/3 / 5/4`; H (edge 2 on A) and E (refuted) recorded |
| AC-3 | All 14 passes re-scored on the instrument of record | **done** — 14 passes scored by `scripts/rubric.mjs` on `gemini-3.5-flash-lite` (user-authorized promotion from the quota-exhausted `gemini-4-hydrogen`). Full score table below; all per-pass `model` fields machine-written |
| AC-4 | Gate verdict recomputed honestly from fresh scores | **done** — scorer wrote `test/art/scores.json`: result `fail`, mean **3.67** (≥3.5), **3 below-floor** scores (humanoid A/B lighting=2, scene A lighting=2). Floor clause binds. Fail verdict recorded honestly; Phase 3 owns gate decision |
| AC-5 | Untouched assets byte-identical | **done** — `verification/asset-digests.md`; humanoid 1x digest unchanged `fc6be134…732f`, no humanoid v2 or v1 original modified, asserted by passing `assets-v2.test.ts` |
| AC-6 | `pnpm verify` and scoped coverage green | **done** — `pnpm verify` green (1028 tests); scoped coverage gate exit 0, all four metrics >80% (primary's recorded result) |
| FR-4 | Lever applied to every below-floor asset | **done** — six assets including prop (plan omission corrected per FR-4) |
| FR-5 | Re-score via scorer only | **done** — all 14 passes scored by `scripts/rubric.mjs`; criterion scores and rationales machine-written, no hand-edit or reroll |
| FR-7 | Untouched digests verified | **done** — see AC-5 |
| NFR-2 | scores.json machine-generated only | **done, with recorded deviation** — criterion scores/rationales machine-written by the scorer; primary changed METADATA only (instrument fields + verdict.note) to record the user-authorized instrument switch honestly. No score, rationale, or below-floor finding hand-edited |
| NFR-3 | No new deps, recipes < ~2000 ops | **done** — no dependency change; op counts unchanged apart from one added light op and removed harmonize |
| NFR-4 | verify + 80% coverage green | **done** — see AC-6 |

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
3. The scoped coverage command (`pnpm exec vitest run --coverage …`) was shell-denied
   for this subagent on both attempts; no workaround was attempted. The primary had
   already run the identical command with exit 0 and recorded all four coverage metrics
   (94.97/85.69/98.33/94.77%, all >80%). AC-6/NFR-4 are therefore satisfied by the
   primary's recorded green run.
4. **Instrument of record switched with explicit user authorization.** The frozen
   `gemini-4-hydrogen` hit its free-tier daily quota (429 `RESOURCE_EXHAUSTED`,
   retryDelay ~67427s / 18h43m) mid-campaign; the USER chose "New instrument of record"
   and all 14 passes were re-run on `gemini-3.5-flash-lite`. The primary edited only
   `test/art/scores.json` METADATA (`scored_by`, `instrument.model`,
   `instrument.fallback_model`, `instrument.fallback_used`, `instrument.note`,
   `verdict.note`) to record this honestly — no criterion score, rationale, or
   below-floor finding was hand-edited, and the date (`2026-11-17`) and schema (3) are
   unchanged. `test/art/rubric.test.ts` guard lines 205/207 were updated to assert the
   new honest truth (model `gemini-3.5-flash-lite`, `fallback_used: true`); this is a
   truth-assertion update, not a weakened check.
5. Temporary artifact-authoring scripts were written under `.conductor/evidence/art-v2/gen/`
   (gitignored evidence area); they are not inputs to the build or tests. No file
   outside Touches was modified in tracked source.

## Scoring commands (primary-run)

The 14 scoring commands below mirror the brief's exact commands, executed by the primary
with `--model gemini-3.5-flash-lite` after the user-authorized instrument-of-record
switch (the originally briefed model was `gemini-4-hydrogen`). Each writes
`test/art/scores.json` via `--replace`; the scorer recomputes the verdict.

```
node scripts/rubric.mjs --asset potion --pass A --artifact .conductor/evidence/art-v2/potion.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application potion A"
node scripts/rubric.mjs --asset potion --pass B --artifact .conductor/evidence/art-v2/potion.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application potion B"
node scripts/rubric.mjs --asset sword --pass A --artifact .conductor/evidence/art-v2/sword.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application sword A"
node scripts/rubric.mjs --asset sword --pass B --artifact .conductor/evidence/art-v2/sword.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application sword B"
node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application humanoid A"
node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application humanoid B"
node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/art-v2/chest.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application chest A"
node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/art-v2/chest.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application chest B"
node scripts/rubric.mjs --asset character --pass A --artifact .conductor/evidence/art-v2/character.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application character A"
node scripts/rubric.mjs --asset character --pass B --artifact .conductor/evidence/art-v2/character.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application character B"
node scripts/rubric.mjs --asset prop --pass A --artifact .conductor/evidence/art-v2/prop.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application prop A"
node scripts/rubric.mjs --asset prop --pass B --artifact .conductor/evidence/art-v2/prop.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application prop B"
node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-3.5-flash-lite --replace --note "craft-application scene A"
node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-3.5-flash-lite --replace --note "craft-application scene B"
```

## 14-pass scores (instrument of record: gemini-3.5-flash-lite)

Criterion order = silhouette / value_separation / lighting / edge_language /
cluster_discipline / palette_craft. Values verified against `test/art/scores.json`.

| Asset | Pass | silhouette | value_sep | lighting | edge_lang | cluster | palette |
|---|---|---|---|---|---|---|---|
| potion | A | 5 | 4 | 3 | 3 | 4 | 3 |
| potion | B | 5 | 4 | 4 | 4 | 5 | 4 |
| sword | A | 5 | 3 | 3 | 3 | 3 | 3 |
| sword | B | 5 | 4 | 3 | 3 | 4 | 3 |
| humanoid | A | 4 | 3 | **2** | 3 | 4 | 3 |
| humanoid | B | 4 | 3 | **2** | 3 | 4 | 3 |
| chest | A | 5 | 4 | 4 | 4 | 5 | 4 |
| chest | B | 5 | 4 | 4 | 4 | 5 | 4 |
| character | A | 5 | 4 | 3 | 3 | 4 | 3 |
| character | B | 4 | 3 | 3 | 3 | 4 | 3 |
| prop | A | 5 | 4 | 3 | 3 | 4 | 3 |
| prop | B | 5 | 4 | 3 | 4 | 5 | 4 |
| scene | A | 5 | 3 | **2** | 3 | 3 | 3 |
| scene | B | 5 | 3 | 3 | 3 | 3 | 3 |

**Scorer-recomputed verdict:** result `fail`, mean **3.67** (threshold 3.5, min allowed
3), 3 below-floor scores: `humanoid A lighting=2`, `humanoid B lighting=2`,
`scene A lighting=2`. Compared with the gemini-4-hydrogen baseline (mean 3.25, 22
below-floor) only directionally — scores do not transfer across instruments. All
criterion scores and rationales were machine-written by the scorer; no below-floor
finding was removed or revised upward.

## Primary verification (conductor-implement)

- **Date:** 2026-11-18
- **Tree:** clean at start of primary checks; 15 tracked files changed vs phase base
  `0a861690`, all within Touches (six `test/art/v2/**/*.px.json` + six sidecars,
  three `verification/*.md`).
- **Artifact faithfulness (independent re-render):** all seven recipes were
  re-rendered in isolated temp workspaces (recipe + root `px.style.json`). Every
  fresh 1x digest matched its committed `.sha256` sidecar and every `.8x.png`
  matched the digest recorded in `asset-digests.md` — 7/7 `OK`. The artifacts to be
  scored are faithful to the re-authored recipes, not stale.
- **AC-6 / NFR-4:** scoped coverage gate
  `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`
  exit 0 — statements 94.97%, branches 85.69%, functions 98.33%, lines 94.77%
  (all > 80%); scoped run 116 files / 996 tests passed. `pnpm verify` exit 0
  (1028 tests) confirmed by subagent. **PASS.**
- **AC-3 / AC-4 — RESOLVED:** the frozen `gemini-4-hydrogen` hit its free-tier daily
  quota (429 `RESOURCE_EXHAUSTED`, 20/day, reset ~18h43m) mid-campaign. The USER
  explicitly authorized switching the instrument of record to `gemini-3.5-flash-lite`.
  All 14 passes were then scored by `scripts/rubric.mjs` on the promoted instrument
  (retry/backoff for transient non-JSON replies), machine-writing criterion scores,
  rationales and per-pass `model` fields. The primary edited METADATA only to record
  the switch honestly; no criterion score or rationale was hand-edited. Schema is 3,
  the date is unchanged (`2026-11-17`), 14 passes are present, and the verdict was
  recomputed by the scorer: **fail, mean 3.67, 3 below-floor** (humanoid A/B lighting=2,
  scene A lighting=2). `test/art/rubric.test.ts` guard lines 205/207 now assert the
  new instrument truth and `pnpm verify` is green (1028 tests).
- **Result:** `verified` — all authoring, rendering, digest, coverage, integrity and
  14-pass scoring work is complete. The gate verdict remains `fail` honestly (floor
  clause binds); Phase 3 owns the gate decision, not this phase.
