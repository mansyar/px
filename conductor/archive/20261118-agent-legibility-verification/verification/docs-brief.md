# Docs-only brief — Agent Legibility Verification

- **Track:** `20261118-agent-legibility-verification` — Agent Legibility Verification
- **Phase:** 1 — Build the docs-only brief and run the fresh-agent test
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Phase base:** `b66912c5a1ca8ad1f4dff9ec65cc9754407a06b2`
- **Covers:** FR-1, NFR-1, AC-1 (and supplies the input contract for FR-2, FR-7, AC-2)
- **Result of this artifact:** assembled; the four fresh-agent launches and the CLI parity run are `PENDING PRIMARY` (see `agent-runs.md` and `phase-1.md`).

This file records the **exact** documented tool contract a fresh agent is allowed to receive, the sources that are explicitly out of scope, and a copy-ready brief the primary can materialize verbatim.

## 1. Allowed-source inventory

The fresh agent receives **only** the three contracts below. Nothing else from the repository is in scope.

### 1.1 CLI help (captured by this phase)

- **Command:** `pnpm exec tsx src/cli.ts --help`
- **Exit:** `0`
- **Captured verbatim at:** `.conductor/evidence/agent-legibility/cli-help.json`
- **Reproduced below:** usage, commands, flags and exit-code sections.

```json
{"v":1,"ok":true,"command":"help","usage":["px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...|name|json-object] [--parts json-or-file] [--design json-or-file] [--profile name] [--derive-ramps] [--synthesize name=#hex:steps]... [--force]","px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]","px edit --file <path> [--layer <id>] (--id <op-id> | --op-index n) --ops <json-array> [--out <path>]","px anchor --file <path> --name <anchor> --x n --y n [--out <path>]","px inspect --file <path> [--region x,y,w,h]... [--summary]","px render --file <path> --out <png> [--swap from=to]... [--debug [--backdrop hex|null]] [--export] [--blockout | --values n]  # views write a sibling PNG, never --out","px diff --file <path> --against <png|sha256:hex> [--out <png>]","px synthesize --file <path> --family <name> --from <hex> --steps n [--force]","px validate --file <path>","px brief <subject> --size n  # subject: character, prop or scene; writes nothing","px critique --file <path> [--streak n --previous <64-hex>]  # read-only ranked gap report","px fix --file <path> --finding n [--sha256 <digest>]  # apply finding n (zero-based) and re-render"],"commands":["init","draw","edit","anchor","inspect","render","diff","synthesize","validate","brief","critique","fix"],"flags":["--subject","--size","--values","--blockout","--pretty","--color","--force","--help","--debug","--strict","--export","--summary","--derive-ramps","--parts","--design","--profile","--backdrop","--against","--family","--from","--steps","--synthesize","--swap","--finding","--sha256","--streak","--previous"],"exit_codes":{"0":"success","1":"caller error","2":"internal error","3":"lint gate under --strict"},"runtime":{"node":"24.22.2","pinned_major":24,"supported":true}}
```

This is verbatim identical to the capture at `.conductor/evidence/agent-legibility/cli-help.json` (and to §3, contract A).

**Exit-code section:**

| Exit | Meaning |
| --- | --- |
| `0` | success |
| `1` | caller error |
| `2` | internal error |
| `3` | lint gate under `--strict` |

### 1.2 MCP px tool descriptions (supplied verbatim by the primary)

- `px_init(file, name?, width?, height?, palette?, parts?, design?, profile?, derive_ramps?, synthesize?, force?, strict?)` — create a recipe with palette, one layer and centred pivot; declare parts here; design may be inline or a path and writes schema 1.2; `derive_ramps` lifts ramp roles; `synthesize` builds `name=#hex:steps` ramp families.
- `px_draw(file, ops, layer?, out?, strict?)` — append ops to a layer; ops may carry `part` to claim pixels for a declared part.
- `px_edit(file, ops, id?, op_index?, layer?, out?, strict?)` — replace one op by id or index.
- `px_anchor(file, name, x, y, out?, strict?)` — set or move a named anchor in canvas coordinates.
- `px_inspect(file, regions?, summary?, strict?)` — ASCII matrices for requested regions plus role legend.
- `px_critique(file, previous?, streak?, strict?)` — rank gaps between declared design intent and compiled sprite; diagnostic proxies only; writes nothing.
- `px_fix(file, finding, sha256?, strict?)` — apply one ranked critique fix by zero-based index and re-render.
- `px_diff(file, against, out?, strict?)` — render and compare with a previous PNG or `sha256:` reference.
- `px_validate(file, strict?)` — lint a recipe without writing a PNG; returns findings, trim bounds, warnings.
- `px_render(file, out, debug?, backdrop?, export?, swap?, blockout?, values?, strict?)` — write the 1x PNG and return it with findings; judgement views write siblings, never `out`.
- `px_brief(subject, size?, strict?)` — plan a subject (`character` | `prop` | `scene`) with parts, hero and 1–5 value hierarchy; local templates only.

