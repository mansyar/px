#!/usr/bin/env node
/**
 * Nine pre-registered attempts at the top of the rubric scale.
 *
 * The calibration measured what *removing* a property costs and found the judge
 * stops at 3 for lighting, edge language and palette craft. This script builds the
 * opposite: three deliberate treatments per criterion that try to earn a 4, fixed
 * before any scoring call and registered by the sha256 of each recipe.
 *
 * Deterministic: no randomness, no clock, no environment reads.
 *
 *   node scripts/calibrate/ceiling.mjs [--no-render]
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const BASE = "test/art/chest/chest.px.json";
const OUT = ".conductor/evidence/ceiling";
const TRACK = "conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling";
const GLYPHS = ["0", "1", "2", "3", "4"];

const load = () => JSON.parse(readFileSync(BASE, "utf8"));
const blits = (recipe) => recipe.layers.flatMap((layer) => layer.ops).filter((op) => op.op === "ascii_blit");

function cells(op) {
  const out = [];
  for (let row = 0; row < op.grid.length; row += 1) {
    for (let col = 0; col < op.grid[row].length; col += 1) {
      if (op.grid[row][col] !== ".") out.push({ row, col, x: op.x + col, y: op.y + row, char: op.grid[row][col] });
    }
  }
  return out;
}

function setCell(op, cell, char) {
  const rows = op.grid.map((line) => [...line]);
  rows[cell.row][cell.col] = char;
  op.grid = rows.map((row) => row.join(""));
}

const materialOf = (recipe, part) => recipe.parts[part].material;

/* --------------------------------------------------------------- colour math */

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
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
  const channels = [channel(p, q, h + 1 / 3), channel(p, q, h), channel(p, q, h - 1 / 3)];
  return `#${channels
    .map((c) =>
      Math.round(Math.max(0, Math.min(1, c)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Build a five-tone ramp from one base colour.
 * `lSteps` are added to the base lightness per tone (t0 lightest, t4 darkest).
 * `warm` moves the light tones a fraction of the way toward yellow and `cool`
 * moves the dark tones a fraction toward blue, along the shorter hue arc — the
 * warm-highlight/cool-shadow convention palette craft names. Moving *toward a
 * hue* rather than rotating by a fixed amount is what keeps a cyan material cyan.
 */
const WARM_HUE = 0.13;
const COOL_HUE = 0.62;

function hueTowards(from, to, amount) {
  let delta = to - from;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return (((from + delta * amount) % 1) + 1) % 1;
}

function buildRamp(base, { lSteps, warm = 0, cool = 0, satScale = 1 } = {}) {
  const [h, s, l] = rgbToHsl(...hexToRgb(base));
  const ramp = {};
  lSteps.forEach((delta, index) => {
    const hue =
      index < 2
        ? hueTowards(h, WARM_HUE, warm * ((2 - index) / 2))
        : index > 2
          ? hueTowards(h, COOL_HUE, cool * ((index - 2) / 2))
          : h;
    ramp[`t${index}`] = hslToHex(hue, Math.max(0, Math.min(1, s * satScale)), Math.max(0.02, Math.min(0.95, l + delta)));
  });
  return ramp;
}

/** Replace every material family's derived ramp with an explicit one. */
function explicitRamps(recipe, options) {
  for (const family of ["body", "lid", "bands", "lock"]) {
    const base = recipe.palette[family].derive.base;
    recipe.palette[family] = { ramp: buildRamp(base, options) };
  }
}

/* ------------------------------------------------------------ tone painting */

const HAND = {
  body: [0.55, 0.45, 0, 3],
  lid: [0.7, 0.3, 0, 2.6],
  bands: [0.6, 0.4, 0, 3],
  lock: [0.8, 0.2, 0, 3],
};

function shadeDirectional(recipe) {
  for (const op of blits(recipe)) {
    const [wx, wy, start, end] = HAND[op.part];
    const painted = cells(op);
    const xs = painted.map((c) => c.x);
    const ys = painted.map((c) => c.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (const cell of painted) {
      const nx = x1 === x0 ? 0.5 : (cell.x - x0) / (x1 - x0);
      const ny = y1 === y0 ? 0.5 : (cell.y - y0) / (y1 - y0);
      const p = Math.max(0, Math.min(1, wx * nx + wy * ny));
      setCell(op, cell, GLYPHS[Math.max(0, Math.min(4, Math.round(start + (end - start) * p)))]);
    }
  }
}

/* --------------------------------------------------------------- candidates */

const CANDIDATES = [
  {
    criterion: "lighting",
    name: "warm-cool",
    intent: "one light direction, with the shadow ramp pulled toward blue and the highlight ramp toward yellow",
    treatment: "directional ramp plus explicit warm/cool ramps",
    apply(recipe) {
      shadeDirectional(recipe);
      explicitRamps(recipe, { lSteps: [0.26, 0.13, 0, -0.13, -0.26], warm: 0.05, cool: 0.09 });
    },
  },
  {
    criterion: "lighting",
    name: "dither-band",
    intent: "a two-tone surface whose band boundary is dithered, so the falloff reads as a gradient at 1x",
    treatment: "directional ramp, then a checkerboard mix across each band edge",
    apply(recipe) {
      shadeDirectional(recipe);
      for (const op of blits(recipe)) {
        const painted = cells(op);
        const tone = new Map(painted.map((cell) => [`${cell.row},${cell.col}`, Number(op.grid[cell.row][cell.col]) || 2]));
        for (const cell of painted) {
          if ((cell.x + cell.y) % 2 !== 0) continue;
          const right = tone.get(`${cell.row},${cell.col + 1}`);
          const down = tone.get(`${cell.row + 1},${cell.col}`);
          const neighbour = right ?? down;
          if (neighbour !== undefined && neighbour !== tone.get(`${cell.row},${cell.col}`)) {
            setCell(op, cell, GLYPHS[neighbour]);
          }
        }
      }
    },
  },
  {
    criterion: "lighting",
    name: "engine-deband",
    intent: "engine-banded falloff that the engine itself dithers, so the band edge is not a hard line",
    treatment: "flat paint, ramp_fill with three bands, then the deband pass",
    apply(recipe) {
      for (const op of blits(recipe)) {
        for (const cell of cells(op)) setCell(op, cell, "2");
      }
      const layer = recipe.layers[0];
      const at = layer.ops.findIndex((op) => op.op === "auto_outline");
      const ops = [{ op: "ramp_fill", bands: 3, light_dir: "top-left" }, { op: "deband" }];
      if (at === -1) layer.ops.push(...ops);
      else layer.ops.splice(at, 0, ...ops);
    },
  },
  {
    criterion: "edge_language",
    name: "selective",
    intent: "a selective outline: dark where the form turns away, light where it faces the light",
    treatment: "auto-outline removed; per-cell rim chosen by which neighbour is empty",
    apply(recipe) {
      for (const op of blits(recipe)) {
        const painted = new Set(cells(op).map((cell) => `${cell.row},${cell.col}`));
        for (const cell of cells(op)) {
          const below = painted.has(`${cell.row + 1},${cell.col}`);
          const above = painted.has(`${cell.row - 1},${cell.col}`);
          if (!below && op.grid[cell.row + 1] !== undefined) setCell(op, cell, "4");
          else if (!above && cell.row > 0) setCell(op, cell, "0");
        }
      }
      dropOutline(recipe);
    },
  },
  {
    criterion: "edge_language",
    name: "hue-shift",
    intent: "an outline tinted toward the material's own hue instead of black, so edges belong to the surface",
    treatment: "auto-outline colour points at a dark navy family rather than ink",
    apply(recipe) {
      recipe.palette.rim = { ramp: { outline: "#232a4d" } };
      for (const op of recipe.layers[0].ops) {
        if (op.op === "auto_outline") op.color = "rim.outline";
      }
    },
  },
  {
    criterion: "edge_language",
    name: "hierarchy",
    intent: "three edge treatments: dark silhouette, mid-tone detail lines, and no outline inside a mass",
    treatment: "interior outline tones lifted to the mid tone; silhouette outline kept",
    apply(recipe) {
      for (const op of blits(recipe)) {
        const painted = new Set(cells(op).map((cell) => `${cell.row},${cell.col}`));
        for (const cell of cells(op)) {
          if (op.legend[cell.char]?.endsWith(".t4") === false) continue;
          const interior =
            painted.has(`${cell.row - 1},${cell.col}`) &&
            painted.has(`${cell.row + 1},${cell.col}`) &&
            painted.has(`${cell.row},${cell.col - 1}`) &&
            painted.has(`${cell.row},${cell.col + 1}`);
          if (interior) setCell(op, cell, "3");
        }
      }
    },
  },
  {
    criterion: "palette_craft",
    name: "hue-ramp",
    intent: "ramps that step in hue as well as value: shadows run cool, highlights run warm",
    treatment: "explicit ramps with a wider hue arc, no change to tone assignment",
    apply(recipe) {
      explicitRamps(recipe, { lSteps: [0.27, 0.135, 0, -0.135, -0.27], warm: 0.07, cool: 0.12 });
    },
  },
  {
    criterion: "palette_craft",
    name: "accent",
    intent: "one saturated accent against quiet surroundings, so the palette has a focal point",
    treatment: "wood and metal desaturated; the lock ramp saturated and widened",
    apply(recipe) {
      for (const family of ["body", "lid", "bands"]) {
        const base = recipe.palette[family].derive.base;
        recipe.palette[family] = { ramp: buildRamp(base, { lSteps: [0.2, 0.1, 0, -0.1, -0.2], satScale: 0.45 }) };
      }
      const lock = recipe.palette.lock.derive.base;
      recipe.palette.lock = { ramp: buildRamp(lock, { lSteps: [0.3, 0.15, 0, -0.14, -0.28], satScale: 1.6, warm: 0.02 }) };
    },
  },
  {
    criterion: "palette_craft",
    name: "nonlinear",
    intent: "a ramp weighted toward the darks, so form reads with few tones and the highlight stays small",
    treatment: "explicit ramps with uneven steps",
    apply(recipe) {
      explicitRamps(recipe, { lSteps: [0.11, 0.05, 0, -0.14, -0.28] });
    },
  },
];

function dropOutline(recipe) {
  recipe.layers = recipe.layers.map((layer) => ({
    ...layer,
    ops: layer.ops.filter((op) => op.op !== "auto_outline"),
  }));
}

/* ------------------------------------------------------------------- render */

function run(command, args) {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
  }
  return spawnSync(command, args, { encoding: "utf8" });
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
    eight: join(dir, files.find((f) => f === `${stem}.8x.png`) ?? ""),
    debug: join(dir, files.find((f) => f === `${stem}.debug.png`) ?? ""),
  };
}

/* --------------------------------------------------------------------- main */

const renderArtifacts = !process.argv.includes("--no-render");
const base = load();
mkdirSync(join(OUT), { recursive: true });
mkdirSync(TRACK, { recursive: true });
const registry = [];

for (const candidate of CANDIDATES) {
  const dir = join(OUT, candidate.criterion);
  mkdirSync(dir, { recursive: true });
  const recipe = structuredClone(base);
  candidate.apply(recipe);
  const path = join(dir, `${candidate.name}.px.json`);
  const body = `${JSON.stringify(recipe, null, 2)}\n`;
  writeFileSync(path, body, "utf8");
  const sha256 = createHash("sha256").update(body).digest("hex");
  // POSIX separators: the registry is committed and read on both CI platforms.
  const posix = (value) => value.replaceAll("\\", "/");
  const entry = {
    criterion: candidate.criterion,
    name: candidate.name,
    intent: candidate.intent,
    treatment: candidate.treatment,
    recipe: posix(path),
    sha256,
  };
  if (renderArtifacts) {
    const artifacts = render(path);
    entry.artifacts = Object.fromEntries(
      Object.entries(artifacts).map(([key, value]) => [key, posix(value)]),
    );
  }
  registry.push(entry);
  console.log(`${candidate.criterion}/${candidate.name}: ${sha256.slice(0, 12)}`);
}

writeFileSync(
  join(TRACK, "candidates.json"),
  `${JSON.stringify({ base_asset: BASE, registered_at: "2026-11-13", candidates: registry }, null, 2)}\n`,
  "utf8",
);
console.log(`\n${registry.length} candidates registered in ${join(TRACK, "candidates.json")}`);
