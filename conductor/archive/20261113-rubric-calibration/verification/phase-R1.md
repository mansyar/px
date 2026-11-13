# Phase R1 — Review Fixes: verification

**Date:** 2026-11-13
**Covers:** F2, F3, F5, F6

## Result: verified

| finding | fix | evidence |
| --- | --- | --- |
| F2 | The report is copied into `verification/calibration/` and `docs/rubric.md` cites that path | the cited file is tracked; `git ls-files` lists it |
| F3 | The calibration section states that the cluster and palette `low` variants are both checkerboards and names the within-pair comparison as the finding | `docs/rubric.md`, Calibration |
| F5 | `spawnSync` no longer passes an args array with `shell: true`; Windows goes through `cmd.exe /d /s /c` | no `DEP0190` warning on a full regeneration |
| F6 | "Rules use `node` only" replaced with a sentence about Node built-ins | `docs/rubric.md`, Calibration |

## Determinism

The generator was re-run after the `spawnSync` change and the variant artifacts
compared by hash of hashes:

```
before: 1377fb60ea7ebe8854d1100b026f1bd460958ed4ccdd8564d112b5e18a19a430
after:  1377fb60ea7ebe8854d1100b026f1bd460958ed4ccdd8564d112b5e18a19a430
```

Twelve recipes, twelve 1× renders, twelve 8× upscales and twelve debug sheets,
byte-identical.

## Checks

`pnpm verify` exit 0 — 861 tests, typecheck, lint, build. `test/art` unchanged.
