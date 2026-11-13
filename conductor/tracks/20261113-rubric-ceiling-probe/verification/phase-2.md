# Phase 2 — Probe Mode: verification

**Date:** 2026-11-13
**Covers:** FR-3, FR-4, FR-5, FR-6, AC-2, AC-6
**Result:** verified

## What the mode does

`node scripts/calibrate.mjs --probes` reads
`verification/ceiling/candidates.json`, and for every registered candidate:

1. reads the recipe and recomputes its sha256 **immediately before each pass**;
2. aborts the run if the hash does not match the registered value;
3. scores pass A on the 8× artifact and pass B on the debug sheet through
   `scripts/rubric.mjs`, with the existing record backup/restore around the run;
4. records both passes, the target criterion's score and the verbatim rationale.

`--only <criterion>` and `--candidate <name>` narrow the selection, and `--merge`
folds a re-score into the existing report.

## Evidence

**Hash guard.** One recipe was modified by a single appended space and re-run:

```
calibrate: recipe hash mismatch for edge_language/hue-shift: 4a63417b… does not
match the registered 88a0c263…
guard exit=1
restored hash matches registry: true
```

No call was made, and the restored recipe hashes to the registered value.

**Unusable credential.** A smoke run with `PX_RUBRIC_CREDENTIALS` pointing at a
missing file marked all nine candidates `unscored`, exited 1, left no backup file,
and left `test/art/scores.json` byte-identical.

**Record safety.** After the full run plus the two-call re-score, `git diff
test/art/scores.json` is empty.

## Defects found and fixed

- `--only` was ignored in probe mode, so a narrowed run still scored all nine. It
  now filters candidates, and `--candidate` filters within a criterion.

## Note on the reply rate

The full run recorded 18 attempted calls and 8 rejected replies — a 44% malformed
rate from the model, absorbed by the retry budget of four. That rate is a property
of the instrument and is reported rather than hidden.
