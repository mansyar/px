# Phase 2 report — Timeline metadata and agent-facing surfaces

Track: `20261119-animation-playback` · Phase: 2 · Date: 2026-11-19
Branch: `feat/20261119-animation-playback`
Base: `74e39d24a9344ad7ca43002cf66d5f491119a072`
Head: `0b483407d14521243666f8a074f57f1bd92ed827`

## Result

Implementation complete and test-first: the three new parity/reachability tests
and the timeline tests failed before their implementations and pass after.
`pnpm verify` (typecheck → lint → test → build) and `pnpm coverage` both exit 0.
The only unresolved item is the brief's **secondary** scoped Vitest command,
which the shell permission layer rejected; per the phase rules it was not
retried or worked around and is reported in Blockers. Phase 1 was accepted by
the primary with the identical non-blocking blocker pattern.

## Tasks

| Task | Status | Commit |
| --- | --- | --- |
| P2.T1 — additive timeline metadata | done | `9ddbf79fd42cbe2ca0cba7ff4158a20b69794eff` |
| P2.T2 — agent-facing descriptions, parity, docs | done | `7a210eb5be048e630d0d0c04edfe227ad1a8686f` |
| P2.T3 — evidence and regression proof | done | `0b483407d14521243666f8a074f57f1bd92ed827` |

## Commands table

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm verify` | 0 | typecheck clean; Biome clean (one pre-existing warning in `test/recipe/version-1-2.test.ts`, untouched); 120 files / 1057 tests pass; build succeeds |
| `pnpm coverage` | 0 | 120 files / 1057 tests pass; global 95.15% statements, 86.15% branches, 98.56% functions, 94.94% lines; `src/meta/index.ts` 95.08% / 89.18% / 100% / 95.08% |
| `pnpm exec vitest run test/mcp/meta-export.test.ts test/mcp/parity.test.ts` | denied | shell permission rejected; not retried — see Blockers |

## Acceptance criteria

| Criterion | Evidence | Status |
| --- | --- | --- |
| AC-4 — CLI/MCP `--onion` byte-identical envelopes + sibling PNG; no new ListTools tool | `test/mcp/parity.test.ts` onion parity test compares envelopes, `out`, `view`, sibling bytes and MCP image block; `agent-facing animation surfaces` test asserts `MCP_TOOLS` length 11 | pass |
| AC-5 — framed timeline correct; frame 0 omits `duration_ms`; single-frame emits none and stays byte-identical | `test/mcp/meta-export.test.ts`: fixture timeline `120`, mixed/undurated cases, frozen hero meta digest `5420fd7a…` | pass |
| AC-6 — existing fields and sheet PNG unchanged | `test/mcp/meta-export.test.ts` AC-6 block compares the projection with `timeline` removed; protected sheet PNG digest unchanged | pass |
| AC-7 — onion golden double-render; three protected digests unchanged | Phase 1 `test/goldens/render.test.ts` still green; framed export double render in `test/mcp/meta-export.test.ts`; digests below | pass |
| AC-8 — CLI help + MCP description mention `--onion`; docs updated; envelope unchanged | `src/cli/main.ts` help usage/flags; `src/mcp/tools.ts` description/schema/`argvFor`; `docs/animation.md`; `v:1` additive-only | pass |
| AC-9 — `pnpm verify` 0; coverage ≥80%; `scores.json` SHA unchanged; diff limited to Touches | commands table above; coverage table in `timeline.md`; `git diff 74e39d2..HEAD` touches 7 files only | pass |

## Golden / protected digest results

All five protected digests unchanged (none appear in the diff):

| File | SHA-256 |
| --- | --- |
| `hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| `anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` |
| `anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` |
| `anim-duo.onion0.sha256` (Phase 1) | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` |
| `anim-duo.onion1.sha256` (Phase 1) | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` |

`scores.json`, archives, CI config and `package.json` dependencies are unchanged.
Working tree clean at hand-off (`git status --porcelain` empty).

## Evidence paths

- `conductor/tracks/20261119-animation-playback/verification/timeline.md`
- `conductor/tracks/20261119-animation-playback/verification/phase-2.md`

## Deviations

- `test/mcp/reachability.test.ts` — brief line 32 explicitly requires removing
  `onion` from `NOT_AGENT_FLAGS` and adding the `px_render` mapping row, but the
  file is not listed in Touches. Required for FR-6 / AC-4.
- `conductor/tracks/20261119-animation-playback/verification/` — the brief's
  bare `verification/timeline.md` and `verification/phase-2.md` paths were
  interpreted as the only permitted evidence location under the track, matching
  Phase 1.

## Notes

- `src/cli/commands.ts` is in Touches but needed no Phase 2 edit: Phase 1 had
  already plumbed `--onion`, and `buildMetadata` derives the timeline from
  `recipe.frames`, so the existing `writeMetadata` calls carry it automatically.
- The MCP `onion` description documents the real `prev | selected | next`
  panel layout, matching `renderOnion` in `src/render/views.ts`.
