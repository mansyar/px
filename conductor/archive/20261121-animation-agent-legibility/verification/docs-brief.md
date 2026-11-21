# Docs-only brief — Animation Agent Legibility Verification

- Track: `20261121-animation-agent-legibility`
- Phase: 1 (artifact consumed by Phase 2)
- Branch: `chore/20261121-animation-agent-legibility`
- Base / head: `7519bf0c79dae45045663dd8e9ba77291fccdad0`

This file is the **sole material** the fresh agent receives in Phase 2. It is
docs-only: every statement below is copied from, or a faithful condensation of,
the agent-facing surfaces listed in the source manifest. No engine code, CLI
behavior, MCP behavior, human doc, golden, rubric, threshold or CI setting is
changed by this track.

## Asset goal (the task the fresh agent must perform)

Author a **16×16 four-frame flame** recipe using only this brief. Frame 0 is the
base; declare three additional frames so the recipe has four frames total. Give
each declared frame a sensible `id` and a positive integer `duration`, then
report the recipe path. Work through the `px frame` / `px_frame` authoring
surface; do not read any other project file.

## Source manifest (every source file consulted)

| # | Exact path | What it supplied |
| --- | --- | --- |
| 1 | `src/cli.ts` (CLI entrypoint, captured via `pnpm exec tsx src/cli.ts frame --help`) | The CLI help JSON, including all six `px frame <subcommand>` usage strings and the global `flags` / `exit_codes` / `runtime` blocks. |
| 2 | `src/mcp/tools.ts` | The `px_frame` entry in `TOOL_DEFINITIONS`: full description and full `inputSchema.properties` key list, plus `required: ['subcommand', 'file']`. Also the `STRICT` and `FILE` schema constants. |
| 3 | `docs/animation.md` | The human authoring contract: frame model, six-subcommand table, command syntax, selectors/invariants, worked example, and the export/sheet/timeline contract. |
| 4 | `docs/art-profiles.md` | Consulted: the canvas-size profile table (a 16×16 canvas is `tiny`) and why thresholds are regime-based. Contributes no frame syntax. |
| 5 | `docs/lint-thresholds.md` | Consulted: what each lint rule catches and the `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` / `JAGGY_LINE` vocabulary used by the strict gate. Contributes no frame syntax. |
| 6 | `conductor/product-guidelines.md` | Canonical-description rule (MCP descriptions are canonical; human docs must not drift, and a shared source generates both), terminology (`recipe`, `op`, `frame`, `timeline`, `onion view`), response envelope, and exit codes. |

Captures are reproducible with:

```
pnpm exec tsx src/cli.ts frame --help
```

The plain `--help` already emits JSON; `--help --json` is **not** supported (it
returns `E_USAGE: --json requires a value`, exit 1). The MCP surface is read
statically from `src/mcp/tools.ts` (lines 220–269 for the tool definition and
505–524 for parameter mapping); no live MCP session is required to read the
description.

## Canonical-description rule (from `conductor/product-guidelines.md`)

> MCP tool descriptions are the canonical agent-facing documentation, and human
> docs must not drift from them; a shared source generates both.

Canonical terms that must not be substituted: **recipe** (the `.px.json` file),
**op** (one drawing operation), **frame** (one compiled image in a framed
recipe), **timeline** (the additive metadata block projecting frame indices and
durations). Response envelope is `v:1`: success `{ "v": 1, "ok": true, ... }`,
failure `{ "v": 1, "ok": false, "error": {...} }`. Exit codes: `0` success,
`1` caller error, `2` internal error, `3` lint gate under `--strict`.

## Surface A — CLI help JSON (verbatim, from `pnpm exec tsx src/cli.ts frame --help`)

