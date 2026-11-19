# Integrated verification — Animation Inspection & Playback

Track: `20261119-animation-playback` · Branch: `feat/20261119-animation-playback`
Base: `b3f984f49374b8ba394afa4d3a708f4a93af67ca` · Final verification HEAD: `48f88dd8157469ccf677e7b4cd5ce795b25baad0`
Date: 2026-11-19

## Result

**PASS.** All three phases are verified, every configured verification command
exits 0 at the final HEAD, every acceptance criterion is met, and no protected
artifact was changed.

## Phase status

| Phase | Name | Result | Checkpoint | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Onion-skin neighbor-strip view | verified | `3285f28` | verification/phase-1.md, verification/onion-view.md |
| 2 | Timeline metadata and agent-facing surfaces | verified | `8b80d91` | verification/phase-2.md, verification/timeline.md |
| 3 | Closeout decision and integrated record | verified (PASS) | `c69576e` | verification/phase-3.md, verification/decision.md |

Progress: 3/3 phases verified, 8/8 tasks done.

## Integrated commands at final HEAD

| # | Exact command | Exit | Result |
| --- | --- | --- | --- |
| A | `pnpm verify` | 0 | typecheck → lint → test → build; 120 files / 1057 tests pass; only pre-existing lint warning in `test/recipe/version-1-2.test.ts` |
| B | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | Statements 95.03%, Branches 85.96%, Functions 98.38%, Lines 94.84% — all ≥80% |
| C | `pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts` | 0 | 4 files / 30 tests pass — all phase-specific targeted commands combined |
| D | `pnpm exec vitest run --project goldens` | 0 | 1 file / 6 tests pass — determinism layer |
| E | `node scripts/rubric-report.mjs` | 0 | `mean 3.82 · pass` on `gemini-3.5-flash-lite`, matching frozen scores |
| F | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `e5cce08003a5f35ee8782225275e491d8edaa2729c871a1bcd685c73166c828d` |

## Acceptance criteria

| ID | Criterion | Status |
| --- | --- | --- |
| AC-1 | `--onion 1` succeeds; invalid index / non-framed cases fail with actionable error | pass — Phase 1 CLI tests |
| AC-2 | Sibling `<stem>.onion<index>.png`, no overwrite, double-render SHA, blank boundaries | pass — Phase 1 golden + CLI tests |
| AC-3 | `--onion` + `--debug`/`--export` rejected; normal bytes unchanged | pass — Phase 1 CLI tests |
| AC-4 | CLI/MCP `--onion` byte-identical envelopes + sibling PNG; no new tool | pass — Phase 2 parity + reachability tests (MCP_TOOLS still 11) |
| AC-5 | Framed `timeline` correct; frame 0 omits `duration_ms`; single-frame emits none, byte-identical | pass — Phase 2 meta-export tests + frozen hero digest |
| AC-6 | Existing metadata fields and sheet PNG unchanged | pass — Phase 2 projection comparison |
| AC-7 | Onion golden double-render twice; three protected digests unchanged | pass — Phase 1 golden test + digest table |
| AC-8 | CLI `--help` + MCP `px_render` mention `--onion`; docs updated; envelope additive-only | pass — Phase 2 help/schema/docs diff |
| AC-9 | `pnpm verify` 0; scoped coverage ≥80%; scores SHA unchanged; diff limited to Touches | pass — commands A, B, F + scope listing |
| AC-10 | Honest pass/fail record; no score, rationale, digest, golden, archive or CI re-baseline | pass — verification/decision.md |

## Protected baselines — verified unchanged

| Artifact | Required value | Result |
| --- | --- | --- |
| `hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | unchanged |
| `anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` | unchanged |
| `anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` | unchanged |
| `anim-duo.onion0.sha256` | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` | unchanged |
| `anim-duo.onion1.sha256` | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` | unchanged |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | unchanged (direct SHA-256 confirmed) |
| Existing archives, `.github/`, `.aws/` | byte-identical to base | absent from tracked diff |
| `package.json` / `pnpm-lock.yaml` | single runtime dependency `@modelcontextprotocol/sdk` 1.32.2 | unchanged |

## Honest limitations

- No playback runtime, player UI, interpolation, tweening, easing or frame generation.
- No ghosted overlay mode, GIF/APNG/video encoder, static HTML preview, new CLI verb,
  new MCP tool, recipe-schema change, frame-0 byte change, or sheet-packing change.
- Only the Windows host was exercised locally; cross-OS golden-hash CI was not run.
- These are deliberate out-of-scope items from the approved spec, not silent omissions.

## Conclusion

The implementation is complete and verified across all layers (static, unit,
integration, smoke, determinism). Ready for doc sync and `conductor-review`.
