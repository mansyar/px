# Asset and artifact digests — Phase 2 (P2.T3.2)

**Track:** 20261117-craft-application
**Phase:** 2 — Apply validated levers and re-score the gate

## A/B artifacts generated (`.conductor/evidence/art-v2/`)

All seven assets were rendered with
`pnpm exec tsx src/cli.ts render --file test/art/v2/<asset>/<asset>.px.json --out .conductor/evidence/art-v2/<asset>.png --debug --strict`
(exit 0, no blocking error/warning findings; BANDING/CLUSTER_THIN/JAGGY_LINE are
`info` and non-blocking), then upscaled with
`pnpm exec tsx scripts/upscale.mjs .conductor/evidence/art-v2/<asset>.png --out .conductor/evidence/art-v2/<asset>.8x.png --factor 8`.

Pass A view = `<asset>.8x.png` (factor-8 nearest-neighbour). Pass B view =
`<asset>.debug.png`. The 1x base `<asset>.png` is the faithful strict render whose
SHA-256 is committed to the `.sha256` sidecar.

| Asset | base 1x (`<asset>.png`) = committed `.sha256` | pass A `<asset>.8x.png` | pass B `<asset>.debug.png` |
|---|---|---|---|
| chest | `1bca726e94fa32cf9830a1234bfc631e8054eb649170fb815b1cde4019750354` | `956c2cf54c32b1fcacfd759eb6e40779e6db496e7ee81d0c26e0d70af57ef332` | `8faeb76fa6ec2c37bedde3fb8cd334c164d72b272d912d41f95b7275842a4d01` |
| character | `f1ff1aede6943b60efe5fbff5fe6a18e5de4dd486fd9564615a2e29a31c0b3a5` | `0871b95b22268ff4c4e3d8edc5e88a34834f4ed44245fd8ce1585c27d5b614ec` | `9f98597f8b160a851c0a4e0cf0322de3f715410f489682dfbf800f1f624c815f` |
| potion | `032ea8b95c9bf7f368cedaca8e88527b3133f0f4bcbeb7d1657a55524543cb90` | `6930129a2dde4c246d512c1494e09c08f41486af871a3eb9f34a8f3f404daeb6` | `08b43fb8f22a68bc9a5737d72717f45ba2da7579a2d05502ae05e89381f374e1` |
| prop | `387cd4ccf1bda19d5a1540f98d49aafd880ab1db247b1dff92c7f210a1b29d58` | `2771670e62749eb139a527128f9e34c6dafc7991171d1623f8ece5eb28904c63` | `a738094f5f9eb6903121983d52d6498eeb13bd085286f758407051e2d43df808` |
| scene | `e1e0a91b3f45da5c42665e7ae3ae141a0c928a97e29f731cbb16f4d6ba5d6072` | `0f8a12c6a583f2f5f281c1149251d60cfd5cac33a4a01c6570e6095792b81e6a` | `fa9a9011d300c1222c72933a6a70322f61393ba3d22d68401853c9758d4d8509` |
| sword | `cd23f140f0f0ffcd6146d0d7ebc082e2680987e4a6a630faabfc7bfc8319d057` | `76a36e5d4798ffbc7167763dff9e19bdee1e7675f9b5f13b092d34a2639ec7c3` | `e0762dd93b5e76bd2ab37c53e567f9de1d8056076bcbfc1429467cc2a6bbc50b` |
| humanoid | `fc6be1345f8019b1f1a7d39e2122c4ce17fbf163d81edcc1ee8f6c788f85732f` | `c25dae3c10504b8d68eef4166f8cc22b65e7e677f031e0eb843c4ec4e30bd49b` | `8580574ac814b89234724f688d4d8b8794d0bd91cdd9f0c5ba263dc94add070b` |

The six re-authored `.sha256` sidecars were regenerated from a fresh `--strict` 1x
render. `test/art/assets-v2.test.ts` independently re-renders each recipe twice in an
isolated temp workspace (recipe + root `px.style.json`) and asserts both digests equal
the committed sidecar with no blocking findings; `pnpm verify` passed all 1028 tests
including these checks.

## Digest comparison — untouched artifacts (AC-5)

| Check | Expected | Observed | Result |
|---|---|---|---|
| humanoid v2 recipe + sidecars byte-identical | no diff in `git status` for `test/art/v2/humanoid/**` | no modified/deleted humanoid v2 file; humanoid 1x digest same `fc6be134…732f` before and after | **PASS** |
| humanoid `.sha256` unchanged | committed digest equals fresh render | `fc6be1345f8019b1f1a7d39e2122c4ce17fbf163d81edcc1ee8f6c788f85732f` (unchanged from baseline) | **PASS** |
| seven v1 originals under `test/art/<asset>/` byte-identical | `ORIGINAL_DIGESTS` in `test/art/assets-v2.test.ts` | no v1 original file modified; asserted by passing `assets-v2.test.ts` "leaves every original asset digest untouched" test | **PASS** |
| score file untouched | `test/art/scores.json` not modified | no change; credentialed scoring reserved for primary (NFR-2/NFR-5) | **PASS** |

`git status --short` after re-authoring lists only the six `test/art/v2/<asset>/*.px.json`
recipes and their six `.sha256` sidecars as tracked modifications (plus the evidence
files written for this phase). No humanoid v2 file and no `test/art/<asset>/` v1
original is modified.

## Notes

- Each `.calls.json` already records exactly one `render` call with `--strict`, ≤20
  calls total, and an unchanged command shape; no `.calls.json` was edited.
- `design.md` sidecars were left untouched; their `**Hero part:**` lines remain intact
  and are asserted by `test/art/assets-v2.test.ts` (all passed).
- No new dependencies were added; recipes remain well under ~2000 ops.
- Temporary helper `.ts` scripts used to author/render artifacts live under
  `.conductor/evidence/art-v2/gen/` (gitignored evidence area, not build inputs).
