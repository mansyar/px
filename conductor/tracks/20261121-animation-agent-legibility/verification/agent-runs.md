# Fresh-agent benchmark runs — Animation Agent Legibility Verification

- Track: `20261121-animation-agent-legibility`
- Phase: 2
- Branch: `chore/20261121-animation-agent-legibility`
- Base / head (verification point): `10d3bcdb14ad4834e7f38d8156356b5583844c21`
- Covers: FR-2, FR-3, AC-2, AC-3

This file records the two fresh-agent benchmark runs consumed as evidence in
Phase 2. The authoring was executed by the primary agent before this phase; this
phase does not re-run it and does not modify either run's recipe or transcript.

## What each run received

- **Run 1 (independent authoring):** received **only** the docs-only brief
  (`conductor/tracks/20261121-animation-agent-legibility/verification/docs-brief.md`)
  plus the asset goal — author a 16×16 four-frame flame recipe through the
  `px frame` / `px_frame` surface. No other project file was provided, and the
  agent had no prior conversation context.
- **Run 2 (replay):** received the same docs-only brief **plus run 1's exact
  authoring call sequence** to replay. The agent was fresh (no prior
  conversation) and reproduced the steps verbatim against its own artifact
  directory (`run-2/`).

**Call-count policy (NFR-3):** the call count is recorded as advisory evidence
only. It is never a hard gate and never flips PASS to FAIL; the verdict is
derived solely from the hard gates (strict findings and byte determinism).

## Run 1 — independent authoring

- Artifact directory: `.../verification/artifacts/run-1/`
- Recipe: `.../run-1/flame.px.json` — 16×16, `version: "1.4"`, frame 0 plus
  three declared frames (`flame-flicker-1`, `flame-flicker-2`,
  `flame-flicker-3`) with durations 120 / 100 / 140 ms.
- Ordered call sequence: **9 calls** (copied verbatim from
  `.../run-1/calls.md`):

```
1. read — D:\Projects\px\conductor\tracks\20261121-animation-agent-legibility\verification\docs-brief.md — read the 182-line docs-only brief; sole documentation source.
2. shell — `pnpm exec tsx src/cli.ts frame --help` (workdir D:\Projects\px) — ok: v:1 help JSON with six frame subcommands and global flags/exit codes.
3. shell — `New-Item -ItemType Directory -Force -Path 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1'` (workdir D:\Projects\px) — ok: run-1 directory ensured, no output.
4. shell — `pnpm exec tsx src/cli.ts init --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json' --name flame --width 16 --height 16` (workdir D:\Projects\px) — ok: base frame 0 created, 16x16, layer `base`, 426 bytes.
5. shell — `pnpm exec tsx src/cli.ts frame add --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json' --from 0 --id flame-flicker-1 --duration 120` (workdir D:\Projects\px) — ok: declared frame 1 `flame-flicker-1`, duration 120.
6. shell — `pnpm exec tsx src/cli.ts frame add --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json' --from 0 --id flame-flicker-2 --duration 100` (workdir D:\Projects\px) — ok: declared frame 2 `flame-flicker-2`, duration 100.
7. shell — `pnpm exec tsx src/cli.ts frame add --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json' --from 0 --id flame-flicker-3 --duration 140` (workdir D:\Projects\px) — ok: declared frame 3 `flame-flicker-3`, duration 140.
8. shell — `pnpm exec tsx src/cli.ts frame list --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json'` (workdir D:\Projects\px) — ok: four rows — frame 0 id null, frames 1-3 with the declared ids and durations.
9. write — D:\Projects\px\conductor\tracks\20261121-animation-agent-legibility\verification\artifacts\run-1\calls.md — wrote this ordered 9-line transcript.
```

## Run 2 — replay of run 1's exact sequence

- Artifact directory: `.../verification/artifacts/run-2/`
- Recipe: `.../run-2/flame.px.json` — 16×16, `version: "1.4"`, frame 0 plus
  three declared frames with the same ids and durations as run 1.
- Ordered call sequence: **9 calls** (copied verbatim from
  `.../run-2/calls.md`):

```
# Ordered call transcript (run-2)

1. read `conductor/tracks/20261121-animation-agent-legibility/verification/docs-brief.md` — outcome: loaded the sole docs-only brief (182 lines); it is the only project file read.
2. shell `pnpm exec tsx src/cli.ts frame --help` — outcome: exit 0, `{"v":1,"ok":true,"command":"help",...}` with usage strings, flags, exit_codes (0/1/2/3) and runtime (node 24.22.2, supported true).
3. shell `New-Item -ItemType Directory -Force -Path 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2'` — outcome: directory `run-2` created under `.../verification/artifacts`.
4. shell `pnpm exec tsx src/cli.ts init --file 'conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.px.json' --name flame --width 16 --height 16` — outcome: exit 0, `ok:true`, name `flame`, width 16, height 16, 426 bytes.
5. shell `pnpm exec tsx src/cli.ts frame add --file '.../run-2/flame.px.json' --from 0 --id flame-flicker-1 --duration 120` — outcome: exit 0, `ok:true`, added frame `flame-flicker-1` (duration 120) at index 1.
6. shell `pnpm exec tsx src/cli.ts frame add --file '.../run-2/flame.px.json' --from 0 --id flame-flicker-2 --duration 100` — outcome: exit 0, `ok:true`, added frame `flame-flicker-2` (duration 100) at index 2.
7. shell `pnpm exec tsx src/cli.ts frame add --file '.../run-2/flame.px.json' --from 0 --id flame-flicker-3 --duration 140` — outcome: exit 0, `ok:true`, added frame `flame-flicker-3` (duration 140) at index 3.
8. shell `pnpm exec tsx src/cli.ts frame list --file '.../run-2/flame.px.json'` — outcome: exit 0, `ok:true`, four frames: index 0 (base, id null), 1 `flame-flicker-1` (120), 2 `flame-flicker-2` (100), 3 `flame-flicker-3` (140).
9. write `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/calls.md` — outcome: created this 9-line ordered transcript.
```

## Counts summary

| Run | Mode | Input provided | Ordered calls | Transcript |
| --- | --- | --- | --- | --- |
| 1 | Independent authoring | Docs-only brief + asset goal only | 9 | `.../run-1/calls.md` |
| 2 | Replay of run 1 | Brief + run 1's exact call sequence | 9 | `.../run-2/calls.md` |

Both runs completed a 16×16 four-frame flame recipe from the brief alone, with
no prior project context. Both counts (9) are advisory only (NFR-3).
