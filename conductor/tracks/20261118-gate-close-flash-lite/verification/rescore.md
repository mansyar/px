# Re-score Evidence — Publishable Gate Close (Phase 2)

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 2 — Re-score the four affected passes and recompute the verdict
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Phase base:** `1190aca9ca7811e780bb621a7f9872afe1d7812c`
**Instrument of record:** `gemini-3.5-flash-lite` only (no instrument switching, no cross-instrument comparison)
**Result:** `blocked` — credentialed re-scoring and verdict recomputation are primary-only (P2.T2/P2.T3)

## 1. Faithful artifact presence (P2.T1)

The four affected artifacts were confirmed present on disk by listing
`.conductor/evidence/art-v2/`. Phase 1 regenerated all seven assets; this phase
did not re-render or modify them.

| Pass | Artifact path | Present |
| --- | --- | --- |
| humanoid A | `.conductor/evidence/art-v2/humanoid.8x.png` | yes |
| humanoid B | `.conductor/evidence/art-v2/humanoid.debug.png` | yes |
| scene A | `.conductor/evidence/art-v2/scene.8x.png` | yes |
| scene B | `.conductor/evidence/art-v2/scene.debug.png` | yes |

## 2. Render / upscale commands (from `generation-summary.json`)

| Asset | Render command | Upscale command (pass A) | Debug sheet (pass B) |
| --- | --- | --- | --- |
| humanoid | `node dist/cli.js render --file test/art/v2/humanoid/humanoid.px.json --out .conductor/evidence/art-v2/humanoid.png --debug --strict` | `node scripts/upscale.mjs .conductor/evidence/art-v2/humanoid.png --out .conductor/evidence/art-v2/humanoid.8x.png --factor 8` | emitted by `--debug` → `.conductor/evidence/art-v2/humanoid.debug.png` |
| scene | `node dist/cli.js render --file test/art/v2/scene/scene.px.json --out .conductor/evidence/art-v2/scene.png --debug --strict` | `node scripts/upscale.mjs .conductor/evidence/art-v2/scene.png --out .conductor/evidence/art-v2/scene.8x.png --factor 8` | emitted by `--debug` → `.conductor/evidence/art-v2/scene.debug.png` |

Both entries in `generation-summary.json` report `exit_code: 0`,
`recipe_sha256 === committed_sha256`, and `blocking_findings: 0`
(humanoid 35 info findings; scene 66 info findings).

## 3. Digests (P2.T1)

Authoritative digests recorded by the Phase 1 render harness
(`.conductor/evidence/art-v2/generation-summary.json`) — these are the source PNG
/ recipe digests paired with the two changed assets:

| Asset | `recipe_sha256` = `committed_sha256` |
| --- | --- |
| humanoid | `27fd32e616389b767d112ae68992ae2912eeca57cf8cd9f7daa7a70aacea0c2a` |
| scene | `f48e72d7ecfda015c5de9623ed2e732cc648a2675d7b0b950406af7f42457a24` |

Per-file SHA-256 of the four faithful artifact PNGs (`.8x.png`, `.debug.png`)
is **PENDING-primary**: this subagent's shell denies the file-hash command
(`Get-FileHash -Algorithm SHA256 …` → `permission.rejected: shell`), and node is
explicitly out of scope. No digest value has been fabricated or guessed. The
primary should compute and append the four values with:

```
Get-FileHash -Algorithm SHA256 -Path .conductor/evidence/art-v2/humanoid.8x.png,.conductor/evidence/art-v2/humanoid.debug.png,.conductor/evidence/art-v2/scene.8x.png,.conductor/evidence/art-v2/scene.debug.png
```

| Artifact | SHA-256 |
| --- | --- |
| `humanoid.8x.png` | PENDING-primary |
| `humanoid.debug.png` | PENDING-primary |
| `scene.8x.png` | PENDING-primary |
| `scene.debug.png` | PENDING-primary |

## 4. Scorer rows (P2.T2 — primary only)

The four affected passes are re-scored with `--model gemini-3.5-flash-lite
--replace`; every per-pass `model`/`note`/score field and the verdict are written
by `scripts/rubric.mjs`. This subagent did not run the scorer and did not edit
`test/art/scores.json`.

| Asset / pass | Artifact | Command | Model | Status |
| --- | --- | --- | --- | --- |
| humanoid A | `humanoid.8x.png` | `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid A"` | gemini-3.5-flash-lite | PENDING |
| humanoid B | `humanoid.debug.png` | `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid B"` | gemini-3.5-flash-lite | PENDING |
| scene A | `scene.8x.png` | `node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene A"` | gemini-3.5-flash-lite | PENDING |
| scene B | `scene.debug.png` | `node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene B"` | gemini-3.5-flash-lite | PENDING |

Retry 503/429/non-JSON replies with backoff; never switch instruments.

## 5. Verdict (recomputation pending)

`test/art/scores.json` remains the pre-track record: verdict `fail`, mean 3.67,
`failures` = humanoid A `lighting=2`, humanoid B `lighting=2`, scene A
`lighting=2`. It is untouched by this subagent. The primary will append the
machine-recomputed mean/failures/result after the four commands above run; no
pass is forced and no criterion value is hand-edited. Scores are on the
flash-lite instrument and are not comparable to the 3.25 frozen baseline.

## 6. Local verification run by this subagent

- `pnpm verify` → exit 0 (typecheck → lint → 119 test files / 1028 tests → build).
  Biome reported one pre-existing, non-failing warning at
  `test/recipe/version-1-2.test.ts:50` (`lint/style/noNonNullAssertion`), not
  modified here.
- `node scripts/rubric.mjs` / `node scripts/rubric-report.mjs`: NOT run (primary-only;
  shell denies general `node` and the credential is never exposed to a subagent).

## 7. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / AC-4 | four affected passes machine-re-scored on flash-lite with `--replace` | §4 — PENDING, primary runs the four commands | blocked |
| NFR-1 | instrument of record flash-lite only | §4 model column; no instrument switch | satisfied pending scores |
| NFR-2 | no hand-edited criterion scores/rationales | `scores.json` untouched by subagent; scorer writes all fields | satisfied pending scores |
| NFR-5 | credentialed scoring primary-run only | §4/§6; no scorer run, no credential access | satisfied |
| P2.T1 | faithful artifact digests recorded | §1–§3; paths confirmed, harness digests recorded; per-file SHA-256 PENDING-primary | partial |

## 8. Notes / deviations

- Artifact-file SHA-256 values are intentionally left PENDING rather than
  inferred; the only available hash command was denied by the shell, so no
  value is asserted. Recorded as a blocker for the primary.
- The digests in §3 are the source-PNG/recipe digests from
  `generation-summary.json`, not hashes of the `.8x.png`/`.debug.png` files;
  they are labelled explicitly to avoid conflating the two.
- `generation-report.txt` / `scoring*.log` contain stale pre-track digests and
  were not used as a source of truth for the four affected artifacts.
