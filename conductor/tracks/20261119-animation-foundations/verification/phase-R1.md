# Phase R1 (Review Fixes) — design record

- Track: `20261119-animation-foundations`
- Phase: R1 — Review Fixes (strict mode ON)
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `ca92ff2027f03629fd74811be358a7f0534bf651`

## Result

**Verified.** All three findings are RESOLVED:

| Finding | Status | Resolution |
| --- | --- | --- |
| F1 — all-frame `--strict` gating | RESOLVED | `runRender` reports `lintCompiledFrames` findings for every frame and suppresses both sheet artifacts when a frame-1+ finding blocks under `--strict`; two `runCli` integration tests cover the gate and frame-0 byte parity. |
| F2 — non-executing v1.4 test file | RESOLVED | Header comment documents that `test/recipe/**` is outside every Vitest include and that the mirrored in-scope unit tests are the executed coverage; no assertion changed. |
| F3 — golden does not exercise shared design | RESOLVED | Recipe-level `design` + minimal `parts` restored in `anim-duo.px.json`, shared by both frames. Primary-confirmed digests are unchanged; sidecars required no re-baseline. |

`pnpm verify` exits 0: typecheck, Biome (one pre-existing non-failing warning at
`test/recipe/version-1-2.test.ts:50`), 119/119 test files and 1043/1043 tests,
and build all pass. No blockers remain.

## F1 — all-frame strict gating (done)

`src/cli/commands.ts`:

- Imports `lintCompiledFrames` and `lintBlocks` alongside `lintCompiled`.
- `runRender` computes
  `const frameFindings = lintCompiledFrames(compileRecipeFrames(effective), lintBackdrop);`
  and uses it for `payload.findings`; frame 0 findings remain byte-identical to
  `lintCompiled` and carry no `frame` field.
- `writeSheet` is gated by `!(args.strict && lintBlocks(frameFindings, true))`,
  so a warning confined to frame 1+ blocks both `<stem>.sheet.png` and
  `<stem>.sheet.meta.json`. Normal PNG bytes and the single-frame metadata
  projection are untouched. `main.ts` needed no change: its existing strict
  gate reads `payload.findings`.
- Added two `runCli` integration tests in `test/lint/feedback-cli.test.ts`: one
  asserts a frame-1 warning yields exit 3 / `E_LINT_GATE`, a `frame: 1` finding,
  a real frame-0 PNG, and no sheet artifacts; the other asserts the same recipe
  without `--strict` writes the sheet pair and that frame-0 bytes equal a
  single-frame control render.

No lint rule was suppressed and `lintBlocks` was not changed.

## F2 — v1.4 test header (done)

`test/recipe/version-1-4.test.ts` gained a header comment stating it is outside
every Vitest include, that CI does not execute it, and that the mirrored
assertions in `test/unit/recipe.test.ts` / `test/unit/compile.test.ts` are the
executed coverage. No assertion changed.

## F3 — shared design in the golden (done, digests unchanged)

`test/goldens/fixtures/anim-duo.px.json` now has:

- a recipe-level `design` (`subject: "animated duo"`, `light: "top-left"`,
  `hierarchy: ["body"]`, `values: {"body": 3}`,
  `edges: {silhouette: "outline", material: "none", detail: "none"}`,
  `materials: ["body"]`, `style: "@project"`) placed after `meta`, shared by
  both frames and not re-declared per frame;
- a minimal `parts` block (`{"body": {"material": "body", "gloss": "cloth"}}`)
  placed after `palette`.

Deviation: each of the four ops was tagged `"part": "body"` (in canonical
position immediately after `op`). This was required because `compileLayers`
throws `E_EMPTY_PART` for a declared part that owns no pixels; tagging is the
documented remedy and does not weaken validation.

**Why digests did not change.** The restored `design`, `parts` and part tags
alter the metadata projection (`recipe_hash`, `generic` deviations) and the
compile-time owner stats, but not rasterized pixels: `renderRecipe` and
`renderSheet` still flatten the same colored slots. The primary's independent
double render confirms every output byte is identical to the pre-F3 fixture,
so the frame-0 and sheet `.sha256` sidecars were correctly left unchanged.

## PRIMARY double-render results (previous PENDING cell — now filled)

`pnpm dev render --file test/goldens/fixtures/anim-duo.px.json --out
<tmp>/anim-duo.png --export --pretty` — primary ran twice in two isolated
workspaces, each with the root `px.style.json` beside the fixture:

| Output | Double-render SHA-256 (uppercase) | Match |
| --- | --- | --- |
| frame PNG (`anim-duo.sha256`) | `7C0C9B385E9EE8FDF45B5DD31D15BFBA5DF51DB4A51CCFBE5AA78C18E591B559` | `SAME_FRAME=True` — unchanged from committed sidecar |
| sheet PNG (`anim-duo.sheet.sha256`) | `6189229CD0B26E818484F8704F5936723E3393E28C3257B7D8DAB3AE63F1B045` | `SAME_SHEET=True` — unchanged from committed sidecar |
| frame meta | `2B06659805300403EAEA52C5B60420334E70AF377F4F15149ECC15891AD49731` | `SAME_META=True` |
| sheet meta | `A03E79366DEBDB177F83E1824B7FC79AADEA9AFEB51866F81AA70A08E41268D2` | `SAME_SHEET_META=True` |

