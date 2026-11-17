# Phase 1 verification — Frozen-instrument craft diagnostic (chest)

- Track: `20261117-craft-application` (Craft Application)
- Phase: 1 — Frozen-instrument craft diagnostic (chest)
- Date: 2026-11-17
- Branch: `feat/20261117-craft-application`
- Base commit: `cd43a51f2a6f716f844847616839c046f9dcf713`
- Head commit (implementation): `02824ec650f327afe59a081c6761feedb831fe8f` (phase work);
  `99b2d090356bd07ff1a2d2662f25f2dc64be4f52` recorded the head before scoring completion.
  Both were cut from base `cd43a51f2a6f716f844847616839c046f9dcf713`; this evidence file is
  finalized in a follow-up documentation commit after the primary-run scores were appended.
- Result: **verified** — all T1-T4 work complete; frozen-instrument scores and the lever
  verdict are recorded in `verification/diagnostic.md` §4-§5 (NFR-5; primary-run dry-run,
  `test/art/scores.json` untouched).

## Commands run

| Layer | Command | Exit | Summary |
|---|---|---:|---|
| baseline | `git diff --no-index --stat test/art/v2/chest/chest.px.json test/art/diagnostic/chest/chest-baseline.px.json` | 0 | no output — byte-identical copy |
| T1 render | `pnpm exec tsx src/cli.ts render --file test/art/diagnostic/chest/chest-baseline.px.json --out .conductor/evidence/craft-application/chest-baseline.png --debug --strict` | 0 | sha256 `0f5976fc…c55a`, 48x48; info BANDING + `W_PASS_NOOP` only |
| T1 upscale | `pnpm exec tsx scripts/upscale.mjs .conductor/evidence/craft-application/chest-baseline.png --out .conductor/evidence/craft-application/chest-baseline.8x.png --factor 8` | 0 | 384x384 |
| T2 generate | `pnpm exec tsx test/art/diagnostic/chest/make-candidates.mjs` | 0 | deterministic L/E/C recipes from H (no new dependency) |
| T3 render H | `pnpm exec tsx src/cli.ts render --file test/art/diagnostic/chest/chest-H.px.json --out .conductor/evidence/craft-application/chest-H.png --debug --strict` | 0 | sha256 `7dbabcea…25a`, strict-clean |
| T3 render L | `pnpm exec tsx src/cli.ts render --file test/art/diagnostic/chest/chest-L.px.json --out .conductor/evidence/craft-application/chest-L.png --debug --strict` | 0 | sha256 `1bca726e…354`, strict-clean |
| T3 render E | `pnpm exec tsx src/cli.ts render --file test/art/diagnostic/chest/chest-E.px.json --out .conductor/evidence/craft-application/chest-E.png --debug --strict` | 0 | sha256 `5b20c43a…f73`, strict-clean |
| T3 render C | `pnpm exec tsx src/cli.ts render --file test/art/diagnostic/chest/chest-C.px.json --out .conductor/evidence/craft-application/chest-C.png --debug --strict` | 0 | sha256 `b7f09c49…235`, strict-clean |
| T3 upscale | `pnpm exec tsx scripts/upscale.mjs .conductor/evidence/craft-application/chest-H.png --out .conductor/evidence/craft-application/chest-H.8x.png --factor 8` | 0 | 384x384 |
| T3 upscale | `pnpm exec tsx scripts/upscale.mjs .conductor/evidence/craft-application/chest-L.png --out .conductor/evidence/craft-application/chest-L.8x.png --factor 8` | 0 | 384x384 |
| T3 upscale | `pnpm exec tsx scripts/upscale.mjs .conductor/evidence/craft-application/chest-E.png --out .conductor/evidence/craft-application/chest-E.8x.png --factor 8` | 0 | 384x384 |
| T3 upscale | `pnpm exec tsx scripts/upscale.mjs .conductor/evidence/craft-application/chest-C.png --out .conductor/evidence/craft-application/chest-C.8x.png --factor 8` | 0 | 384x384 |
| regression | `pnpm verify` | 0 | typecheck, lint, 119 files / 1028 tests, build all pass; one **pre-existing** `noNonNullAssertion` warning in `test/recipe/version-1-2.test.ts:50` (untouched by this phase) |

### Primary-run credentialed scoring (NFR-5, reported by the primary)

The subagent did not run `node scripts/rubric.mjs`. The primary ran the ten exact commands
from `verification/diagnostic.md` §6 with the frozen instrument credential and `--dry-run`;
stdout was appended to the phase brief. Criterion order: `silhouette / value_separation /
lighting / edge_language / cluster_discipline / palette_craft`.

