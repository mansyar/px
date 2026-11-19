# Godot 4 Export Validation — Decision Record

- Track: `20261119-godot-export-validation` — Godot 4 Export Validation
- Phase: 2 — Honest decision record
- Date: 2026-11-19
- Branch: `chore/20261119-godot-export-validation`
- Phase base: `9c4b3c8bc224064023d5c4e5d24c3c6d01f76bfc`
- Covers: FR-6, NFR-1, NFR-4, NFR-5, AC-5, AC-8
- Source evidence: `verification/godot-validation.md`, `verification/phase-1.md` (Phase 1 checkpoint `18004de1f669c989945aea52c7ad85960987ef9f`)

## Result

**verified** — the decision is **PASS**: "Godot export contract verified in real Godot 4.7.2"; no product change. The decision is derived from the authoritative Phase 1 outcome, never chosen for a desired result. Every PASS condition below is satisfied by a recorded Phase 1 evidence value; no assertion failed and no real discrepancy was observed, so no follow-up issue is required.

## Decision derivation

PASS is recorded only because every condition in the fixed decision logic holds. Each row cites the exact Phase 1 evidence value.

| # | PASS condition | Required | Recorded evidence value | Source | Met |
| --- | --- | --- | --- | --- | --- |
| D1 | Godot headless script exits 0 | exit `0` | V1c final run exit `0` | `godot-validation.md` §1c / table row V1c; `phase-1.md` commands table | **YES** |
| D2 | Every `ASSERT` line is `PASS` | all five `result=PASS` | `texture_loaded`, `texture_path`, `filter_centered`, `offset_origin`, `anchor_transform` all `result=PASS` | `godot-validation.md` §1c (verbatim stdout) and §4 assertion table | **YES** |
| D3 | `GODOT_VALIDATION=PASS` | literal line present | `GODOT_VALIDATION=PASS` printed; stderr empty | `godot-validation.md` §1c | **YES** |
| D4 | PNG hash unchanged after import | equal to golden before and after import | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` before and after V1c, equal to `test/goldens/fixtures/hero.sha256` | `godot-validation.md` §1 (E3/V2), §3, §4; `phase-1.md` golden hash results | **YES** |
| D5 | Exported metadata deep-equals `buildMetadata` | deep-equal `true` | `buildMetadata(parseRecipe(fixture).recipe, compileRecipe(...), 'hero.png')` deep-equal to exported `hero.meta.json`: **true** | `godot-validation.md` table row E4 / §1 | **YES** |

All five conditions are met → **PASS**. No condition is inferred from a failed or partial run.

## Godot version, command and exit

- Godot version: `4.7.2.stable.mono.official.ed1daf0bf` (local binary `C:\Godot\godot.exe`; headless, no download/install/network). Source: E5, `godot-validation.md` §2.
- Final validation command (primary-run): `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` (stdout/stderr redirected to files under the project dir).
- Exit code: `0`. Stderr: empty. Source: `godot-validation.md` §1c.

## In-engine assertion table (final run V1c)

Verbatim from `godot-validation.md` §1c; all five assertions PASS and the final marker is present.

| ID | Observed (Godot stdout) | Result |
| --- | --- | --- |
| `texture_loaded` | `null=false width=16 height=16 expected=16x16 trim=[4,4,8,8]` | **PASS** |
| `texture_path` | `texture_path=hero.png expected=hero.png` | **PASS** |
| `filter_centered` | `filter=false centered=false expected=false/false` | **PASS** |
| `offset_origin` | `offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4] expected=[-4,-4]` | **PASS** |
| `anchor_transform` | `pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true` | **PASS** |
| `final` | `GODOT_VALIDATION=PASS` | **PASS** |

## Hashes (transcribed verbatim from Phase 1)

| Artifact | SHA-256 |
| --- | --- |
| Exported / project-copy PNG; committed golden `hero.sha256` (post-import unchanged) | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` |
| Exported `hero.meta.json` (post-import unchanged) | `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068` |
| `generic.recipe_hash` | `sha256:49d77ab086c4e6c2a8a68c5d79851ec22b463e1d63496c42e340d7bb76401c41` |
| `test/art/scores.json` (E6 / post-run unchanged) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |

No `.import/` cache was created after any run. Source: `godot-validation.md` §3.

## Earlier failed runs — not product defects, no follow-up

Two earlier Godot executions failed and are recorded in Phase 1 evidence as resolved validator drafting defects, not product, export, metadata or anchor-contract defects:

- **V1a** (exit 1): GDScript parse-time type-inference errors at `validate.gd` lines 37, 38 and 109; no `ASSERT` line emitted. Fixed by adding explicit types (`meta: Variant`, `recipe: Variant`, `pivot_ok: bool`). See `godot-validation.md` §1a.
- **V1b** (exit 1): `texture_loaded` expected 8×8 but the exported PNG is the full 16×16 canvas (`generic.canvas`); fixed by deriving expected dimensions from `generic.canvas`. No other assertion result is inferred from V1b. See `godot-validation.md` §1b.

Neither run contributes an assertion result; V1c supplied the final all-PASS results. No re-roll or fishing for a favorable result occurred, and neither failure requires a follow-up issue.

## Limitations (recorded, not passes)

- Only Godot `4.7.2.stable.mono` is exercised; no cross-version claim.
- Empty trim (no offset) is not exercised by hero; that case is untested, not passed.
- Headless script only; GUI editor import and on-disk `.import` texture settings are outside scope.
- The validator checks the metadata contract and image dimensions against the copied files; it does not check pixel colours or re-run `render --export` inside Godot.
- Full E1/E2 stdout envelope text was not supplied by the primary; recorded digests are transcribed verbatim.

These are limitations of scope, not discrepancies. No follow-up issue is required.

## Follow-up

**None.** No assertion failed and no real discrepancy was observed. A genuine engine/metadata defect, were one found, would require a separate track; this track stays evidence-only and makes no engine, metadata, score, recipe, golden or product change.

## Acceptance criteria (Phase 2 decision scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | Decision honestly recorded as PASS from green assertions and integrity checks, with no engine or metadata change. | Decision derivation D1–D5 above; §§Earlier failed runs, Follow-up. | **done (PASS)** |
| AC-8 | Evidence docs contain exact commands, exit codes, Godot version, hashes and artifact paths. | This file §§Godot version/command/exit, Hashes, assertion table; `godot-validation.md` §§1–1c, 2–3, 5; `phase-1.md` commands table. | **done (PASS)** |

AC-6 and AC-7 are Phase 3 scope and are not claimed here.
