# Re-score Evidence — Publishable Gate Close (Phase 2)

**Track:** `20261118-gate-close-flash-lite` — Publishable Gate Close
**Phase:** 2 — Re-score the four affected passes and recompute the verdict
**Date:** 2026-11-18
**Branch:** `feat/20261118-gate-close-flash-lite`
**Phase base:** `1190aca9ca7811e780bb621a7f9872afe1d7812c`
**Instrument of record:** `gemini-3.5-flash-lite` only (no instrument switching, no cross-instrument comparison)
**Result:** `verified` — phase work complete and honestly recorded; this does NOT mean the gate passed (the gate decision belongs to Phase 3)

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

## 3. Digests (P2.T1 — resolved)

The authoritative source PNG / recipe digests recorded by the Phase 1 render
harness (`.conductor/evidence/art-v2/generation-summary.json`):

| Asset | `recipe_sha256` = `committed_sha256` |
| --- | --- |
| humanoid | `27fd32e616389b767d112ae68992ae2912eeca57cf8cd9f7daa7a70aacea0c2a` |
| scene | `f48e72d7ecfda015c5de9623ed2e732cc648a2675d7b0b950406af7f42457a24` |

Per-file SHA-256 of the four faithful artifact PNGs, computed by the primary
(the subagent's shell denied the file-hash command; resolved in the brief's
PRIMARY-RESOLVED section):

| Artifact | SHA-256 |
| --- | --- |
| `humanoid.8x.png` | `46A6D3A220A83E87D96C75095D14ACC57D5B40869890CF8A1985B2EED69C8A1A` |
| `humanoid.debug.png` | `1A9C1847C1030FEF4BA5F8A0AF77554AB4B541BF67DF6ACB884BA3FDFAAC391A` |
| `scene.8x.png` | `477601A09A16563FE01BC0FCCC06659D7CC8A454A83D812CF6ACE7C37F5685AB` |
| `scene.debug.png` | `931E132002ADFDEA9594921C7A025038B5D9CAC1582249D0ACF059DCCF2A77EC` |

`test/art/scores.json` SHA-256 changed from baseline
`E930EC6D0CBEC27144CA9E020C9B1603BC183E7CFFF7BF9FAE87C54A5F50AC07` to
`F3127641F9B9136730F4DB62D0745E76225D9DCD57FF14BC8C2FEC8AB28B1F5D`
(scorer-written, primary-reported).

## 4. Scorer rows (P2.T2 — primary-run, complete)

Criterion order: silhouette / value_separation / lighting / edge_language /
cluster_discipline / palette_craft. All fields below were machine-written by
`scripts/rubric.mjs --model gemini-3.5-flash-lite --replace`; no criterion score
or rationale was hand-edited. Full rationales live in `test/art/scores.json`.

| Asset / pass | Artifact | Criterion scores | Attempts | `model` | `note` |
| --- | --- | --- | --- | --- | --- |
| humanoid A | `humanoid.8x.png` | 4 / 3 / 3 / 2 / 4 / 2 | 4 (3 transient retries) | gemini-3.5-flash-lite | gate-close-flash-lite humanoid A |
| humanoid B | `humanoid.debug.png` | 4 / 3 / 3 / 3 / 4 / 3 | 1 | gemini-3.5-flash-lite | gate-close-flash-lite humanoid B |
| scene A | `scene.8x.png` | 5 / 4 / 3 / 3 / 4 / 3 | 1 | gemini-3.5-flash-lite | gate-close-flash-lite scene A |
| scene B | `scene.debug.png` | 5 / 4 / 3 / 3 / 4 / 3 | 1 | gemini-3.5-flash-lite | gate-close-flash-lite scene B |

The three original below-floor `lighting=2` failures are cleared (all four
passes now score `lighting=3`). However, humanoid A regressed from 3 to 2 on
`edge_language` and `palette_craft`.

## 5. Verdict (scorer-recomputed, honest)

From `test/art/scores.json` `verdict` (machine-recomputed by the scorer):

