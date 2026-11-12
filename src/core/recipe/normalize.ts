/**
 * Recipe normalization.
 *
 * JSON in, canonical recipe model out. Compact op tuples are expanded here, so
 * everything downstream sees one shape.
 */

import { PxError, type PxWarning } from '../errors.js';
import { normalizeFamily } from '../palette.js';
import {
  type Anchor,
  type Anchors,
  type Layer,
  type LineOp,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  OP_PARAM_ORDER,
  type Op,
  type OpName,
  type Palette,
  RECIPE_VERSION,
  type Recipe,
  type RecipeMeta,
  type RectOp,
  type SetPixelsOp,
} from './types.js';

const OP_NAMES = Object.keys(OP_PARAM_ORDER) as OpName[];
const META_KEYS = ['name', 'width', 'height', 'alpha_mode'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function opLocation(layer: string, opIndex: number): { layer: string; op_index: number } {
  return { layer, op_index: opIndex };
}

function unknownKeys(
  source: Record<string, unknown>,
  allowed: readonly string[],
  code: 'E_BAD_META' | 'E_BAD_LAYER' | 'E_BAD_PARAM',
  where: string,
): void {
  const extra = Object.keys(source).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new PxError(
      code,
      `${where} has unknown key${extra.length === 1 ? '' : 's'} ${extra.join(', ')}`,
      `Accepted keys are ${allowed.join(', ')}.`,
    );
  }
}

function normalizeMeta(raw: unknown): RecipeMeta {
  if (!isRecord(raw)) {
    throw new PxError(
      'E_BAD_META',
      'Recipe meta is missing or is not an object',
      'Declare "meta": {"name", "width", "height", "alpha_mode": "binary"}.',
    );
  }

  const { name, width, height, alpha_mode: alphaMode } = raw;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new PxError(
      'E_BAD_META',
      'Recipe meta.name is missing or empty',
      'Name the asset, e.g. "meta": {"name": "potion"}.',
    );
  }

  const widthValue = canvasDimension('width', width);
  const heightValue = canvasDimension('height', height);

  if (alphaMode === 'translucent') {
    throw new PxError(
      'E_BAD_ALPHA',
      'alpha_mode "translucent" is not supported',
      'Alpha is binary. Dither for partial coverage instead of declaring translucent alpha.',
    );
  }

  if (alphaMode !== 'binary') {
    throw new PxError(
      'E_BAD_META',
      `Recipe meta.alpha_mode is ${String(alphaMode)}, not "binary"`,
      'Set "alpha_mode": "binary".',
    );
  }

  unknownKeys(raw, META_KEYS, 'E_BAD_META', 'Recipe meta');

  return { name, width: widthValue, height: heightValue, alphaMode: 'binary' };
}

function canvasDimension(key: string, value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_CANVAS_SIZE ||
    value > MAX_CANVAS_SIZE
  ) {
    throw new PxError(
      'E_BAD_CANVAS',
      `Recipe meta.${key} is ${String(value)}, outside ${MIN_CANVAS_SIZE}-${MAX_CANVAS_SIZE}`,
      `Canvas ${key} is an integer between ${MIN_CANVAS_SIZE} and ${MAX_CANVAS_SIZE}.`,
    );
  }
  return value;
}

function normalizePalette(raw: unknown): Palette {
  if (!isRecord(raw)) {
    throw new PxError(
      'E_BAD_PALETTE',
      'Recipe palette is missing or is not an object',
      'Declare "palette": {"<family>": {"ramp": {...}}} or a flat {"colors": [...]}.',
    );
  }
  const palette: Palette = {};
  for (const [name, family] of Object.entries(raw)) {
    palette[name] = normalizeFamily(name, family).family;
  }
  return palette;
}

function normalizeAnchors(
  raw: unknown,
  width: number,
  height: number,
): { anchors: Anchors; warnings: PxWarning[] } {
  if (raw === undefined) {
    return { anchors: {}, warnings: [] };
  }
  if (!isRecord(raw)) {
    throw new PxError(
      'E_BAD_ANCHOR',
      'Recipe anchors is not an object',
      'Anchors map a name to an [x, y] point, e.g. "anchors": {"pivot": [8, 8]}.',
    );
  }

  const anchors: Anchors = {};
  const warnings: PxWarning[] = [];
  for (const [name, value] of Object.entries(raw)) {
    const anchor = anchorPoint(name, value);
    anchors[name] = anchor;
    if (anchor[0] < 0 || anchor[0] >= width || anchor[1] < 0 || anchor[1] >= height) {
      warnings.push({
        code: 'W_ANCHOR_OUT_OF_BOUNDS',
        message: `Anchor "${name}" at (${anchor[0]}, ${anchor[1]}) is outside the ${width}x${height} canvas`,
        hint: 'Anchors outside the canvas are recorded but resolve to no pixel.',
      });
    }
  }
  return { anchors, warnings };
}

