# Phase R1 — Review Fixes: verification

**Date:** 2026-11-13
**Covers:** F1, F2, F3
**Result:** verified

| finding | fix | evidence |
| --- | --- | --- |
| F1 | `candidates.json` and `probe.json` store POSIX paths | 0 backslash characters in either file; `warm-cool.recipe` reads `.conductor/evidence/…` |
| F2 | a merged probe report records `merged_candidates` | field added to the merge path in `scripts/calibrate.mjs` |
| F3 | a registry entry without artifacts raises a named error instead of a `TypeError` | guard added at the top of `runProbes` |

## Determinism and integrity after the fixes

The generator was re-run with rendering enabled, so the registry carries artifact
paths again:

```
9 / 9 match
```

Every registered recipe still hashes to its recorded sha256, which means the
evidence files that produced the committed scores are byte-identical to what was
scored. `pnpm verify` exits 0 with 861 tests, and `git diff test/art/scores.json`
is empty.
