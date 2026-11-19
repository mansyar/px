# Phase 1 report — Onion-skin neighbor-strip view

Track: `20261119-animation-playback` · Phase: 1
Branch: `feat/20261119-animation-playback` · Base: `3f41fbed3e91479672ebb435c7e918d514e8c79b`

## Tasks

| Task | Status | Commit |
| --- | --- | --- |
| P1.T1 — onion view primitive (`views.ts` + pure tests) | done | `d579bc8bbbc26cf282dc8212855a871b23eba2e6` |
| P1.T2 — `--onion` flag, validation, CLI dispatch (+ CLI tests) | done | `be2c77b281d7266c4b293c70693722686c6a71fd` |
| P1.T3 — golden sidecars, double-render assertion, evidence | done | `5bde9eeeb22c4e7edb4d6da9b28ad27108cd1eb7` |

Test-first was confirmed: before implementation `pnpm verify` failed typecheck
with the missing `parseOnionIndex`/`renderOnion` exports and the unsupported
`{ kind: 'onion' }` view spec.

## Verification

- `pnpm verify` — exit 0. Typecheck clean; Biome clean (one pre-existing warning
  in `test/recipe/version-1-2.test.ts`, untouched); 120 test files / 1052 tests
  pass; build succeeds. This runs both named test files plus the new CLI tests.
- Protected digests re-read and confirmed unchanged; `git status` shows none of
  `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256`, or `test/art/scores.json`
  modified.

## Deviations

- `vitest.config.ts` — added `test/cli/**/*.test.ts` to the unit project include.
  The new CLI tests live in `test/cli/` (per Touches) but that directory was not
  in any project's include, so the tests would never run under `pnpm verify`.
- `test/mcp/reachability.test.ts` — added `onion` to `NOT_AGENT_FLAGS` with a
  comment. Adding `onion` to `VALUE_FLAGS` (required by P1.T2) otherwise breaks
  the "reaches every CLI flag through some tool parameter" test, because the MCP
  `px_render` parameter/mapping is Phase 2 scope. Phase 2 should add the MCP row
  and remove `onion` from `NOT_AGENT_FLAGS`.
- Brief paths `verification/onion-view.md` and `verification/phase-1.md` were
  written under `conductor/tracks/20261119-animation-playback/verification/`,
  the only evidence location permitted by the phase-executor rules.

## Blockers

- `pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts`
  was rejected by the shell permission layer. Non-blocking: `pnpm verify` runs
  the full Vitest suite, which includes both files and the new CLI tests, and
  passed.

## Files changed

`src/render/views.ts`, `src/cli/args.ts`, `src/cli/commands.ts`,
`test/render/views.test.ts`, `test/cli/onion.test.ts` (new),
`test/goldens/render.test.ts`,
`test/goldens/fixtures/anim-duo.onion0.sha256` (new),
`test/goldens/fixtures/anim-duo.onion1.sha256` (new),
`vitest.config.ts`, `test/mcp/reachability.test.ts`,
`conductor/tracks/20261119-animation-playback/verification/onion-view.md` (new),
`conductor/tracks/20261119-animation-playback/verification/phase-1.md` (new).

## Notes for the primary agent

- Phase 2 (MCP exposure) must add an `onion` parameter to `px_render` in
  `src/mcp/tools.ts` (schema, description, `argvFor`) and an MCP reachability
  mapping row, then remove `onion` from `NOT_AGENT_FLAGS` in
  `test/mcp/reachability.test.ts`.
- `--onion` index range is `[0, recipe.frames.length]`, which equals the last
  valid compiled frame index for a framed recipe.

