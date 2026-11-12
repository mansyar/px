/**
 * Recipe normalization.
 *
 * JSON in, canonical recipe model out. Compact op tuples are expanded here, so
 * everything downstream sees one shape.
 */

import { PxError, type PxWarning } from '../errors.js';
import { normalizeFamily } from '../palette.js';
import { parseScaleProfile, profileWarnings } from '../profile.js';
import {
  ACCEPTED_VERSIONS,
  type Anchor,
  type Anchors,
  type AsciiBlitOp,
  type AutoOutlineOp,
  type AutoShadeOp,
  type DebandOp,
  DITHER_PATTERNS,
  type DitherFillOp,
  type DitherPattern,
  type EllipseOp,
  type FloodFillOp,
  GLOSS_PROFILES,
  type GlossProfile,
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
  type Op,
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
  type Recipe,
  type RecipeMeta,
  type RectOp,
  type ReplaceSlotOp,
  type SealOp,
  type SetPixelsOp,
  type SlotRef,
  type StraysOp,
} from './types.js';

const OP_NAMES = Object.keys(OP_PARAM_ORDER) as OpName[];
const META_KEYS = ['name', 'width', 'height', 'alpha_mode', 'profile'];
const RECIPE_KEYS = ['version', 'meta', 'palette', 'parts', 'anchors', 'layers'];
const PART_KEYS = ['material', 'gloss', 'z'];

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

  return {
    material,
    gloss: glossParam(name, raw.gloss),
    z: z ?? 0,
  };
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

/** Shared x, y, w, h reader for the rectangle-shaped ops. */
function regionParams(
  source: Record<string, unknown>,
  opName: string,
  opIndex: number,
  layer: string,
): { x: number; y: number; w: number; h: number } {
  const x = intParam(source, 'x', opName, opIndex, layer);
  const y = intParam(source, 'y', opName, opIndex, layer);
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

function normalizeRect(source: Record<string, unknown>, opIndex: number, layer: string): RectOp {
  const region = regionParams(source, 'rect', opIndex, layer);
  return {
    op: 'rect',
    ...region,
    color: colorParam(source, 'rect', opIndex, layer) ?? null,
  };
}

function normalizeLine(source: Record<string, unknown>, opIndex: number, layer: string): LineOp {
  return {
    op: 'line',
    x1: intParam(source, 'x1', 'line', opIndex, layer),
    y1: intParam(source, 'y1', 'line', opIndex, layer),
    x2: intParam(source, 'x2', 'line', opIndex, layer),
    y2: intParam(source, 'y2', 'line', opIndex, layer),
    color: colorParam(source, 'line', opIndex, layer) ?? null,
  };
}

function normalizeEllipse(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): EllipseOp {
  const region = regionParams(source, 'ellipse', opIndex, layer);
  const op: EllipseOp = {
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
): FloodFillOp {
  const op: FloodFillOp = {
    op: 'flood_fill',
    x: intParam(source, 'x', 'flood_fill', opIndex, layer),
    y: intParam(source, 'y', 'flood_fill', opIndex, layer),
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
): DitherFillOp {
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

function normalizeAsciiBlit(
  source: Record<string, unknown>,
  opIndex: number,
  layer: string,
): AsciiBlitOp {
  const x = intParam(source, 'x', 'ascii_blit', opIndex, layer);
  const y = intParam(source, 'y', 'ascii_blit', opIndex, layer);
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

function normalizeMirrorOp(source: Record<string, unknown>, opIndex: number, layer: string): Op {
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
  const targetLayer = optionalStringParam(source, 'target_layer', 'auto_outline', opIndex, layer);
  if (targetLayer !== undefined) {
    op.targetLayer = targetLayer;
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
): Op {
  switch (name) {
    case 'set_pixels':
      return normalizeSetPixels(raw, opIndex, layer);
    case 'rect':
      return normalizeRect(raw, opIndex, layer);
    case 'line':
      return normalizeLine(raw, opIndex, layer);
    case 'ellipse':
      return normalizeEllipse(raw, opIndex, layer);
    case 'polygon':
      return normalizePolygon(raw, opIndex, layer);
    case 'flood_fill':
      return normalizeFloodFill(raw, opIndex, layer);
    case 'dither_fill':
      return normalizeDitherFill(raw, opIndex, layer);
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

export function normalizeOp(raw: unknown, opIndex: number, layer: string): Op {
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
