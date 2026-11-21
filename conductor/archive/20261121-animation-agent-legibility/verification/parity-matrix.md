# Three-surface parity matrix — `px frame` / `px_frame`

- Track: `20261121-animation-agent-legibility`
- Phase: 1
- Branch: `chore/20261121-animation-agent-legibility`
- Base / head: `7519bf0c79dae45045663dd8e9ba77291fccdad0`

Covers FR-7 / AC-7: all six `frame` subcommands and every frame flag on all
three surfaces. This is a documentation-parity observation only; it does not
change any surface.

## Surfaces and capture method

| Surface ID | Surface | Source | How captured |
| --- | --- | --- | --- |
| CLI | CLI help JSON | `src/cli.ts` | `pnpm exec tsx src/cli.ts frame --help` (exit 0, JSON). Plain `--help` emits JSON; `--help --json` is unsupported (`E_USAGE: --json requires a value`, exit 1). |
| MCP | `px_frame` tool description + `inputSchema` | `src/mcp/tools.ts` | `TOOL_DEFINITIONS` entry at lines 220–269; description verbatim; `inputSchema.properties` key list; `required: ['subcommand','file']`. Parameter mapping at lines 505–524; shared `strict` append at lines 583–585. |
| DOC | Human authoring contract | `docs/animation.md` | "Authoring frames" section (lines 30–90): six-subcommand table, command syntax, MCP paragraph, selectors/invariants. |

Presence rule: a flag is **present** on the CLI surface if it appears in a
`px frame <subcommand>` usage string **or** in the help JSON's global `flags`
array. A subcommand is present if named by the CLI usage/commands, the MCP
`subcommand` enum, or the DOC subcommand table/syntax.

## Subcommand matrix

| Subcommand | CLI (help JSON usage) | MCP (`subcommand` enum) | DOC (`docs/animation.md`) |
| --- | --- | --- | --- |
| `add` | Present — `px frame add …` | Present — enum value `add` | Present — table row + syntax line |
| `edit` | Present — `px frame edit …` | Present — enum value `edit` | Present — table row + syntax line |
| `remove` | Present — `px frame remove …` | Present — enum value `remove` | Present — table row + syntax line |
| `list` | Present — `px frame list …` | Present — enum value `list` | Present — table row + syntax line |
| `set-duration` | Present — `px frame set-duration …` | Present — enum value `set-duration` | Present — table row + syntax line |
| `move` | Present — `px frame move …` | Present — enum value `move` | Present — table row + syntax line |

All six subcommands are present on all three surfaces; no drift.

## Flag matrix

| Flag | CLI (help JSON) | MCP (`px_frame` property) | DOC (`docs/animation.md`) |
| --- | --- | --- | --- |
| `file` | Present — `--file <path>` in all six usage strings; **not** in global `flags` array | Present — `file: FILE` (string), required | Present — "every form takes `--file <recipe>`"; MCP parameter list |
| `out` | Present — `--out <path>` in add, edit, remove, set-duration, move; **not** in global `flags` array | Present — `out` (string) | Present — "--out <path> that writes the result elsewhere"; MCP parameter list |
| `frame` | Present — `--frame <index\|id>` in edit, remove, set-duration, move; also in global `flags` array | Present — `frame` (`anyOf: [string, integer]`) | Present — syntax lines + "Selectors and invariants" |
| `from` | Present — `--from <index\|id>` in add; also in global `flags` array | Present — `from` (`anyOf: [string, integer]`) | Present — add syntax + selectors |
| `ops` | Present — `--ops <json-array>` in add and edit; **not** in global `flags` array | Present — `ops` (`anyOf: [array, string]`) | Present — syntax lines + "ops accepts op objects or compact tuples" |
| `op-index` | Present — `--op-index n` in edit; **not** in global `flags` array | Present — `op_index` (integer), mapped to `--op-index` | Present — edit syntax + "`op_index` → `--op-index`" |
| `layer` | Present — `--layer <id>` in add and edit; **not** in global `flags` array | Present — `layer` (string) | Present — add/edit syntax + ops-default note |
| `to` | Present — `--to <index>` in move; also in global `flags` array | Present — `to` (integer) | Present — move syntax + selectors |
| `duration` | Present — `--duration n` in add and set-duration; also in global `flags` array | Present — `duration` (number) | Present — add/set-duration syntax + invariants |
| `replace` | Present — `--replace` in edit; also in global `flags` array | Present — `replace` (boolean, default false) | Present — edit syntax `(--op-index n \| --replace)` |
| `id` | Present — `--id <id>` in add; **not** in global `flags` array | Present — `id` (string) | Present — add syntax + numeric-string-id observation |
| `strict` | Present — global `flags` array and `exit_codes` (`3`: lint gate under `--strict`); **not** in any frame usage string, but accepted globally as a bare switch (`src/cli/args.ts` `BOOLEAN_FLAGS`) | Present — `strict: STRICT` (boolean, default false); appended to argv by the shared adapter | Present — MCP paragraph: "plus the standard `strict` flag shared by the other tools" |

