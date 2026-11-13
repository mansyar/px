/**
 * Recipe normalization.
 *
 * JSON in, canonical recipe model out. Compact op tuples are expanded here, so
 * everything downstream sees one shape.
 */

import { PxError, type PxWarning } from '../errors.js';
import { FACING_UNIT_EPSILON } from '../facing.js';
import { normalizeFamily } from '../palette.js';
import { parseScaleProfile, profileWarnings } from '../profile.js';
import { parseRef, REF_GRAMMAR } from '../refs.js';
import {
  ACCEPTED_VERSIONS,
  type Anchor,
  type Anchors,
  type AsciiBlitOp,
  type AutoOutlineOp,
  type AutoShadeOp,
  type Coord,
  type CoordRef,
  type DebandOp,
  DITHER_PATTERNS,
  type DitherFillOp,
  type DitherPattern,
  type EllipseOp,
  FACING_NAMES,
  type Facing,
  type FloodFillOp,
  GLOSS_PROFILES,
  type GlossProfile,
  isCoordRef,
  type Layer,
  LIGHT_DIRS,
  LIGHT_FORMS,
  LIGHT_RIMS,
  type LightDir,
  type LightForm,
  type LightOp,
  type LightRim,
  type LineOp,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  OP_PARAM_ORDER,
  type OpName,
  OUTLINE_MODES,
  OUTLINE_WHERES,
  type OutlineMode,
  type OutlineWhere,
  PART_TAGGED_OPS,
  type Palette,
  type Part,
  type Parts,
  type PolygonOp,
  type RampFillOp,
  type RawOf,
  type RawOp,
  type Recipe,
  type RecipeMeta,
  type RecipeVersion,
  type RectOp,
  type ReplaceSlotOp,
  type SealOp,
  type SetPixelsOp,
  type SlotRef,
  type StraysOp,
  type StrokeOp,
  TEXTURE_PATTERNS,
  type TextureOp,
  type TexturePattern,
} from './types.js';

const OP_NAMES = Object.keys(OP_PARAM_ORDER) as OpName[];
const META_KEYS = ['name', 'width', 'height', 'alpha_mode', 'profile'];
const RECIPE_KEYS = ['version', 'meta', 'palette', 'parts', 'anchors', 'layers'];
const PART_KEYS = ['material', 'gloss', 'z', 'facing'];

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

  const profile = raw.profile === undefined ? undefined : parseScaleProfile(raw.profile);
  const meta: RecipeMeta = { name, width: widthValue, height: heightValue, alphaMode: 'binary' };
  if (profile !== undefined) {
    meta.profile = profile;
  }
  return meta;
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

function normalizeParts(raw: unknown): Parts {
  if (raw === undefined) {
    return {};
  }
  if (!isRecord(raw)) {
    throw new PxError(
      'E_BAD_PARAM',
      'Recipe parts is not an object',
      'Declare "parts": {"blade": {"material": "steel", "gloss": "metal"}}.',
    );
  }
  const parts: Parts = {};
  for (const [name, value] of Object.entries(raw)) {
    if (name === '') {
      throw new PxError(
        'E_BAD_PARAM',
        'Recipe parts declares a part with an empty name',
        'Name each part, e.g. "blade" or "guard".',
      );
    }
    parts[name] = normalizePart(name, value);
  }
  return parts;
}

function normalizePart(name: string, raw: unknown): Part {
  if (!isRecord(raw)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" is not an object`,
      'A part is {"material": "<palette family>", "gloss": "matte|metal|gem|cloth", "z": 0}.',
    );
  }
  unknownKeys(raw, PART_KEYS, 'E_BAD_PARAM', `Part "${name}"`);

  const material = raw.material;
  if (typeof material !== 'string' || material === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has no "material"`,
      'A part names a palette family, e.g. "material": "steel".',
    );
  }

  const z = raw.z;
  if (z !== undefined && (typeof z !== 'number' || !Number.isInteger(z))) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has a non-integer "z": ${JSON.stringify(z)}`,
      '"z" is an integer; it defaults to 0 and only orders parts for shading.',
    );
  }

  const facing = facingParam(name, raw.facing);

  return {
    material,
    gloss: glossParam(name, raw.gloss),
    z: z ?? 0,
    ...(facing === undefined ? {} : { facing }),
  };
}

/**
 * `facing` is a plane name or an explicit unit vector. The vector is stored as
 * given rather than renormalised, so a canonical write reproduces the authored
 * bytes; the length check is what guarantees the stored vector is unit.
 */
