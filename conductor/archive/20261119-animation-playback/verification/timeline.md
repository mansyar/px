# Timeline metadata proof — Phase 2

Track: `20261119-animation-playback` · Phase: 2
Branch: `feat/20261119-animation-playback` · Base: `74e39d24a9344ad7ca43002cf66d5f491119a072`

## Derivation contract (FR-3 / FR-4)

`buildTimeline(recipe)` in `src/meta/index.ts` is a pure projection of
`recipe.frames`; it reads no clock, RNG, path or locale (NFR-3). It returns
`undefined` when the recipe has no frames, so the conditional spread in
`buildMetadata` emits no `timeline` key for a single-frame recipe — the meta
bytes stay byte-identical to the pre-animation projection.

For a framed recipe, the ordered `frames` array is:

- index `0` — frame 0 (top-level `layers`), no `id`, no `duration_ms`,
  `start_ms: 0`, contributes `0` to the total.
- index `i + 1` — `recipe.frames[i]`: `id` copied from the declared frame,
  `duration_ms` copied from `frame.duration` only when declared,
  `start_ms` = sum of declared durations of all preceding frames.
- `total_ms` = sum of all declared durations; an undeclared duration contributes
  `0` without emitting a `duration_ms` key.

No recipe schema, version or field was changed; `v:1` and all pre-existing
metadata fields keep their values (AC-6).

## Asserted values

`test/mcp/meta-export.test.ts`:

| Case | Declared durations | Expected frames | Expected total |
| --- | --- | --- | --- |
| `anim-duo` fixture | frame 1 = 120 | `[{index:0,start_ms:0}, {index:1,id:'shift',duration_ms:120,start_ms:0}]` | `120` |
| Mixed declarations | 100 / absent / 50 | frame 0 `0`; f1 `100`; f2 `start_ms:100`, no `duration_ms`; f3 `start_ms:100` | `150` |
| Fully undurated | none | all four `start_ms: 0`, no `duration_ms` keys | `0` |

These assert that the emitted numbers equal the recipe's declared durations
exactly, including the missing-duration and boundary cases (AC-5).

## Determinism (FR-5 / AC-7)

The framed export is rendered twice in the same test through the CLI driver;
all four output files are compared as raw bytes and the envelopes are compared
as JSON strings. Both renders produce identical PNG bytes, meta bytes (including
`timeline`), `sheet` SHA-256 and envelope. The existing Phase 1 golden test
`test/goldens/render.test.ts` still double-renders the onion views and compares
them to the protected sidecars (see `onion-view.md`).

## Protected digests — unchanged

| File | SHA-256 (unchanged) |
| --- | --- |
| `test/goldens/fixtures/hero.sha256` | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` |
| `test/goldens/fixtures/anim-duo.sha256` | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` |
| `test/goldens/fixtures/anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` |
| `test/goldens/fixtures/anim-duo.onion0.sha256` | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` |
| `test/goldens/fixtures/anim-duo.onion1.sha256` | `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` |

`git diff 74e39d2..HEAD` touches only the seven files listed in `phase-2.md`;
none of the digests, `scores.json`, archives or CI config changed.

## Coverage

`pnpm coverage` — exit 0. `src/meta/index.ts`: 95.08% statements, 89.18%
branches, 100% functions, 95.08% lines. Global: 95.15% statements, 86.15%
branches, 98.56% functions, 94.94% lines. All configured thresholds are 80%.
