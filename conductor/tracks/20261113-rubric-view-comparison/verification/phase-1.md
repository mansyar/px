# Phase 1 — Views and Pre-registration: Verification

**Status:** verified
**Date:** 2026-11-13

## Claim

Six artifacts exist for two assets across three views, their hashes are recorded in
the track before any scoring call, and no asset or recipe changed.

## Commands

```sh
node scripts/calibrate/views.mjs
git diff --stat test/art
```

## Results

```
chest 48x48: 1x 07193f45 · 8x 7429dca7 · debug e81307b2
humanoid 32x32: 1x ebb87295 · 8x 39c25ac8 · debug 50595a47

registered 2 assets x 3 views in conductor/tracks/20261113-rubric-view-comparison/verification/views/artifacts.json
```

Exit code 0. `git diff --stat test/art` produced no output: no asset, recipe or
recorded score changed.

The registry stores the plan alongside the artifacts — two assets, three views, two
repeats, and the tolerance the harness applies (one step per criterion, mean |Δ|
below 0.25). Committing the plan with the hashes is what makes the thresholds
pre-registered rather than reconstructed after the run.

## Covers

FR-1, AC-1.