function facingParam(name: string, value: unknown): Facing | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    const match = FACING_NAMES.find((facing) => facing === value);
    if (match === undefined) {
      throw new PxError(
        'E_FACING_UNKNOWN',
        `Part "${name}" has an unknown facing ${JSON.stringify(value)}`,
        `Facing is ${FACING_NAMES.join(', ')}, or a unit [x, y, z] vector.`,
      );
    }
    return match;
  }
  if (!Array.isArray(value) || value.length !== 3) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has a "facing" that is neither a name nor a 3-element vector: ${JSON.stringify(value)}`,
      `Facing is ${FACING_NAMES.join(', ')}, or a unit [x, y, z] vector.`,
    );
  }
  if (!value.every((component) => typeof component === 'number' && Number.isFinite(component))) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has a non-numeric facing vector ${JSON.stringify(value)}`,
      'Each component of a facing vector is a finite number.',
    );
  }
  const [x, y, z] = value as [number, number, number];
  const length = Math.hypot(x, y, z);
  if (length === 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has a zero facing vector [0, 0, 0]`,
      'A zero vector has no direction: name a plane such as "front", or give a unit vector.',
    );
  }
  if (Math.abs(length - 1) > FACING_UNIT_EPSILON) {
    throw new PxError(
      'E_BAD_PARAM',
      `Part "${name}" has a facing vector of length ${length}, which is not 1 within ${FACING_UNIT_EPSILON}`,
      `Normalise the vector, or name one of ${FACING_NAMES.join(', ')}.`,
    );
  }
  return [x, y, z];
}

function glossParam(name: string, value: unknown): GlossProfile {
  if (value === undefined) {
    return 'matte';
  }
  const match =
    typeof value === 'string' ? GLOSS_PROFILES.find((profile) => profile === value) : undefined;
  if (match === undefined) {
    throw new PxError(
      'E_GLOSS_UNKNOWN',
      `Part "${name}" has an unknown gloss ${JSON.stringify(value)}`,
      `Gloss is one of ${GLOSS_PROFILES.join(', ')}.`,
    );
  }
  return match;
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

/**
 * A coordinate: an integer, or a ref object resolved against the entry snapshot
 * at compile time. Refs are stored verbatim, so a read-write cycle never
 * rewrites one into the number it happened to resolve to.
 */
function coordParam(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): Coord {
  const value = source[key];
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (${opName}) is missing "${key}"`,
      `Parameters for ${opName} are ${OP_PARAM_ORDER[opName as OpName].join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (${opName}) has a non-integer "${key}"`,
        `"${key}" must be an integer pixel coordinate or a ref object.`,
        opLocation(layer, opIndex),
      );
    }
    return value;
  }
  if (!isCoordRef(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a "${key}" that is neither an integer nor a ref object`,
      `"${key}" must be an integer pixel coordinate or a ref object. ${REF_GRAMMAR}`,
      opLocation(layer, opIndex),
    );
  }
  return refParam(value, key, opName, opIndex, layer);
}

function offsetParam(
  raw: CoordRef,
  key: 'dx' | 'dy',
  opName: string,
  opIndex: number,
  layer: string,
): number {
  const value = raw[key];
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-integer ref "${key}": ${JSON.stringify(value)}`,
      `A ref offset is an integer pixel delta; "${key}" defaults to 0.`,
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function refParam(
  raw: CoordRef,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): CoordRef {
  const extra = Object.keys(raw).filter(
    (entry) => entry !== 'ref' && entry !== 'dx' && entry !== 'dy',
  );
  if (extra.length > 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) "${key}" ref has unknown key${extra.length === 1 ? '' : 's'} ${extra.join(', ')}`,
      'Accepted keys are ref, dx, dy.',
      opLocation(layer, opIndex),
    );
  }
  const text: unknown = raw.ref;
  if (typeof text !== 'string' || text === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a "${key}" ref without a "ref" string`,
      REF_GRAMMAR,
      opLocation(layer, opIndex),
    );
  }
  // Grammar only. Whether the part or anchor exists is a question about the
  // compile snapshot, so `validateReferences` and the compiler answer it.
  parseRef(text, { layer, opIndex, opName });
  const ref: CoordRef = { ref: text };
  const dx = offsetParam(raw, 'dx', opName, opIndex, layer);
  const dy = offsetParam(raw, 'dy', opName, opIndex, layer);
  if (dx !== 0) {
    ref.dx = dx;
  }
  if (dy !== 0) {
    ref.dy = dy;
  }
  return ref;
}

function stringParam(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): string {
  const value = source[key];
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (${opName}) is missing "${key}"`,
      `Parameters for ${opName} are ${OP_PARAM_ORDER[opName as OpName].join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (typeof value !== 'string' || value === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-string or empty "${key}"`,
      `"${key}" is a slot name such as "steel.base".`,
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function optionalStringParam(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): string | undefined {
  if (source[key] === undefined) {
    return undefined;
  }
  return stringParam(source, key, opName, opIndex, layer);
}

function enumParam<T extends string>(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
  allowed: readonly T[],
  required: boolean,
): T | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      throw new PxError(
        'E_MISSING_PARAM',
        `Op ${opIndex} (${opName}) is missing "${key}"`,
        `"${key}" is one of ${allowed.join(', ')}.`,
        opLocation(layer, opIndex),
      );
    }
    return undefined;
  }
  const match = typeof value === 'string' ? allowed.find((entry) => entry === value) : undefined;
  if (match === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has an invalid "${key}": ${JSON.stringify(value)}`,
      `"${key}" is one of ${allowed.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  return match;
}

function boolParam(
  source: Record<string, unknown>,
  key: string,
  opName: string,
  opIndex: number,
  layer: string,
): boolean | undefined {
  const value = source[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-boolean "${key}"`,
      `"${key}" is true or false.`,
      opLocation(layer, opIndex),
    );
  }
  return value;
}

/**
 * Present-and-null is an erase; absent is an error. The presence check is
 * `'color' in source`, never a truthiness test: `null` is a valid value here and
 * the whole erase semantics depends on telling the two apart.
 */
function colorParam(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
  required = true,
): SlotRef | undefined {
  if (!('color' in source)) {
    if (!required) {
      return undefined;
    }
    throw new PxError(
      'E_MISSING_COLOR',
      `Op ${opIndex} (${opName}) is missing "color"`,
      'Pass "color": "<family>.<role>" to paint, or "color": null to erase.',
      opLocation(layer, opIndex),
    );
  }
  const value = source.color;
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string' || value === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-string "color"`,
      'Colour is a palette slot name such as "steel.base", or null to erase.',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function pointsParam(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
  minimum: number,
): Array<[number, number]> {
  const value = source.points;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (${opName}) is missing "points"`,
      'Pass points as [[x, y], ...].',
      opLocation(layer, opIndex),
    );
  }
  if (!Array.isArray(value) || value.length < minimum) {
    throw new PxError(
      opName === 'polygon' ? 'E_BAD_POLYGON' : 'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has ${Array.isArray(value) ? value.length : 'no'} points; at least ${minimum} are required`,
      opName === 'polygon'
        ? 'A polygon needs at least three points, each an [x, y] integer pair.'
        : 'Pass points as [[x, y], ...] with at least one coordinate.',
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
        opName === 'polygon' ? 'E_BAD_POLYGON' : 'E_BAD_PARAM',
        `Op ${opIndex} (${opName}) point ${pointIndex} is not an [x, y] integer pair`,
        'Pass points as [[x, y], ...].',
        opLocation(layer, opIndex),
      );
    }
    return [entry[0], entry[1]];
  });
}

