# Phase R3 — Review Round 3 Fixes

| Field | Value |
| --- | --- |
| Track | `20261113-static-art-quality` |
| Phase | R3 — review round 3 fixes (F17, F18, F19) |
| Date | 2026-11-13 |
| Branch | `feat/20261113-static-art-quality` |
| Base commit | `266d811` |
| Head commit | `0eb724a` (task commits `8c94062` … `0eb724a`) |
| Result | **verified** |

The round-3 Medium (F17) was removed rather than documented. `normalizeRecipe`
now rejects `parts` under a 1.0 version with `E_BAD_VERSION`, so a 1.0 recipe is
always part-less and `writtenVersion`'s promotion branch is unreachable — the
branch is deleted, not kept "defensively". AC-1 is now true by construction: no
write can promote a 1.0 recipe, so no write can change its outline depth. Every
recorded hash — hero golden, the four benchmarks, and the 1.1 scene asset — is
byte-identical to the base commit. No hash was re-recorded.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| phase gate | `pnpm verify` | 0 | `tsc --noEmit` → `biome check .` (154 files, no findings) → `vitest run` (76 files, 714 tests) → `tsc -p tsconfig.build.json` |
| coverage | `pnpm vitest run --coverage` | 0 | statements 95.6%, branches 86.57%, functions 98.17%, lines 95.43% (gate 80%) |
| F18 proof | `pnpm vitest run test/art-lint/cleanup.test.ts -t "part index\|owned neighbour"` | 1 while the tie-break was removed, 0 restored | both reordered fixtures fail without the `better` clause; see below |

The suite is still 714 tests. One case was replaced, not added: the case that
pinned the promotion (a 1.0 recipe gaining parts and being written as `"1.1"`)
now asserts the rejection of that same now-illegal state.

## Tasks

| Task | Finding | Commit | What changed |
| --- | --- | --- | --- |
| R3.T1 | F17 (Medium) — a 1.0 recipe with parts changed bytes on write | `8c94062` | `src/core/recipe/normalize.ts` rejects `parts` when the declared version is `1` or `"1.0"` with `E_BAD_VERSION`, before any other normalization: message `Recipe declares parts with version <v>, but parts require schema 1.1`, hint `Parts are a 1.1 feature: set "version": "1.1" to declare them.` `src/core/recipe/serialize.ts` no longer promotes: `writtenVersion` is deleted and `canonicalRecipe` writes `recipe.version` verbatim (the now-unused `RecipeVersion` import went with it). `px init --parts` now writes `LATEST_RECIPE_VERSION` at creation, the one legitimate path that declares parts, so a 1.1 document exists from the first byte rather than being promoted on a later write. Tests: the promotion case in `test/parts/serialize.test.ts` asserts `E_BAD_VERSION` for both `1` and `"1.0"`; `test/parts/schema.test.ts` exercises the accepted 1.0 literals on a part-less recipe; the two fixtures that hand-built the illegal state (`test/parts/surface.test.ts`, `test/palettes/swap.test.ts`) now declare 1.1, and `test/integration/cli.test.ts` pins that `init --parts` writes 1.1. `docs/art-profiles.md` says parts require schema 1.1, which is why the outline gate is a version test. |
| R3.T2 | F18 (Low) — seal tie fixtures could not fail | `de0aa72` | `test/art-lint/cleanup.test.ts`: in the 2-vs-2 seam fixture `seam_b` now sits at `(4,3)` and `(4,5)` with `seam_a` at `(5,4)` and `(3,4)`; in the owned-vs-unowned fixture the unowned `steel.base` pixel is at `(4,3)` and the owned `body` pixel at `(5,4)`. Scan order is up, right, down, left, so the disfavoured candidate is now supplied first in both. Comments state why, and the proof below shows both tests fail without the tie-break. |
| R3.T3 | F19 (Low) — docs paragraph contradicted the table | `0eb724a` | `docs/art-profiles.md`: the gate paragraph now reads that the profile's outline width applies to a `"version": "1.1"` recipe — which is what declaring parts writes — while a 1.0 recipe keeps the historical 1 px border. This matches `outlineDepth`, which keys on the version literal, and the table row above it. |

## F18 proof — the fixtures bite

Performed in this order, on top of `8c94062`:

1. Reordered both fixtures as above. With the tie-break present,
   `pnpm vitest run test/art-lint/cleanup.test.ts -t "part index|owned neighbour"`
   → 2 passed, exit 0. (The fixtures as reordered still agree with the rule.)
2. Temporarily deleted the tie-break from `adoptedOwner` in
   `src/core/ops/cleanup.ts` — the `better` binding and the
   `count === best && better` disjunct, leaving `if (count > best)` — then ran
   the same command: **exit 1, both tests failed**.
   - *breaks a two-against-two seam tie by the lower part index*: `expected 1 to
     be +0` at `expect(ownerAt(compiled, 4, 4)).toBe(ownerOf(compiled,
     'seam_a'))` — the hole adopted `seam_b` (index 1) because it was scanned
     first.
   - *prefers an owned neighbour over an unowned one at the same tone and
     count*: `expected -1 to be +0` at `expect(ownerAt(compiled, 4, 4)).toBe(
     ownerOf(compiled, 'body'))` — the hole stayed unowned because the unowned
     pixel was scanned first.
