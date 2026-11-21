# Phase 1 Evidence — Build the docs-only brief and parity matrix

- Track: `20261121-animation-agent-legibility` — Animation Agent Legibility Verification
- Phase: 1 — Build the docs-only brief and parity matrix
- Date: 2026-11-21
- Branch: `chore/20261121-animation-agent-legibility`
- Base commit: `7519bf0c79dae45045663dd8e9ba77291fccdad0`
- Head commit (pre-commit working head): `7519bf0c79dae45045663dd8e9ba77291fccdad0`
- Result: **verified**

This is an evidence-only chore. No engine, CLI, MCP, human-doc, golden, rubric,
lint-threshold or CI file was changed; only the three files under this track's
verification directory were written.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| capture | `pnpm exec tsx src/cli.ts frame --help` | 0 | Canonical CLI help JSON captured verbatim, including all six `px frame` usage strings and the global `flags`/`exit_codes`/`runtime` blocks. |
| capture | `pnpm exec tsx src/cli.ts frame --help --json` | 1 | Not supported: `E_USAGE: --json requires a value`. Plain `--help` already emits JSON; recorded as a capture caveat. |
| static/determinism | `pnpm verify` | 0 | `typecheck → lint → test → build` all passed. Biome reported 1 pre-existing non-blocking warning (`lint/style/noNonNullAssertion` in `test/recipe/version-1-2.test.ts:50`); 123 files / 1111 tests passed. |
| content assertion | grep: 6 source paths in `docs-brief.md` | 0 | All six consulted source files are listed in the brief's source manifest (`src/cli.ts`, `src/mcp/tools.ts`, `docs/animation.md`, `docs/art-profiles.md`, `docs/lint-thresholds.md`, `conductor/product-guidelines.md`). |
| content assertion | grep: 6 subcommands in `parity-matrix.md` | 0 | `add`, `edit`, `remove`, `list`, `set-duration`, `move` each appear as a matrix row with all three surfaces marked Present. |
| content assertion | grep: 12 frame flags in `parity-matrix.md` | 0 | `file`, `out`, `frame`, `from`, `ops`, `op-index`, `layer`, `to`, `duration`, `replace`, `id`, `strict` each appear as a matrix row with all three surfaces marked Present. |
| scope | `git status --short` | 0 | Only the three verification artifacts are new; no changes to `src/`, `docs/`, goldens, rubric, thresholds or CI. |

## Acceptance criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | The brief exists in the verification directory and lists every source file consulted. | `verification/docs-brief.md`: source manifest table lines 24–31 list all six consulted paths; Surfaces A/B/C reproduce the CLI help JSON, the full `px_frame` description + `inputSchema.properties` key list, and the documented authoring contract; asset goal stated at top. | Pass |
| AC-7 | The parity matrix covers all six subcommands and every frame flag on all three surfaces. | `verification/parity-matrix.md`: "Subcommand matrix" (6 rows × CLI/MCP/DOC) and "Flag matrix" (12 rows × CLI/MCP/DOC), every cell Present; "Parameter mapping" and "Drift notes" sections. | Pass |

Requirement mapping:

- **FR-1 / AC-1 / NFR-1:** satisfied by `docs-brief.md`, which cites the exact
  CLI help JSON command, the `src/mcp/tools.ts` `px_frame` definition, the four
  human-doc/guideline files, and lives entirely under this track's verification
  directory. No artifact was written outside Conductor state.
- **FR-7 / AC-7:** satisfied by `parity-matrix.md`, which maps all six
  subcommands and all twelve frame flags across CLI help, MCP `px_frame` and
  `docs/animation.md`, marks every cell present, and records five verbatim
  drift/caveat observations.

## Evidence paths

- `conductor/tracks/20261121-animation-agent-legibility/verification/docs-brief.md`
- `conductor/tracks/20261121-animation-agent-legibility/verification/parity-matrix.md`
- `conductor/tracks/20261121-animation-agent-legibility/verification/phase-1.md` (this report)

No binary artifacts were produced; nothing was written under `.conductor/evidence/`.

## Deviations

None. All written files are within the phase `Touches`. No product or design
decision was required.

## Notes

- The CLI flat `flags` array in the help JSON omits six frame flags that are
  present in the per-subcommand usage strings; this is recorded in the parity
  matrix as a coverage observation, not a semantic drift. No fix was applied
  (out of scope for an evidence-only track).
- `--help --json` is unsupported; the plain `--help` output is the canonical
  JSON surface and was captured verbatim.
- `strict` is exposed on all three surfaces (CLI global bare switch, MCP
  `STRICT` property, DOC prose) but is not written in any CLI frame usage line;
  recorded in the matrix.
- The single Biome warning in `pnpm verify` is pre-existing in a test file and
  does not fail the command (exit 0); no code was touched to suppress it.
- Task commits: see the structured phase report for task-level commit SHAs.

## Primary verification

- Primary re-ran the exact verification command: `pnpm verify` → exit 0
  (typecheck, Biome with 1 pre-existing non-blocking warning at
  `test/recipe/version-1-2.test.ts:50`, 123 files / 1111 tests, build).
- Diff scope check: clean tree; only the three declared Touches changed between
  the phase base `7519bf0` and HEAD `fce7b0e` — `docs-brief.md`,
  `parity-matrix.md`, `phase-1.md`. No `src/`, `docs/`, golden, rubric, lint
  threshold, CI, or Conductor-state file outside track verification was touched.
- AC-1 and AC-7 checked against `spec.md` lines 93 and 99: both satisfied by the
  cited artifacts and content assertions.
- Result: **verified** (subagent report confirmed independently).
