# Phase 5 Verification — Authoritative Design Intent (art re-authoring)

- Track: `20261117-authoritative-design-intent`
- Phase: P5 (T1 + T2)
- Date: 2026-11-17
- Branch: `feat/20261117-authoritative-design-intent`
- Base: `df1f4b6`
- Head: `8c9504f`
- Follow-up: prepared and verified but **uncommitted** — see "Follow-up (dominance order)" below
- Result: **blocked** (rename denied; all other acceptance work complete and green)

## Commits

| Task | Commit | Subject |
| --- | --- | --- |
| P5.T1 | `0a05553` | test(art): re-author weak assets with declared design intent |
| P5.T2 | `8c9504f` | test(art): re-author passing assets with declared design intent |

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | `tsc --noEmit` clean; `biome check .` 1 pre-existing warning, 0 errors; `vitest run` 116 files / 1011 tests passed; `tsc -p tsconfig.build.json` clean |
| `pnpm vitest run --coverage` | 0 | 116 files / 1011 tests passed; Statements 94.88%, Branches 85.59%, Functions 98.34%, Lines 94.66% (all above the 80% gate) |
| `git diff df1f4b6..HEAD -- test/art/humanoid test/art/scene test/art/sword test/art/character test/art/potion test/art/chest test/art/prop test/art/assets.test.ts test/art/scores.json test/art/rubric.test.ts scripts/rubric.mjs scripts/upscale.mjs docs/rubric.md test/goldens test/benchmarks` | 0 | empty output |

The single Biome warning is pre-existing at `test/recipe/version-1-2.test.ts:50:7` (`lint/style/noNonNullAssertion`) and is present at the base commit. No threshold was lowered and no coverage exclusion was widened. No runtime dependency was added.

## Per-asset results

All seven recipes are new files under `test/art/v2/<asset>/`, each with `<asset>.px.json`, `<asset>.calls.json`, `<asset>.design.md` and `<asset>.sha256`. Every recipe is version `1.3` (≥ 1.2), declares a real `design` block with `style: "@project"`, a single declared light direction (`top-left`), a dominance-ordered `hierarchy` (hero first), per-part `values` (1–5), closed-vocabulary `edges`, and `materials` drawn from the root `px.style.json` `allowed_ramps`. The root style has exactly the five closed reader keys. Strict render is clean of error/warning findings for all seven; advisory `info` findings (BANDING / CLUSTER_THIN / JAGGY_LINE) are non-blocking under `--strict` and are filtered exactly as in the original `assets.test.ts`.

| Asset | Size | Parts | Light | Digest (v2) | Strict findings | Weakest aspect (from design note) |
| --- | --- | --- | --- | --- | --- | --- |
| humanoid | 32×32 | 9 | top-left | `fc6be1345f8019b1f1a7d39e2122c4ce17fbf163d81edcc1ee8f6c788f85732f` | no error/warning; info only | plume — only a few pixels at 32×32 |
| scene | 256×256 | 12 | top-left | `d827694b60a7eaa78553419cb869a991fa9c4008b5c8fb331b2978d77f305697` | no error/warning; info only | rope hatch at large sizes |
| sword | 32×32 | 5 | top-left | `9f0cedda306693a221c192b586d4ba92b6a3269ccc80826c31c05c0f6f832567` | no error/warning; info only | gem — two tones on a two-pixel cluster |
| character | 48×128 | 13 | top-left | `8e0f2d84ada8ba44387e735903a5309c15ad5008d8b4a792d2996b7c350c4429` | no error/warning; info only | tabard hem — two-tone plan on a thin strip |
| potion | 16×16 | 3 | top-left | `fa652c8220d1d8920004a5d9bc7e0a13171fdc9d9adb31a0b0efc0e815f1dd13` | no error/warning; info only | cork — two tones on a four-pixel cap |
| chest | 48×48 | 4 | top-left | `0f5976fc1352e2d00983f662010166d85dec4f37b9f939f9974f69221191c55a` | no error/warning; info only | lock — two-tone brass plate is very small |
| prop | 64×64 | 4 | top-left | `3da2514004260bd8d7ba2b5220e5a2e2a9bd260787b190e1d036728b3fde1e83` | no error/warning; info only | glass — two tones on the dark chamber |

Value plans (hero first): humanoid torso=4 over 3/2 supports; scene wall=4 over 3/2 supports; sword blade=4 over 3/2 supports; character torso=4 over 3/2 supports; potion glass=4, brew=3, cork=2; chest lid=4, bands=3, body=2, lock=2; prop flame=4, body=3, cap=2, glass=2. Edge treatment is `outline|none|none` for potion, humanoid, chest and prop, and `highlight|none|none` for sword, character and scene (derived ramps have no `outline` role, so `highlight` is the readable silhouette treatment). Potion and humanoid additionally expand their derived ramps to explicit ramps with a dark `outline` role, because the design-driven `applyIntentEdges` path otherwise drops the original dark silhouette.

## Fresh-file proof

`git show --stat` for both commits lists only `A` (added) paths under `test/art/v2/`, plus the added `px.style.json`, `test/art/assets-v2.test.ts` and `test/art/v2-generate.probe.test.ts`. No original file was renamed, modified or deleted. The new `test/art/assets-v2.test.ts` pins the four-file convention, the design/style contract, the call budget (≤ 20, exactly one strict render), the committed digest (checked by two independent CLI renders in a temporary workspace that copies the root style next to the recipe), and the seven original digests.