function anchorPoint(name: string, value: unknown): Anchor {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    !Number.isInteger(value[0]) ||
    !Number.isInteger(value[1])
  ) {
    throw new PxError(
      'E_BAD_ANCHOR',
      `Anchor "${name}" is not an [x, y] integer pair`,
      'Write the anchor as [x, y] in recipe coordinates.',
    );
  }
  return [value[0], value[1]];
}

function intParam(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): number {
  const value = source[key];
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (${opName}) is missing "${key}"`,
      `Parameters for ${opName} are ${OP_PARAM_ORDER[opName as OpName].join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-integer "${key}"`,
      `"${key}" must be an integer pixel coordinate.`,
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function colorParam(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
): string {
  const value = source.color;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (${opName}) is missing "color"`,
      'Pass a palette slot such as "steel.base".',
      opLocation(layer, opIndex),
    );
  }
  if (value === null) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has "color": null`,
      'Phase 1 does not accept erase; pass a palette slot such as "steel.base".',
      opLocation(layer, opIndex),
    );
  }
  if (typeof value !== 'string') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-string "color"`,
      'Colour is the palette slot name, e.g. "steel.base".',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function pointsParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): Array<[number, number]> {
  const value = source.points;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (set_pixels) is missing "points"`,
      'Pass points as [[x, y], ...] with at least one coordinate.',
      opLocation(layer, opIndex),
    );
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (set_pixels) has no points`,
      'Pass points as [[x, y], ...] with at least one coordinate.',
      opLocation(layer, opIndex),
    );
  }
  return value.map((entry, pointIndex) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== 'number' ||
      typeof entry[1] !== 'number' ||
      !Number.isInteger(entry[0]) ||
      !Number.isInteger(entry[1])
    ) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (set_pixels) point ${pointIndex} is not an [x, y] integer pair`,
        'Pass points as [[x, y], ...].',
        opLocation(layer, opIndex),
      );
    }
    return [entry[0], entry[1]];
  });
}

function normalizeSetPixels(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): SetPixelsOp {
  return {
    op: 'set_pixels',
    points: pointsParam(source, opIndex, layer),
    color: colorParam(source, 'set_pixels', opIndex, layer),
  };
}

function normalizeRect(source: Record<string, unknown>, opIndex: number, layer: string): RectOp {
  const x = intParam(source, 'x', 'rect', opIndex, layer);
  const y = intParam(source, 'y', 'rect', opIndex, layer);
  const w = intParam(source, 'w', 'rect', opIndex, layer);
  const h = intParam(source, 'h', 'rect', opIndex, layer);
  if (w < 1 || h < 1) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (rect) has a non-positive size: ${w}x${h}`,
      'rect width and height are at least 1.',
      opLocation(layer, opIndex),
    );
  }
  return { op: 'rect', x, y, w, h, color: colorParam(source, 'rect', opIndex, layer) };
}

