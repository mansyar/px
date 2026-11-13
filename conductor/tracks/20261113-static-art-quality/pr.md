# Static Art Quality

Raises `px` from *legal* pixel art to *aimed* pixel art: recipes declare **parts** with materials, a **`light`** pass gives form, ambient occlusion, cast shadow and rim, lint thresholds follow the canvas **scale**, ramps are **synthesised** in OKLCH and swapped at material level, seven **art-direction codes** carry part attribution, `seal`/`strays`/`deband` clean up deterministically, and an agent can address geometry by part and see what changed.

**This track ends with one acceptance criterion unmet, recorded rather than rewritten.** Seven benchmarks were scored blind on a six-criterion rubric; the mean is **3.79 against a 4.0 bar**, with four individual criteria below 3. The numbers, every pass, and the reasons are in `test/art/scores.json` and `verification/phase-7-scoring.md`. Potion 4.25, chest 4.17 and prop 4.33 clear the bar; sword 3.50, humanoid 3.34, character 3.58 and scene 3.33 do not.

## What was added

| Area | What it does |
|---|---|
| Parts and materials | Ops carry `part`; ownership is derived on replay (last writer wins) into a per-layer `Int16Array` and never stored. `material` resolves to a palette family, `gloss` is one of `matte` / `metal` / `gem` / `cloth`. Unassigned pixels stay legal, so 1.0 recipes are untouched. |
| `light` pass | `angle`, `form` (`flat` / `bevel` / `round`), `ao`, `cast` with a 1–4 px offset, `rim` (`none` / `edge` / `selective`). Runs form → gloss → AO → cast → rim over one entry snapshot, strictly `z`-ordered, and `matte` can never reach a gloss path. |
| Scale profiles | `tiny` ≤16, `small` 17–48, `medium` 49–128, `large` 129–256 by longest side, overridable with `meta.profile`. One table drives jaggy runs, contrast floors, cluster minimums, dither eligibility, outline width and debug zoom. `small` reproduces the pre-track numbers exactly, which is why the four Phase-1 benchmarks never moved. |
| Palette intelligence | `synthesize` expands a base colour into 3–6 OKLCH steps, hand-written (no colour library), with cool shadows, warm highlights, clamped chroma and a guaranteed strict luminance separation — a ramp that cannot be separated is `E_RAMP_UNSEPARABLE`, never a near-identical pair. `--swap a=b` remaps materials at render time and leaves the file alone. |
| Art lint | `VALUE_COLLISION`, `BANDING`, `PILLOW_SHADE`, `DITHER_NOISE`, `CLUSTER_THIN`, `RAMP_NONMONOTONIC`, `SILHOUETTE_LOSS`, part-attributed where pixels belong to one part and judged on the flattened grid where they don't. |
| Cleanup | `seal` (fills ≤1 px holes, adopting the owner of the tone it chose), `strays` (drops clusters below the profile minimum), `deband` (breaks equal-width parallel runs). One pass each, bounded work, `W_CLEANUP_NOOP` when nothing changed. |
| Ergonomics | Coordinates may be `{"ref": "guard.center", "dx": 2}` resolved against the part mask at op start; `px diff --against <png|sha256>` reports changed count, bounding box and a per-part table; `inspect` adds per-part tones and an 8-bucket value histogram bounded at 256×256. |

## Determinism and compatibility

- Hero golden `8d907415…f027cb` and all four Phase-1 benchmark digests are **unchanged** across seven phases and three review rounds. Every 1.0 recipe still renders byte-identically, including the outline depth: the profile's outline width is gated on the version, so a 1.0 recipe keeps its historical 1 px border at any canvas size.
- Parts require schema 1.1. A `version: 1` document that declares them is rejected with `E_BAD_VERSION` rather than silently promoted — promotion changed rendered bytes the moment a profile default keyed on the version, and that was a review finding.
- One runtime dependency, unchanged. The OKLCH maths is hand-written; nothing in `src/` touches the network.
- 714 tests, coverage 95.6% statements / 86.57% branches at an 80% gate. Performance: 181 ms median at 256×256 with 2,000 ops and a full `light` pass, against a 500 ms budget.

## Why the art bar was missed

All three scoring rounds, both pass styles, on the four weak assets, land on the same three complaints: **flat form** on broad faces (the `light` pass shades rims and can band a region, but a front-facing plane has no form), **stair-stepped edges** (dominant at 256 px — there is no stroke op that walks a path and cleans its own steps), and **texture that cannot read** at 1× (no primitive survives the `large` profile's own cluster floor). Those are authoring-capability gaps, so another revision round with the same ops lands in the same place. A follow-up track takes them on.

## Review

Three rounds. Round 1 BLOCK (2 High, 4 Medium, 4 Low) — `seal` painted pixels nobody owned so `light` skipped them, and no tool could declare parts or a role palette, leaving the headline feature unreachable through the tool surface. Round 2 PASS WITH FINDINGS — round 1's own outline default made AC-1 false for 1.0 recipes above 128 px, hidden because every fixture was ≤64 px. Round 3 PASS WITH FINDINGS — the last path to a byte change was a 1.0-with-parts document being promoted to 1.1 on write, closed by rejecting that state rather than documenting the drift.

Every round found something the phase gates could not: a phase can pass every check it writes for itself.

## Try it

```bash
pnpm build
node dist/cli.js init --file hero.px.json --name hero --width 64 --height 64 \
  --palette '#14101c,#5d6b8a,#a8bcd6,#4a2f16,#c9973c' --derive-ramps \
  --parts '{"blade":{"material":"c2","gloss":"metal"},"grip":{"material":"c4","gloss":"matte"}}'
node dist/cli.js draw --file hero.px.json --ops '[{"op":"rect","x":24,"y":20,"w":12,"h":20,"color":"c1.base","part":"blade"}]'
node dist/cli.js draw --file hero.px.json --ops '[{"op":"light","angle":"top-left","form":"bevel","ao":true,"cast":"blade","rim":"edge"}]'
node dist/cli.js render --file hero.px.json --out hero.png --debug --strict
node dist/cli.js inspect --file hero.px.json --summary
```

`pnpm exec px` does not resolve — pnpm does not link a package's own bins — so use `node dist/cli.js`, or the MCP server via `opencode.json` (which registers `node dist/mcp/server.js`).