| Layer | Command | Exit | Summary |
|---|---|---:|---|
| scoring | `node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-baseline.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic baseline A"` | 0 | `3/3/1/2/4/2` — reproduces canonical baseline A exactly |
| scoring | `node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-baseline.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic baseline B"` | n/a | `EXHAUSTED` (endpoint `fetch failed`/503 across 12 retries); canonical recorded B `3/3/1/2/4/2` used unchanged |
| scoring | `node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-H.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic hue-ramp A"` | 0 | `3/3/4/2/4/4` |
| scoring | `node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-H.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic hue-ramp B"` | 0 | `3/4/4/4/4/4` |
| scoring | `node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-L.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic warm-cool A"` | 0 | `3/4/5/4/4/5` |
| scoring | `node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-L.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic warm-cool B"` | 0 | `3/4/4/3/4/4` |
| scoring | `node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-E.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic edge-hierarchy A"` | 0 | `2/4/3/2/3/4` |
| scoring | `node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-E.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic edge-hierarchy B"` | 0 | `3/4/4/2/4/4` |
| scoring | `node scripts/rubric.mjs --asset chest --pass A --artifact .conductor/evidence/craft-application/chest-C.8x.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic combination A"` | 0 | `3/4/3/2/3/3` |
| scoring | `node scripts/rubric.mjs --asset chest --pass B --artifact .conductor/evidence/craft-application/chest-C.debug.png --model gemini-4-hydrogen --replace --dry-run --note "diagnostic combination B"` | n/a | `EXHAUSTED` (endpoint unavailable across 12 retries); C reported A-only, non-decisive |

Two `EXHAUSTED` calls are availability failures disclosed rather than suppressed findings;
no rerolls were cherry-picked and no score was revised.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-1 | 2-3 chest diagnostic candidates using existing ops | `test/art/diagnostic/chest/chest-{H,L,E,C}.px.json`; recipes use only `ascii_blit`, `light`, `auto_outline` | done |
| FR-2 | Faithful A/B views | `chest-*.8x.png` (pass A) + `chest-*.debug.png` (pass B) for baseline and all 4 candidates; NN factor 8, identical source recipes | done |
| FR-3 | Frozen-instrument scores with per-criterion deltas | `verification/diagnostic.md` §4: real A/B scores and Δ vs baseline for all candidates; two availability failures disclosed | done |
| FR-6 | Honest verdict | `verification/diagnostic.md` §5: L validated, H partial, E/C not validated; gate remains fail | done |
| NFR-1 | Frozen instrument only | Primary-run commands all specify `--model gemini-4-hydrogen`; no other instrument used | done |
| NFR-3 | No new deps, recipes <~2000 ops | No manifest change; 5-7 ops per recipe | done |
| NFR-5 | Credentialed scoring primary-run, never printed | Subagent never invoked rubric; primary ran ten `--dry-run` commands with credential never printed | done |
| NFR-6 | Reproducible evidence | Artifacts + digests in `verification/diagnostic.md` §3; generator script checked in | done |
| AC-1 | diagnostic.md records >=2 candidates with A/B artifacts and frozen scores vs baseline | 4 candidates with A/B artifacts, digests and frozen scores vs baseline in `verification/diagnostic.md` | done |

## Golden hash results

- Baseline 1x render: `0f5976fc1352e2d00983f662010166d85dec4f37b9f939f9974f69221191c55a`
  = canonical `chest.sha256` in `test/art/scores.json` → **unchanged**.
- `test/art/scores.json` and all golden fixtures: untouched; canonical verdict still
  fail / mean 3.25 / floor 3.0 / 22 below-floor.
- Candidate digests (1x and debug) are recorded in `verification/diagnostic.md` §3.

## Evidence paths

- Recipes: `test/art/diagnostic/chest/chest-baseline.px.json`, `chest-H.px.json`,
  `chest-L.px.json`, `chest-E.px.json`, `chest-C.px.json`, plus unchanged `px.style.json`
  and generator `make-candidates.mjs`.
- Binaries (gitignored): `.conductor/evidence/craft-application/chest-<name>.png`,
  `.conductor/evidence/craft-application/chest-<name>.8x.png`,
  `.conductor/evidence/craft-application/chest-<name>.debug.png` for
  `<name>` in `baseline, H, L, E, C`.
- Report: `conductor/tracks/20261117-craft-application/verification/diagnostic.md`.

## Deviations

- Dropped the baseline's `harmonize` op from all candidates. It flattened every part to
  one tone and erased the ascii grids' authored ramps; `design.values` and the grids stay
  unchanged, so the declared value plan is still faithfully expressed. Required to make
  any lever visible at all.
- Candidate C uses `light` with `rim:"none"`; a second rim pass on top of the material
  seams double-counted edge shadows and tripped `PILLOW_SHADE` under `--strict`.
- An exploratory `where:"inner"` outline in E/C was removed for the same reason.
- Exploratory `chest-H-noharm.png` / `.debug.png` were left in the gitignored evidence dir.

## Notes

- Ceiling-probe results came from a **different** instrument and are hypotheses only;
  they were not transferred into any verdict. The frozen-instrument verdict in
  `diagnostic.md` §5 is independent and refutes the literal-edge-hierarchy hypothesis.
- Baseline B and C B were unavailable across 12 retries each; the canonical recorded
  baseline B was reused unchanged and C is reported A-only as non-decisive.
- `test/art/scores.json` is unchanged: the publishable gate remains fail. Applying the
  validated L lever to other v2 assets and re-scoring all 14 passes belong to FR-4/FR-5,
  outside this phase.
