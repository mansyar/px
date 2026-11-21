# Agent Legibility — Animation Agent Legibility Verification (Final Evidence Report)

- Track: `20261121-animation-agent-legibility` — Animation Agent Legibility Verification
- Phase: 3 — Record the verdict and confirm scope
- Date: 2026-11-21
- Branch: `chore/20261121-animation-agent-legibility`
- Verification point (base): `4cc05bad23f3a11cd680922da0b15ba868d27842`; Phase 3 checkpoint: `02ed63732c522eebe7f4ce8876751ef75096d334` (report authored at pre-commit working state `e50a92f9f99e1202c21aba5c1ca4377dff60d27c`; final HEAD is re-confirmed at completion/review).
- Covers: FR-8, NFR-2, NFR-3, AC-8, AC-9, AC-10

## Verdict: PASS

The verdict is derived mechanically from the hard gates (strict validation,
export + timeline, byte determinism, and three-surface parity). All four hard
gates pass, so the verdict is **PASS** per FR-8 / NFR-3 / AC-8. The advisory
9-call count, the empty-`ops` art, and the documentation/coverage observations
are recorded below as follow-ups and do **not** affect this verdict.

## Hard-gate summary

| Hard gate | Evidence | Result |
| --- | --- | --- |
| Strict validation — zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL` on both recipes | `determinism.md` §1 — both runs `exit 0`, `ok:true`, `findings:[]`, `warnings:[]`, both counts 0 | PASS |
| Export + timeline — sheet PNG and sheet metadata with `timeline` on both runs | `determinism.md` §2 — `flame.sheet.png` (64×16) and `flame.sheet.meta.json` with `timeline` (`total_ms: 360`) for both runs | PASS |
| Byte determinism — recipe, sheet PNG, timeline metadata identical across runs | `determinism.md` §3 — three required SHA-256 pairs all IDENTICAL | PASS |
| Three-surface parity — six subcommands × twelve flags × CLI/MCP/DOC | `parity-matrix.md` — all six subcommand rows and all twelve flag rows Present on all three surfaces | PASS |

All four hard gates pass; therefore `Verdict: PASS`.

## Artifact index (every artifact)

Docs-only brief and parity (Phase 1):

- `conductor/tracks/20261121-animation-agent-legibility/verification/docs-brief.md` — the docs-only brief given to both agents.
- `conductor/tracks/20261121-animation-agent-legibility/verification/parity-matrix.md` — three-surface parity matrix (six subcommands, twelve flags).

Fresh-agent transcripts and recipes (Phase 2):

- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/calls.md` — run 1 ordered transcript (9 calls, independent authoring).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/calls.md` — run 2 ordered transcript (9 calls, replay).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json` — run 1 recipe (SHA-256 `bb80778c…`).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.px.json` — run 2 recipe (same SHA-256 `bb80778c…`).
- `conductor/tracks/20261121-animation-agent-legibility/verification/agent-runs.md` — benchmark-run report (counts and call sequences).

Sheet PNGs and timeline metadata (Phase 2):

- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.sheet.png` — run 1 sheet PNG (SHA-256 `f69146f2…`).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.sheet.png` — run 2 sheet PNG (same SHA-256 `f69146f2…`).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.sheet.meta.json` — run 1 sheet metadata with `timeline` (SHA-256 `d7b75d7c…`).
- `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.sheet.meta.json` — run 2 sheet metadata with `timeline` (same SHA-256 `d7b75d7c…`).
- Corroborating frame artifacts (also retained, both byte-identical): `.../run-{1,2}/flame.png` (`a901afae…`) and `.../run-{1,2}/flame.meta.json` (`77ac4d79…`, also carries `timeline`).

Determinism and phase evidence:

- `conductor/tracks/20261121-animation-agent-legibility/verification/determinism.md` — strict validation, export, and SHA-256 byte comparison.
- `conductor/tracks/20261121-animation-agent-legibility/verification/phase-1.md` — Phase 1 evidence (brief + parity).
- `conductor/tracks/20261121-animation-agent-legibility/verification/phase-2.md` — Phase 2 evidence (benchmark + determinism).
- `conductor/tracks/20261121-animation-agent-legibility/verification/phase-3.md` — Phase 3 evidence (this verdict and scope confirmation).

## Scope confirmation

- Scope is confirmed by the reproducible command `git diff --name-only 4cc05bad23f3a11cd680922da0b15ba868d27842..HEAD`, which lists only `conductor/` paths with no dependency manifest; the count grows with each Conductor-state commit (review-time snapshot: 27 files / 1978 insertions at HEAD `f4797c6beccda146c3cdcad77ed409d4b803c9aa`).
- `git diff --name-only 4cc05bad23f3a11cd680922da0b15ba868d27842..HEAD` lists no dependency manifest (`package.json`, `pnpm-lock.yaml`, etc.), so no runtime dependency was added (AC-9, AC-10, NFR-2, NFR-4).
- `pnpm verify` exits 0 (one pre-existing, non-blocking Biome warning in `test/recipe/version-1-2.test.ts:50`).

## Follow-ups / gaps

None of the items below was fixed in-track; this is an evidence-only chore.
None is a hard gate, so none changes the PASS verdict.

1. **Empty-ops flame art (`pixel_count: 0`).** Both authored recipes pass strict
   validation but have empty `ops`; the frames are structurally valid yet draw
   no pixels, so no lint findings of any kind are emitted. A follow-up should
   re-author a flame with actual painted ops so the strict gate is exercised
   against real findings. The artifacts were not enriched or repaired here.
2. **Advisory 9-call count (NFR-3).** Each run used 9 tool calls; the count is
   recorded as advisory evidence with no pass/fail threshold and never flips
   the verdict. No threshold was invented for it.
3. **Documentation / coverage observations (Phase 1 parity matrix).** Repeated
   here so they are not lost: (a) the CLI help flat `flags` array omits six
   frame flags that appear in the per-subcommand usage strings (coverage
   difference, not semantic drift); (b) `strict` is declared differently across
   the three surfaces though present on all; (c) `--help --json` is unsupported
   (plain `--help` already emits canonical JSON); (d) DOC prose implies `list`
   accepts `--out` while its syntax line and CLI usage do not; (e) the docs
   instruct that a declared numeric-string frame id is addressed by exact id.
   No CLI help, MCP description, or `docs/animation.md` change was made.
4. **Pre-existing Biome warning.** `pnpm verify` reports one non-blocking
   `lint/style/noNonNullAssertion` warning in `test/recipe/version-1-2.test.ts:50`;
   it predates this track and was not suppressed.
5. **Fresh-agent subcommand coverage is narrower than the parity matrix.** Both
   fresh-agent transcripts (`artifacts/run-1/calls.md`, `artifacts/run-2/calls.md`)
   show the agent invoked only: read brief, `frame --help`, mkdir, `init`,
   `frame add` (×3, durations supplied at add time), `frame list`, write.
   `frame edit`, `frame set-duration`, `frame remove`, `frame move`, and
   `render --export` were NOT invoked by the agent; the four mutation subcommands
   are documentation-and-parity-checked only (FR-7/AC-7), and export was run by
   the verifier in Phase 2. Non-gating: the hard gates do not require every
   subcommand to be exercised by a fresh agent, so `Verdict: PASS` is unchanged.
