# Closeout decision — Animation Inspection & Playback

Track: `20261119-animation-playback` · Phase: 3 · Date: 2026-11-19
Branch: `feat/20261119-animation-playback`
Base (phase base and verified HEAD): `688a7b057bd8c942ad855f07dda0a0d32715c707`

## Verdict

**BLOCKED — not a clean pass, not a failure.** Every verification command that
the shell permission layer accepted exited 0 and every protected baseline that
could be checked is intact. Three of the six required commands were rejected
by the shell permission layer and, per the phase rules, were not retried or
worked around. The primary agent must run those three commands before the
track can be accepted. No check that ran produced a failure; nothing was
re-baselined to force a green result.

This is an honest record, not a forced pass: the measured evidence supports
"pass so far", but the phase cannot be declared `verified` while three
configured checks did not execute. No score, rationale, golden digest,
archive, or CI value was changed.

## Measured evidence (commands that ran)

| Check | Exact command | Exit | Result |
| --- | --- | --- | --- |
| Full verify | `pnpm verify` | 0 | typecheck clean; Biome clean except one pre-existing warning in `test/recipe/version-1-2.test.ts` (untouched); 120 test files / 1057 tests pass; build succeeds |
| Determinism layer | `pnpm vitest run --project goldens` | 0 | 1 test file / 6 tests pass (first form accepted; fallback not needed) |
| Tracked diff scope | `git diff --name-only b3f984f49374b8ba394afa4d3a708f4a93af67ca..HEAD` | 0 | 24 tracked files; no protected path present (see phase-3.md) |
| Protected-path diff | `git diff --name-only b3f984f..HEAD -- test/art/scores.json .github .aws package.json pnpm-lock.yaml src/core conductor/archive conductor/product.md conductor/product-guidelines.md` | 0 | empty — all protected paths byte-unchanged vs `b3f984f` |

## Denied commands (primary must run)

These were rejected by the shell permission layer. They were not retried,
rephrased, or worked around (brief rule: report and set status `blocked`).

| Exact command | Why needed | Expected result |
| --- | --- | --- |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | Re-measure the 80% coverage gate on `src/core/` and `src/lint/` at final HEAD | ≥80% on all four metrics; prior phase evidence recorded 95.15% stmts / 86.15% branches / 98.56% funcs / 94.94% lines globally |
| `node scripts/rubric-report.mjs` | Confirm the recorded publishable-gate verdict is unchanged | `mean 3.82 · pass` on `gemini-3.5-flash-lite`, matching the frozen `test/art/scores.json` record |
| `Get-FileHash -Algorithm SHA256 test/art/scores.json` | Directly confirm the protected scores digest | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |

## Protected baselines — intact

All five golden sidecars were read directly and match the expected content
exactly (no re-baseline):

| File | Content (SHA-256) | Match |
| --- | --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | yes |
| `test/goldens/fixtures/anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` | yes |
| `test/goldens/fixtures/anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` | yes |
| `test/goldens/fixtures/anim-duo.onion0.sha256` | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` | yes |
| `test/goldens/fixtures/anim-duo.onion1.sha256` | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` | yes |

`test/art/scores.json`, `.github/`, `.aws/`, `package.json`, `pnpm-lock.yaml`,
`src/core/`, `conductor/archive/`, `conductor/product.md` and
`conductor/product-guidelines.md` are absent from the full tracked diff —
byte-identical to the base commit. The direct SHA-256 of `scores.json` could
not be recomputed here because `Get-FileHash` was denied; byte-identity is
established by git diff, and the frozen digest recorded by Phases 1 and 2 is
`E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.

## Acceptance criteria at closeout

| Criterion | Evidence | Status |
| --- | --- | --- |
| AC-9 — `pnpm verify` 0; coverage ≥80%; `scores.json` SHA unchanged; diff limited to Touches | `pnpm verify` exit 0; goldens exit 0; protected-path diff empty; full diff limited to the active track's approved files (Phase 1/2 source, tests, docs and Conductor state, no protected paths) | partial — coverage re-run and scores hash were denied; prior evidence records both as passing |
| AC-10 — honest pass/fail with evidence; no re-baseline | This decision plus `phase-3.md`; all five sidecars match baseline, no protected path in diff | pass |

## Limitations (stated honestly)

- **No playback runtime** — this track delivers an inspection view and a
  timing-data projection only; no player, GUI, interpolation, tweening, easing
  or frame generation.
- **No overlay/ghost mode and no encoders** — the onion view is a deterministic
  3-panel strip (prev | selected | next); no GIF/APNG/video/HTML output.
- **No new CLI verb or MCP tool** — `--onion` is a flag and `onion` is a
  property on `px_render`; the `v:1` envelope is additive-only.
- **Three verification commands were denied** by the shell permission layer
  (scoped coverage, rubric report, scores hash). They are not re-run here;
  conclusions about them rest on prior-phase evidence and git-diff proof.
- **Single OS** — only the Windows host was exercised in this phase; the
  cross-OS golden-hash CI job was not run locally.
- This is an **evidence-only** phase: no source, test, Conductor state,
  golden, score, archive or CI file was edited.

## Files written

- `conductor/tracks/20261119-animation-playback/verification/decision.md`
- `conductor/tracks/20261119-animation-playback/verification/phase-3.md`