3. Restored the clause. `git diff --stat -- src/core/ops/cleanup.ts` is empty
   (the file is byte-identical to `HEAD`), and the full file passes: 21 tests,
   exit 0.

This is the evidence the old fixtures never produced: with the rule deleted the
previous fixtures were green, which is how F18 survived two rounds.

## Blocker check — is the new rule too strict?

No legitimate recipe is rejected. Every 1.0 fixture in the repository is
part-less: the hero, the four benchmarks (`potion`, `sword`, `humanoid`, `chest`)
and the 1.1 scene all parse unchanged. The two fixtures that were rejected were
building the illegal state in a test (`test/parts/surface.test.ts` serialized
parts onto a version-1 init output; `test/palettes/swap.test.ts` built a
`RECIPE_VERSION` recipe with a part), and both were fixed by declaring 1.1,
which is what they meant. The one product path that declares parts at creation —
`px init --parts` — now writes 1.1, so it is legal by construction, and its
existing round-trip assertion (`serializeRecipe(parsed) === text`) still holds.

Interpretation recorded deliberately: the rule rejects the key's **presence**,
so `"parts": {}` under 1.0 is rejected too, not only a non-empty map. An empty
map is still a declaration, and it was silently dropped on write (the writer
never emits an empty parts map), so it carried the same read-write drift the
finding is about.

## Golden hashes

| Golden | Expected | Observed |
| --- | --- | --- |
| Hero render | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged — `test/goldens` green |
| potion | `9529870a9922253919f097506d27cf88515525e93a87995034d6a19d1f59108f` | unchanged — `test/benchmarks` green |
| sword | `4050e8458b7a8b4efe42a2ce0c0e5cdeabb7beb5c8263bf8c9131cf50bd7aaf1` | unchanged — `test/benchmarks` green |
| humanoid | `03e717013181ace32025ca9310ebc857142b417cfc1565c239b689bf13713bfc` | unchanged — `test/benchmarks` green |
| chest | `cda5bbedca4639ce9354704da465ccf1d0595791edf8f15f8022c0a5d21d6917` | unchanged — `test/benchmarks` green |
| scene (asset) | `ed1ba3866bf5f0400f3f51db53ea06a4ab06dd4f4cd7dc093f62ac584eac9d1a` | unchanged — `test/art` green, file untouched |

`git diff --stat 266d811..HEAD -- test/art test/goldens test/benchmarks` is
empty: no `.sha256`, `.png`, `.px.json`, `scores.json` or `.calls.json` moved, so
the digests are unchanged by observation, not by assertion alone. The scene is
`"version": "1.1"`, so it keeps its 2 px border.

## AC notes

- **AC-1 is enforced, not just preserved.** Before this phase the only guarantee
  was that nothing currently promoted a 1.0 recipe; `writtenVersion` still could,
  and the write verb recompiled from its own output. Now parsing cannot produce
  the promoting state at all, and the writer has no branch that can change the
  version.
- **The outline gate did not move.** `outlineDepth` is untouched; the scene
  digest and `test/ops/outline.test.ts` still pass.
- **No dead surface left behind.** The promotion function is gone rather than
  unreachable. `LATEST_RECIPE_VERSION`, which had no consumer before this phase,
  is now the version `px init --parts` writes.
- **No threshold lowered, no coverage exclude widened, no `v8 ignore`.** The
  coverage figures are identical to R2 (95.6 / 86.57).
- **No new dependency**, no lockfile change, no generated file edited.

## Deviations

| File | Reason |
| --- | --- |
| `src/cli/commands.ts` | Required by the decision: `px init --parts` used to write `version: 1` with parts and then parse its own output, so the new rule would have made a legitimate command fail. It now writes `LATEST_RECIPE_VERSION` when parts are declared and keeps the legacy numeric literal otherwise. |
| `test/parts/surface.test.ts`, `test/palettes/swap.test.ts`, `test/parts/schema.test.ts`, `test/integration/cli.test.ts` | Fixtures that asserted the now-illegal state, as the brief anticipated. They now declare 1.1; the schema case that checks the accepted 1.0 literals uses a part-less recipe. |

## Notes

- Commit messages carry no `--amend`; each task is one commit, and T1's source +
  docs + fixtures landed together because the rule, the deleted branch and the
  fixtures that pinned it are one change.
- R3.T1's rejection fires before `unknownKeys`, so a 1.0 recipe with parts and an
  unknown top-level key reports the version contradiction first — the version is
  the problem a caller must fix before anything else in the document matters.
- The `"1.0"` string literal is covered by the same loop in
  `test/parts/serialize.test.ts`, so the gate is pinned for both spellings of the
  legacy version.

## Evidence paths

- Source: `src/core/recipe/normalize.ts`, `src/core/recipe/serialize.ts`,
  `src/cli/commands.ts`
- Tests: `test/parts/serialize.test.ts`, `test/parts/schema.test.ts`,
  `test/parts/surface.test.ts`, `test/integration/cli.test.ts`,
  `test/palettes/swap.test.ts`, `test/art-lint/cleanup.test.ts`
- Docs: `docs/art-profiles.md`