### 1.3 Documentation files

- `docs/art-profiles.md` — allowed **in full**: profile regimes (`tiny`/`small`/`medium`/`large`), the threshold table, and how a regime is derived from the canvas's longest side.
- `docs/lint-thresholds.md` — allowed **in full**: what each lint rule catches, the `small` compatibility row, and the response bounds.
- `docs/rubric.md` — **silhouette anchor text only** (no other part of the rubric is in scope):

  > Each criterion is scored with an integer from 1 to 5. 2 and 4 sit between the anchors. Anchors are written so they can be checked against the artifact at 1× (the debug sheet's second panel), not against the recipe.

  | Criterion | 1 | 3 | 5 |
  | --- | --- | --- | --- |
  | `silhouette` | reads as an unidentifiable blob at 1× | recognisable only after being told what it is, or only with colour | identifiable at 1× with no colour information |

### 1.4 Fresh-agent brief path

The copy-ready section in §3 is materialized by the primary as:

`.conductor/evidence/agent-legibility/fresh-agent-brief.md`

The same path is recorded in `agent-runs.md`, `phase-1.md`, and `.conductor/evidence/agent-legibility/inventory.md`.

## 2. Explicit exclusions

The fresh agent must **not** be given, read, or infer from any of the following:

- engine source — `src/**`
- tests — `test/**`, including fixtures, goldens, and benchmark call transcripts
- existing recipes — any `.px.json` recipe, benchmark or otherwise
- benchmark call transcripts — recorded transcripts under `test/benchmarks/` or elsewhere
- `test/art/scores.json`
- all Conductor plan/spec/verification files — `conductor/**`
- all archived evidence — `conductor/archive/**` and prior verification artifacts

The copy-ready brief contains no source paths (other than the required `--help` command itself), no scores, no fixtures, no transcripts, no benchmark artifacts, and no design solutions.

## 3. Copy-ready: Fresh-agent brief

Everything from the `---` rules below is the verbatim, copy-ready brief. The primary writes exactly this section to `.conductor/evidence/agent-legibility/fresh-agent-brief.md`.

---

## Fresh-agent brief — author four px benchmark assets

You are authoring four pixel-art assets with the `px` tool. Work **only** from the contracts in this brief. Do not open repository source (`src/**`), tests (`test/**`), recipes (`.px.json`), benchmark transcripts, `test/art/scores.json`, or Conductor files (`conductor/**`). The only documentation you may consult is `docs/art-profiles.md` and `docs/lint-thresholds.md` (both in full) and the silhouette anchor quoted below.

### Task

Author these four assets:

- **potion** — 16×16
- **sword** — 32×32
- **humanoid** — 32×32
- **chest** — 48×48

For each asset, keep an **ordered call transcript**: record every px tool call, its arguments, and the tool surface used (MCP tool or CLI command). Stay at or under **12 px tool calls per asset**. Prefer the MCP px tools; if you fall back to the CLI, record the deviation explicitly. Do not fabricate calls or claim work you did not do.

### Tool contract A — CLI help

Read the live contract with:

```
pnpm exec tsx src/cli.ts --help
```

Its recorded JSON output (usage, commands, flags, exit codes, runtime) is:

```json
{"v":1,"ok":true,"command":"help","usage":["px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...|name|json-object] [--parts json-or-file] [--design json-or-file] [--profile name] [--derive-ramps] [--synthesize name=#hex:steps]... [--force]","px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]","px edit --file <path> [--layer <id>] (--id <op-id> | --op-index n) --ops <json-array> [--out <path>]","px anchor --file <path> --name <anchor> --x n --y n [--out <path>]","px inspect --file <path> [--region x,y,w,h]... [--summary]","px render --file <path> --out <png> [--swap from=to]... [--debug [--backdrop hex|null]] [--export] [--blockout | --values n]  # views write a sibling PNG, never --out","px diff --file <path> --against <png|sha256:hex> [--out <png>]","px synthesize --file <path> --family <name> --from <hex> --steps n [--force]","px validate --file <path>","px brief <subject> --size n  # subject: character, prop or scene; writes nothing","px critique --file <path> [--streak n --previous <64-hex>]  # read-only ranked gap report","px fix --file <path> --finding n [--sha256 <digest>]  # apply finding n (zero-based) and re-render"],"commands":["init","draw","edit","anchor","inspect","render","diff","synthesize","validate","brief","critique","fix"],"flags":["--subject","--size","--values","--blockout","--pretty","--color","--force","--help","--debug","--strict","--export","--summary","--derive-ramps","--parts","--design","--profile","--backdrop","--against","--family","--from","--steps","--synthesize","--swap","--finding","--sha256","--streak","--previous"],"exit_codes":{"0":"success","1":"caller error","2":"internal error","3":"lint gate under --strict"},"runtime":{"node":"24.22.2","pinned_major":24,"supported":true}}
```

Exit codes: `0` success · `1` caller error · `2` internal error · `3` lint gate under `--strict`.

### Tool contract B — MCP px tools

- `px_init(file, name?, width?, height?, palette?, parts?, design?, profile?, derive_ramps?, synthesize?, force?, strict?)` — create a recipe with palette, one layer and centred pivot; declare parts here; design may be inline or a path and writes schema 1.2; `derive_ramps` lifts ramp roles; `synthesize` builds `name=#hex:steps` ramp families.
- `px_draw(file, ops, layer?, out?, strict?)` — append ops to a layer; ops may carry `part` to claim pixels for a declared part.
- `px_edit(file, ops, id?, op_index?, layer?, out?, strict?)` — replace one op by id or index.
- `px_anchor(file, name, x, y, out?, strict?)` — set or move a named anchor in canvas coordinates.
- `px_inspect(file, regions?, summary?, strict?)` — ASCII matrices for requested regions plus role legend.
- `px_critique(file, previous?, streak?, strict?)` — rank gaps between declared design intent and compiled sprite; diagnostic proxies only; writes nothing.
- `px_fix(file, finding, sha256?, strict?)` — apply one ranked critique fix by zero-based index and re-render.
- `px_diff(file, against, out?, strict?)` — render and compare with a previous PNG or `sha256:` reference.
- `px_validate(file, strict?)` — lint a recipe without writing a PNG; returns findings, trim bounds, warnings.
- `px_render(file, out, debug?, backdrop?, export?, swap?, blockout?, values?, strict?)` — write the 1x PNG and return it with findings; judgement views write siblings, never `out`.
- `px_brief(subject, size?, strict?)` — plan a subject (`character` | `prop` | `scene`) with parts, hero and 1–5 value hierarchy; local templates only.

### Tool contract C — documentation

- `docs/art-profiles.md` — profile regimes and the threshold table.
- `docs/lint-thresholds.md` — what each lint rule catches and the compatibility row.
- `docs/rubric.md` — **silhouette anchor only**:

  > Each criterion is scored with an integer from 1 to 5. 2 and 4 sit between the anchors. Anchors are written so they can be checked against the artifact at 1× (the debug sheet's second panel), not against the recipe.

  | Criterion | 1 | 3 | 5 |
  | --- | --- | --- | --- |
  | `silhouette` | reads as an unidentifiable blob at 1× | recognisable only after being told what it is, or only with colour | identifiable at 1× with no colour information |

### Guardrails

- Use only the contracts in this brief.
- Do not read source, tests, recipes, transcripts, scores, or Conductor files.
- Return, per asset: the ordered call transcript with arguments, the recipe path, the render path, and a call count. Be honest about failures and call-budget overruns.

---

## 4. Evidence references

- `.conductor/evidence/agent-legibility/cli-help.json` — verbatim CLI help capture (authoritative source for §1.1 and §3 contract A).
- `.conductor/evidence/agent-legibility/inventory.md` — mirror of §1 and the exact fresh-agent brief path.
- `.conductor/evidence/agent-legibility/fresh-agent-brief.md` — **materialized by the primary** from §3; not created by this phase.