```json
{
  "phase": "1",
  "status": "verified",
  "tasks": [
    {
      "id": "P1.T1",
      "status": "done",
      "commits": ["d579bc8bbbc26cf282dc8212855a871b23eba2e6"]
    },
    {
      "id": "P1.T2",
      "status": "done",
      "commits": ["be2c77b281d7266c4b293c70693722686c6a71fd"]
    },
    {
      "id": "P1.T3",
      "status": "done",
      "commits": ["5bde9eeeb22c4e7edb4d6da9b28ad27108cd1eb7"]
    }
  ],
  "commits": [
    "d579bc8bbbc26cf282dc8212855a871b23eba2e6",
    "be2c77b281d7266c4b293c70693722686c6a71fd",
    "5bde9eeeb22c4e7edb4d6da9b28ad27108cd1eb7"
  ],
  "files_changed": [
    "src/render/views.ts",
    "src/cli/args.ts",
    "src/cli/commands.ts",
    "test/render/views.test.ts",
    "test/cli/onion.test.ts",
    "test/goldens/render.test.ts",
    "test/goldens/fixtures/anim-duo.onion0.sha256",
    "test/goldens/fixtures/anim-duo.onion1.sha256",
    "vitest.config.ts",
    "test/mcp/reachability.test.ts",
    "conductor/tracks/20261119-animation-playback/verification/onion-view.md",
    "conductor/tracks/20261119-animation-playback/verification/phase-1.md"
  ],
  "verification": {
    "command": "pnpm verify",
    "exit_code": 0,
    "evidence": "conductor/tracks/20261119-animation-playback/verification/phase-1.md"
  },
  "deviations": [
    {
      "file": "vitest.config.ts",
      "reason": "test/cli/**/*.test.ts was not in any project include; added so new CLI tests run under pnpm verify"
    },
    {
      "file": "test/mcp/reachability.test.ts",
      "reason": "VALUE_FLAGS now includes onion; added it to NOT_AGENT_FLAGS until Phase 2 adds the px_render MCP parameter and mapping"
    },
    {
      "file": "conductor/tracks/20261119-animation-playback/verification/",
      "reason": "Brief verification/ paths interpreted as the only permitted evidence location under the track verification directory"
    }
  ],
  "blockers": [
    {
      "command": "pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts",
      "why": "Secondary verification command from the brief was rejected by the shell permission layer",
      "expected": "Both named test files pass; pnpm verify already ran the full suite including them and exited 0"
    }
  ],
  "notes": "Phase 1 complete. Test-first confirmed via failing typecheck before implementation. Protected digests unchanged. Phase 2 must add the MCP onion parameter/mapping and remove onion from NOT_AGENT_FLAGS."
}
```

## Primary verification

Verified independently by the primary agent (not solely the phase subagent), per
conductor-implement Section 4.7.

| Check | Result |
| --- | --- |
| Working tree clean at hand-off | Yes — `git status --porcelain` count 0 |
| Commits since phase base are conventional, no merge commits | Yes — 4 conventional commits (`d579bc8`, `be2c77b`, `5bde9ee`, `9a24a2d`) |
| Changed files vs Touches | All in Touches except two justified deviations (`vitest.config.ts` project include for `test/cli/**`; `test/mcp/reachability.test.ts` temporary `NOT_AGENT_FLAGS` entry), both recorded above |
| `pnpm verify` (typecheck → lint → test → build) | exit 0 — 120 files / 1052 tests pass; only pre-existing lint warning in `test/recipe/version-1-2.test.ts` (untouched) |
| `pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts` | exit 0 — 2 files / 14 tests pass (subagent shell blocker resolved at primary level) |
| AC-1 (valid/invalid index, framed requirement) | Confirmed by `test/cli/onion.test.ts` cases (lines 155-180) |
| AC-2 (sibling path, no overwrite, double-render SHA, blank boundaries) | Confirmed by `test/cli/onion.test.ts` lines 99-139 and `test/goldens/render.test.ts` onion case |
| AC-3 (`--debug`/`--export` rejection, normal bytes unchanged) | Confirmed by `test/cli/onion.test.ts` lines 141-153 and byte comparison at 125 |
| Protected golden sidecars byte-identical | Yes — `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256` contents unchanged and not in diff |
| `scores.json` SHA unchanged | Yes — `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| Archives / CI config / `package.json` dependencies unchanged | Yes — no diff in `.aws`, `.github`, or `package.json`; dependency remains `@modelcontextprotocol/sdk` 1.32.2 only |
| Single-compiled view contracts preserved | Yes — `renderView` rejects `onion` explicitly; new frames-aware `renderOnion` has separate dispatch; `renderDebugSheet` untouched |
| No new CLI verb / MCP tool / schema / encoder | Yes — diff limited to render views, CLI args/commands and tests |

Primary verdict: **verified**. Accepting Phase 1.