| Field | Value |
| --- | --- |
| `result` | `fail` |
| `mean` | 3.73 |
| `threshold_mean` | 3.5 (cleared) |
| `min_allowed` | 3 (floor clause binds) |
| `failures` | 2 — `humanoid/A/edge_language=2`, `humanoid/A/palette_craft=2` |
| `basis` | `independent` |

The mean clears the 3.5 threshold but the floor clause still binds. No pass was
forced and no score was re-rolled to fish for better results. Scores are on the
flash-lite instrument and are not comparable to the 3.25 frozen baseline. The
invest/accept decision is Phase 3's responsibility.

**P2.T3 no-fabrication check (primary):** the ten unaffected passes were compared
JSON-equal against the pre-track snapshot — `unaffected_checked=10 diffs=0`.
Only the four intended passes changed, all with `model=gemini-3.5-flash-lite`.

## 6. Primary-run command table

| Command | Run by | Exit | Summary |
| --- | --- | --- | --- |
| `node scripts/rubric.mjs --asset humanoid --pass A --artifact .conductor/evidence/art-v2/humanoid.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid A"` | primary | 0 | 4/3/3/2/4/2, OK on try 4 (transient retries) |
| `node scripts/rubric.mjs --asset humanoid --pass B --artifact .conductor/evidence/art-v2/humanoid.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite humanoid B"` | primary | 0 | 4/3/3/3/4/3, try 1 |
| `node scripts/rubric.mjs --asset scene --pass A --artifact .conductor/evidence/art-v2/scene.8x.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene A"` | primary | 0 | 5/4/3/3/4/3, try 1 |
| `node scripts/rubric.mjs --asset scene --pass B --artifact .conductor/evidence/art-v2/scene.debug.png --model gemini-3.5-flash-lite --replace --note "gate-close-flash-lite scene B"` | primary | 0 | 5/4/3/3/4/3, try 1 |
| `Get-FileHash -Algorithm SHA256 -Path … (four artifacts)` | primary | 0 | resolved the P2.T1 hash blocker; values in §3 |
| `node scripts/rubric-report.mjs` | primary (read-only) | not run by subagent | primary-only; this subagent did not run it |
| `pnpm verify` | subagent | 0 | typecheck → lint → 119 files / 1028 tests → build; one pre-existing non-failing lint warning at `test/recipe/version-1-2.test.ts:50` |

Credentials were supplied from the credential file via `PX_RUBRIC_CREDENTIALS`;
the key was never printed or exposed to this subagent.

## 7. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / AC-4 | four affected passes machine-re-scored with flash-lite `--replace` | §4; all four `model=gemini-3.5-flash-lite`, machine-written | done |
| NFR-1 | instrument of record flash-lite only | §4 model column; no instrument switch | done |
| NFR-2 | no hand-edited criterion scores/rationales | §4, §5; scorer wrote all fields, no re-roll | done |
| NFR-5 | credentialed scoring primary-run only | §6 run-by column | done |
| P2.T1 | faithful artifact digests recorded | §1–§3; paths confirmed, four SHA-256 values recorded | done |
| P2.T3 | no score fabrication | §5; `unaffected_checked=10 diffs=0` | done |
| FR-5 / AC-5 | honest recomputed verdict | §5; fail/3.73/2 failures, not forced | done (Phase 3 owns decision) |

## 8. Notes / deviations

- `test/art/scores.json` `verdict.note` is a stale free-text string: it still
  describes the pre-track state ("Mean 3.67 … 3 below-floor criterion scores
  remain (humanoid A/B lighting=2, scene A lighting=2)") while the structured
  `result`/`mean`/`failures` fields are correctly recomputed (`fail`/3.73/2).
  This subagent did not edit it — the brief reserves metadata edits in
  `scores.json` to the primary. Flagged here for Phase 3 to reconcile.
- The digests in §3's first table are the source-PNG/recipe digests from
  `generation-summary.json`, not hashes of the `.8x.png`/`.debug.png` files;
  they are labelled explicitly to avoid conflating the two.
- `generation-report.txt` / `scoring*.log` contain stale pre-track digests and
  were not used as a source of truth for the four affected artifacts.