- The frozen hero meta SHA (`5420fd7a…`) proves single-frame byte identity.
- The secondary scoped Vitest command should be run by the primary; `pnpm verify`
  already executes both named files as part of the full suite.

```json
{
  "phase": "2",
  "status": "blocked",
  "tasks": [
    {
      "id": "P2.T1",
      "status": "done",
      "commits": ["9ddbf79fd42cbe2ca0cba7ff4158a20b69794eff"]
    },
    {
      "id": "P2.T2",
      "status": "done",
      "commits": ["7a210eb5be048e630d0d0c04edfe227ad1a8686f"]
    },
    {
      "id": "P2.T3",
      "status": "done",
      "commits": ["0b483407d14521243666f8a074f57f1bd92ed827"]
    }
  ],
  "commits": [
    "9ddbf79fd42cbe2ca0cba7ff4158a20b69794eff",
    "7a210eb5be048e630d0d0c04edfe227ad1a8686f",
    "0b483407d14521243666f8a074f57f1bd92ed827"
  ],
  "files_changed": [
    "src/meta/index.ts",
    "src/cli/main.ts",
    "src/mcp/tools.ts",
    "docs/animation.md",
    "test/mcp/meta-export.test.ts",
    "test/mcp/parity.test.ts",
    "test/mcp/reachability.test.ts",
    "conductor/tracks/20261119-animation-playback/verification/timeline.md",
    "conductor/tracks/20261119-animation-playback/verification/phase-2.md"
  ],
  "verification": {
    "command": "pnpm verify",
    "exit_code": 0,
    "evidence": "conductor/tracks/20261119-animation-playback/verification/phase-2.md"
  },
  "deviations": [
    {
      "file": "test/mcp/reachability.test.ts",
      "reason": "Brief requires removing onion from NOT_AGENT_FLAGS and adding the px_render mapping row, but the file is not in Touches"
    },
    {
      "file": "conductor/tracks/20261119-animation-playback/verification/",
      "reason": "Bare verification/ paths from the brief written to the only permitted track evidence directory, matching Phase 1"
    }
  ],
  "blockers": [
    {
      "command": "pnpm exec vitest run test/mcp/meta-export.test.ts test/mcp/parity.test.ts",
      "why": "Secondary scoped verification command from the brief was rejected by the shell permission layer; both named files already pass under pnpm verify",
      "expected": "2 files pass (meta-export and parity tests), confirming the timeline and onion-sibling assertions in isolation"
    }
  ],
  "notes": "Implementation complete; pnpm verify (120 files / 1057 tests) and pnpm coverage (meta 95.08% stmts / 89.18% branches / 100% funcs / 95.08% lines) exit 0. Test-first confirmed. All protected digests, scores.json, archives and CI unchanged. Status is blocked only for the denied secondary scoped command, which the primary must run."
}
```

## Primary verification

Verified independently by the primary agent (conductor-implement Section 4.7).

| Check | Result |
| --- | --- |
| Working tree clean at hand-off | Yes |
| Commits since phase base conventional, no merges | Yes — 4 conventional commits (`9ddbf79`, `7a210eb`, `0b48340`, `e3d8a0f`) |
| Files vs Touches | All in Touches except `test/mcp/reachability.test.ts` (required by brief task P2.T2.1 to remove `onion` from `NOT_AGENT_FLAGS` and add the `px_render` mapping row), recorded as a deviation |
| `pnpm verify` | exit 0 — 120 files / 1057 tests pass; only pre-existing lint warning in `test/recipe/version-1-2.test.ts` |
| `pnpm exec vitest run test/mcp/meta-export.test.ts test/mcp/parity.test.ts` | exit 0 — 2 files / 16 tests pass (subagent shell blocker resolved at primary level) |
| AC-4 | Confirmed — `px_render` gains an `onion` integer param + `argvFor` mapping; MCP_TOOLS count asserted at 11 (no new tool); CLI/MCP byte-identical envelopes and sibling PNG in parity tests |
| AC-5 | Confirmed — timeline frame entries, frame-0 omission of `duration_ms` with `start_ms: 0`, single-frame emits no `timeline` key; frozen hero meta digest |
| AC-6 | Confirmed — `v`, sheet, anchors, offset, palette, `recipe_hash` unchanged; `timeline` added only via conditional spread |
| AC-7 | Confirmed — Phase 1 golden double-render still green; framed export double render asserted; all three protected digests unchanged |
| AC-8 | Confirmed — `--help` usage/flags and `px_render` description/schema mention `--onion`; `docs/animation.md` updated; envelope `v:1` additive-only |
| AC-9 | Confirmed — `pnpm verify` 0; scoped coverage reported by subagent ≥80% (meta 95.08/89.18/100/95.08); `scores.json` SHA `E5CCE080…`; diff limited to approved files |
| Protected digests / scores / archives / CI / dependencies | All unchanged; no diff in `.aws`, `.github`, `package.json`, `pnpm-lock.yaml`, `src/core`, `src/render`, `conductor/product.md`, `conductor/tech-stack.md` |

Primary verdict: **verified** — the sole blocker was a permission denial on the secondary command, now resolved by the primary running it successfully. Accepting Phase 2.
