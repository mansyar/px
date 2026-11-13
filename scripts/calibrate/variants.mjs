#!/usr/bin/env node
/**
 * Generate the low/high variant pairs that calibrate the art rubric.
 *
 * One base asset (the chest), twelve recipes: for each criterion the generator
 * writes a `low` variant that removes the property under test and a `high`
 * variant that keeps it. Geometry is only replaced for `silhouette`, where shape
 * is the property; every other mutation rewrites tone assignments, outline
 * presence, palette saturation or cluster structure, leaving the drawn shape
 * where it was.
 *
 * The output is deterministic: no randomness, no clock, no environment reads.
 * Recipes land in `.conductor/evidence/calibration/variants/<criterion>/`.
 *
 *   node scripts/calibrate/variants.mjs [--no-render]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";

const BASE = "test/art/chest/chest.px.json";
const OUT = ".conductor/evidence/calibration/variants";
const GLYPHS = ["0", "1", "2", "3", "4"];

/** Per-part shading weights used for the `lighting` high variant. */
const HAND = {
  body: [0.55, 0.45, 0, 3],
  lid: [0.7, 0.3, 0, 2.6],
  bands: [0.6, 0.4, 0, 3],
  lock: [0.8, 0.2, 0, 3],
};

const load = () => JSON.parse(readFileSync(BASE, "utf8"));

function ops(recipe) {
  return recipe.layers.flatMap((layer) => layer.ops);
}

function blits(recipe) {
  return ops(recipe).filter((op) => op.op === "ascii_blit");
}

function cells(op) {
  const out = [];
  for (let row = 0; row < op.grid.length; row += 1) {
    for (let col = 0; col < op.grid[row].length; col += 1) {
      if (op.grid[row][col] !== ".") {
        out.push({ row, col, x: op.x + col, y: op.y + row, char: op.grid[row][col] });
      }
    }
  }
  return out;
}

function setCell(op, cell, char) {
  const rows = op.grid.map((line) => [...line]);
  rows[cell.row][cell.col] = char;
  op.grid = rows.map((row) => row.join(""));
}

function materialOf(recipe, part) {
  return recipe.parts[part].material;
}

function toneLegend(material) {
  return Object.fromEntries(GLYPHS.map((g, i) => [g, `${material}.t${i}`]));
}

/* ---------------------------------------------------------------- mutations */