/**
 * `stroke`'s vertex list. Consecutive duplicates are legal input (the op
 * deduplicates them); a list with fewer than two entries, or an entry that is
 * not an integer pair, is `E_BAD_PATH`.
 */
function pathParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): Array<[number, number]> {
  const value = source.path;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (stroke) is missing "path"`,
      'Pass path as [[x, y], ...].',
      opLocation(layer, opIndex),
    );
  }
  if (!Array.isArray(value) || value.length < 2) {
    throw new PxError(
      'E_BAD_PATH',
      `Op ${opIndex} (stroke) has ${Array.isArray(value) ? value.length : 'no'} path points; at least two are required`,
      'Pass path as [[x, y], ...] with at least two different integer coordinates.',
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
        'E_BAD_PATH',
        `Op ${opIndex} (stroke) path point ${pointIndex} is not an [x, y] integer pair`,
        'Pass path as [[x, y], ...].',
        opLocation(layer, opIndex),
      );
    }
    return [entry[0], entry[1]];
  });
}

/** Shared x, y, w, h reader for the rectangle-shaped ops. */
function regionParams(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
): { x: Coord; y: Coord; w: number; h: number } {
  const x = coordParam(source, 'x', opName, opIndex, layer);
  const y = coordParam(source, 'y', opName, opIndex, layer);
  const w = intParam(source, 'w', opName, opIndex, layer);
  const h = intParam(source, 'h', opName, opIndex, layer);
  if (w < 1 || h < 1) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-positive size: ${w}x${h}`,
      `${opName} width and height are at least 1.`,
      opLocation(layer, opIndex),
    );
  }
  return { x, y, w, h };
}

function normalizeSetPixels(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): SetPixelsOp {
  return {
    op: 'set_pixels',
    points: pointsParam(source, 'set_pixels', opIndex, layer, 1),
    color: colorParam(source, 'set_pixels', opIndex, layer) ?? null,
  };
}

function normalizeRect(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<RectOp> {
  const region = regionParams(source, 'rect', opIndex, layer);
  return {
    op: 'rect',
    ...region,
    color: colorParam(source, 'rect', opIndex, layer) ?? null,
  };
}

function normalizeLine(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<LineOp> {
  return {
    op: 'line',
    x1: coordParam(source, 'x1', 'line', opIndex, layer),
    y1: coordParam(source, 'y1', 'line', opIndex, layer),
    x2: coordParam(source, 'x2', 'line', opIndex, layer),
    y2: coordParam(source, 'y2', 'line', opIndex, layer),
    color: colorParam(source, 'line', opIndex, layer) ?? null,
  };
}

function normalizeStroke(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): StrokeOp {
  const op: StrokeOp = {
    op: 'stroke',
    path: pathParam(source, opIndex, layer),
    color: colorParam(source, 'stroke', opIndex, layer) ?? null,
  };
  if (boolParam(source, 'closed', 'stroke', opIndex, layer) === true) {
    op.closed = true;
  }
  if (boolParam(source, 'smooth', 'stroke', opIndex, layer) === true) {
    op.smooth = true;
  }
  const width = source.width;
  if (width !== undefined) {
    if (width !== 1 && width !== 2) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (stroke) has width ${String(width)}; only 1 and 2 are supported`,
        'Stroke width is 1 (default) or 2 pixels; a wider stroke is a shape, not a path.',
        opLocation(layer, opIndex),
      );
    }
    if (width === 2) {
      op.width = 2;
    }
  }
  const corner = source.corner;
  if (corner !== undefined) {
    if (corner !== 'miter' && corner !== 'round' && corner !== 'bevel') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (stroke) has corner ${JSON.stringify(corner)}; only "miter", "round" and "bevel" are supported`,
        'Absent means miter, which is the pre-1.2 behaviour.',
        opLocation(layer, opIndex),
      );
    }
    if (corner !== 'miter') {
      op.corner = corner;
    }
  }
  const cap = source.cap;
  if (cap !== undefined) {
    if (cap !== 'butt' && cap !== 'round') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (stroke) has cap ${JSON.stringify(cap)}; only "butt" and "round" are supported`,
        'Absent means butt, which is the pre-1.2 behaviour.',
        opLocation(layer, opIndex),
      );
    }
    if (cap === 'round') {
      op.cap = 'round';
    }
  }
  return op;
}

function normalizeEllipse(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<EllipseOp> {
  const region = regionParams(source, 'ellipse', opIndex, layer);
  const op: RawOf<EllipseOp> = {
    op: 'ellipse',
    ...region,
    color: colorParam(source, 'ellipse', opIndex, layer) ?? null,
  };
  if (boolParam(source, 'fill', 'ellipse', opIndex, layer) === true) {
    op.fill = true;
  }
  return op;
}

function normalizePolygon(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): PolygonOp {
  return {
    op: 'polygon',
    points: pointsParam(source, 'polygon', opIndex, layer, 3),
    color: colorParam(source, 'polygon', opIndex, layer) ?? null,
  };
}

function normalizeFloodFill(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<FloodFillOp> {
  const op: RawOf<FloodFillOp> = {
    op: 'flood_fill',
    x: coordParam(source, 'x', 'flood_fill', opIndex, layer),
    y: coordParam(source, 'y', 'flood_fill', opIndex, layer),
    color: colorParam(source, 'flood_fill', opIndex, layer) ?? null,
  };
  const connectivity = source.connectivity;
  if (connectivity !== undefined) {
    if (connectivity !== 4 && connectivity !== 8) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (flood_fill) has connectivity ${JSON.stringify(connectivity)}`,
        'connectivity is 4 or 8; it defaults to 4.',
        opLocation(layer, opIndex),
      );
    }
    if (connectivity === 8) {
      op.connectivity = 8;
    }
  }
  return op;
}

