/**
 * Command wiring. Each command is a pure-ish function of parsed arguments and
 * the working directory, returning the payload that goes inside the envelope.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { compileRecipe } from '../core/compile.js';
import { PxError, type PxWarning } from '../core/errors.js';
import { type buildSlotTable, parseHex } from '../core/palette.js';
import { normalizeOp } from '../core/recipe/normalize.js';
import { parseRecipe } from '../core/recipe/parse.js';
import { serializeRecipe } from '../core/recipe/serialize.js';
import { type Palette, RAMP_ROLES, RECIPE_VERSION, type Recipe } from '../core/recipe/types.js';
import { renderRecipe, sha256Hex } from '../render/render.js';
import type { ParsedArgs } from './args.js';
import { type Region, renderRegion } from './inspect.js';

const DEFAULT_RAMP_COLORS = ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57'];
const DEFAULT_LAYER_ID = 'base';

function usageError(message: string, hint: string): PxError {
  return new PxError('E_USAGE', message, hint);
}

function requireFile(args: ParsedArgs): string {
  if (args.file === undefined || args.file === '') {
    throw usageError('Missing --file', 'Point --file at the recipe, e.g. --file hero.px.json.');
  }
  return args.file;
}

function ensureParent(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function readSource(
  target: string,
  display: string,
): {
  recipe: Recipe;
  slots: ReturnType<typeof buildSlotTable>;
  warnings: PxWarning[];
} {
  if (!existsSync(target)) {
    throw new PxError(
      'E_FILE_NOT_FOUND',
      `Recipe not found: ${display}`,
      'Check the path passed to --file; it is resolved against the working directory.',
    );
  }
  return parseRecipe(readFileSync(target, 'utf8'));
}

function intFlag(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw usageError(
      `--${name} is not an integer: "${value}"`,
      `Pass --${name} as a whole number.`,
    );
  }
  return parsed;
}

function paletteFromFlag(value: string | undefined): Palette {
  if (value === undefined) {
    const ramp: Record<string, string> = {};
    RAMP_ROLES.forEach((role, index) => {
      ramp[role] = DEFAULT_RAMP_COLORS[index] ?? '#000000';
    });
    return { steel: { ramp } };
  }
  const colors = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  if (colors.length === 0) {
    throw usageError(
      '--palette is empty',
      'Pass comma-separated hex colours, e.g. --palette "#000000,#ffffff".',
    );
  }
  for (const color of colors) {
    if (parseHex(color) === null) {
      throw usageError(
        `--palette entry "${color}" is not a hex colour`,
        'Use #rrggbb or #rrggbbaa.',
      );
    }
  }
  if (colors.length === RAMP_ROLES.length) {
    const ramp: Record<string, string> = {};
    RAMP_ROLES.forEach((role, index) => {
      ramp[role] = colors[index] ?? '#000000';
    });
    return { main: { ramp } };
  }
  return { main: { colors } };
}

function defaultName(file: string): string {
  const base = basename(file);
  if (base.endsWith('.px.json')) {
    return base.slice(0, -'.px.json'.length);
  }
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function runInit(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  if (existsSync(target) && !args.force) {
    throw new PxError(
      'E_FILE_EXISTS',
      `Recipe already exists: ${file}`,
      'Pass --force to overwrite it, or choose another --file.',
    );
  }

  const width = intFlag(args.width, 16, 'width');
  const height = intFlag(args.height, 16, 'height');
  const palette = paletteFromFlag(args.palette);
  const recipe: Recipe = {
    version: RECIPE_VERSION,
    meta: {
      name: args.name ?? defaultName(file),
      width,
      height,
      alphaMode: 'binary',
    },
    palette,
    anchors: { pivot: [Math.floor(width / 2), Math.floor(height / 2)] },
    layers: [{ id: DEFAULT_LAYER_ID, ops: [] }],
  };

  const text = serializeRecipe(recipe);
  const parsed = parseRecipe(text);
  ensureParent(target);
  writeFileSync(target, text, 'utf8');

  return {
    file,
    name: recipe.meta.name,
    width,
    height,
    slots: parsed.slots.names,
    layers: [DEFAULT_LAYER_ID],
    bytes: text.length,
  };
}

function parseOpList(value: string): unknown[] {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw usageError(
      `--ops is not valid JSON: ${detail}`,
      'Pass --ops as a JSON array, e.g. [["rect",0,0,4,4,"steel.base"]].',
    );
  }
  if (!Array.isArray(raw)) {
    throw usageError(
      '--ops is not an array',
      'Pass --ops as a JSON array of op objects or compact tuples.',
    );
  }
  return raw;
}

export function runDraw(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  const { recipe } = readSource(target, file);

  const layerId = args.layer ?? recipe.layers[0]?.id;
  if (layerId === undefined) {
    throw new PxError(
      'E_NO_SUCH_LAYER',
      `Recipe ${file} has no layers to draw into`,
      'Add a layer to the recipe, e.g. {"id": "base", "ops": []}.',
    );
  }
  const layer = recipe.layers.find((entry) => entry.id === layerId);
  if (layer === undefined) {
    throw new PxError(
      'E_NO_SUCH_LAYER',
      `Layer "${layerId}" does not exist in ${file}`,
      `Layers are ${recipe.layers.map((entry) => entry.id).join(', ') || 'none'}.`,
    );
  }

  if (args.ops === undefined) {
    throw usageError(
      'Missing --ops',
      'Pass --ops as a JSON array of op objects or compact tuples.',
    );
  }
  const rawOps = parseOpList(args.ops);
  const appended = rawOps.map((raw, index) => normalizeOp(raw, layer.ops.length + index, layer.id));
  const nextOps = [...layer.ops, ...appended];

  const next: Recipe = {
    ...recipe,
    layers: recipe.layers.map((entry) =>
      entry.id === layerId ? { id: entry.id, ops: nextOps } : entry,
    ),
  };
  const text = serializeRecipe(next);
  const parsed = parseRecipe(text);

  const outFile = args.out ?? file;
  const outTarget = resolve(cwd, outFile);
  ensureParent(outTarget);
  writeFileSync(outTarget, text, 'utf8');

  return {
    file: outFile,
    layer: layerId,
    added: appended.length,
    layer_ops: nextOps.length,
    layers: parsed.recipe.layers.map((entry) => ({ id: entry.id, ops: entry.ops.length })),
  };
}

function parseRegionFlag(value: string, width: number, height: number): Region {
  const parts = value.split(',').map((entry) => entry.trim());
  if (parts.length !== 4) {
    throw usageError(
      `--region is not x,y,w,h: "${value}"`,
      `Pass --region x,y,w,h with integers inside 0-${width - 1} and 0-${height - 1}.`,
    );
  }
  const numbers = parts.map((entry) => Number(entry));
  if (numbers.some((entry) => !Number.isInteger(entry))) {
    throw usageError(`--region contains a non-integer: "${value}"`, 'Pass four integers: x,y,w,h.');
  }
  const [x, y, w, h] = numbers;
  if (x === undefined || y === undefined || w === undefined || h === undefined) {
    throw usageError(`--region is not x,y,w,h: "${value}"`, 'Pass four integers: x,y,w,h.');
  }
  if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > width || y + h > height) {
    throw new PxError(
      'E_BAD_PARAM',
      `Region ${x},${y},${w},${h} is not inside the ${width}x${height} canvas`,
      `Keep x within 0-${width - 1}, y within 0-${height - 1}, and x+w / y+h within the canvas.`,
    );
  }
  return { x, y, w, h };
}

export function runInspect(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  const compiled = compileRecipe(recipe);
  const region =
    args.region === undefined
      ? { x: 0, y: 0, w: compiled.width, h: compiled.height }
      : parseRegionFlag(args.region, compiled.width, compiled.height);
  const { matrix, legend } = renderRegion(
    compiled.flattened,
    compiled.width,
    compiled.slots,
    region,
  );

  const payload: Record<string, unknown> = {
    file,
    canvas: { width: compiled.width, height: compiled.height },
    region,
    matrix,
    legend,
    layers: compiled.layers.map((layer) => ({
      id: layer.id,
      painted: layer.canvas.paintedCount(),
    })),
  };
  const allWarnings = [...warnings, ...compiled.warnings];
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  return payload;
}

export function runRender(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  if (args.out === undefined || args.out === '') {
    throw usageError('Missing --out', 'Name the PNG, e.g. --out hero.png.');
  }
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  const result = renderRecipe(recipe);

  const outTarget = resolve(cwd, args.out);
  ensureParent(outTarget);
  writeFileSync(outTarget, result.png);

  const payload: Record<string, unknown> = {
    file,
    out: args.out,
    width: result.width,
    height: result.height,
    bytes: result.png.length,
    sha256: sha256Hex(result.png),
  };
  const allWarnings = [...warnings, ...result.warnings];
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  return payload;
}
