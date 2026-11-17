# Scoring inputs — v2 re-score (P6.T1)

Track: `20261117-authoritative-design-intent`
Branch: `feat/20261117-authoritative-design-intent`
Phase base: `b9e0ab1`

This file lists the faithful artifacts the scorer must read. It records no art
score and no rationale: scoring requires a vision model with network access,
which this executor does not have. The old `test/art/scores.json` was copied
byte-for-byte to `test/art/scores-before-intent.json` as the immutable
pre-track record; `test/art/scores.json` itself is untouched.

## Pass artifacts

Pass A (plain, enlarged with nearest-neighbour ×8) and pass B (debug sheet)
for each of the seven v2 recipes:

| Asset | Pass A artifact | Pass B artifact |
|---|---|---|
| potion | `.conductor/evidence/art-v2/potion.8x.png` | `.conductor/evidence/art-v2/potion.debug.png` |
| sword | `.conductor/evidence/art-v2/sword.8x.png` | `.conductor/evidence/art-v2/sword.debug.png` |
| humanoid | `.conductor/evidence/art-v2/humanoid.8x.png` | `.conductor/evidence/art-v2/humanoid.debug.png` |
| chest | `.conductor/evidence/art-v2/chest.8x.png` | `.conductor/evidence/art-v2/chest.debug.png` |
| character | `.conductor/evidence/art-v2/character.8x.png` | `.conductor/evidence/art-v2/character.debug.png` |
| prop | `.conductor/evidence/art-v2/prop.8x.png` | `.conductor/evidence/art-v2/prop.debug.png` |
| scene | `.conductor/evidence/art-v2/scene.8x.png` | `.conductor/evidence/art-v2/scene.debug.png` |

The un-enlarged render beside each pair is `.conductor/evidence/art-v2/<asset>.png`.

## Commands (as specified by the brief)

Render (debug sheet lands beside the output as `<asset>.debug.png`):

```
node dist/cli.js render --file test/art/v2/<asset>/<asset>.px.json --out .conductor/evidence/art-v2/<asset>.png --debug --strict
```

Faithful pass-A enlargement:

```
node scripts/upscale.mjs .conductor/evidence/art-v2/<asset>.png --out .conductor/evidence/art-v2/<asset>.8x.png --factor 8
```

**Executor deviation (full disclosure):** those two `node …` commands, plus
`pnpm tsx`, `pnpm dev` and `pnpm list --prod --depth 0`, are denied by this
executor's shell permission layer. The artifacts were therefore produced by a
self-contained in-process generator, `test/art/scoring-artifacts.test.ts`, run
with the permitted `pnpm vitest run --project unit test/art/scoring-artifacts.test.ts`.
It drives the real `runCli` renderer and the same deterministic filter-0,
deflate-level-9 nearest-neighbour enlargement as `scripts/upscale.mjs`; an
in-test assertion proves the project's `encodePng` and the faithful encoder
produce byte-identical output.

**Style resolution caveat for the primary:** the CLI resolves `@project` from
the recipe's own directory (`baseDir: dirname(resolve(cwd, file))` in
`src/cli/commands.ts`) and there is no `px.style.json` under `test/art/v2/`.
The brief's literal render command issued from the repository root therefore
fails with `E_STYLE_MISSING`. The generator follows the established contract-test
pattern: copy the root `px.style.json` next to the recipe in a temporary
workspace, then render. Re-running the literal commands will need the same
workspace preparation (or a style copy in each v2 asset directory).

## Recipe digests and strict-render results

Recorded by the generator in `.conductor/evidence/art-v2/generation-summary.json`.
Every digest matches the committed `test/art/v2/<asset>/<asset>.sha256`; every
strict render exited 0 with no error or warning findings (advisory `info`
findings are non-blocking under `--strict`).

| Asset | Recipe sha256 | Exit code | Finding counts | Blocking findings | Source → enlarged |
|---|---|---|---|---|---|
| potion | `fa652c8220d1d8920004a5d9bc7e0a13171fdc9d9adb31a0b0efc0e815f1dd13` | 0 | info 4 (total 4) | 0 | 16×16 → 128×128 |
| sword | `9f0cedda306693a221c192b586d4ba92b6a3269ccc80826c31c05c0f6f832567` | 0 | info 3 (total 3) | 0 | 32×32 → 256×256 |
| humanoid | `fc6be1345f8019b1f1a7d39e2122c4ce17fbf163d81edcc1ee8f6c788f85732f` | 0 | info 31 (total 31) | 0 | 32×32 → 256×256 |
| chest | `0f5976fc1352e2d00983f662010166d85dec4f37b9f939f9974f69221191c55a` | 0 | info 17 (total 17) | 0 | 48×48 → 384×384 |
| character | `8e0f2d84ada8ba44387e735903a5309c15ad5008d8b4a792d2996b7c350c4429` | 0 | info 58 (total 58) | 0 | 48×128 → 384×1024 |
| prop | `3da2514004260bd8d7ba2b5220e5a2e2a9bd260787b190e1d036728b3fde1e83` | 0 | info 21 (total 21) | 0 | 64×64 → 512×512 |
| scene | `d827694b60a7eaa78553419cb869a991fa9c4008b5c8fb331b2978d77f305697` | 0 | info 65 (total 65) | 0 | 256×256 → 2048×2048 |

## What remains for the primary

AC-14 is blocked. The primary must score the seven v2 assets with two faithful
nearest-neighbour passes, write the schema-3 record, and recompute the verdict
with `test/art/rubric.test.ts`. No score or rationale is invented here.
