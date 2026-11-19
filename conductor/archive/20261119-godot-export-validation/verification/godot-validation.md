# Godot 4 Export Validation — Validation Record

- Track: `20261119-godot-export-validation` — Godot 4 Export Validation
- Phase: 1 — Export hero and validate in headless Godot
- Date: 2026-11-19
- Branch: `chore/20261119-godot-export-validation`
- Phase base: `0e8fdb9c1c96b29991fc6385673a58e6f09707f4`
- Result: **verified** — all Phase 1 acceptance criteria are met. The export is byte-identical to the golden, `buildMetadata` equality holds, headless Godot 4.7.2 exits 0 with all five assertions PASS, and the PNG hash is unchanged after import. The two earlier Godot failures were validator drafting defects (parse-time type inference and a stale 8×8 expectation), both resolved; no product, export, score, recipe, golden or engine change occurred.

This record transcribes results the primary already produced (including the appended V1a, V1b and V1c Godot executions on 2026-11-19). No command marked "primary-run" below was re-run or fabricated by the phase subagent.

## 1. Commands, exits and evidence

| # | Runner | Command (cwd shown where relevant) | Exit | Result / evidence |
| --- | --- | --- | --- | --- |
| E1 | primary | `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export --strict` (cwd `.conductor/evidence/godot-export/export`) | **3** | `E_LINT_GATE`. Pre-existing golden-fixture findings: `LOW_CONTRAST` (28/28 edge pixels, warning) and `DITHER_NOISE` (info). PNG + `.meta.json` were still emitted and are byte-identical to the canonical golden. Not used for validation. |
| E2 | primary | `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export` | **0** | Canonical export used for this track. Envelope sha256 `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`; metadata sha256 `5420fd7aa2b508781be8d188ced41d5dd5aa90adb4a5788f8a36e0ff7894c068`; `generic.recipe_hash` `sha256:49d77ab086c4e6c2a8a68c5d79851ec22b463e1d63496c42e340d7bb76401c41`. |
| E3 | primary | `Get-FileHash -Algorithm SHA256 <exported hero.png>` and `<project-copy hero.png>` | 0 | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` for both, equal to `test/goldens/fixtures/hero.sha256`. |
| E4 | primary | `buildMetadata(parseRecipe(fixture).recipe, compileRecipe(...), 'hero.png')` via `pnpm exec tsx` | 0 | Parsed JSON deep-equal to exported `hero.meta.json`: **true**. |
| E5 | primary | `C:\Godot\godot.exe --version` | 0 | `4.7.2.stable.mono.official.ed1daf0bf`. |
| E6 | primary | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (unchanged). |
| V1a (first run) | primary | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` | **1** | Failed at GDScript parse time: three type-inference errors in `validate.gd` (lines 109, 37, 38). Stdout was only the Godot 4.7.2 banner; no `ASSERT` line was emitted. Validator defect — not a product, export, or metadata defect. See section 1a. |
| V1b (re-run after parse fix) | primary | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` | **1** | Assertion `texture_loaded` failed: validator expected 8×8 but the PNG is the full 16×16 canvas. Stdout carried one `ASSERT … result=FAIL` line and `GODOT_VALIDATION=FAIL`; no other assertion ran. Validator expectation error — not a product/export defect. See section 1b. |
| V1c (final re-run after expectation fix) | primary | `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` (stdout/stderr redirected to files under project dir) | **0** | All five assertions PASS and `GODOT_VALIDATION=PASS`; stderr empty. Stdout: `ASSERT name=texture_loaded result=PASS detail=null=false width=16 height=16 expected=16x16 trim=[4,4,8,8]`<br>`ASSERT name=texture_path result=PASS detail=texture_path=hero.png expected=hero.png`<br>`ASSERT name=filter_centered result=PASS detail=filter=false centered=false expected=false/false`<br>`ASSERT name=offset_origin result=PASS detail=offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4] expected=[-4,-4]`<br>`ASSERT name=anchor_transform result=PASS detail=pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true`<br>`GODOT_VALIDATION=PASS`. Verbatim block in section 1c. |
| V2a (post-first-run hashes) | primary | `Get-FileHash -Algorithm SHA256` re-check of project `hero.png`, project `hero.meta.json`, `test/art/scores.json` (exact invocation not supplied) | 0 | After V1a: PNG `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB`, meta `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068`, scores `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` — all unchanged. No `.import/` cache created. |
| V2b (post-V1b hashes) | primary | `Get-FileHash -Algorithm SHA256` re-check of project `hero.png`, project `hero.meta.json`, `test/art/scores.json` (exact invocation not supplied) | 0 | After V1b: PNG `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB`, meta `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068`, scores `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` — all unchanged. No `.import/` cache created. |
| V2 (post-V1c import hash) | primary | `Get-FileHash -Algorithm SHA256 .conductor/evidence/godot-export/project/hero.png` (after V1c / Godot import) | 0 | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` — unchanged from export and golden. Post-run meta `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068` and scores `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` also unchanged; `.import/` cache absent. |
| S1 | subagent | `pnpm verify` | **0** | `119` test files / `1028` tests passed; one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50`. |

## 1a. First Godot execution V1a — validator parse error (primary-run, 2026-11-19)

The primary ran the reserved validation command with stdout/stderr captured to files. Exit code **1**. Stdout contained only the Godot 4.7.2 banner — no `ASSERT` line was emitted, because the script failed to parse before any assertion executed. Stderr, verbatim:

```
SCRIPT ERROR: Parse Error: Cannot infer the type of "pivot_ok" variable because the value doesn't have a set type.
   at: GDScript::reload (res://validate.gd:109)
SCRIPT ERROR: Parse Error: The variable type is being inferred from a Variant value, so it will be typed as Variant. (Warning treated as error.)
   at: GDScript::reload (res://validate.gd:37)
SCRIPT ERROR: Parse Error: The variable type is being inferred from a Variant value, so it will be typed as Variant. (Warning treated as error.)
   at: GDScript::reload (res://validate.gd:38)
ERROR: Failed to load script "res://validate.gd" with error "Parse error".
```

**Classification:** a validator-script parse failure (Godot 4.7.2 treats Variant-inferred types as errors), not a product, export, metadata, or anchor-contract defect. No assertion was evaluated, so no assertion result is inferred from this run.

**Fix applied by the subagent** (types only; no assertion logic or expected value changed):
- `var meta: Variant = read_json(META_PATH)` (line 37)
- `var recipe: Variant = read_json(RECIPE_PATH)` (line 38)
- `var pivot_ok: bool = name != "pivot" or (local_x == 4 and local_y == 4)` (line 109)

The primary re-ran the same command as V1b (section 1); its result is recorded in section 1b.

## 1b. Second Godot execution V1b — validator expectation error (primary-run, 2026-11-19)

The primary re-ran the validation command after the parse fix. Exit code **1**. Stdout, verbatim:

```
Godot Engine v4.7.2.stable.mono.official.ed1daf0bf - https://godotengine.org

ASSERT name=texture_loaded result=FAIL detail=null=false width=16 height=16 expected=8x8
GODOT_VALIDATION=FAIL
```

Stderr, verbatim: `ERROR: godot-export validation failed: texture_loaded (null=false width=16 height=16 expected=8x8)` with a backtrace at `validate.gd:66`. PNG/meta/scores hashes were unchanged; no `.import/` cache was created.

**Classification:** a failed validator expectation, not a product or export defect. The exported PNG is the **full 16×16 canvas** (transparent padding included), as `generic.canvas` records; `generic.trim` describes the opaque 8×8 box at `(4,4)`. Expecting an 8×8 image was a drafting error in the brief's `texture_loaded` assertion (the spec's phrase "trimmed dimensions"). The offset rule still holds: `offset = -trim origin = [-4,-4]`, and pivot `(8,8)` maps to `(4,4)`. No other assertion ran, so no other result is inferred from V1b.

**Fix applied by the subagent** (only `texture_loaded`; the other four assertions and all expected numbers unchanged): the check now derives its expected dimensions from `generic.canvas.width` / `generic.canvas.height` (16×16), and the detail line still reports the trim box from `generic.trim` (`trim=[4,4,8,8]`).

The primary ran the same command as V1c (section 1); its result is recorded in section 1c.

## 1c. Final Godot execution V1c — all assertions PASS (primary-run, 2026-11-19)

Command: `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script .conductor/evidence/godot-export/project/validate.gd` with stdout/stderr redirected to files under the project dir.

Exit code: **0**. Stdout, verbatim:

```
Godot Engine v4.7.2.stable.mono.official.ed1daf0bf - https://godotengine.org

ASSERT name=texture_loaded result=PASS detail=null=false width=16 height=16 expected=16x16 trim=[4,4,8,8]
ASSERT name=texture_path result=PASS detail=texture_path=hero.png expected=hero.png
ASSERT name=filter_centered result=PASS detail=filter=false centered=false expected=false/false
ASSERT name=offset_origin result=PASS detail=offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4] expected=[-4,-4]
ASSERT name=anchor_transform result=PASS detail=pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true
GODOT_VALIDATION=PASS
```

Stderr: **empty**. Post-run hashes: PNG `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` (unchanged from export and golden), meta `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068` (unchanged), `test/art/scores.json` `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (unchanged). `.import/` cache: **absent**.

## 2. Godot version

`4.7.2.stable.mono.official.ed1daf0bf` (local binary, `C:\Godot\godot.exe`; headless, no download/install/network).

## 3. Hashes (transcribed verbatim from primary)

| Artifact | SHA-256 |
| --- | --- |
| Exported `hero.png` (E2) | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| Project-copy `hero.png` (E3) | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` |
| Committed golden `test/goldens/fixtures/hero.sha256` | `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` |
| Render envelope (E2 stdout) | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| Exported `hero.meta.json` (E2) | `5420fd7aa2b508781be8d188ced41d5dd5aa90adb4a5788f8a36e0ff7894c068` |
| `generic.recipe_hash` | `sha256:49d77ab086c4e6c2a8a68c5d79851ec22b463e1d63496c42e340d7bb76401c41` |
| `test/art/scores.json` (E6) | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |

The full E1/E2 stdout envelope text was summarised by the primary as the digest values above; those digests and the metadata hash are recorded verbatim rather than re-derived.

Post-V1a (failed parse), post-V1b (failed expectation) and post-V1c (all PASS) hashes reported unchanged by the primary: PNG `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB`, meta `5420FD7AA2B508781BE8D188CED41D5DD5AA90ADB4A5788F8A36E0FF7894C068`, scores `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`. No `.import/` cache was created after any run. V2 confirms the final PNG hash is unchanged from export and golden.

## 4. In-engine assertion table

"Expected" is computed from the copied `hero.meta.json` / `hero.px.json` and the recipe contract. "Observed (Godot stdout)" and "Result" are the primary's V1c final-run output; all five assertions pass. V1a (section 1a) emitted no `ASSERT` line — it failed to parse before any assertion ran. V1b (section 1b) emitted one `ASSERT` for `texture_loaded` that failed only because the validator expected 8×8; the observed `width=16 height=16` there matches the full canvas. Neither earlier run contributes a result; both defects were resolved before V1c.

| ID | Check | Expected (from metadata / recipe) | Observed (Godot stdout) | Result |
| --- | --- | --- | --- | --- |
| `texture_loaded` | `Image.load_from_file("hero.png")` non-null, width/height equal to `generic.canvas` (full canvas); trim box reported separately in detail | non-null, `16x16` canvas, `trim=[4,4,8,8]` | `null=false width=16 height=16 expected=16x16 trim=[4,4,8,8]` | **PASS** |
| `texture_path` | `godot.texture_path == "hero.png"` | `hero.png` | `texture_path=hero.png expected=hero.png` | **PASS** |
| `filter_centered` | `godot.filter == false` and `godot.centered == false` | `false` / `false` | `filter=false centered=false expected=false/false` | **PASS** |
| `offset_origin` | `godot.offset == generic.origin == [-trim.x, -trim.y]` | `[-4,-4]` | `offset=[-4,-4] origin=[-4,-4] negated_trim=[-4,-4] expected=[-4,-4]` | **PASS** |
| `anchor_transform` | For each recipe anchor `a`: `a + offset == a - trim`; local inside `[0,8) x [0,8)`; pivot `[8,8]` → local `[4,4]` | `pivot local=[4,4]`, inside = true | `pivot:anchor=[8,8] local=[4,4] algebra=true inside=true pivot_ok=true` | **PASS** |
| `final` | Print `GODOT_VALIDATION=PASS` only when all assertions pass | `GODOT_VALIDATION=PASS` | `GODOT_VALIDATION=PASS` | **PASS** |

The validator (`validate.gd`) prints one `ASSERT name=<id> result=PASS|FAIL detail=<...>` line per assertion, uses explicit boolean checks (no bare `assert`), calls `push_error()` on the first failure, and `quit(1)` on failure / `quit(0)` only when all pass. It exits 1 and prints `GODOT_VALIDATION=FAIL` if either JSON file cannot be read or parsed.

## 5. Artifact paths

Isolated export workspace (gitignored):
- `.conductor/evidence/godot-export/export/hero.px.json`
- `.conductor/evidence/godot-export/export/px.style.json`
- `.conductor/evidence/godot-export/export/hero.png`
- `.conductor/evidence/godot-export/export/hero.meta.json`

Godot project (gitignored):
- `.conductor/evidence/godot-export/project/project.godot`
- `.conductor/evidence/godot-export/project/validate.gd`
- `.conductor/evidence/godot-export/project/hero.png`
- `.conductor/evidence/godot-export/project/hero.meta.json`
- `.conductor/evidence/godot-export/project/hero.px.json`

Godot may generate an `.import/` cache under the project directory; it stays inside gitignored `.conductor/evidence/`.

## 6. Deviation note

The plan's `--strict` export command (E1) exits 3 (`E_LINT_GATE`) on the golden fixture's **pre-existing** lint findings — `LOW_CONTRAST` on 28/28 edge pixels (warning) and `DITHER_NOISE` (info). The canonical, non-strict render (E2) produces the exact golden bytes and is the export used for this evidence track. No fixture, linter threshold, product code, recipe, or golden was changed to work around this.

## 7. Limitations

- Only Godot `4.7.2.stable.mono` is exercised; no cross-version claim is made.
- Empty trim (no offset) is not exercised by hero; that case is untested, not passed.
- Headless script only; GUI editor import and on-disk `.import` texture settings are outside scope — the validator checks the metadata contract and image dimensions, not pixel colours or Godot's importer defaults.
- The validator asserts the arithmetic/flags against the copied files; it does not re-run `render --export` inside Godot.
- Full E1/E2 stdout envelope text was not supplied by the primary; only the recorded digests are transcribed here.
- V1a failed at parse time on validator type inference (section 1a) and V1b failed on a stale 8×8 dimension expectation (section 1b); both were validator drafting defects, now resolved, and neither is evidence about the export contract either way. V1c supplied the final assertion results (all PASS).