```json
{"v":1,"ok":true,"command":"help","usage":["px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...|name|json-object] [--parts json-or-file] [--design json-or-file] [--profile name] [--derive-ramps] [--synthesize name=#hex:steps]... [--force]","px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]","px edit --file <path> [--layer <id>] (--id <op-id> | --op-index n) --ops <json-array> [--out <path>]","px frame add --file <path> (--from <index|id> | --ops <json-array>) [--id <id>] [--duration n] [--layer <id>] [--out <path>]  # --ops wins over --from when both are given","px frame edit --file <path> --frame <index|id> [--layer <id>] (--op-index n | --replace) --ops <json-array> [--out <path>]","px frame remove --file <path> --frame <index|id> [--out <path>]  # frame 0 cannot be removed","px frame list --file <path>  # one row per frame, including frame 0","px frame set-duration --file <path> --frame <index|id> [--duration n] [--out <path>]  # omit --duration to clear","px frame move --file <path> --frame <index|id> --to <index> [--out <path>]  # --to is zero-based within the declared frames","px anchor --file <path> --name <anchor> --x n --y n [--out <path>]","px inspect --file <path> [--region x,y,w,h]... [--summary]","px render --file <path> --out <png> [--swap from=to]... [--debug [--backdrop hex|null]] [--export] [--blockout | --values n | --onion <index>]  # --export on a framed recipe also writes <stem>.sheet.png + <stem>.sheet.meta.json (with an additive timeline); views write a sibling PNG, never --out","px diff --file <path> --against <png|sha256:hex> [--out <png>]","px synthesize --file <path> --family <name> --from <hex> --steps n [--force]","px validate --file <path>","px brief <subject> --size n  # subject: character, prop or scene; writes nothing","px critique --file <path> [--streak n --previous <64-hex>]  # read-only ranked gap report","px fix --file <path> --finding n [--sha256 <digest>]  # apply finding n (zero-based) and re-render"],"commands":["init","draw","edit","frame","anchor","inspect","render","diff","synthesize","validate","brief","critique","fix"],"flags":["--subject","--size","--values","--onion","--frame","--to","--duration","--replace","--blockout","--pretty","--color","--force","--help","--debug","--strict","--export","--summary","--derive-ramps","--parts","--design","--profile","--backdrop","--against","--family","--from","--steps","--synthesize","--swap","--finding","--sha256","--streak","--previous"],"exit_codes":{"0":"success","1":"caller error","2":"internal error","3":"lint gate under --strict"},"runtime":{"node":"24.22.2","pinned_major":24,"supported":true}}
```

The six frame usage lines, extracted verbatim for convenience:

```
px frame add --file <path> (--from <index|id> | --ops <json-array>) [--id <id>] [--duration n] [--layer <id>] [--out <path>]  # --ops wins over --from when both are given
px frame edit --file <path> --frame <index|id> [--layer <id>] (--op-index n | --replace) --ops <json-array> [--out <path>]
px frame remove --file <path> --frame <index|id> [--out <path>]  # frame 0 cannot be removed
px frame list --file <path>  # one row per frame, including frame 0
px frame set-duration --file <path> --frame <index|id> [--duration n] [--out <path>]  # omit --duration to clear
px frame move --file <path> --frame <index|id> --to <index> [--out <path>]  # --to is zero-based within the declared frames
```

## Surface B — MCP `px_frame` (verbatim description + schema from `src/mcp/tools.ts`)

Description:

> Author animation frames in a v1.4 recipe. The subcommand picks one of add, edit, remove, list, set-duration or move; all other parameters map to the matching px frame flags. Frame 0 is the base and cannot be removed; --from clones the base or another frame, and explicit --ops take precedence over --from. Omit --duration to clear a frame duration.

`inputSchema.properties` (every key, with its verbatim description where one
exists):

| Property | Type / shape | Verbatim description |
| --- | --- | --- |
| `subcommand` | string, `enum: ['add','edit','remove','list','set-duration','move']` | "The frame operation to perform." |
| `file` | string (`FILE`) | "Recipe path, resolved against the server cwd." |
| `out` | string | "Optional path to write the recipe to, leaving the source untouched." |
| `frame` | `anyOf: [string, integer]` | "Frame to address: 0 for the base, a logical index from 1, or an exact frame id." |
| `from` | `anyOf: [string, integer]` | "Clone source for add: a frame index or id." |
| `ops` | `anyOf: [array, string]` | "Op objects or compact tuples, as an array or a JSON string." |
| `op_index` | integer | "Zero-based op index to replace in a frame." |
| `layer` | string | "Layer holding the ops; defaults to the first layer." |
| `to` | integer | "Zero-based destination index for move." |
| `duration` | number | "Frame duration in milliseconds; a positive integer. Omit it to clear." |
| `replace` | boolean, `default: false` | "Replace the whole ops list instead of one op index." |
| `id` | string | "Id to assign to a newly added frame." |
| `strict` | boolean, `default: false` (`STRICT`) | "Fail the call when a lint finding blocks; defaults to false." |