All 12 frame flags are present on all three surfaces; no flag is absent.

`subcommand` is MCP-only and maps to the CLI subcommand positional (recorded in
the "Parameter mapping" section below), matching the brief's note that it is
not a CLI flag.

## Parameter mapping (MCP → CLI)

| MCP parameter | CLI form |
| --- | --- |
| `subcommand` | second positional after `frame` (`px frame <subcommand>`) |
| `file` | `--file` |
| `out` | `--out` |
| `id` | `--id` |
| `from` | `--from` |
| `ops` | `--ops` |
| `op_index` | `--op-index` |
| `layer` | `--layer` |
| `frame` | `--frame` |
| `to` | `--to` |
| `duration` | `--duration` |
| `replace` | `--replace` |
| `strict` | `--strict` (appended by shared adapter for all tools) |

## Drift notes (verbatim)

1. **CLI help flat `flags` array is an incomplete index of frame flags —
   coverage difference, not a semantic drift.** The `flags` array contains
   `--frame`, `--to`, `--duration`, `--replace`, `--strict` and `--from`, but
   omits `--file`, `--out`, `--ops`, `--op-index`, `--layer` and `--id`.
   Those six are nevertheless present in the per-subcommand usage strings, e.g.
   verbatim: `px frame add --file <path> (--from <index|id> | --ops <json-array>) [--id <id>] [--duration n] [--layer <id>] [--out <path>]`.
   MCP lists all 12 as properties; DOC's MCP paragraph lists all 12. Recorded as
   an observation; no fix in-track.

2. **`strict` is declared differently across surfaces — no absence.** CLI help
   places it only in the global `flags` array and `exit_codes`
   (`"3":"lint gate under --strict"`), not in any `px frame …` usage line; MCP
   declares `strict: STRICT` with description verbatim "Fail the call when a
   lint finding blocks; defaults to false."; DOC says "plus the standard
   `strict` flag shared by the other tools". All three therefore expose it.

3. **`--help --json` unsupported (capture caveat).** Verbatim CLI response:
   `{"v":1,"ok":false,"error":{"code":"E_USAGE","message":"--json requires a value","hint":"Write --json <value>."}}` (exit 1). The plain `--help` already returns the canonical JSON; no surface drift.

4. **Minor DOC imprecision about `--out` on `list`.** Verbatim DOC: "every form
   takes `--file <recipe>` and an optional `--out <path>` that writes the result
   elsewhere and leaves the source untouched", yet the same DOC's `list` syntax
   line is `px frame list --file <recipe>` and the CLI usage line is
   `px frame list --file <path>  # one row per frame, including frame 0` —
   `list` accepts no `--out`. The MCP `list` call still carries `out` in the
   shared schema. Low-severity observation; recorded, not fixed.

5. **`op_index` naming bridge is documented consistently.** MCP property
   `op_index` maps to CLI `--op-index`; both DOC and MCP state this mapping
   verbatim ("`op_index` → `--op-index`"). No drift.

No change to CLI help, MCP descriptions, or `docs/animation.md` was made by
this track (product-guidelines declares MCP descriptions canonical and forbids
doc drift; this matrix only reports it).
