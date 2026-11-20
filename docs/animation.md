# Animation frames and sprite sheets

A recipe may declare extra frames alongside its frame 0. Frame 0 is the
top-level `layers` every recipe already has; `frames` holds **only** the
additional frames, so a single-frame recipe has no `frames` key at all. Both
kinds of frame share one canvas, one palette and one design block — a frame
never re-declares them.

```json
{
  "version": "1.4",
  "meta": { "name": "anim-duo", "width": 16, "height": 16, "alpha_mode": "binary" },
  "palette": { "body": { "ramp": { "outline": "#1a1c2c", "base": "#b13e53" } } },
  "anchors": { "pivot": [8, 8] },
  "layers": [{ "id": "base", "ops": [["rect", 2, 4, 8, 8, "body.base"]] }],
  "frames": [
    {
      "id": "shift",
      "layers": [{ "id": "base", "ops": [["rect", 6, 4, 8, 8, "body.base"]] }] },
      "duration": 120
    }
  ]
}
```

`frames` requires version 1.4. `id` names a frame for lint findings and sheet
metadata; `duration` is recorded for a future playback slice and is **never**
interpreted by the compiler. Frame 0 has no declared id.

## Authoring frames

A recipe's `frames` can be written through supported tools instead of being
edited by hand. The `frame` CLI verb and the `px_frame` MCP tool expose the
same six operations with identical semantics and byte-identical output: both
call one core implementation, which normalizes ops, re-validates the recipe and
serializes it deterministically before writing. A rejected operation writes
nothing.

| Subcommand | Purpose |
| --- | --- |
| `add` | create a declared frame from a `--from` clone and/or explicit `--ops`; `--id` and `--duration` optional |
| `edit` | replace one op (`--op-index`) or the whole ops list (`--replace`) in a declared frame |
| `remove` | delete a declared frame by id or index; frame 0 is refused |
| `list` | report one row per frame, including frame 0, with index, id, duration and layer/ops counts |
| `set-duration` | set a positive integer duration; omit `--duration` to clear it |
| `move` | reorder a declared frame to a zero-based `--to` position inside `frames` |

Command syntax — every form takes `--file <recipe>` and an optional
`--out <path>` that writes the result elsewhere and leaves the source untouched:

```
px frame add --file <recipe> (--from <index|id> | --ops <json-array>) [--id <id>] [--duration n] [--layer <id>] [--out <path>]
px frame edit --file <recipe> --frame <index|id> [--layer <id>] (--op-index n | --replace) --ops <json-array> [--out <path>]
px frame remove --file <recipe> --frame <index|id> [--out <path>]
px frame list --file <recipe>
px frame set-duration --file <recipe> --frame <index|id> [--duration n] [--out <path>]
px frame move --file <recipe> --frame <index|id> --to <index> [--out <path>]
```

Over MCP the same surface is one tool, `px_frame`, with parameters
`subcommand`, `file`, `out`, `id`, `from`, `ops`, `op_index`, `layer`, `frame`,
`to`, `duration` and `replace` (plus the standard `strict` flag shared by the
other tools). `subcommand` and `file` are required; the rest are optional and
map to the same-named CLI flag (`op_index` → `--op-index`). `ops` accepts op
objects or compact tuples, as an array or a JSON string. Each call returns the
same `v:1` envelope as its CLI equivalent, and the recipe bytes are identical.

### Selectors and invariants

- `--frame` (and the `--from` clone source) address a frame by logical index or
  exact id: `0` is the base, and logical `i + 1` is `frames[i]`.
- Frame 0 is **immutable**: no command can edit, remove, retime or move it. It
  is only a read-only clone source for `frame add --from 0`.
- `--to` is a zero-based position **inside `frames`**, not a logical frame
  index — `--to 0` means "first declared frame". Out-of-range destinations and
  attempts to move frame 0 are rejected.
- When `add` receives both `--from` and `--ops`, the explicit `--ops` win: the
  clone source is ignored and exactly the supplied layers/ops are written.
- `set-duration` with no `--duration` clears the duration, omitting the key;
  durations must be positive integers.
- Ops default to the first layer; `--layer <id>` selects another. Bad ids,
  unknown targets, out-of-range indices and malformed ops fail before any
  write, leaving the recipe unchanged.

### Minimal worked example

Starting from a recipe created with `px init`:

```
px frame add --file walk.px.json --from 0 --id step --duration 120
px frame set-duration --file walk.px.json --frame step --duration 80
px frame list --file walk.px.json
px render --file walk.px.json --out walk.png --export
```

The first command deep-clones frame 0 into a new declared frame (frame 0 is
untouched); the second retimes it; the third prints the base plus the declared
frame with its id, duration and layer/ops counts. The final command consumes
the authored frames unchanged: `walk.sheet.png` and `walk.sheet.meta.json` are
written beside `walk.png`. The sheet meta's `sheet` block records each frame's
index, id, position, size, trim, origin and duration, and the additive
`timeline` block (present in both metas) sums the declared durations into
`start_ms` and `total_ms` (frame 0 contributes zero). Repeating the same
authoring commands yields byte-identical recipes and sheets.

## What `render` writes

`--export` on a single-frame recipe behaves exactly as before: `<stem>.png` and
`<stem>.meta.json`, where the meta describes the one frame.

`--export` on a framed recipe writes **four** files:

