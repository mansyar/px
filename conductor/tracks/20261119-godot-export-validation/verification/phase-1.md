# Phase 1 — Export hero and validate in headless Godot

- Track: `20261119-godot-export-validation` — Godot 4 Export Validation
- Phase: 1 — Export hero and validate in headless Godot
- Date: 2026-11-19
- Branch: `chore/20261119-godot-export-validation`
- Base commit: `0e8fdb9c1c96b29991fc6385673a58e6f09707f4`
- Head at write time: `0e8fdb9c1c96b29991fc6385673a58e6f09707f4` (this evidence is recorded in the phase commit; SHA reported by the subagent)

## Result

**verified** — all Phase 1 acceptance criteria are met. The export is byte-identical to the golden, `buildMetadata` equality holds, headless Godot 4.7.2 exits 0 with all five assertions PASS, and the PNG hash is unchanged after import. The two earlier Godot failures were validator drafting defects (parse-time type inference and a stale 8×8 expectation), both resolved; no product, export, score, recipe, golden or engine change occurred.

## Commands table

| Layer / kind | Command (cwd shown where relevant) | Exit | Summary |
| --- | --- | --- | --- |
| export (strict attempt, primary) | `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export --strict` (cwd `.conductor/evidence/godot-export/export`) | 3 | `E_LINT_GATE`, pre-existing golden lint findings; PNG/meta emitted byte-identical to golden. |
| export (canonical, primary) | `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export` | 0 | Envelope sha256 `8d90…027cb`, metadata sha256 `5420…c068`, `recipe_hash` `sha256:49d77ab…c41`. |
| hash (primary) | `Get-FileHash -Algorithm SHA256 <exported PNG>` / `<project copy>` | 0 | Both `8D907415…F027CB`, equal to `hero.sha256`. |
| metadata equality (primary) | `buildMetadata(parseRecipe(fixture).recipe, compileRecipe(...), 'hero.png')` via `pnpm exec tsx` | 0 | Deep-equal to exported `hero.meta.json`: true. |
| version (primary) | `C:\Godot\godot.exe --version` | 0 | `4.7.2.stable.mono.official.ed1daf0bf`. |
| scores hash (primary) | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE080…C828D`, unchanged. |
| Godot validation V1a (primary) | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` | **1** | Failed at GDScript parse time (lines 109, 37, 38): three type-inference errors. Godot 4.7.2 banner only on stdout; no `ASSERT` line emitted. Validator parse error, not a product/export defect. Verbatim stderr in `godot-validation.md` §1a. |
| post-first-run hashes (primary) | `Get-FileHash -Algorithm SHA256` on project `hero.png`, `hero.meta.json`, `test/art/scores.json` (exact invocation not supplied) | 0 | All unchanged after the failed run: PNG `8D907415…F027CB`, meta `5420FD7A…C068`, scores `E5CCE080…C828D`; no `.import/` cache created. |
| Godot validation V1b (primary) | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` | **1** | `texture_loaded` failed: validator expected 8×8 but PNG is the full 16×16 canvas (`ASSERT … result=FAIL detail=null=false width=16 height=16 expected=8x8`, `GODOT_VALIDATION=FAIL`). Validator expectation error, not a product/export defect. Full stdout/stderr in `godot-validation.md` §1b. |
| post-V1b hashes (primary) | `Get-FileHash -Algorithm SHA256` on project `hero.png`, `hero.meta.json`, `test/art/scores.json` (exact invocation not supplied) | 0 | All unchanged after V1b: PNG `8D907415…F027CB`, meta `5420FD7A…C068`, scores `E5CCE080…C828D`; no `.import/` cache created. |
| Godot validation V1c (primary) | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` (stdout/stderr redirected to files under project dir) | **0** | All five assertions PASS, `GODOT_VALIDATION=PASS`, stderr empty. `ASSERT name=texture_loaded result=PASS detail=null=false width=16 height=16 expected=16x16 trim=[4,4,8,8]`<br>`ASSERT name=texture_path result=PASS detail=texture_path=hero.png expected=hero.png`<br>`ASSERT name=filter_centered result=PASS detail=filter=false centered=false expected=false/false`<br>`ASSERT name=offset_origin result=PASS detail=offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4] expected=[-4,-4]`<br>`ASSERT name=anchor_transform result=PASS detail=pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true`<br>`GODOT_VALIDATION=PASS`. Verbatim block in `godot-validation.md` §1c. |
| post-import hash (primary) | `Get-FileHash -Algorithm SHA256 .conductor/evidence/godot-export/project/hero.png` (after V1c) | 0 | `8D907415…F027CB` — unchanged from export and golden. Post-run meta `5420FD7A…C068` and scores `E5CCE080…C828D` also unchanged; `.import/` cache absent. |
| static + unit + integration + smoke + determinism | `pnpm verify` | **0** | 119 files / 1028 tests passed; one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50`. |

## Acceptance criteria (Phase 1 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Exported hero PNG SHA-256 equals golden digest; `.meta.json` exists and equals `buildMetadata` output. | E2/E3/E4 in `godot-validation.md`; hashes section there. | **PASS** (primary-run) |
| AC-2 | Godot headless validation exits 0 and prints every assertion passing. | V1c exit 0 with all five `ASSERT … result=PASS` lines and `GODOT_VALIDATION=PASS` (`godot-validation.md` §1c); V1a/V1b validator defects resolved. | **PASS** |
| AC-3 | Offset rule verified in-engine: `godot.offset == generic.origin == [-trim.x,-trim.y]`, hero pivot → local `(4,4)`. | V1c `offset_origin` PASS (`offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4]`) and `anchor_transform` PASS (`pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true`), §1c. | **PASS** |
| AC-4 | PNG bytes unchanged after export and Godot import; `recipe_hash` matches canonical recipe bytes. | E2/E3 + `recipe_hash` recorded; V2 post-V1c PNG hash `8D907415…F027CB` unchanged; meta/scores unchanged, no `.import/` cache. | **PASS** |
| AC-8 | Evidence docs contain exact commands, exit codes, Godot version, hashes and artifact paths. | `godot-validation.md` sections 1–1c, 2–3 and 5; this file's commands table. | **PASS** |

AC-5/6/7 are Phase 2/3 scope and are not claimed here.

## Golden hash results

- Exported PNG = project-copy PNG = `test/goldens/fixtures/hero.sha256` = `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB`.
- Post-V1a (failed parse), post-V1b (failed expectation) and post-V1c (all PASS) PNG/meta/scores hashes unchanged: `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` / `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068` / `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; no `.import/` cache created after any run.
- Post-V1c import PNG hash: `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` — unchanged from export and golden.
- `pnpm verify` determinism layer green (included in the 1028 passing tests).

