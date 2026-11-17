# Phase R1 verification — coverage scope and fix-rationale truth

Base `020f544`. Branch `feat/20261117-authoritative-design-intent`.
Commits: `189d5cc` (R1.T1), `d0340f0` (R1.T2).

## R1.T1 — enlarge the measured scope and make the new modules real tests

`vitest.config.ts` coverage `include` was widened by exactly three paths —
`src/brief/**`, `src/critique/**`, `src/render/views.ts` — with the four
original paths retained. No threshold was changed, no exclude widened, no
`v8 ignore` comment added, and no runtime dependency added. `test/render/**/*.test.ts`
was registered with the `unit` project so the new narrow test directory runs.

### Coverage before → after

| Scope | Before scope fix (stmts / branch / funcs / lines) | After include only, before tests | After R1.T1 + R1.T2 |
|---|---|---|---|
| All files | 94.88 / 85.70 / 98.34 / 94.66 (117 files, 1012 tests) | 94.25 / 84.45 / 97.95 / 93.99 | **95.09 / 85.89 / 98.51 / 94.87** (119 files, 1024 tests) |
| `src/brief/templates.ts` | not included | 92.85 / **81.25** / 100 / 92.59 | 92.85 / **81.25** / 100 / 92.59 |
| `src/critique/index.ts` | not included | 80.92 / **64.17** / 79.89 / 80.92 | 97.93 / **89.55** / 100 / 97.82 |
| `src/render/views.ts` | not included | 96.82 / **65.90** / 100 / 96.82 | 100 / **81.81** / 100 / 100 |

Every newly included file clears 80% on **both** statements and branches; the
global gate remains 80/80/80/80 and passes on the enlarged list.

### Exact test files added / extended

- `test/critique/pure-branches.test.ts` (new): direct `buildCritique` cases for a
  recipe with no design (five `noTarget`/fallback arms), a directly built empty
  canvas (`W_CRITIQUE_EMPTY`, empty fingerprint, bounds-null arm), faced planes
  (lighting agreement path), lint-driven cluster fixes (`count` present and
  absent, banding evidence), `none` edge treatments, and the `boundFindings`
  criterion/op tie-break. Six tests, all asserting report content.
- `test/render/views.test.ts` (new): `viewPath` with and without a `.png` stem,
  `parseSteps` bounds and missing-count error, flat-only palette `blockout`
  preserving original slots, `renderValues` posterise bytes plus `renderView`
  dispatch equality, and rejection of a truncated RGBA buffer. Five tests.
- `test/critique/gap-report.test.ts` (extended): one CLI-driven test pinning the
  edge fix rationale to the emitted op (R1.T2 below).

At the intermediate point with only the include list enlarged, `critique/index.ts`
branches were 64.17% and `views.ts` 65.90% — confirming the previous green number
was measured on a scope that omitted these modules. Real behavioural tests, not
import smoke tests or ignore comments, moved both above the gate.

## R1.T2 — fix rationale matches the emitted op

`src/critique/index.ts` edge_language fix rationale (was):

> `Edge-pixel classes do not carry their declared treatments; harmonize re-applies light, edges and values.`

(now):

> `Edge-pixel classes do not carry their declared treatments; the emitted auto_outline pass redraws those edges on the target layer.`

The emitted op is `auto_outline` (`mode: '4-way'`, `where: 'inner'`, width 1), so
the rationale now names that pass as a full concrete sentence. The added test in
`test/critique/gap-report.test.ts` asserts `fix.op.op === 'auto_outline'`,
`why` contains `auto_outline`, does **not** contain `harmonize`, and ends as a
sentence. The intended behaviour was `auto_outline` (the comment above the op
already contrasts it with `harmonize`); no design decision was needed.

## Gates and non-regression

- `pnpm verify` — exit 0 (typecheck → lint → test → build; 1024 tests pass; the
  single pre-existing `noNonNullAssertion` warning in
  `test/recipe/version-1-2.test.ts:50` is untouched).
- `pnpm vitest run --coverage` — exit 0 (1024 tests pass; 95.09% statements,
  85.89% branches globally).
- Only five files changed across the two commits: `vitest.config.ts`,
  `test/critique/pure-branches.test.ts`, `test/render/views.test.ts`,
  `src/critique/index.ts`, `test/critique/gap-report.test.ts`.
- No golden, digest, benchmark, score record or rubric file was edited: hero
  digest `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`,
  the four 1.0 benchmark digests, seven v1 and seven v2 art digests, pre/post
  score records, the rubric 10/10 with mean 3.39 fail verdict, AC-14's failed
  status, all eleven MCP tools and their bidirectional reachability remain as
  they were. `plan.md`, `phase-4.md` and all other primary-owned files were not
  touched.

## Primary verification

Independent checks at acceptance, not taken from the executor's report:

- Tree clean apart from this untracked evidence file; two commits since base
  `020f544` (`189d5cc`, `d0340f0`), zero merges, no path outside `src/`,
  `test/`, `vitest.config.ts` or the track's `verification/`.
- `git diff 020f544..HEAD -- test/goldens test/benchmarks test/art` is empty.
- Read `vitest.config.ts` directly: the coverage include now lists
  `src/brief/**`, `src/critique/**` and `src/render/views.ts` alongside the
  original four entries; thresholds and excludes are untouched.
- `pnpm verify` exit 0 (119 collected files, 1024 tests, build clean).
- `pnpm vitest run --coverage` exit 0: statements 95.09%, branches 85.89%,
  functions 98.51%, lines 94.87%, with the enlarged include list.
- The primary corrected the one stale claim in `verification/phase-4.md:71`,
  which said `src/critique/**` was intentionally excluded; it now records that
  exclusion as the historical state and Phase R1 as the fix. `plan.md` already
  described an enlarged include list and needed no correction.
- R1.T2 was checked against emitted op and rationale: the finding's `why`
  names `auto_outline`, the op emitted is `auto_outline`, and a test asserts the
  rationale does not mention `harmonize`.