/** Every painted cell takes the family base tone. Values collapse; hue stays. */
function flatten(recipe) {
  for (const op of blits(recipe)) {
    const material = materialOf(recipe, op.part);
    op.grid = op.grid.map((line) => line.replace(/[^.]/g, "2"));
    op.legend = { 2: `${material}.t2` };
  }
  return ["every painted cell rewritten to the family base tone", "legend reduced to t2"];
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const channel = (p, q, t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const value = [channel(p, q, h + 1 / 3), channel(p, q, h), channel(p, q, h - 1 / 3)];
  return `#${value
    .map((c) =>
      Math.round(Math.max(0, Math.min(1, c)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Flat tones, then every family base moved to one shared lightness. Hues stay, so
 * the parts are distinguishable by colour and indistinguishable in greyscale —
 * the failure `value_separation` names.
 */
function valueCollapse(recipe) {
  flatten(recipe);
  const used = ["body", "lid", "bands", "lock"];
  const bases = used.map((family) => recipe.palette[family].derive.base);
  const hls = bases.map((hex) => rgbToHsl(...[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)));
  const target = hls.reduce((sum, [, , l]) => sum + l, 0) / hls.length;
  used.forEach((family, i) => {
    const [h, s] = hls[i];
    recipe.palette[family].derive.base = hslToHex(h, s, target);
  });
  return [
    "every painted cell rewritten to the family base tone",
    `all four family bases set to lightness ${target.toFixed(3)} with hue kept`,
  ];
}

/** Directional ramp painted per part, as the hand-shaded calibration variant. */
function shade(recipe) {
  for (const op of blits(recipe)) {
    const [wx, wy, start, end] = HAND[op.part];
    const painted = cells(op);
    const xs = painted.map((c) => c.x);
    const ys = painted.map((c) => c.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    for (const cell of painted) {
      const nx = x1 === x0 ? 0.5 : (cell.x - x0) / (x1 - x0);
      const ny = y1 === y0 ? 0.5 : (cell.y - y0) / (y1 - y0);
      const p = Math.max(0, Math.min(1, wx * nx + wy * ny));
      const tone = Math.round(start + (end - start) * p);
      setCell(op, cell, GLYPHS[Math.max(0, Math.min(4, tone))]);
    }
    op.legend = toneLegend(materialOf(recipe, op.part));
  }
  return ["tone per cell from a single top-left ramp", "legend expanded to t0..t4"];
}

/** Replace the drawing with a solid rounded blob of the same bounds. */
function blob(recipe) {
  const painted = blits(recipe).flatMap(cells);
  const x0 = Math.min(...painted.map((c) => c.x));
  const x1 = Math.max(...painted.map((c) => c.x));
  const y0 = Math.min(...painted.map((c) => c.y));
  const y1 = Math.max(...painted.map((c) => c.y));
  const width = recipe.meta.width;
  const height = recipe.meta.height;
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
  for (let y = y0 + 1; y <= y1 - 1; y += 1) {
    for (let x = x0 + 1; x <= x1 - 1; x += 1) {
      grid[y][x] = "2";
    }
  }
  for (const [cx, cy] of [
    [x0 + 1, y0 + 1],
    [x1 - 1, y0 + 1],
    [x0 + 1, y1 - 1],
    [x1 - 1, y1 - 1],
  ]) {
    grid[cy][cx] = ".";
  }
  // A declared part must own pixels, so the blob keeps only the body.
  recipe.parts = { body: recipe.parts.body };
  recipe.layers = [
    {
      id: "base",
      ops: [
        {
          op: "ascii_blit",
          part: "body",
          x: 0,
          y: 0,
          grid: grid.map((row) => row.join("")),
          legend: { 2: `${materialOf(recipe, "body")}.t2` },
        },
        { op: "auto_outline", mode: "4-way", where: "outer", color: "ink.outline" },
      ],
    },
  ];
  return [`geometry replaced by a ${x1 - x0 - 1}x${y1 - y0 - 1} rounded blob`, "all parts but body removed"];
}

/**
 * Edge treatment that switches reasonlessly across the image: a deterministic
 * scatter of outline and highlight tones, with the auto-outline pass removed.
 */
function deEdge(recipe) {
  for (const op of blits(recipe)) {
    for (const cell of cells(op)) {
      const seed = (cell.x * 5 + cell.y * 7) % 11;
      if (seed < 2) setCell(op, cell, "4");
      else if (seed < 4) setCell(op, cell, "0");
    }
  }
  recipe.layers = recipe.layers.map((layer) => ({
    ...layer,
    ops: layer.ops.filter((op) => op.op !== "auto_outline"),
  }));
  return ["outline tones rewritten to the base tone", "auto_outline pass removed"];
}

/**
 * 1 px checkerboard of extreme tones: every cluster is a single pixel, which is
 * the anchor-1 description rather than an accent.
 */
function confetti(recipe) {
  for (const op of blits(recipe)) {
    for (const cell of cells(op)) {
      setCell(op, cell, (cell.x + cell.y) % 2 === 0 ? "0" : "4");
    }
  }
  return ["every painted cell alternates between two extreme tones in a 1px checkerboard"];
}

/**
 * Arbitrary hues that fight: every part is painted from a different family's ramp
 * in 1 px stripes, so hue and value change without any reason in the subject.
 */
function warringHues(recipe) {
  const donor = { body: "lock", lid: "bands", bands: "lock", lock: "body" };
  for (const op of blits(recipe)) {
    const material = materialOf(recipe, donor[op.part] ?? "body");
    for (const cell of cells(op)) {
      setCell(op, cell, (cell.x + cell.y) % 2 === 0 ? "0" : "4");
    }
    op.legend = toneLegend(material);
  }
  return ["each part painted from another family's ramp in 1px extreme-tone stripes"];
}

const VARIANTS = [
  { criterion: "silhouette", low: blob, high: null },
  { criterion: "value_separation", low: valueCollapse, high: null },
  { criterion: "lighting", low: flatten, high: shade },
  { criterion: "edge_language", low: deEdge, high: null },
  { criterion: "cluster_discipline", low: confetti, high: null },
  { criterion: "palette_craft", low: warringHues, high: null },
];

/* ------------------------------------------------------------------- render */

function run(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function render(recipePath) {
  const png = recipePath.replace(/\.px\.json$/, ".png");
  const result = run("pnpm", ["exec", "tsx", "src/cli.ts", "render", "--file", recipePath, "--out", png, "--debug"]);
  if (result.status !== 0) {
    throw new Error(`render failed for ${recipePath}\n${result.stdout}\n${result.stderr}`);
  }
  const upscaled = run("pnpm", ["exec", "tsx", "scripts/upscale.mjs", png]);
  if (upscaled.status !== 0) {
    throw new Error(`upscale failed for ${png}\n${upscaled.stdout}\n${upscaled.stderr}`);
  }
  const dir = dirname(png);
  const stem = basename(png, ".png");
  const files = readdirSync(dir);
  return {
    png,
    eight: files.find((f) => f === `${stem}.8x.png`) ?? null,
    debug: files.find((f) => f === `${stem}.debug.png`) ?? null,
  };
}

/* -------------------------------------------------------------------- audit */

function audit(base, variant) {
  const changes = [];
  const baseFams = Object.keys(base.palette).sort();
  const varFams = Object.keys(variant.palette).sort();
  if (baseFams.join() !== varFams.join()) changes.push("palette families added or removed");
  for (const family of baseFams.filter((f) => varFams.includes(f))) {
    const a = JSON.stringify(base.palette[family]);
    const b = JSON.stringify(variant.palette[family]);
    if (a !== b) changes.push(`palette.${family}`);
  }
  const baseOps = ops(base);
  const varOps = ops(variant);
  if (baseOps.length !== varOps.length) {
    changes.push(`op count ${baseOps.length} -> ${varOps.length}`);
  }
  const baseParts = Object.keys(base.parts).sort();
  const varParts = Object.keys(variant.parts).sort();
  if (baseParts.join() !== varParts.join()) changes.push("parts added or removed");
  for (const [part, def] of Object.entries(variant.parts)) {
    const before = base.parts[part];
    if (JSON.stringify(before) !== JSON.stringify(def)) changes.push(`parts.${part}`);
  }
  let cellDiffs = 0;
  for (const op of varOps) {
    const before = baseOps.find((b) => b.op === "ascii_blit" && b.part === op.part);
    if (!before) continue;
    for (const cell of cells(op)) {
      const char = before.grid[cell.row]?.[cell.col];
      if (char !== cell.char) cellDiffs += 1;
    }
  }
  if (cellDiffs > 0) changes.push(`${cellDiffs} painted cells changed tone`);
  return changes;
}

/* --------------------------------------------------------------------- main */

const renderArtifacts = !process.argv.includes("--no-render");
const base = load();
mkdirSync(OUT, { recursive: true });
const report = [];

for (const variant of VARIANTS) {
  const dir = join(OUT, variant.criterion);
  mkdirSync(dir, { recursive: true });
  for (const level of ["low", "high"]) {
    const mutate = variant[level];
    const recipe = structuredClone(base);
    const notes = mutate ? mutate(recipe) : ["identical to the base recipe"];
    const path = join(dir, `${level}.px.json`);
    writeFileSync(path, `${JSON.stringify(recipe, null, 2)}\n`, "utf8");
    const changes = audit(base, recipe);
    const entry = { criterion: variant.criterion, level, recipe: path, changes, notes };
    if (renderArtifacts) entry.artifacts = render(path);
    report.push(entry);
    console.log(`${variant.criterion}/${level}: ${changes.join("; ") || "no change"}`);
  }
}

writeFileSync(join(OUT, "audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`\n${report.length} variants written under ${OUT}`);
