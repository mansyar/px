# Phase 3 report — Closeout decision and integrated record

Track: `20261119-animation-playback` · Phase: 3 · Date: 2026-11-19
Branch: `feat/20261119-animation-playback`
Base: `688a7b057bd8c942ad855f07dda0a0d32715c707` (phase base)
Head: `688a7b057bd8c942ad855f07dda0a0d32715c707` (HEAD at which all checks
below were run; this evidence-only phase changes no code, so base = verified
HEAD. The evidence files are committed on top afterwards as a docs commit.)

## Result

**blocked** — all six commands were attempted at final HEAD. Three executed
and exited 0; three were rejected by the shell permission layer and were not
retried, rephrased, or worked around per the brief rules. No executed check
failed and no protected baseline changed. The primary agent must run the three
denied commands; until then the track cannot be declared `verified`.

## Commands table (all six verification commands)

| # | Exact command | Exit code | Summary |
| --- | --- | --- | --- |
| 1 | `pnpm verify` | 0 | Chains typecheck → lint → test → build. Typecheck clean; Biome clean except one pre-existing warning in `test/recipe/version-1-2.test.ts` (untouched); 120 test files / 1057 tests pass; build succeeds. |
| 2 | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | denied | `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}`. Not retried (brief rule). Recorded in blockers. |
| 3 | `pnpm vitest run --project goldens` | 0 | First form accepted, so the `pnpm exec` fallback was not used. 1 test file / 6 tests pass. |
| 4 | `node scripts/rubric-report.mjs` | denied | `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}`. Not retried. Recorded in blockers. |
| 5 | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | denied | `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}`. Not retried. Recorded in blockers. |
| 6 | `git diff --name-only b3f984f49374b8ba394afa4d3a708f4a93af67ca..HEAD` | 0 | 24 tracked files listed; no protected path present. Full listing below. |

Supporting checks (permitted, successful):

| Exact command | Exit code | Summary |
| --- | --- | --- |
| `git diff --name-only b3f984f..HEAD -- test/art/scores.json .github .aws package.json pnpm-lock.yaml src/core conductor/archive conductor/product.md conductor/product-guidelines.md` | 0 | Empty — every protected path byte-unchanged vs `b3f984f`. |
| `git status --porcelain` | 0 | Empty before evidence files were written (clean working tree; test runs modified no tracked file). |
| Native reads of the five `.sha256` fixtures | n/a | All five contents match the expected baselines exactly (table below). |

## Acceptance criteria

| Criterion | Evidence | Status |
| --- | --- | --- |
| AC-9 — `pnpm verify` exit 0; scoped coverage ≥80%; `scores.json` SHA unchanged; tracked diff limited to approved Touches | Command 1 exit 0; command 3 exit 0; protected-path diff empty; full diff listing below contains only the active track's approved source/test/docs and Conductor-state files, no protected path. Coverage re-run (command 2) and scores hash (command 5) were denied; prior phase evidence records coverage 95.15% stmts / 86.15% branches / 98.56% funcs / 94.94% lines and SHA `E5CCE080…828D`. | partial — measured items pass; two re-checks denied, pending primary |
| AC-10 — final record states an honest pass/fail with evidence; no score, rationale, digest, golden, archive or CI value re-baselined | `decision.md` verdict `blocked` (honest, not forced); all five golden sidecars match baseline; protected-path diff empty; no source/test/state file edited in this phase. | pass |

## Protected-digest table

| File | Expected / baseline | Observed | Match |
| --- | --- | --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | same (native read) | yes |
| `test/goldens/fixtures/anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` | same (native read) | yes |
| `test/goldens/fixtures/anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` | same (native read) | yes |
| `test/goldens/fixtures/anim-duo.onion0.sha256` | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` | same (native read) | yes |
| `test/goldens/fixtures/anim-duo.onion1.sha256` | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` | same (native read) | yes |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | direct hash denied; byte-identical to base via git diff, digest recorded by Phases 1/2 | yes (by diff) |

## Tracked diff scope (`b3f984f..HEAD`, 24 files)

No protected path appears in this list. The Phase 1/2 implementation files and
the active track's own Conductor state are expected; Phase 3 adds no code.

- `conductor/tracks.md`
- `conductor/tracks/20261119-animation-playback/index.md`
- `conductor/tracks/20261119-animation-playback/metadata.json`
- `conductor/tracks/20261119-animation-playback/plan.md`
- `conductor/tracks/20261119-animation-playback/spec.md`
- `conductor/tracks/20261119-animation-playback/verification/onion-view.md`
- `conductor/tracks/20261119-animation-playback/verification/phase-1.md`
- `conductor/tracks/20261119-animation-playback/verification/phase-2.md`
- `conductor/tracks/20261119-animation-playback/verification/timeline.md`
- `docs/animation.md`
- `src/cli/args.ts`
- `src/cli/commands.ts`
- `src/cli/main.ts`
- `src/mcp/tools.ts`
- `src/meta/index.ts`
- `src/render/views.ts`
- `test/cli/onion.test.ts`
- `test/goldens/fixtures/anim-duo.onion0.sha256`
- `test/goldens/fixtures/anim-duo.onion1.sha256`
- `test/goldens/render.test.ts`
- `test/mcp/meta-export.test.ts`
- `test/mcp/parity.test.ts`
- `test/mcp/reachability.test.ts`
- `test/render/views.test.ts`
- `vitest.config.ts`

Absent from the diff (confirmed unchanged): `.github/`, `.aws/`,
`package.json`, `pnpm-lock.yaml`, `src/core/`, `conductor/archive/`,
`conductor/product.md`, `conductor/product-guidelines.md`,
`test/art/scores.json`, and the three pre-existing golden sidecars.

## Honest limitations

- No playback runtime, interpolation, tweening, easing, frame generation,
  overlay/ghost mode, GUI, or GIF/APNG/video/HTML encoder — these are out of
  scope for the track, not passes claimed here.
- No new CLI verb or MCP tool; `v:1` response envelope is additive-only.
- Scoped coverage (command 2), rubric report (command 4) and the scores hash
  (command 5) were denied and are not re-asserted as freshly measured; their
  status rests on prior-phase evidence and git-diff byte-identity.
- Only the Windows host was exercised; cross-OS golden-hash CI was not run.
- Evidence-only phase: no source, test, golden, score, archive, CI or Conductor
  state file was edited (only the two evidence files named in the brief).

## Deviations

- None in code or scope. The brief's bare `verification/decision.md` and
  `verification/phase-3.md` paths were written under
  `conductor/tracks/20261119-animation-playback/verification/`, the only
  permitted evidence location, matching Phases 1 and 2.

## Notes

- The `pnpm verify` pass (120 files / 1057 tests) includes the full Vitest
  suite, so the goldens and all Phase 1/2 tests are covered by an executed,
  green command even though command 2 was denied.
- The three denied commands are environment-permission denials, not test
  failures; the primary agent should run them exactly as written and attach
  their output before accepting the phase.
- Verdict is `blocked` (not `failed`): nothing failed, but not all configured
  checks executed.
