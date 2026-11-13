# Phase R1 — Review Fixes: Verification

**Status:** verified
**Date:** 2026-11-13

## Claim

The four review findings are fixed and each fix is demonstrated, without changing
the measurement or the recorded verdict.

## Fixes

| Finding | Change | Demonstration |
| --- | --- | --- |
| F1 | `--view`/`--repeat` require `--merge-views` | `node scripts/calibrate.mjs --views --asset chest --view 1x` → `--view and --repeat select single slots; add --merge-views…`, exit 1 |
| F2 | committed report written only when complete or `--replace` | run with `PX_RUBRIC_CREDENTIALS=/nonexistent/creds.json` → exit 1, message `the committed report was left untouched`, `git diff verification/views/` empty |
| F3 | generator removes the intermediate upscale | `ls .conductor/evidence/views/chest` → `1x.png 8x.png debug.png` |
| F4 | `--replace` parsed | reachable opt-in for F2; unknown-argument error no longer raised |

## Determinism after the generator change

```sh
node scripts/calibrate/views.mjs
git diff --exit-code conductor/tracks/20261113-rubric-view-comparison/verification/views/artifacts.json
```

Exit 0, no output: regenerating reproduces the registered hashes, so the artifacts
the comparison scored are the artifacts the repository now describes.

## Checks

```sh
pnpm verify   # 861 tests, typecheck, lint, build — exit 0
```

## Covers

F1, F2, F3, F4.
