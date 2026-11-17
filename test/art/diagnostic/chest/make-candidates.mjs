/**
 * Deterministic generator for Phase 1 diagnostic candidates.
 *
 * Reads the authored baseline and hue-ramp candidate and derives the
 * warm-cool light (L), edge hierarchy (E) and combined (C) recipes. Run with
 * `pnpm exec tsx test/art/diagnostic/chest/make-candidates.mjs` from the repo root.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'test/art/diagnostic/chest';
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}.px.json`, 'utf8'));
const write = (name, recipe) =>
  writeFileSync(`${dir}/${name}.px.json`, `${JSON.stringify(recipe, null, 2)}\n`);

const H = read('chest-H');
const ops = H.layers[0].ops;
const blits = ops.filter((op) => op.op === 'ascii_blit');
const baseOutline = ops.find((op) => op.op === 'auto_outline');

const light = {
  op: 'light',
  angle: 'top-left',
  form: 'bevel',
  ao: true,
  cast: null,
  cast_offset: 2,
  rim: 'edge',
};

const hierarchy = {
  op: 'auto_outline',
  mode: '4-way',
  where: 'outer',
  color: 'ink.outline',
  seam: 'ink.shadow',
};

function inkRoles(recipe) {
  recipe.palette.ink.ramp = {
    outline: '#0b0a10',
    shadow: '#3a4654',
    highlight: '#e8ecf0',
  };
  recipe.design.edges = { silhouette: 'outline', material: 'shadow', detail: 'highlight' };
}

// L: same explicit warm/cool ramps as H, plus a single directional engine light.
const L = structuredClone(H);
L.meta.name = 'chest-L';
L.layers[0].ops = [...blits, light, baseOutline];
write('chest-L', L);

// E: edge hierarchy only - light inner detail rim, dark outer silhouette,
// mid-tone material seams. No light op, no hue change beyond H's ramps.
const E = structuredClone(H);
E.meta.name = 'chest-E';
inkRoles(E);
E.layers[0].ops = [...blits, hierarchy];
write('chest-E', E);

// C: combination - light modelling plus the three-tier edge hierarchy.
const C = structuredClone(H);
C.meta.name = 'chest-C';
inkRoles(C);
const lightForm = { ...light, rim: 'none' };
C.layers[0].ops = [...blits, lightForm, hierarchy];
write('chest-C', C);