| file | contents |
| --- | --- |
| `<stem>.png` | frame 0, byte-identical to rendering the same recipe without its frames |
| `<stem>.meta.json` | the single-frame projection plus the additive `timeline` block |
| `<stem>.sheet.png` | every frame packed into one left-to-right row |
| `<stem>.sheet.meta.json` | the same projection plus the additive `sheet` block |

The sheet PNG and sheet meta exist only when both conditions hold: `--export`
was passed **and** the recipe declares at least one additional frame. Without
`--export`, or for a single-frame recipe (including a 1.4 recipe with no
`frames`), only the normal pair is written. The `--out` path still names the
normal PNG; the two sheet paths are derived from its stem.

The response envelope stays `v:1` and additive-only. A framed export adds one
payload key, `sheet`, reporting `{out, width, height, bytes, sha256, metadata}`
so a client never has to guess whether the sheet files were written. `px render
--export` and `px_render` with `export: true` are the only export entry points;
the authoring commands above change only the recipe, never export artifacts.

## Sheet geometry

Frames are packed in frame order into a **single row**. For frame `i`:

- `x` is the sum of the widths of all preceding frames; `y` is always `0`.
- The frame keeps its full canvas — the sheet is not tightly trimmed.
- Sheet width is the sum of the frame widths; sheet height is the tallest frame.
- A frame shorter than the tallest leaves transparent padding below it.

The pixels are rasterized through the same slot pipeline as the normal PNG and
encoded with the same deterministic `encodePng` (filter 0, deflate level 9).
The output is a pure function of the recipe: no RNG, timestamps, absolute paths
or host-dependent ordering.

## The additive `sheet` block

The sheet meta's `generic` object gains one optional key, `sheet`: an ordered
array with one entry per frame.

| field | meaning |
| --- | --- |
| `index` | zero-based frame index; `0` is the top-level layers |
| `id` | declared frame id; omitted for frame 0 |
| `x`, `y` | top-left corner of the frame in the sheet |
| `width`, `height` | full canvas size of the frame |
| `trim` | tightest rectangle around painted pixels (`x`, `y`, `w`, `h`) |
| `origin` | negated trim origin (`x`, `y`), matching the frame rendered alone |
| `duration` | declared duration; omitted when the frame did not declare one |

`v`, `texture_path`, `filter`, `centered`, `offset`, `anchors`, `canvas`,
`palette` and `recipe_hash` keep their existing values. `id` and `duration`
are the only optional entry fields because frame 0 has neither by design.
A single-frame export has no `sheet` key at all, so its metadata is
byte-identical to the pre-animation projection.

The normal meta and the sheet meta therefore differ in exactly two ways: the
sheet meta's `godot.texture_path` names the sheet PNG, and its `generic.sheet`
array lists the frames. Everything else is the frame-0 projection, including the
additive `timeline` block described below (present in both metas).

## The additive `timeline` block

Both metadata files gained by a framed export also carry a `timeline` key in
their `generic` object. It is a pure projection of the recipe's `frames`, so the
same recipe always produces the same bytes: no clock, RNG, path or locale is
read (NFR-3).

```json
{
  "timeline": {
    "frames": [
      { "index": 0, "start_ms": 0 },
      { "index": 1, "id": "shift", "duration_ms": 120, "start_ms": 0 }
    ],
    "total_ms": 120
  }
}
```

| field | meaning |
| --- | --- |
| `index` | zero-based position: `0` is frame 0, and `i + 1` is `frames[i]` |
| `id` | declared frame id; omitted for frame 0 |
| `duration_ms` | declared `duration` in milliseconds; omitted for frame 0 and for frames that declared none |
| `start_ms` | sum of the declared durations of every preceding frame; frame 0 starts at `0` |
| `total_ms` | sum of all declared durations across the timeline |

An undeclared duration contributes `0` to both `start_ms` and `total_ms` without
adding a `duration_ms` key. A fully undurated recipe still emits `timeline`, with
every `start_ms` and `total_ms` equal to `0`. A single-frame recipe (including a
1.4 recipe with no `frames`) emits **no** `timeline` key at all, so its metadata
stays byte-identical to the pre-animation projection. `v` and every pre-existing
metadata field keep their values; `duration` is recorded, never interpreted by
the renderer, and no recipe schema or version changed.

## The onion view

`--onion <index>` is a judgement view for framed recipes, alongside `--blockout`
and `--values`. It composites three full-canvas panels in one row: the frame
**before** the selected one, the selected frame, and the frame **after** it.
Panels outside the frame range stay transparent, so the view is deterministic at
the boundaries.

- `index` is zero-based and ranges from `0` to the number of declared frames.
  Frame `0` is the top-level layers; index `i + 1` is `frames[i]`.
- The view requires at least one declared frame and cannot be combined with
  `--blockout`, `--values`, `--debug` or `--export`.
- It writes a sibling `<stem>.onion<index>.png` — never the caller's `--out`.
  The normal PNG, its metadata and any sheet artifacts are untouched.
- The envelope names the sibling in `out` and describes the view in
  `view: {kind: 'onion', index, panels: 3}`; `sha256` and `bytes` describe the
  sibling PNG. The response shape itself is unchanged.

The view is reachable from both surfaces with identical envelopes and bytes:
`px render --file <recipe> --out <png> --onion <index>` on the CLI, and
`px_render` with `{file, out, onion: <index>}` over MCP. The MCP `onion`
parameter is an optional integer published in `px_render` — the view adds no
tool or verb of its own.