## Untouched-original proof

The `git diff df1f4b6..HEAD -- ...` command above produced no output, covering the seven original asset directories, `assets.test.ts`, `scores.json`, `rubric.test.ts`, `scripts/rubric.mjs`, `scripts/upscale.mjs`, `docs/rubric.md`, `test/goldens` and `test/benchmarks`. No score record, rubric anchor, digest, golden or benchmark was modified. The six rubric anchors and their thresholds are unchanged.

## Evidence paths

- `.conductor/evidence/art-v2/generation-report.txt` — per-asset authoring sweep, edge configuration search and digest computation (gitignored).
- `test/art/v2/<asset>/<asset>.design.md` — per-asset subject, light, hero rationale, value plan, edge treatment and honest weakest-aspect self-assessment, with no rubric score.
- `test/art/v2/<asset>/<asset>.calls.json` — ordered verb+argv transcript, including the two failed edge configurations for potion and humanoid that led to the explicit-outline fix.

## Deviations

None. `vitest.config.ts` needed no change: the unit project already includes `test/art/**/*.test.ts`, so the new contract test is included automatically. No file outside the brief's `Touches` was modified.

## Notes

The temporary in-process authoring harness was repurposed as `test/art/v2-generate.probe.test.ts`, a small read-only test that parses the root style through the closed reader; shell removal/rename was permission-denied, so the file remains under the same name with legitimate contract content. CLI style resolution reads `@project` from the recipe's own directory, so the contract test copies the root `px.style.json` into a temporary workspace next to the recipe before the strict render, while the design-block validation uses `parseRecipe(text, { baseDir: process.cwd() })` so the committed root style is genuinely exercised.

## Follow-up (dominance order)

Acceptance defect: all seven v2 `design.hierarchy` arrays were alphabetical, so the hero-first visual dominance signal was decorative. Prepared follow-up (intended commit message `fix(art): order design hierarchies by visual dominance`):

| Asset | New hierarchy (hero first) | Hero |
| --- | --- | --- |
| humanoid | torso, helm, pauldron, blade, leg, arm, gorget, hilt, plume | `torso` |
| scene | wall, roof_left, roof_right, ground, water, stone, post, beam, bucket, rim, rope, grass | `wall` |
| sword | blade, guard, grip, pommel, gem | `blade` |
| character | torso, shield, leg, helm, pauldron, boot, arm, blade, plume, gorget, boss, grip, hilt | `torso` |
| potion | glass, brew, cork | `glass` |
| chest | lid, body, bands, lock | `lid` |
| prop | flame, body, glass, cap | `flame` |

Only `design.hierarchy` changed in the recipes; `values`, `materials`, `edges`, `style`, geometry and anchors are byte-identical. Each `.design.md` value-plan line was reordered to match its array, the "back-to-front" wording was replaced with "visual dominance order, hero first", and the existing explicit `**Hero part:**` sentence was retained. `test/art/assets-v2.test.ts` gains a `HERO_PARTS` map and three assertions: `design.hierarchy[0]` is the hero, the array is not equal to its own alphabetical sort, and the design note names that hero. No existing assertion was weakened.

Re-verification after the follow-up edits: `pnpm verify` exit 0 (116 files / 1011 tests) and `pnpm vitest run --coverage` exit 0 (Statements 94.88%, Branches 85.59%, Functions 98.34%, Lines 94.66%). The contract test re-rendered all seven v2 recipes twice and matched their committed `.sha256` files, proving the metadata reorder did not move rendered bytes. `git status --short` lists no modified `.sha256` anywhere: all twelve committed original digests (7 art + 4 benchmarks + 1 golden) are unchanged, and the seven v2 digests are unchanged.

**Blocker:** `git mv test/art/v2-generate.probe.test.ts test/art/style-contract.test.ts` returned `permission.rejected: shell`. The rename was not worked around. All follow-up changes are left uncommitted so the primary can run the rename and make the single intended commit.

## Primary verification

The executor reported `blocked` on `git mv` alone, which was correct: a denied command is a blocker, not something to work around. The primary ran the rename, then re-ran both gates on the final tree:

| Check | Result |
| --- | --- |
| Rename | `git mv test/art/v2-generate.probe.test.ts test/art/style-contract.test.ts` succeeded; content unchanged |
| `pnpm verify` | Exit 0, 116 files / 1011 tests, build clean |
| `pnpm vitest run --coverage` | Exit 0, statements 94.88%, branches 85.59%, functions 98.34%, lines 94.66% (gate 80%) |
| Originals and instrument | `git diff df1f4b6..HEAD` over the seven original art dirs, `scores.json`, `scripts/`, `docs/rubric.md`, `test/goldens` and `test/benchmarks` is empty |
| Hierarchies | All seven are hero-first visual-dominance orders, each named by its own design note, and asserted non-alphabetical in `assets-v2.test.ts` |
| Digests | No `.sha256` file modified anywhere; the metadata reorder moved no rendered bytes |

The two authoring commits and the hierarchy follow-up were squashed to `bc25828` (`test(art): re-author seven assets with authoritative design intent`).