function normalizeDitherFill(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<DitherFillOp> {
  const region = regionParams(source, 'dither_fill', opIndex, layer);
  const pattern = enumParam<DitherPattern>(
    source,
    'pattern',
    'dither_fill',
    opIndex,
    layer,
    DITHER_PATTERNS,
    true,
  );
  return {
    op: 'dither_fill',
    ...region,
    color: colorParam(source, 'dither_fill', opIndex, layer) ?? null,
    pattern: pattern ?? DITHER_PATTERNS[0],
  };
}

function gridParam(source: Record<string, unknown>, opIndex: number, layer: string): string[] {
  const value = source.grid;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (ascii_blit) is missing "grid"`,
      'Pass grid as an array of equal-length strings.',
      opLocation(layer, opIndex),
    );
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new PxError(
      'E_BAD_GRID',
      `Op ${opIndex} (ascii_blit) has an empty grid`,
      'Pass at least one row of characters.',
      opLocation(layer, opIndex),
    );
  }
  const rows: string[] = [];
  let width = -1;
  value.forEach((row, rowIndex) => {
    if (typeof row !== 'string') {
      throw new PxError(
        'E_BAD_GRID',
        `Op ${opIndex} (ascii_blit) row ${rowIndex} is not a string`,
        'Every grid row is a string of characters.',
        opLocation(layer, opIndex),
      );
    }
    const length = Array.from(row).length;
    if (length === 0) {
      throw new PxError(
        'E_BAD_GRID',
        `Op ${opIndex} (ascii_blit) row ${rowIndex} is empty`,
        'Every row has at least one character.',
        opLocation(layer, opIndex),
      );
    }
    if (width === -1) {
      width = length;
    } else if (length !== width) {
      throw new PxError(
        'E_BAD_GRID',
        `Op ${opIndex} (ascii_blit) row ${rowIndex} has ${length} characters; row 0 has ${width}`,
        'Pad every row to the same length.',
        opLocation(layer, opIndex),
      );
    }
    rows.push(row);
  });
  return rows;
}

function legendParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): Record<string, string> {
  const value = source.legend;
  if (value === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (ascii_blit) is missing "legend"`,
      'Pass legend as {"#": "steel.outline", ...}.',
      opLocation(layer, opIndex),
    );
  }
  if (!isRecord(value)) {
    throw new PxError(
      'E_BAD_LEGEND',
      `Op ${opIndex} (ascii_blit) has a non-object legend`,
      'A legend maps single characters to declared palette slots.',
      opLocation(layer, opIndex),
    );
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new PxError(
      'E_BAD_LEGEND',
      `Op ${opIndex} (ascii_blit) has an empty legend`,
      'Map at least one character to a slot.',
      opLocation(layer, opIndex),
    );
  }
  const legend: Record<string, string> = {};
  for (const [glyph, slot] of entries) {
    if (Array.from(glyph).length !== 1) {
      throw new PxError(
        'E_BAD_LEGEND',
        `Op ${opIndex} (ascii_blit) legend key ${JSON.stringify(glyph)} is not a single character`,
        'Each key is exactly one character.',
        opLocation(layer, opIndex),
      );
    }
    if (typeof slot !== 'string' || slot === '') {
      throw new PxError(
        'E_BAD_LEGEND',
        `Op ${opIndex} (ascii_blit) legend entry "${glyph}" is not a slot name`,
        'Map each character to a declared palette slot such as "steel.base".',
        opLocation(layer, opIndex),
      );
    }
    legend[glyph] = slot;
  }
  return legend;
}

/**
 * `texture` reads a part's mask, so the pattern is required and its own code
 * names the legal set. `color` may be a slot or a bare ramp role, resolved
 * against the part's material at compile time; `density` defaults to 2 and is
 * written back only when it differs, so a plain texture stays compact.
 */