## Evidence paths

- `conductor/tracks/20261119-godot-export-validation/verification/godot-validation.md`
- `conductor/tracks/20261119-godot-export-validation/verification/phase-1.md`
- `.conductor/evidence/godot-export/export/**` (recipe, style, PNG, meta)
- `.conductor/evidence/godot-export/project/**` (`project.godot`, `validate.gd`, PNG, meta, recipe)

## Deviations

- The plan's `--strict` export command exits 3 on the golden fixture's pre-existing `LOW_CONTRAST` (28/28 edge pixels, warning) and `DITHER_NOISE` (info) findings. The canonical non-strict render produces the exact golden bytes and is the export used for this evidence track. No fixture, linter threshold, recipe, golden, or product code was changed.

## Notes

- No product behavior changed; only the two verification docs (tracked) and the gitignored evidence tree were written.
- The Godot project uses `config/features=PackedStringArray("4.7")` and a minimal `[application]` section. `validate.gd` extends `SceneTree`, is an `_initialize()` entry point, loads `res://hero.png` via `Image.load_from_file(ProjectSettings.globalize_path(...))`, parses both JSON files with `JSON.parse_string`, prints one `ASSERT name=… result=… detail=…` line per check, uses explicit checks (no bare `assert`), calls `push_error()` on failure, and quits 0 only when all pass.
- V1a failed at parse time on three Variant-typed `:=` inferences (lines 37, 38, 109); the fix added explicit types (`meta: Variant`, `recipe: Variant`, `pivot_ok: bool`). V1b then failed because `texture_loaded` expected an 8×8 image while the export is the full 16×16 canvas; the fix now derives expected dimensions from `generic.canvas` and still reports `generic.trim` in the detail. The other four assertions and all expected numbers (`[-4,-4]`, pivot `[4,4]`) are unchanged. Both failures were validator drafting defects only; neither says anything about the export contract either way, and both are resolved by V1c.
- `pnpm verify` warning at `test/recipe/version-1-2.test.ts:50` is pre-existing and non-failing; `pnpm verify` still exits 0.
- Phase closed: the primary supplied V1c stdout/stderr and the V2 hash; no re-roll or fishing for favourable results was used.

## Primary verification (conductor-implement)

- Date: 2026-11-19. Branch: `chore/20261119-godot-export-validation`, phase base `0e8fdb9c1c96b29991fc6385673a58e6f09707f4`.
- Working tree clean; range `0e8fdb9..e03bcb1e29e1e8a3d3fd78a8318569088dab562b` contains exactly the four commits reported by the subagent (`d74444b`, `b16feca`, `d49e8d8`, `e03bcb1`), with no merges or unreported commits.
- Changed paths: exactly `verification/godot-validation.md` and `verification/phase-1.md`, both within Touches. Zero `PENDING`/`pending`/`blocked`/`PARTIAL` cells remain in either file; `phase-1.md` line 12 records `**verified**`.
- Primary independently re-ran `pnpm verify`: exit 0, 119 test files / 1028 tests, build clean, one pre-existing non-failing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`.
- Primary-run evidence stands as transcribed: export PNG SHA-256 `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` equals the golden; exported metadata deep-equals `buildMetadata`; Godot V1c exit 0 with five `ASSERT ... result=PASS` lines and `GODOT_VALIDATION=PASS`; PNG/meta unchanged after Godot import; `test/art/scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged.
- The two earlier failed Godot runs are honestly recorded as validator defects (GDScript type inference, then a wrong trimmed-dimension expectation) and were fixed without changing product code, export metadata, recipes, goldens, scores, or assertion intent. No re-roll or fishing for favourable model output occurred.
- AC-1, AC-2, AC-3, AC-4 and AC-8 are satisfied. Squash guard: eligible — every commit in range was reported by the subagent and no merge/user commit is present.