Because both PNG digests match the committed sidecars byte-for-byte, no sidecar
re-baseline and no golden-test change was necessary.

## Commands and exit codes

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck, lint (one pre-existing warning at `test/recipe/version-1-2.test.ts:50`), 119 files / 1043 tests, and build all pass. |
| `pnpm exec vitest run test/lint/feedback-cli.test.ts test/goldens/render.test.ts test/mcp/meta-export.test.ts` | denied → RESOLVED BY PRIMARY | The subagent shell returned `permission.rejected` (non-retryable). The primary ran the command verbatim; after the test-harness fix below it passes, and `pnpm verify` runs all three files in CI. |
| `pnpm dev render --file test/goldens/fixtures/anim-duo.px.json --out <tmp>/anim-duo.png --export --pretty` | 0 (primary, twice) | Double-render digests above; subagent never ran it (PRIMARY-ONLY). |

## Test-harness fix for the four transient failures

At the first invocation the scoped run and `pnpm verify` failed with four
`expected 1 to be +0` errors: `test/mcp/meta-export.test.ts` and
`test/mcp/parity.test.ts` copied only `anim-duo.px.json` into a fresh temp
workspace, so `design.style: "@project"` could not find `px.style.json` there
(`E_STYLE_MISSING`). This is a harness defect, not a product defect. With the
primary's expanded Touches, both helpers now copy the root `px.style.json` into
every temp workspace that renders the fixture, using `copyFileSync` and a repo
root derived from the test file via `import.meta.url`. No assertion, expected
value, product code or other test was changed.

## Baseline integrity

- `test/art/scores.json` and `test/goldens/fixtures/hero.sha256` untouched.
- `lintBlocks`, lint rules, `vitest.config.ts`, `LATEST_RECIPE_VERSION`, archive,
  CI, product docs, spec, plan, metadata, tracks, review and PR files untouched.
- No new dependency; no `git push`/`merge`/`reset`/`checkout`/`amend`.

## Primary verification (conductor-implement)

- Date: 2026-11-19.
- Branch: `feat/20261119-animation-foundations`; R1 phase base `ca92ff2027f03629fd74811be358a7f0534bf651`.
- Tree state at verification: clean except the primary's uncommitted `plan.md` Touches expansion (adding `test/mcp/meta-export.test.ts` and `test/mcp/parity.test.ts`) and the expected untracked `pr.md`.
- Range `ca92ff2..HEAD` contains exactly the two reported commits, `7864ecf` and `1d1c0de`; no merge or unreported commit. Changed paths are the nine files listed in the subagent report, all within Phase R1 Touches as expanded by the primary.
- F1 verified in code: `runRender` now reports `lintCompiledFrames(compileRecipeFrames(effective), lintBackdrop)` in `payload.findings` (so `runCli` strict gating sees frame-1 findings) and writes sheet artifacts only when `effective.frames?.length > 0 && !(args.strict && lintBlocks(frameFindings, true))`. Two new `runCli` integration tests in `test/lint/feedback-cli.test.ts` assert strict exit 3 / `E_LINT_GATE`, `frame === 1`, and no `.sheet.png`/`.sheet.meta.json`, plus non-strict sheet output with identical frame-0 PNG.
- F2 verified: header comment added to `test/recipe/version-1-4.test.ts` explaining it is outside Vitest includes and mirrored in executed unit tests; no assertion changed.
- F3 verified: `anim-duo.px.json` has a declared `body` part and minimal `design` block, with `part: body` on all four ops (required by `E_EMPTY_PART`); validation unchanged.
- Primary re-ran the scoped command denied to the subagent: `pnpm exec vitest run test/lint/feedback-cli.test.ts test/goldens/render.test.ts test/mcp/meta-export.test.ts` — exit 0, 3 files / 25 tests.
- Primary re-ran `pnpm verify` — exit 0: typecheck clean, Biome 224 files with only the pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`, 119 test files / 1043 tests, build clean.
- Primary double-render of the updated fixture in two isolated workspaces (root `px.style.json` beside recipe) produced identical digests: frame PNG `7C0C9B385E9EE8FDF45B5DD31D15BFBA5DF51DB4A51CCFBE5AA78C18E591B559`, sheet PNG `6189229CD0B26E818484F8704F5936723E3393E28C3257B7D8DAB3AE63F1B045`, frame meta `2B06659805300403EAEA52C5B60420334E70AF377F4F15149ECC15891AD49731`, sheet meta `A03E79366DEBDB177F83E1824B7FC79AADEA9AFEB51866F81AA70A08E41268D2`; all four `SAME_*` checks true. Frame/sheet PNG digests match the committed sidecars, so no re-baseline was needed; design/parts/part-tags changed metadata only.
- Protected digests unchanged: `test/art/scores.json` `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; `test/goldens/fixtures/hero.sha256` `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62`.
- All three review findings F1 (Medium, FR-4/AC-4), F2 (Low) and F3 (Low) are RESOLVED. Squash guard eligible: all commits in range were reported by the subagent and none is a merge.