function normalizeTexture(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): TextureOp {
  const pattern = source.pattern;
  if (pattern === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (texture) is missing "pattern"`,
      `Parameters for texture are ${OP_PARAM_ORDER.texture.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  if (typeof pattern !== 'string' || !TEXTURE_PATTERNS.includes(pattern as TexturePattern)) {
    throw new PxError(
      'E_PATTERN_UNKNOWN',
      `Op ${opIndex} (texture) has pattern ${JSON.stringify(pattern)}, which is not a texture pattern`,
      `Patterns are ${TEXTURE_PATTERNS.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  const op: TextureOp = {
    op: 'texture',
    pattern: pattern as TexturePattern,
    color: colorParam(source, 'texture', opIndex, layer) ?? null,
  };
  const density = source.density;
  if (density !== undefined) {
    if (density !== 1 && density !== 2 && density !== 3) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (texture) has density ${String(density)}; only 1, 2 and 3 are supported`,
        'Density 1 is sparsest and 3 is densest; it scales the gap between marks, not their size.',
        opLocation(layer, opIndex),
      );
    }
    if (density !== 2) {
      op.density = density;
    }
  }
  const fit = source.fit;
  if (fit !== undefined) {
    if (fit !== 'full' && fit !== 'region') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (texture) has fit ${JSON.stringify(fit)}; only "full" and "region" are supported`,
        'Full fit needs a whole mark inside the part; region fit anchors one legal mark when the lattice cannot.',
        opLocation(layer, opIndex),
      );
    }
    if (fit === 'region') {
      op.fit = 'region';
    }
  }
  const targetLayer = optionalStringParam(source, 'target_layer', 'texture', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
  }
  return op;
}

function normalizeAsciiBlit(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOf<AsciiBlitOp> {
  const x = coordParam(source, 'x', 'ascii_blit', opIndex, layer);
  const y = coordParam(source, 'y', 'ascii_blit', opIndex, layer);
  const grid = gridParam(source, opIndex, layer);
  const legend = legendParam(source, opIndex, layer);

  grid.forEach((row, rowIndex) => {
    Array.from(row).forEach((glyph, columnIndex) => {
      // `.` is transparent unless the legend claims it.
      if (glyph === '.' && legend[glyph] === undefined) {
        return;
      }
      if (legend[glyph] === undefined) {
        throw new PxError(
          'E_UNKNOWN_GLYPH',
          `Op ${opIndex} (ascii_blit) uses character ${JSON.stringify(glyph)} at row ${rowIndex}, column ${columnIndex}, which the legend does not define`,
          'Add the character to the legend, or use "." for transparency.',
          opLocation(layer, opIndex),
        );
      }
    });
  });

  return { op: 'ascii_blit', x, y, grid, legend };
}

function normalizeMirrorOp(source: Record<string, unknown>, opIndex: number, layer: string): RawOp {
  const axis = enumParam(source, 'axis', 'mirror', opIndex, layer, ['x', 'y'] as const, true);
  const pivot = source.pivot;
  if (pivot === undefined) {
    throw new PxError(
      'E_MISSING_PARAM',
      `Op ${opIndex} (mirror) is missing "pivot"`,
      '"pivot" is an integer or half-integer axis coordinate.',
      opLocation(layer, opIndex),
    );
  }
  if (typeof pivot !== 'number' || !Number.isFinite(pivot) || !Number.isInteger(pivot * 2)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (mirror) has pivot ${JSON.stringify(pivot)}`,
      '"pivot" is a whole or half-pixel coordinate, e.g. 7 or 7.5.',
      opLocation(layer, opIndex),
    );
  }
  return { op: 'mirror', axis: axis ?? 'x', pivot };
}

/**
 * `width` is 1-4 px: the border's depth, overriding the profile's outlineWidth
 * when a recipe wants a heavier or lighter edge than its scale expects.
 */
function outlineWidthParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): number | undefined {
  const value = source.width;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (auto_outline) has width ${JSON.stringify(value)}, outside 1-4`,
      '"width" is an integer from 1 to 4 pixels of border depth.',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function normalizeAutoOutline(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): AutoOutlineOp {
  const mode = enumParam<OutlineMode>(
    source,
    'mode',
    'auto_outline',
    opIndex,
    layer,
    OUTLINE_MODES,
    false,
  );
  const where = enumParam<OutlineWhere>(
    source,
    'where',
    'auto_outline',
    opIndex,
    layer,
    OUTLINE_WHERES,
    false,
  );
  const selective = boolParam(source, 'selective', 'auto_outline', opIndex, layer);
  const color = colorParam(source, 'auto_outline', opIndex, layer, selective !== true);
  const outlineWidth = outlineWidthParam(source, opIndex, layer);
  const op: AutoOutlineOp = { op: 'auto_outline' };
  if (mode !== undefined) {
    op.mode = mode;
  }
  if (where !== undefined) {
    op.where = where;
  }
  if (color !== undefined) {
    op.color = color;
  }
  if (selective === true) {
    op.selective = true;
  }
  if (outlineWidth !== undefined) {
    op.width = outlineWidth;
  }
  const targetLayer = optionalStringParam(source, 'target_layer', 'auto_outline', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
  }
  // `colorParam` only ever reads `color`, so the seam needs its own read. The
  // slot itself is resolved at compile time, where an unknown name is an error.
  const seam = source.seam;
  if (seam !== undefined) {
    if (typeof seam !== 'string') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (auto_outline) has a non-string seam`,
        'seam is a slot reference such as "steel.outline".',
        opLocation(layer, opIndex),
      );
    }
    op.seam = seam;
  }

  return op;
}

function normalizeAutoShade(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): AutoShadeOp {
  const lightDir = enumParam<LightDir>(
    source,
    'light_dir',
    'auto_shade',
    opIndex,
    layer,
    LIGHT_DIRS,
    true,
  );
  const op: AutoShadeOp = { op: 'auto_shade', lightDir: lightDir ?? 'top-left' };
  const targetLayer = optionalStringParam(source, 'target_layer', 'auto_shade', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
  }
  return op;
}

