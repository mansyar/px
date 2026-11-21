# Strict validation, export and byte determinism — Animation Agent Legibility Verification

- Track: `20261121-animation-agent-legibility`
- Phase: 2
- Branch: `chore/20261121-animation-agent-legibility`
- Base / head (verification point): `10d3bcdb14ad4834e7f38d8156356b5583844c21`
- Covers: FR-4, FR-5, FR-6, AC-4, AC-5, AC-6

All commands below were run from `D:\Projects\px`. The recipe authoring was not
re-run or repaired; both recipes are consumed as-is.

## 1. Strict validation (P2.T2.1)

Command (per run):

```
pnpm exec tsx src/cli.ts validate --file <recipe> --strict
```

| Run | Exit | `ok` | `findings` | `warnings` | `OUT_OF_BOUNDS` | `ORPHAN_PIXEL` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | true | `[]` | `[]` | 0 | 0 |
| 2 | 0 | true | `[]` | `[]` | 0 | 0 |

Verbatim run-1 response:

```
{"v":1,"ok":true,"command":"validate","file":"conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-1/flame.px.json","canvas":{"width":16,"height":16},"bounds":null,"pixel_count":0,"layers":[{"id":"base","painted":0}],"findings":[],"warnings":[]}
```

Verbatim run-2 response:

```
{"v":1,"ok":true,"command":"validate","file":"conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/run-2/flame.px.json","canvas":{"width":16,"height":16},"bounds":null,"pixel_count":0,"layers":[{"id":"base","painted":0}],"findings":[],"warnings":[]}
```

Both recipes report **zero `OUT_OF_BOUNDS`** and **zero `ORPHAN_PIXEL`**. There
are no other findings and no warnings — informational findings such as
`BANDING`, `CLUSTER_THIN` and `RAMP_NONMONOTONIC` are absent, so the question of
whether they are non-blocking does not arise. Both hard gates pass.

Note: both recipes have `pixel_count: 0` (empty `ops`), which is why no lint
findings of any kind are emitted. This is an honest property of the authored
artifacts and was not altered.

## 2. Export (P2.T2.2)

Command (per run):

```
pnpm exec tsx src/cli.ts render --file <recipe> --out <stem>.png --export
```

Both exports exited 0 (`ok:true`, `findings:[]`) and wrote four files into each
run's artifact directory:

| File (relative to each run dir) | Meaning |
| --- | --- |
| `flame.png` | frame 0 (16×16) |
| `flame.meta.json` | frame-0 projection + additive `timeline` block |
| `flame.sheet.png` | packed sheet (64×16, four frames in one row) |
| `flame.sheet.meta.json` | sheet projection + `sheet` block + additive `timeline` block |

Both metadata files contain a `timeline` block; the **sheet metadata**
(`flame.sheet.meta.json`) is the "sheet metadata containing a `timeline` block"
required by AC-5. Its `timeline` reports four frames (`index` 0–3, ids
`flame-flicker-1..3`, `duration_ms` 120/100/140, `start_ms` 0/0/120/220) and
`total_ms: 360`. Frame 0 contributes zero duration, as documented.

CLI-reported digests (identical for both runs):

- recipe_hash: `sha256:bb80778c63ded794374212397efa849474ba5b139cd8861282de2c31b7bad577`
- frame PNG: `a901afae7bdb66678f08a39b32f8a46da9864c8a64fabc0e77a7f12b93df12ba`
- frame meta: `77ac4d79db6a0b59ef5e3a39078449c87858b44c243ab408d1f83494677f385a`
- sheet PNG: `f69146f2d40ee8d4b7a989791b329ac59dbf0e43edbbb4e058bec82a70ba79bf`
- sheet meta: `d7b75d7c94f73110d4288bb3dcf64f27cd0cbcd78fb0c34447cf9e25dfaa30d7`

## 3. SHA-256 byte comparison (P2.T3)

Digests computed with the recommended method:

```
pnpm exec tsx -e "import {createHash} from 'node:crypto'; import {readFileSync} from 'node:fs'; console.log(createHash('sha256').update(readFileSync('<path>')).digest('hex'))"
```

Six required digests (three artifact pairs × two runs):

| Artifact pair | run-1 SHA-256 | run-2 SHA-256 | Result |
| --- | --- | --- | --- |
| Recipe JSON (`flame.px.json`) | `bb80778c63ded794374212397efa849474ba5b139cd8861282de2c31b7bad577` | `bb80778c63ded794374212397efa849474ba5b139cd8861282de2c31b7bad577` | IDENTICAL |
| Sheet PNG (`flame.sheet.png`) | `f69146f2d40ee8d4b7a989791b329ac59dbf0e43edbbb4e058bec82a70ba79bf` | `f69146f2d40ee8d4b7a989791b329ac59dbf0e43edbbb4e058bec82a70ba79bf` | IDENTICAL |
| Timeline metadata (`flame.sheet.meta.json`) | `d7b75d7c94f73110d4288bb3dcf64f27cd0cbcd78fb0c34447cf9e25dfaa30d7` | `d7b75d7c94f73110d4288bb3dcf64f27cd0cbcd78fb0c34447cf9e25dfaa30d7` | IDENTICAL |

Additional corroborating pairs (also identical):

| Artifact pair | SHA-256 (both runs) | Result |
| --- | --- | --- |
| Frame PNG (`flame.png`) | `a901afae7bdb66678f08a39b32f8a46da9864c8a64fabc0e77a7f12b93df12ba` | IDENTICAL |
| Frame metadata (`flame.meta.json`, also has `timeline`) | `77ac4d79db6a0b59ef5e3a39078449c87858b44c243ab408d1f83494677f385a` | IDENTICAL |

All three required artifact pairs are **IDENTICAL**; there is no diff to record
because no bytes differ.
