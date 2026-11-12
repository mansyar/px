# Product Guidelines — px

## Branding

The name is `px`, always lowercase, never `Px` or `PX`. In prose it takes no article: "px compiles the recipe", not "the px tool does". No logo, no marketing surface, no landing page in Phase 1.

## Voice & Tone

Applies to CLI output, error messages, lint findings, MCP tool descriptions, and JSON diagnostics.

- **Terse and mechanical.** No exclamation marks, no "Oops", no apologies, no encouragement. The reader is a machine first and a human second.
- **Every error is actionable.** State what failed, where it failed (file, layer, op index, coordinate), why, and what to do instead. An error an agent cannot act on is a bug in the error.
- **Never blame the caller.** "Unknown slot `steel.brass` in op 4; palette defines `steel.base`, `steel.shadow`, `steel.highlight`, `steel.outline`" — not "invalid color specified".
- **No anthropomorphism.** The engine does not try, guess, or feel. It rejects or produces.
- **No hiding.** Warnings are returned even when the operation succeeds. Silence means clean.

## Interaction Principles

1. **Batch by default.** Every write command accepts an array of ops. One round-trip per op is a design failure, not an agent failure.
2. **Deterministic and replayable.** Same recipe, same bytes, every time, on every platform.
3. **Machine-first output.** JSON to stdout, human-readable chatter to stderr, `--pretty` for people.
4. **Errors are data.** Structured codes, never prose alone, never a stack trace as the error message.
5. **No hidden state.** No config files, no caches, no implicit "current palette". The recipe is the entire state of the asset.
6. **Fail closed on ambiguity, fail soft on overflow.** An out-of-bounds write clips and warns; an unknown slot, malformed legend, or non-binary alpha is a hard rejection.
7. **Bounded feedback.** Never dump unbounded tables. Inspect defaults to a summary; full dumps are opt-in.
8. **Expensive output is opt-in.** The annotated debug sheet and written export artifacts are requested explicitly, never produced by default. A 1× preview PNG returned inline from `render` is not an export artifact and is always cheap enough to include.

## Output Conventions

**Response envelope** — every command and every MCP tool returns the same shape:

- Success: `{ "v": 1, "ok": true, ... }`
- Failure: `{ "v": 1, "ok": false, "error": { "code": "...", "message": "...", "op_index": n?, "coord": [x, y]?, "hint": "..." } }`

`v` is a response schema version; Phase 1 changes are additive only.

**Exit codes:** `0` success · `1` caller error (bad args, invalid recipe) · `2` internal error · `3` lint gate failure under `--strict`.

**Lint severities:** `error`, `warning`, `info`. Only `error` affects the exit code unless `--strict` is passed, which promotes `warning`.

**Formatting:** no ANSI color by default, because agents parse the output; `--color` is opt-in. Tables are capped and truncation is stated explicitly.

## Terminology

Canonical terms. These are not interchangeable, and synonyms in output or documentation are defects.

| Term | Means |
|---|---|
| **recipe** | The `.px.json` file. Not "document", "project", or "sprite file" |
| **op** | One drawing operation in a layer. Not "command", "shape", or "step" |
| **layer** | An ordered group of ops with its own buffer |
| **slot** | A named palette entry, referenced as `family.role` |
| **family** | A named group of related slots, usually a ramp |
| **ramp** | The `outline`/`shadow`/`base`/`highlight` roles of a family |
| **canvas** | The indexed pixel grid. Not "image" or "bitmap" |
| **bounds** | The non-transparent bounding box of the flattened canvas |
| **trim** | Cropping to `bounds`, reported with an origin offset |
| **anchor** | A named point in recipe coordinates (pivot, socket) |
| **legend** | The character → slot mapping returned by `inspect` |
| **golden** | A recipe plus its expected PNG SHA-256 |

## Accessibility

The engine has no UI, but the debug sheet is a human-facing artifact and must survive being viewed in grayscale or by a colorblind reader: never encode meaning by hue alone. Rulers, crosshairs, anchor markers, and the silhouette pass all use shape and luminance. The 1× panel must stay legible without zoom, since that is the size the sprite will actually be seen at.

## Non-Applicable Dimensions

- **Internationalization / localization:** out of scope. Output is English and machine-oriented; translating JSON diagnostics would break agent tooling for no benefit.
- **Legal, privacy, compliance:** nothing to declare. Everything runs locally, no telemetry, no network calls, no user data leaves the machine.
- **Design system / components:** no visual UI in Phase 1.

## Open Questions & Assumptions

**Assumptions:** MCP tool descriptions are the canonical agent-facing documentation, and human docs must not drift from them; a shared source generates both. The `v` envelope field is worth the bytes because it makes additive evolution safe.

**Resolved:** `strict` is an explicit per-call parameter on every MCP tool, defaulting to `false`, because an MCP caller reads the findings in the response and decides; the calibration harness passes `strict: true` so the benchmarks still gate.