function normalizeRampFill(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RampFillOp {
  const bands = intParam(source, 'bands', 'ramp_fill', opIndex, layer);
  if (bands < 2 || bands > 3) {
    throw new PxError(
      'E_BANDS_RANGE',
      `Op ${opIndex} (ramp_fill) has ${bands} bands`,
      'bands is 2 or 3: a family supplies three shading roles (shadow, base, highlight), so a band count above 3 cannot produce more transitions.',
      opLocation(layer, opIndex),
    );
  }
  const lightDir = enumParam<LightDir>(
    source,
    'light_dir',
    'ramp_fill',
    opIndex,
    layer,
    LIGHT_DIRS,
    true,
  );
  const op: RampFillOp = { op: 'ramp_fill', bands, lightDir: lightDir ?? 'top-left' };
  const targetLayer = optionalStringParam(source, 'target_layer', 'ramp_fill', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
  }
  return op;
}

/** `cast` names a declared part, or null for no cast shadow; absent means null. */
function castParam(source: Record<string, unknown>, opIndex: number, layer: string): string | null {
  const value = source.cast;
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (light) has a non-string or empty "cast"`,
      '"cast" names a declared part, or null for no cast shadow.',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

/**
 * `cast_offset` is 1-4 px: a shadow touching the caster at one pixel or sitting
 * four pixels away, with nothing between that changes how it reads.
 */
function castOffsetParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): number | undefined {
  const value = source.cast_offset;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (light) has cast_offset ${JSON.stringify(value)}, outside 1-4`,
      '"cast_offset" is an integer from 1 to 4 pixels along the light vector.',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function normalizeLight(source: Record<string, unknown>, opIndex: number, layer: string): LightOp {
  const angle = enumParam<LightDir>(source, 'angle', 'light', opIndex, layer, LIGHT_DIRS, false);
  const form = enumParam<LightForm>(source, 'form', 'light', opIndex, layer, LIGHT_FORMS, false);
  const rim = enumParam<LightRim>(source, 'rim', 'light', opIndex, layer, LIGHT_RIMS, false);
  const ao = boolParam(source, 'ao', 'light', opIndex, layer);
  const castOffset = castOffsetParam(source, opIndex, layer);
  const op: LightOp = {
    op: 'light',
    angle: angle ?? 'top-left',
    form: form ?? 'bevel',
    ao: ao ?? true,
    cast: castParam(source, opIndex, layer),
    castOffset: castOffset ?? 1,
    rim: rim ?? 'edge',
  };
  const bands = source.bands;
  if (bands !== undefined) {
    if (typeof bands !== 'number' || !Number.isInteger(bands) || bands < 2 || bands > 4) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (light) has bands ${JSON.stringify(bands)}; only 2, 3 and 4 are supported`,
        'Bands split the part along the light axis; a part thinner than the count degrades to fewer bands.',
        opLocation(layer, opIndex),
      );
    }
    op.bands = bands;
  }
  const bandScale = source.band_scale;
  if (bandScale !== undefined) {
    if (bands === undefined) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (light) sets band_scale without bands`,
        'band_scale only means something when bands says how many to place.',
        opLocation(layer, opIndex),
      );
    }
    if (bandScale !== 'thickness' && bandScale !== 'uniform') {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (light) has band_scale ${JSON.stringify(bandScale)}; only "thickness" and "uniform" are supported`,
        'thickness shares the part`s extent equally; uniform uses a fixed pixel width.',
        opLocation(layer, opIndex),
      );
    }
    if (bandScale === 'uniform') {
      op.bandScale = 'uniform';
    }
  }
  const names = (key: 'parts' | 'skip'): string[] | undefined => {
    const raw = source[key];
    if (raw === undefined) {
      return undefined;
    }
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op ${opIndex} (light) has ${key} ${JSON.stringify(raw)}; expected a non-empty list of part names`,
        'Name at least one declared part.',
        opLocation(layer, opIndex),
      );
    }
    const out: string[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string' || entry === '') {
        throw new PxError(
          'E_BAD_PARAM',
          `Op ${opIndex} (light) has a non-string entry in ${key}`,
          'Part names are strings copied from the recipe parts block.',
          opLocation(layer, opIndex),
        );
      }
      if (!out.includes(entry)) {
        out.push(entry);
      }
    }
    return out;
  };
  const include = names('parts');
  const exclude = names('skip');
  if (include !== undefined && exclude !== undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (light) sets both parts and skip`,
      'An allow-list and a deny-list cannot both decide which parts are shaded.',
      opLocation(layer, opIndex),
    );
  }
  if (include !== undefined) {
    op.parts = include;
  }
  if (exclude !== undefined) {
    op.skip = exclude;
  }
  const targetLayer = optionalStringParam(source, 'target_layer', 'light', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
  }
  return op;
}

function normalizeReplaceSlot(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): ReplaceSlotOp {
  return {
    op: 'replace_slot',
    from: stringParam(source, 'from', 'replace_slot', opIndex, layer),
    to: stringParam(source, 'to', 'replace_slot', opIndex, layer),
  };
}

/**
 * Cleanup passes take one optional key. `target_layer` is the layer they read;
 * they always write into the layer that contains the op.
 */
function normalizeCleanup(
  name: 'seal' | 'strays' | 'deband',
  raw: Record<string, unknown>,
  opIndex: number,
  layer: string,
): SealOp | StraysOp | DebandOp {
  const targetLayer = optionalStringParam(raw, 'target_layer', name, opIndex, layer);
  return targetLayer === undefined ? { op: name } : { op: name, targetLayer };
}

function normalizeTupleOp(raw: unknown[], opIndex: number, layer: string): RawOp {
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
      `Ops are ${OP_NAMES.join(', ')}.`,
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

function opIdParam(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): string | undefined {
  const value = source.id;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} has a non-string or empty "id"`,
      'An op id is a non-empty string, unique across the recipe.',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function normalizeOpObject(raw: Record<string, unknown>, opIndex: number, layer: string): RawOp {
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
      `Ops are ${OP_NAMES.join(', ')}.`,
      opLocation(layer, opIndex),
    );
  }
  const tagged = PART_TAGGED_OPS.includes(name as OpName);
  unknownKeys(
    raw,
    OP_PARAM_ORDER[name as OpName].concat('op', 'id').concat(tagged ? ['part'] : []),
    'E_BAD_PARAM',
    `Op ${opIndex} (${name})`,
  );

  const id = opIdParam(raw, opIndex, layer);
  const op = normalizeOpBody(name as OpName, raw, opIndex, layer);
  if (id !== undefined) {
    op.id = id;
  }
  const part = tagged ? partParam(raw, name, opIndex, layer) : undefined;
  if (part !== undefined) {
    op.part = part;
  }
  return op;
}

/**
 * `part` is a declared name. It travels inside the op object rather than as a
 * flag: a batched draw can address several parts at once (FR-2).
 */
function partParam(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
): string | undefined {
  const value = source.part;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${opIndex} (${opName}) has a non-string or empty "part"`,
      'A part is a name declared in "parts", such as "blade".',
      opLocation(layer, opIndex),
    );
  }
  return value;
}