function normalizeLine(source: Record<string, unknown>, opIndex: number, layer: string): LineOp {
  const op: LineOp = {
    op: 'line',
    x1: intParam(source, 'x1', 'line', opIndex, layer),
    y1: intParam(source, 'y1', 'line', opIndex, layer),
    x2: intParam(source, 'x2', 'line', opIndex, layer),
    y2: intParam(source, 'y2', 'line', opIndex, layer),
    color: colorParam(source, 'line', opIndex, layer),
  };
  const pixelPerfect = source.pixel_perfect;
  if (pixelPerfect !== undefined) {
    if (typeof pixelPerfect !== 'boolean') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (line) has a non-boolean "pixel_perfect"`,
        'pixel_perfect is true or false.',
        opLocation(layer, opIndex),
      );
    }
    if (pixelPerfect) {
      op.pixelPerfect = true;
    }
  }
  return op;
}

function normalizeTupleOp(raw: unknown[], opIndex: number, layer: string): Op {
  const name = raw[0];
  if (typeof name !== 'string') {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Op ${opIndex} is a tuple whose first element is not an op name`,
      `Tuple ops start with one of ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (!OP_NAMES.includes(name as OpName)) {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Unknown op "${name}" in op ${opIndex}`,
      `Phase 1 accepts ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  const params = OP_PARAM_ORDER[name as OpName];
  if (raw.length - 1 > params.length) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${name}) has ${raw.length - 1} tuple arguments, expected at most ${params.length}`,
      `Tuple order for ${name} is ${params.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  const expanded: Record<string, unknown> = { op: name };
  params.forEach((param, index) => {
    const value = raw[index + 1];
    if (value !== undefined) {
      expanded[param] = value;
    }
  });
  return normalizeOpObject(expanded, opIndex, layer);
}

function normalizeOpObject(raw: Record<string, unknown>, opIndex: number, layer: string): Op {
  const name = raw.op;
  if (typeof name !== 'string') {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Op ${opIndex} has no "op" name`,
      `Every op declares "op" as one of ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (!OP_NAMES.includes(name as OpName)) {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Unknown op "${name}" in op ${opIndex}`,
      `Phase 1 accepts ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  unknownKeys(
    raw,
    OP_PARAM_ORDER[name as OpName].concat('op'),
    'E_BAD_PARAM',
    `Op ${opIndex} (${name})`,
  );
  switch (name) {
    case 'set_pixels':
      return normalizeSetPixels(raw, opIndex, layer);
    case 'rect':
      return normalizeRect(raw, opIndex, layer);
    case 'line':
      return normalizeLine(raw, opIndex, layer);
    default:
      throw new PxError(
        'E_UNKNOWN_OP',
        `Unknown op "${name}" in op ${opIndex}`,
        `Phase 1 accepts ${OP_NAMES.join(', ')}.`,
        opLocation(layer, opIndex),
      );
  }
}

export function normalizeOp(raw: unknown, opIndex: number, layer: string): Op {
  if (Array.isArray(raw)) {
    return normalizeTupleOp(raw, opIndex, layer);
  }
  if (!isRecord(raw)) {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Op ${opIndex} is neither an object nor a tuple`,
      `Object ops declare "op"; tuples start with the op name. Phase 1 accepts ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  return normalizeOpObject(raw, opIndex, layer);
}

function normalizeLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw)) {
    throw new PxError(
      'E_BAD_LAYER',
      'Recipe layers is missing or is not an array',
      'Declare "layers": [{"id": "base", "ops": []}].',
    );
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new PxError(
        'E_BAD_LAYER',
        `Layer ${index} is not an object`,
        'A layer is {"id": "<name>", "ops": [...]}.',
      );
    }
    const id = entry.id;
    if (typeof id !== 'string' || id.trim() === '') {
      throw new PxError(
        'E_BAD_LAYER',
        `Layer ${index} has no id`,
        'Give each layer a non-empty id such as "base".',
      );
    }
    if (seen.has(id)) {
      throw new PxError(
        'E_DUPLICATE_LAYER',
        `Layer id "${id}" appears more than once`,
        'Layer ids are unique; they address the active layer in draw and inspect.',
      );
    }
    seen.add(id);
    unknownKeys(entry, ['id', 'ops'], 'E_BAD_LAYER', `Layer "${id}"`);
    const ops = entry.ops;
    if (ops !== undefined && !Array.isArray(ops)) {
      throw new PxError(
        'E_BAD_LAYER',
        `Layer "${id}" has a non-array ops`,
        'A layer is {"id": "<name>", "ops": [...]}.',
      );
    }
    return { id, ops: (ops ?? []).map((op, opIndex) => normalizeOp(op, opIndex, id)) };
  });
}

export interface NormalizeResult {
  recipe: Recipe;
  warnings: PxWarning[];
}

export function normalizeRecipe(raw: unknown): NormalizeResult {
  if (!isRecord(raw)) {
    throw new PxError(
      'E_PARSE',
      'Recipe is not a JSON object',
      'A recipe is a JSON object with version, meta, palette, anchors, and layers.',
    );
  }

  if (raw.version !== RECIPE_VERSION) {
    throw new PxError(
      'E_BAD_VERSION',
      `Recipe version is ${String(raw.version)}, expected ${RECIPE_VERSION}`,
      `Set "version": ${RECIPE_VERSION}.`,
    );
  }

  unknownKeys(raw, ['version', 'meta', 'palette', 'anchors', 'layers'], 'E_BAD_META', 'Recipe');

  const meta = normalizeMeta(raw.meta);
  const palette = normalizePalette(raw.palette);
  const { anchors, warnings } = normalizeAnchors(raw.anchors, meta.width, meta.height);
  const layers = normalizeLayers(raw.layers);

  return { recipe: { version: RECIPE_VERSION, meta, palette, anchors, layers }, warnings };
}
