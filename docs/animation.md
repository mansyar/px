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

## What `render` writes

`--export` on a single-frame recipe behaves exactly as before: `<stem>.png` and
`<stem>.meta.json`, where the meta describes the one frame.

`--export` on a framed recipe writes **four** files:

| file | contents |
| --- | --- |
| `<stem>.png` | frame 0, byte-identical to rendering the same recipe without its frames |
| `<stem>.meta.json` | the unchanged single-frame metadata projection |
| `<stem>.sheet.png` | every frame packed into one left-to-right row |
| `<stem>.sheet.meta.json` | the same projection plus the additive `sheet` block |

The sheet PNG and sheet meta exist only when both conditions hold: `--export`
was passed **and** the recipe declares at least one additional frame. Without
`--export`, or for a single-frame recipe (including a 1.4 recipe with no
`frames`), only the normal pair is written. The `--out` path still names the
normal PNG; the two sheet paths are derived from its stem.

The response envelope is unchanged. A framed export adds one payload key,
`sheet`, reporting `{out, width, height, bytes, sha256, metadata}` so a client
never has to guess whether the sheet files were written. There is no new CLI
verb and no new MCP tool: `px render --export` and `px_render` with
`export: true` are the only entry points.

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
array lists the frames. Everything else is the frame-0 projection.