function normalizeOpBody(
  name: OpName,
  raw: Record<string, unknown>,
  opIndex: number,
  layer: string,
): RawOp {
  switch (name) {
    case 'set_pixels':
      return normalizeSetPixels(raw, opIndex, layer);
    case 'rect':
      return normalizeRect(raw, opIndex, layer);
    case 'line':
      return normalizeLine(raw, opIndex, layer);
    case 'stroke':
      return normalizeStroke(raw, opIndex, layer);
    case 'ellipse':
      return normalizeEllipse(raw, opIndex, layer);
    case 'polygon':
      return normalizePolygon(raw, opIndex, layer);
    case 'flood_fill':
      return normalizeFloodFill(raw, opIndex, layer);
    case 'dither_fill':
      return normalizeDitherFill(raw, opIndex, layer);
    case 'texture':
      return normalizeTexture(raw, opIndex, layer);
    case 'ascii_blit':
      return normalizeAsciiBlit(raw, opIndex, layer);
    case 'mirror':
      return normalizeMirrorOp(raw, opIndex, layer);
    case 'auto_outline':
      return normalizeAutoOutline(raw, opIndex, layer);
    case 'auto_shade':
      return normalizeAutoShade(raw, opIndex, layer);
    case 'ramp_fill':
      return normalizeRampFill(raw, opIndex, layer);
    case 'light':
      return normalizeLight(raw, opIndex, layer);
    case 'replace_slot':
      return normalizeReplaceSlot(raw, opIndex, layer);
    case 'seal':
    case 'strays':
    case 'deband':
      return normalizeCleanup(name, raw, opIndex, layer);
  }
}

