# Integrated Verification — Godot 4 Export Validation

- Track: `20261119-godot-export-validation`
- Type / priority: chore / high
- Branch: `chore/20261119-godot-export-validation`
- Base: `0ea5c5357985b365e02b860d872e0de5bca93d84`
- Final check HEAD: `2715356` (post Phase 3 acceptance; later doc-sync/review/completion commits are Conductor documentation only and do not affect any command, exit code or metric in this record)
- Date: 2026-11-19

## Commands

| Command | Exit | Result / metrics | Source |
| --- | --- | --- | --- |
| `pnpm verify` | 0 | typecheck clean; Biome 223 files with one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 files / 1028 tests pass; build clean | primary, final HEAD and each phase |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; statements 95.02% (3969/4177), branches 85.72% (2625/3062), functions 98.33% (530/539), lines 94.82% (3758/3963); gate 80%; benchmarks excluded | primary, final HEAD |
| `pnpm vitest run --project goldens` | 0 | 1 file / 2 tests; golden hashes match | primary, final HEAD |
| `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes; `mean 3.82 · pass · gemini-3.5-flash-lite` | primary, final HEAD |
| `Get-FileHash -Algorithm SHA256 test/art/scores.json` | n/a | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` unchanged | primary, final HEAD |
| `git diff --name-only 0ea5c53..HEAD` | n/a | 11 paths, all Conductor state/verification files; no src, test, scripts, score, recipe, golden or product-doc change | primary, final HEAD |
| `gh pr list --state open` | 0 | zero open PRs at final verification | primary |
| `pnpm exec tsx src/cli.ts render --file hero.px.json --out hero.png --export [--strict]` in isolated workspace | 0 (non-strict) / 3 (`--strict`, pre-existing fixture lint) | PNG `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB` equals committed golden; `.meta.json` emitted | primary, Phase 1 |
| `C:\Godot\godot.exe --headless --path .conductor/evidence/godot-export/project --script validate.gd` | 0 (V1c) | five `ASSERT ... result=PASS` lines; `GODOT_VALIDATION=PASS`; stderr empty; Godot `4.7.2.stable.mono.official.ed1daf0bf` | primary, Phase 1 |

## Requirements coverage

| ID | Coverage | Evidence |
| --- | --- | --- |
| FR-1 | covered | Phase 1 export in isolated workspace; PNG hash equals golden; `.meta.json` emitted (`godot-validation.md` §1–3) |
| FR-2 | covered | Temporary gitignored Godot project + headless GDScript validator loading texture and parsing metadata (`godot-validation.md` §1c) |
| FR-3 | covered | In-engine `texture_path`, `filter=false`, `centered=false`, `offset=[-4,-4] == origin == negated trim` assertions PASS (`godot-validation.md` §4) |
| FR-4 | covered | In-engine anchor transform `pivot [8,8] -> local [4,4]`, algebra and inside checks PASS (`godot-validation.md` §4) |
| FR-5 | covered | PNG hash unchanged before/after Godot import; `recipe_hash` matches canonical recipe; exported metadata deep-equals `buildMetadata` (`godot-validation.md` §3, §5) |
| FR-6 | covered | Phase 2 decision record PASS with exact commands, exits, version, hashes, paths; two earlier failures recorded as validator defects; no follow-up (`decision.md`) |
| FR-7 | covered | Final-check table F1–F7 with all configured checks green (`final-checks.md`, `phase-3.md`) |
| NFR-1 | covered | Only Conductor state/verification and gitignored evidence changed; no product behavior change |
| NFR-2 | covered | Configured commands used exactly; verify exit 0; coverage above 80% on all four metrics |
| NFR-3 | covered | Local Godot 4.7.2 binary used headlessly; no download, install, credential or network call |
| NFR-4 | covered | Evidence records exact commands, exits, Godot version, hashes and paths; no fabricated result |
| NFR-5 | covered with deviation recorded | No re-roll or fishing for a favorable result; two validator-authoring defects (type annotations, expected canvas dimensions) were corrected before final V1c run; final result is the first clean execution of a correct validator |
| NFR-6 | covered | `scores.json` and archives byte-identical; published gate untouched |
| AC-1 | covered | PNG SHA-256 equals golden; metadata deep-equals `buildMetadata` |
| AC-2 | covered | Godot V1c exit 0; all five assertions PASS |
| AC-3 | covered | Offset rule verified in-engine: `offset == origin == [-trim.x,-trim.y]`; pivot local `(4,4)` inside 8×8 trim |
| AC-4 | covered | PNG bytes unchanged after export and after import; recipe hash matches |
| AC-5 | covered | Honest PASS decision with no engine/metadata change and no follow-up needed |
| AC-6 | covered | Final checks green; scores hash unchanged |
| AC-7 | covered | Code delta empty of product change; 11 changed paths all Conductor state/verification |
| AC-8 | covered | Evidence docs contain exact commands, exits, Godot version, hashes and artifact paths |

## Outcome

`PASS` — the Godot export contract is verified in real Godot `4.7.2.stable.mono.official.ed1daf0bf` for the golden hero fixture: full-canvas texture loads with `filter=false`/`centered=false`, `godot.offset == generic.origin == [-4,-4]`, anchor `pivot [8,8]` maps to local `[4,4]` inside the trimmed 8×8 region, exported bytes match the committed golden and remain unchanged after import. No engine, metadata, score, recipe, golden, product-doc or other code change was made.

## Deviations

- The plan's `--export --strict` variant (E1) exits 3 `E_LINT_GATE` on the golden fixture's pre-existing `LOW_CONTRAST` 28/28 warning and `DITHER_NOISE` info finding. The canonical non-strict export (E2) produces the exact golden bytes and is the artifact validated in Godot. No fixture, threshold, recipe, golden or linter rule was changed.
- Two early validator runs failed before any usable assertion result: V1a was a GDScript parse error (Variant inference) and V1b asserted trimmed 8×8 PNG dimensions when the export is correctly the full 16×16 canvas with an 8×8 trim box. Both were validator-authoring defects, fixed with type annotations and `generic.canvas`-derived dimensions; V1c was the first correct run and passed all assertions. No score, assertion result or expected export value was changed to obtain a favorable outcome.
- Phase 2 squash was applied; no other phase deviations.

## Limitations (not passes)

Empty-trim assets, Godot versions other than 4.7.2, GUI editor import, and the other six v2 assets were not exercised. These are recorded as scope limits in `decision.md`, not as passes.

## Evidence paths

- `verification/godot-validation.md` — export, metadata equality, Godot runs (V1a/V1b/V1c), assertion table, hashes, deviations.
- `verification/phase-1.md` — Phase 1 acceptance and primary verification.
- `verification/decision.md` — honest PASS decision and bounded stop.
- `verification/phase-2.md` — Phase 2 acceptance and primary verification.
- `verification/final-checks.md` — final configured-check table F1–F7, hashes and scope.
- `verification/phase-3.md` — Phase 3 acceptance and primary verification.
- Gitignored binaries and validator: `.conductor/evidence/godot-export/**`.

## Notes

All three implementation phases are verified (checkpoints `18004de1f669c989945aea52c7ad85960987ef9f`, `9fbbda5504064a5dd4ed168984a3db67084163b2`, `a6a9d3d7ba9976de1ce3c2ef00fdfe0ab88de3d6`), with 9/9 tasks complete. The published gate remains `pass` at mean 3.82 on `gemini-3.5-flash-lite`; no cross-instrument comparison was made.