`required: ['subcommand', 'file']`. `strict` is appended to the CLI argv by the
shared adapter (`src/mcp/tools.ts`, the `if (strict) argv.push('--strict')`
after the per-tool switch), so it is available on `px_frame` like every other
tool. Parameter mapping: `op_index` → `--op-index`; `subcommand` is the CLI's
second positional, not a flag.

## Surface C — `docs/animation.md` authoring contract (faithful condensation)

Frame model (verbatim key lines):

> A recipe may declare extra frames alongside its frame 0. Frame 0 is the
> top-level `layers` every recipe already has; `frames` holds **only** the
> additional frames, so a single-frame recipe has no `frames` key at all. Both
> kinds of frame share one canvas, one palette and one design block — a frame
> never re-declares them.
>
> `frames` requires version 1.4. `id` names a frame for lint findings and sheet
> metadata; `duration` is recorded for a future playback slice and is **never**
> interpreted by the compiler. Frame 0 has no declared id.

Six subcommands (verbatim table rows):

| Subcommand | Purpose |
| --- | --- |
| `add` | create a declared frame from a `--from` clone and/or explicit `--ops`; `--id` and `--duration` optional |
| `edit` | replace one op (`--op-index`) or the whole ops list (`--replace`) in a declared frame |
| `remove` | delete a declared frame by id or index; frame 0 is refused |
| `list` | report one row per frame, including frame 0, with index, id, duration and layer/ops counts |
| `set-duration` | set a positive integer duration; omit `--duration` to clear it |
| `move` | reorder a declared frame to a zero-based `--to` position inside `frames` |

MCP paragraph (verbatim):

> Over MCP the same surface is one tool, `px_frame`, with parameters
> `subcommand`, `file`, `out`, `id`, `from`, `ops`, `op_index`, `layer`, `frame`,
> `to`, `duration` and `replace` (plus the standard `strict` flag shared by the
> other tools). `subcommand` and `file` are required; the rest are optional and
> map to the same-named CLI flag (`op_index` → `--op-index`). `ops` accepts op
> objects or compact tuples, as an array or a JSON string. Each call returns the
> same `v:1` envelope as its CLI equivalent, and the recipe bytes are identical.

Selectors and invariants (faithful condensation of the "Selectors and
invariants" section):

- `--frame` and `--from` address a frame by logical index or exact id: `0` is
  the base, logical `i + 1` is `frames[i]`. A declared id always wins over the
  index reading — a frame whose id is `"5"` is selected by `--frame 5` /
  `--from 5` even when its position differs, including after `move`/`remove`.
  With no id match, `0` is the base and a canonical number is a logical index.
- `add` requires at least one source: `--from` and/or `--ops`; neither is
  `E_USAGE`. When both are given, `--ops` wins and the clone source is ignored.
- Frame 0 is immutable: no command can edit, remove, retime or move it. It is
  only a read-only clone source for `frame add --from 0`.
- `--to` is a zero-based position inside `frames`, not a logical frame index;
  `--to 0` means "first declared frame".
- `set-duration` with no `--duration` clears the key; durations must be positive
  integers.
- Ops default to the first layer; `--layer <id>` selects another. Bad ids,
  unknown targets, out-of-range indices and malformed ops fail before any
  write, leaving the recipe unchanged.

Worked example (verbatim), which the agent may adapt for a flame:

```
px frame add --file walk.px.json --from 0 --id step --duration 120
px frame set-duration --file walk.px.json --frame step --duration 80
px frame list --file walk.px.json
px render --file walk.px.json --out walk.png --export
```

Export contract (faithful condensation): `px render --file <recipe> --out
<png> --export` on a framed recipe writes four files — `<stem>.png` (frame 0),
`<stem>.meta.json` (single-frame projection plus an additive `timeline` block),
`<stem>.sheet.png` (every frame packed into one left-to-right row), and
`<stem>.sheet.meta.json` (projection plus additive `sheet` block). The sheet is
a pure function of the recipe. Authoring commands change only the recipe, never
export artifacts.

## Rules for the fresh agent

- Use only this brief; do not consult other files.
- Prefer batched ops and one command per mutation; every rejected operation
  writes nothing.
- Report the exact tool calls used, in order, and the final recipe path.