export function normalizeOp(raw: unknown, opIndex: number, layer: string): RawOp {
  if (Array.isArray(raw)) {
    return normalizeTupleOp(raw, opIndex, layer);
  }
  if (!isRecord(raw)) {
    throw new PxError(
      'E_UNKNOWN_OP',
      `Op ${opIndex} is neither an object nor a tuple`,
      `Object ops declare "op"; tuples start with the op name. Ops are ${OP_NAMES.join(', ')}.`,
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

/** Op ids address ops across the whole recipe, so they must be unique globally. */
function validateOpIds(layers: readonly Layer[]): void {
  const seen = new Map<string, { layer: string; index: number }>();
  for (const layer of layers) {
    layer.ops.forEach((op, opIndex) => {
      if (op.id === undefined) {
        return;
      }
      const previous = seen.get(op.id);
      if (previous !== undefined) {
        throw new PxError(
          'E_DUPLICATE_OP_ID',
          `Op id "${op.id}" appears more than once: layer "${previous.layer}" op ${previous.index} and layer "${layer.id}" op ${opIndex}`,
          'Op ids are unique across the recipe; rename one of the duplicates.',
          opLocation(layer.id, opIndex),
        );
      }
      seen.set(op.id, { layer: layer.id, index: opIndex });
    });
  }
}

export interface NormalizeResult {
  recipe: Recipe;
  warnings: PxWarning[];
}

/** Ordering for gates: a 1.0 document predates every option a later version adds. */
function versionRank(version: RecipeVersion): number {
  switch (version) {
    case 1:
    case '1.0':
      return 0;
    case '1.1':
      return 1;
    case '1.2':
      return 2;
    default:
      return 3;
  }
}

export function normalizeRecipe(raw: unknown): NormalizeResult {
  if (!isRecord(raw)) {
    throw new PxError(
      'E_PARSE',
      'Recipe is not a JSON object',
      'A recipe is a JSON object with version, meta, palette, parts, anchors, and layers.',
    );
  }

  const version = ACCEPTED_VERSIONS.find((entry) => entry === raw.version);
  if (version === undefined) {
    throw new PxError(
      'E_BAD_VERSION',
      `Recipe version is ${String(raw.version)}, expected one of ${ACCEPTED_VERSIONS.map((entry) => JSON.stringify(entry)).join(', ')}`,
      'Keep "version": 1 for a 1.0 recipe, or set "version": "1.1" to declare parts.',
    );
  }

  // Part selection names must exist at any version, not only the one that
  // introduced the option: a typo should not wait for a second error.
  const namedParts = new Set(
    typeof raw.parts === 'object' && raw.parts !== null ? Object.keys(raw.parts) : [],
  );
  for (const layer of Array.isArray(raw.layers) ? raw.layers : []) {
    const ops = (layer as { ops?: unknown }).ops;
    if (!Array.isArray(ops)) continue;
    for (const op of ops) {
      const candidate = op as { op?: unknown; parts?: unknown; skip?: unknown };
      if (candidate.op !== 'light') continue;
      for (const key of ['parts', 'skip'] as const) {
        const list = candidate[key];
        if (!Array.isArray(list)) continue;
        for (const name of list) {
          if (!namedParts.has(String(name))) {
            throw new PxError(
              'E_BAD_PARAM',
              `Op (light) names part "${String(name)}" in ${key}, which the recipe does not declare`,
              `Declared parts are ${[...namedParts].join(', ') || 'none'}.`,
            );
          }
        }
      }
    }
  }

  // 1.3 options: band count and scale, part selection, the outline seam, and a
  // role that names a tone. Each changes pixels only when used, so a document
  // that does not use them keeps its bytes at any version.
  if (versionRank(version) < 3) {
    const rawLayers = Array.isArray(raw.layers) ? raw.layers : [];
    for (const layer of rawLayers) {
      const ops = (layer as { ops?: unknown }).ops;
      if (!Array.isArray(ops)) continue;
      for (const op of ops) {
        const candidate = op as Record<string, unknown>;
        const lightUses =
          candidate.op === 'light' &&
          (candidate.bands !== undefined ||
            candidate.band_scale !== undefined ||
            candidate.parts !== undefined ||
            candidate.skip !== undefined);
        const seamUses = candidate.op === 'auto_outline' && candidate.seam !== undefined;
        if (lightUses || seamUses) {
          throw new PxError(
            'E_BAD_VERSION',
            `Op uses a 1.3-only option with version ${JSON.stringify(version)}, but it requires schema 1.3`,
            'Set "version": "1.3" to use light bands, part selection or the outline seam.',
          );
        }
      }
    }
    const families = (raw.palette ?? {}) as Record<string, unknown>;
    for (const [name, family] of Object.entries(families)) {
      const ramp = (family as { ramp?: Record<string, unknown> }).ramp;
      if (typeof ramp !== 'object' || ramp === null) continue;
      for (const [role, value] of Object.entries(ramp)) {
        if (typeof value === 'string' && /^t\d+$/.test(value)) {
          throw new PxError(
            'E_BAD_VERSION',
            `Palette family "${name}" role "${role}" names a tone with version ${JSON.stringify(version)}, which requires schema 1.3`,
            'Set "version": "1.3" to point a role at a tone.',
          );
        }
      }
    }
  }

  // Parts are a 1.1 feature (FR-5), so a 1.0 document that declares them is a
  // contradiction. Rejecting it here is what lets the writer echo the caller's
  // version verbatim: a 1.0 recipe is always part-less, so no write can promote
  // it and silently change the depth `auto_outline` defaults to (AC-1).
  // `fit: "region"` is a 1.2 option (FR-16). A 1.1 document that used it would
  // otherwise compile to different pixels on either side of the upgrade, so it
  // is rejected here with a message that names the version to set.
  if (versionRank(version) < 2) {
    const palette = (raw.palette ?? {}) as Record<string, unknown>;
    for (const [name, family] of Object.entries(palette)) {
      if (typeof family === 'object' && family !== null && 'derive' in family) {
        throw new PxError(
          'E_BAD_VERSION',
          `Palette family "${name}" is derived with version ${JSON.stringify(version)}, but derivation requires schema 1.2`,
          'Set "version": "1.2" to derive a ramp from one base colour.',
        );
      }
    }
    const declaredParts = new Set(
      typeof raw.parts === 'object' && raw.parts !== null ? Object.keys(raw.parts) : [],
    );
    const layers = Array.isArray(raw.layers) ? raw.layers : [];
    for (const layer of layers) {
      const ops = (layer as { ops?: unknown }).ops;
      if (!Array.isArray(ops)) continue;
      for (const op of ops) {
        const candidate = op as { op?: unknown; parts?: unknown; skip?: unknown };
        if (candidate.op !== 'light') continue;
        for (const key of ['parts', 'skip'] as const) {
          const list = candidate[key];
          if (!Array.isArray(list)) continue;
          for (const name of list) {
            if (!declaredParts.has(String(name))) {
              throw new PxError(
                'E_BAD_PARAM',
                `Op (light) names part "${String(name)}" in ${key}, which the recipe does not declare`,
                `Declared parts are ${[...declaredParts].join(', ') || 'none'}.`,
                { layer: String((layer as { id?: unknown }).id ?? 'base') },
              );
            }
          }
        }
      }
    }
    for (const layer of layers) {
      const ops = (layer as { ops?: unknown }).ops;
      if (!Array.isArray(ops)) continue;
      for (const op of ops) {
        const candidate = op as { op?: unknown; fit?: unknown; corner?: unknown; cap?: unknown };
        const gated =
          (candidate.op === 'texture' && candidate.fit === 'region') ||
          (candidate.op === 'stroke' &&
            ((candidate.corner !== undefined && candidate.corner !== 'miter') ||
              candidate.cap === 'round'));
        if (gated) {
          throw new PxError(
            'E_BAD_VERSION',
            `Op uses a 1.2-only option with version ${JSON.stringify(version)}, but it requires schema 1.2`,
            'Set "version": "1.2" to use region texture fit or stroke corner/cap.',
          );
        }
      }
    }
  }

  if ((version === 1 || version === '1.0') && raw.parts !== undefined) {
    throw new PxError(
      'E_BAD_VERSION',
      `Recipe declares parts with version ${JSON.stringify(version)}, but parts require schema 1.1`,
      'Parts are a 1.1 feature: set "version": "1.1" to declare them.',
    );
  }

  unknownKeys(raw, RECIPE_KEYS, 'E_BAD_META', 'Recipe');

  const meta = normalizeMeta(raw.meta);
  const palette = normalizePalette(raw.palette);
  const parts = normalizeParts(raw.parts);
  const { anchors, warnings: anchorWarnings } = normalizeAnchors(
    raw.anchors,
    meta.width,
    meta.height,
  );
  const layers = normalizeLayers(raw.layers);
  validateOpIds(layers);

  const warnings =
    meta.profile === undefined
      ? anchorWarnings
      : [...profileWarnings(meta.profile, meta.width, meta.height), ...anchorWarnings];

  return {
    recipe: { version, meta, palette, parts, anchors, layers },
    warnings,
  };
}
