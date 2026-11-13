/**
 * Command wiring. Each command is a pure-ish function of parsed arguments and
 * the working directory, returning the payload that goes inside the envelope.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { type CompiledRecipe, compileRecipe } from '../core/compile.js';
import { diffRgba } from '../core/diff.js';
import { causeMessage, PxError, type PxWarning } from '../core/errors.js';
import type { CleanupReport } from '../core/ops/index.js';
import {
  buildSlotRoles,
  type buildSlotTable,
  hasBinaryAlpha,
  parseHex,
  TRANSPARENT_SLOT,
} from '../core/palette.js';
import { partDetails } from '../core/parts.js';
import { parseScaleProfile } from '../core/profile.js';
import { normalizeOp } from '../core/recipe/normalize.js';
import { parseRecipe } from '../core/recipe/parse.js';
import { serializeRecipe } from '../core/recipe/serialize.js';
import {
  isCleanupOp,
  type Palette,
  type Parts,
  RAMP_ROLES,
  type RawOp,
  RECIPE_VERSION,
  type Recipe,
  recipeParts,
} from '../core/recipe/types.js';
import { lintCompiled } from '../lint/index.js';
import { trimBounds } from '../meta/bounds.js';
import { buildMetadata, metadataPath, serializeMetadata } from '../meta/index.js';
import { DERIVATION_NOTE, deriveRamps, PALETTE_NAMES, paletteByName } from '../palettes/index.js';
import { applySwaps } from '../palettes/swap.js';
import { parseStepCount, synthesizeFamily } from '../palettes/synthesize.js';
import { BACKDROP_FORMS, renderDebugSheet } from '../render/debug/sheet.js';
import { decodePng } from '../render/png.js';
import { renderRecipe, sha256Hex } from '../render/render.js';
import type { ParsedArgs } from './args.js';
import { inspectCodes, type Region, renderRegion, usedSlots } from './inspect.js';

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

/**
 * The file that was read and the file that was written describe the same recipe,
 * so their warnings overlap. Keep one copy of each distinct warning rather than
 * reporting the same problem twice.
 */
function mergeWarnings(...groups: PxWarning[][]): PxWarning[] {
  const seen = new Set<string>();
  const merged: PxWarning[] = [];
  for (const group of groups) {
    for (const warning of group) {
      const key = JSON.stringify(warning);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(warning);
    }
  }
  return merged;
}

/**
 * Writes a file the caller named. A path the process cannot write is the
 * caller's fault, not an engine fault, so it carries the resolved path and a
 * hint instead of surfacing as E_INTERNAL.
 */
function writeOut(target: string, data: string | Uint8Array): void {
  try {
    ensureParent(target);
    writeFileSync(target, data);
  } catch (cause) {
    throw new PxError(
      'E_WRITE_FAILED',
      `Could not write ${target}: ${causeMessage(cause)}`,
      'Pass --out as a path the process can write to, such as one under the working directory.',
    );
  }
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

function paletteFromFlag(value: string | undefined, derive: boolean): Palette {
  if (value === undefined) {
    if (derive) {
      return deriveRamps(DEFAULT_RAMP_COLORS, 'steel');
    }
    const ramp: Record<string, string> = {};
    RAMP_ROLES.forEach((role, index) => {
      ramp[role] = DEFAULT_RAMP_COLORS[index] ?? '#000000';
    });
    return { steel: { ramp } };
  }
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    if (derive) {
      throw usageError(
        '--derive-ramps does not apply to an object palette',
        'Name the roles in the object, or pass a flat hex list with --derive-ramps.',
      );
    }
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch (cause) {
      throw new PxError(
        'E_BAD_PALETTE',
        `--palette is not valid JSON: ${causeMessage(cause)}`,
        'Pass an object of families, e.g. --palette \'{"steel":{"ramp":{"base":"#808080"}}}\'.',
      );
    }
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new PxError(
        'E_BAD_PALETTE',
        '--palette object must map family names to ramps or colour lists',
        'Each family is {"ramp": {"outline", "shadow", "base", "highlight"}} or {"colors": [hex, ...]}.',
      );
    }
    return raw as Palette;
  }
  if (!trimmed.includes('#') && !trimmed.includes(',')) {
    const named = paletteByName(trimmed);
    if (named === undefined) {
      throw usageError(
        `Unknown palette "${value}"`,
        `Name one of ${PALETTE_NAMES.join(', ')}, or pass comma-separated hex colours.`,
      );
    }
    return derive
      ? deriveRamps(named.colors, `${named.name}_`)
      : { [named.name]: { colors: named.colors } };
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
  if (derive) {
    return deriveRamps(colors);
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

/**
 * `--parts` takes an inline JSON object or a path to a JSON file, so an agent
 * with no filesystem-free path still gets parts (FR-1, FR-2). The material each
 * part names is resolved against the palette by `parseRecipe`, so an unknown
 * material fails at init rather than at the first draw.
 */
function partsFromFlag(value: string | undefined, cwd: string): Parts | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw usageError(
      '--parts is empty',
      'Pass an inline object, e.g. --parts \'{"blade":{"material":"steel"}}\', or a JSON file.',
    );
  }
  let text = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      text = readFileSync(resolve(cwd, trimmed), 'utf8');
    } catch (cause) {
      throw new PxError(
        'E_FILE_NOT_FOUND',
        `Cannot read parts file ${trimmed}: ${causeMessage(cause)}`,
        'Pass a readable JSON file, or an inline object.',
      );
    }
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new PxError(
      'E_PARSE',
      `Parts is not valid JSON: ${causeMessage(cause)}`,
      'Check for a trailing comma, a missing quote, or an unquoted key.',
    );
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new PxError(
      'E_BAD_PARAM',
      'Parts must be an object of part name to material',
      'Each part is {"material": "<family>", "gloss": "matte|metal|gem|cloth", "z": 0}.',
    );
  }
  return raw as Parts;
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
  const parts = partsFromFlag(args.parts, cwd);
  let palette = paletteFromFlag(args.palette, args.deriveRamps);
  for (const entry of args.synthesize) {
    palette = synthesizeFamily(palette, entry, false);
  }
  const meta: Recipe['meta'] = {
    name: args.name ?? defaultName(file),
    width,
    height,
    alphaMode: 'binary',
  };
  if (args.profile !== undefined) {
    meta.profile = parseScaleProfile(args.profile);
  }
  const recipe: Recipe = {
    version: RECIPE_VERSION,
    meta,
    palette,
    anchors: { pivot: [Math.floor(width / 2), Math.floor(height / 2)] },
    layers: [{ id: DEFAULT_LAYER_ID, ops: [] }],
  };
  if (parts !== undefined) {
    recipe.parts = parts;
  }

  const text = serializeRecipe(recipe);
  const parsed = parseRecipe(text);
  writeOut(target, text);

  const payload: Record<string, unknown> = {
    file,
    name: recipe.meta.name,
    width,
    height,
    slots: parsed.slots.names,
    layers: [DEFAULT_LAYER_ID],
    bytes: text.length,
  };
  if (args.deriveRamps && args.synthesize.length === 0) {
    payload.derive_ramps = true;
    payload.derivation = DERIVATION_NOTE;
  }
  if (args.synthesize.length > 0) {
    payload.synthesized = args.synthesize.length;
  }
  if (args.profile !== undefined) {
    payload.profile = args.profile;
  }
  if (parts !== undefined) {
    payload.parts = Object.keys(parts).sort();
  }
  // The document just written is the one that will be read next, so the warnings
  // it raises belong to this envelope: a `--profile` that contradicts the canvas
  // reports `W_PROFILE_MISMATCH` here, not only at the next `validate`.
  if (parsed.warnings.length > 0) {
    payload.warnings = parsed.warnings;
  }
  return payload;
}

/**
 * `px synthesize --file --family --from --steps [--force]` (FR-15, FR-17).
 * The result is canonicalised into the recipe: the family holds hex tones, and
 * nothing about the synthesis survives the write.
 */
export function runSynthesize(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  if (args.family === undefined || args.family === '') {
    throw usageError('Missing --family', 'Name the family to write, e.g. --family leaf.');
  }
  if (args.from === undefined || args.from === '') {
    throw usageError('Missing --from', 'Pass the base colour, e.g. --from "#4a8f3c".');
  }
  if (args.steps === undefined || args.steps === '') {
    throw usageError('Missing --steps', 'Pass an integer from 3 to 6, e.g. --steps 5.');
  }
  const { recipe } = readSource(target, file);
  const palette = synthesizeFamily(
    recipe.palette,
    `${args.family}=${args.from}:${args.steps}`,
    args.force,
  );
  const next: Recipe = { ...recipe, palette };
  const text = serializeRecipe(next);
  const parsed = parseRecipe(text);
  writeOut(target, text);

  const family = parsed.recipe.palette[args.family];
  const slots =
    family === undefined
      ? []
      : parsed.slots.names.filter((name) => name.startsWith(`${args.family}.`));
  return {
    file,
    family: args.family,
    from: args.from,
    steps: parseStepCount(args.steps),
    slots,
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

/**
 * What the cleanup passes changed, plus the warnings compiling them raised,
 * when the recipe uses one. Compiling is the only way to know, so recipes
 * without a cleanup op pay nothing and their responses stay byte-identical.
 */
function cleanupOf(recipe: Recipe): {
  cleanup?: CleanupReport[];
  warnings: PxWarning[];
} {
  const uses = recipe.layers.some((layer) => layer.ops.some((op) => isCleanupOp(op.op)));
  if (!uses) {
    return { warnings: [] };
  }
  const compiled = compileRecipe(recipe);
  return {
    warnings: compiled.warnings,
    ...(compiled.cleanup === undefined ? {} : { cleanup: compiled.cleanup }),
  };
}

export function runDraw(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  const { recipe, warnings: sourceWarnings } = readSource(target, file);

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
  writeOut(outTarget, text);

  const pass = cleanupOf(parsed.recipe);
  const allWarnings = mergeWarnings(sourceWarnings, parsed.warnings, pass.warnings);

  return {
    file: outFile,
    layer: layerId,
    added: appended.length,
    layer_ops: nextOps.length,
    op_index: opIndexMap(parsed.recipe),
    layers: parsed.recipe.layers.map((entry) => ({ id: entry.id, ops: entry.ops.length })),
    ...(pass.cleanup === undefined ? {} : { cleanup: pass.cleanup }),
    ...(allWarnings.length > 0 ? { warnings: allWarnings } : {}),
  };
}

export interface OpIndexEntry {
  index: number;
  id: string | null;
  layer: string;
  op: RawOp;
}

/**
 * Where every op sits, flat and in recipe order. Ids are stable addresses, so
 * this map is what a client edits against instead of re-inspecting the file.
 * `index` is per layer; `layer` disambiguates it.
 */
export function opIndexMap(recipe: Recipe): OpIndexEntry[] {
  const entries: OpIndexEntry[] = [];
  for (const layer of recipe.layers) {
    layer.ops.forEach((op, index) => {
      entries.push({ index, id: op.id ?? null, layer: layer.id, op });
    });
  }
  return entries;
}

function parseOpIndex(value: string | undefined, count: number, layer: string): number {
  if (value === undefined) {
    throw usageError(
      'Missing --id or --op-index',
      'Address the op with --id <op id>, or --layer <layer> --op-index <n>.',
    );
  }
  const index = Number(value);
  if (!Number.isInteger(index)) {
    throw usageError(`--op-index is not an integer: "${value}"`, 'Pass a zero-based op index.');
  }
  if (index < 0 || index >= count) {
    throw new PxError(
      'E_NO_SUCH_OP',
      `No op at index ${index} in layer "${layer}"`,
      count === 0 ? `Layer "${layer}" has no ops.` : `Layer "${layer}" has ops 0-${count - 1}.`,
      { layer, op_index: index },
    );
  }
  return index;
}

export function runEdit(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  const { recipe, warnings: sourceWarnings } = readSource(target, file);

  const requestedLayer = args.layer ?? recipe.layers[0]?.id;
  if (requestedLayer === undefined) {
    throw new PxError(
      'E_NO_SUCH_LAYER',
      `Recipe ${file} has no layers to edit`,
      'Add a layer to the recipe, e.g. {"id": "base", "ops": []}.',
    );
  }
  const layerEntry = recipe.layers.find((entry) => entry.id === requestedLayer);
  if (layerEntry === undefined) {
    throw new PxError(
      'E_NO_SUCH_LAYER',
      `Layer "${requestedLayer}" does not exist in ${file}`,
      `Layers are ${recipe.layers.map((entry) => entry.id).join(', ') || 'none'}.`,
    );
  }

  let layer = layerEntry;
  let index: number;
  if (args.id !== undefined) {
    const scope =
      args.layer === undefined
        ? recipe.layers
        : recipe.layers.filter((entry) => entry.id === requestedLayer);
    const found = scope
      .flatMap((entry) => entry.ops.map((op, opIndex) => ({ layer: entry, op, opIndex })))
      .find((candidate) => candidate.op.id === args.id);
    if (found === undefined) {
      const ids = recipe.layers.flatMap((entry) =>
        entry.ops.flatMap((op) => (op.id === undefined ? [] : [op.id])),
      );
      throw new PxError(
        'E_NO_SUCH_OP',
        `No op with id "${args.id}" in ${file}`,
        ids.length === 0
          ? 'No op in this recipe has an id; add "id" to an op and re-run.'
          : `Op ids are ${ids.join(', ')}.`,
      );
    }
    layer = found.layer;
    index = found.opIndex;
  } else {
    index = parseOpIndex(args.opIndex, layerEntry.ops.length, requestedLayer);
  }
  const layerId = layer.id;

  if (args.ops === undefined) {
    throw usageError('Missing --ops', 'Pass --ops as a JSON array of the replacement op(s).');
  }
  const replacements = parseOpList(args.ops).map((raw, offset) =>
    normalizeOp(raw, index + offset, layerId),
  );

  const nextOps = [...layer.ops.slice(0, index), ...replacements, ...layer.ops.slice(index + 1)];
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
  writeOut(outTarget, text);

  const pass = cleanupOf(parsed.recipe);
  const allWarnings = mergeWarnings(sourceWarnings, parsed.warnings, pass.warnings);

  return {
    file: outFile,
    layer: layerId,
    replaced_index: index,
    added: replacements.length,
    layer_ops: nextOps.length,
    op_index: opIndexMap(parsed.recipe),
    layers: parsed.recipe.layers.map((entry) => ({ id: entry.id, ops: entry.ops.length })),
    ...(pass.cleanup === undefined ? {} : { cleanup: pass.cleanup }),
    ...(allWarnings.length > 0 ? { warnings: allWarnings } : {}),
  };
}

export function runAnchor(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const source = readSource(resolve(cwd, file), file);
  if (args.name === undefined || args.name === '') {
    throw usageError('Missing --name', 'Name the anchor, e.g. --name grip_pivot.');
  }
  if (args.x === undefined || args.y === undefined) {
    throw usageError('Missing --x or --y', 'Give the anchor point, e.g. --x 8 --y 23.');
  }
  const x = intFlag(args.x, 0, 'x');
  const y = intFlag(args.y, 0, 'y');
  const name = args.name;
  const next: Recipe = {
    ...source.recipe,
    anchors: { ...source.recipe.anchors, [name]: [x, y] },
  };
  const text = serializeRecipe(next);
  // Re-parsing is the validation: a non-integer pair would already have been
  // rejected, and an out-of-canvas pair is reported, never dropped.
  const parsed = parseRecipe(text);
  const outFile = args.out ?? file;
  const target = resolve(cwd, outFile);
  writeOut(target, text);

  const payload: Record<string, unknown> = {
    file: outFile,
    name,
    anchor: [x, y],
    anchors: parsed.recipe.anchors,
  };
  const allWarnings = mergeWarnings(source.warnings, parsed.warnings);
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  return payload;
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
  const regions = args.regions.map((value) =>
    parseRegionFlag(value, compiled.width, compiled.height),
  );
  const withSummary = args.summary || regions.length === 0;

  // One code table for the whole response: assign codes from the union of slots
  // every region shows, then render each region against it. With no regions the
  // legend describes the full canvas the summary covers.
  const scanned =
    regions.length > 0 ? regions : [{ x: 0, y: 0, w: compiled.width, h: compiled.height }];
  const used = new Set<number>();
  for (const region of scanned) {
    for (const slot of usedSlots(compiled.flattened, compiled.width, region)) {
      used.add(slot);
    }
  }
  const roles = buildSlotRoles(compiled.slots);
  const { codes, legend } = inspectCodes(compiled.slots, roles, used);

  const payload: Record<string, unknown> = {
    file,
    canvas: { width: compiled.width, height: compiled.height },
    regions: regions.map((region) => ({
      ...region,
      matrix: renderRegion(compiled.flattened, compiled.width, region, codes),
    })),
    legend,
  };

  if (withSummary) {
    const bounds = trimBounds(compiled.flattened, compiled.width, compiled.height);
    payload.summary = {
      canvas: { width: compiled.width, height: compiled.height },
      bounds,
      pixel_count: countPainted(compiled.flattened),
    };
  }

  payload.layers = compiled.layers.map((layer) => ({
    id: layer.id,
    painted: layer.canvas.paintedCount(),
  }));
  // Only a recipe that declares parts grows this key, so a part-less envelope
  // stays exactly what it was before parts existed. FR-24 appends the tone
  // table and the value histogram to each entry rather than replacing it.
  if (compiled.parts.length > 0) {
    payload.parts = partDetails(
      compiled.width,
      compiled.height,
      compiled.owners,
      compiled.flattened,
      recipeParts(recipe),
      compiled.slots,
    );
  }
  const allWarnings = [...warnings, ...compiled.warnings];
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  return payload;
}

/**
 * `--backdrop` fills panel B of the debug sheet: a hex colour, or `null` for a
 * transparent panel so the sheet composites over whatever a client shows it on.
 * Alpha stays binary, as everywhere else in the engine: `#rrggbb`, or
 * `#rrggbbaa` with `aa` of `00` or `ff`.
 */
function backdropFlag(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'null') {
    return null;
  }
  const parsed = parseHex(value);
  if (parsed === null) {
    throw usageError(`--backdrop "${value}" is not a hex colour`, BACKDROP_FORMS);
  }
  if (!hasBinaryAlpha(parsed)) {
    throw usageError(
      `--backdrop "${value}" has alpha ${parsed.a}; backdrop alpha is binary`,
      BACKDROP_FORMS,
    );
  }
  return value;
}

export function runRender(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  if (args.out === undefined || args.out === '') {
    throw usageError('Missing --out', 'Name the PNG, e.g. --out hero.png.');
  }
  const backdrop = backdropFlag(args.backdrop);
  if (backdrop !== undefined && !args.debug) {
    throw usageError(
      '--backdrop only affects the debug sheet',
      'Pass --debug as well, or drop --backdrop.',
    );
  }
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  let effective = recipe;
  if (args.swap.length > 0) {
    const palette = applySwaps(recipe.palette, args.swap);
    effective = { ...recipe, palette };
  }
  const result = renderRecipe(effective);

  const outTarget = resolve(cwd, args.out);
  writeOut(outTarget, result.png);

  // Lint against the backdrop the caller asked to check, so a part that melts
  // into the panel is reported for that panel. Absent means the default grey.
  const lintBackdrop = typeof backdrop === 'string' ? (parseHex(backdrop) ?? undefined) : undefined;

  const payload: Record<string, unknown> = {
    file,
    out: args.out,
    width: result.width,
    height: result.height,
    bytes: result.png.length,
    sha256: sha256Hex(result.png),
    findings: lintCompiled(result.compiled, lintBackdrop),
  };
  if (result.compiled.parts.length > 0) {
    payload.parts = result.compiled.parts;
  }
  const allWarnings = [...warnings, ...result.warnings];
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  if (args.debug) {
    payload.debug = writeDebugSheet(args.out, result.compiled, effective, cwd, backdrop);
  }
  if (args.metaExport) {
    payload.metadata = writeMetadata(args.out, recipe, result.compiled, cwd, effective);
  }
  return payload;
}

/**
 * `diff` renders the recipe in memory and compares it with a previous PNG or a
 * previous sha256. A hash can prove that two renders differ but cannot locate
 * the pixels, so that mode reports `count: null` instead of inventing a diff.
 */
export function runDiff(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  if (args.against === undefined || args.against === '') {
    throw usageError(
      'Missing --against',
      'Pass --against prev.png or --against sha256:<64 hex digits>.',
    );
  }
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  const result = renderRecipe(recipe);
  const currentHash = `sha256:${sha256Hex(result.png)}`;
  const payload: Record<string, unknown> = {};

  if (args.against.startsWith('sha256:')) {
    const expected = args.against.toLowerCase();
    if (!/^sha256:[0-9a-f]{64}$/.test(expected)) {
      throw usageError(
        `--against "${args.against}" is not a sha256 ref`,
        'A hash ref is sha256: followed by 64 lowercase hex digits.',
      );
    }
    const identical = expected === currentHash;
    payload.identical = identical;
    payload.against = { kind: 'hash', sha256: expected };
    // A hash proves difference, not location: count stays null unless identical.
    payload.changed = { count: identical ? 0 : null, bounds: null };
    if (result.compiled.parts.length > 0) {
      const parts: Array<{ part: string | null; changed: number | null }> =
        result.compiled.parts.map((part) => ({
          part: part.name,
          changed: identical ? 0 : null,
        }));
      parts.push({ part: null, changed: identical ? 0 : null });
      payload.parts = parts;
    }
    if (!identical) {
      warnings.push({
        code: 'W_DIFF_HASH_ONLY',
        message: `The render differs from ${expected}, but a hash cannot say where`,
        hint: 'Compare against a PNG (--against prev.png) for a changed count, bounds, and per-part breakdown.',
      });
    }
  } else {
    const target = resolve(cwd, args.against);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(readFileSync(target));
    } catch (error) {
      throw new PxError(
        'E_FILE_NOT_FOUND',
        `Cannot read comparison image ${args.against}: ${causeMessage(error)}`,
        'Check the path passed to --against; it is resolved against the working directory.',
      );
    }
    const against = decodePng(bytes);
    if (against.width !== result.width || against.height !== result.height) {
      throw new PxError(
        'E_DIFF_SIZE',
        `Render is ${result.width}x${result.height} but ${args.against} is ${against.width}x${against.height}`,
        'Diff compares renders pixel for pixel; compare against a PNG of the same recipe size.',
      );
    }
    const diff = diffRgba(
      result.width,
      result.height,
      result.rgba,
      against.rgba,
      result.compiled.owners,
    );
    payload.identical = diff.count === 0;
    payload.against = { kind: 'png', path: args.against, sha256: `sha256:${sha256Hex(bytes)}` };
    payload.changed = { count: diff.count, bounds: diff.bounds };
    if (result.compiled.parts.length > 0) {
      const parts: Array<{ part: string | null; changed: number | null }> =
        result.compiled.parts.map((part, index) => ({
          part: part.name,
          changed: diff.byOwner.get(index) ?? 0,
        }));
      parts.push({ part: null, changed: diff.unowned });
      payload.parts = parts;
    }
  }

  if (args.out !== undefined && args.out !== '') {
    writeOut(resolve(cwd, args.out), result.png);
    payload.out = args.out;
  }
  if (warnings.length > 0) {
    payload.warnings = warnings;
  }
  return payload;
}

/**
 * `render --export` writes the metadata beside the PNG, named from the PNG
 * stem, and reports the same `{out, bytes, sha256}` shape as the debug sheet so
 * a client never has to guess whether a file was written.
 */
function writeMetadata(
  out: string,
  recipe: Recipe,
  compiled: CompiledRecipe,
  cwd: string,
  paletteRecipe: Recipe = recipe,
): Record<string, unknown> {
  const metadata = buildMetadata(recipe, compiled, out, paletteRecipe);
  const text = serializeMetadata(metadata);
  const file = metadataPath(out);
  const target = resolve(cwd, file);
  writeOut(target, text);
  return {
    out: file,
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: sha256Hex(Buffer.from(text, 'utf8')),
    recipe_hash: metadata.generic.recipe_hash,
  };
}

/** `hero.png` pairs with `hero.debug.png`, so the pair is obvious on disk. */
function debugPath(out: string): string {
  return out.endsWith('.png') ? `${out.slice(0, -'.png'.length)}.debug.png` : `${out}.debug.png`;
}

function writeDebugSheet(
  out: string,
  compiled: CompiledRecipe,
  recipe: Recipe,
  cwd: string,
  backdrop: string | null | undefined,
): Record<string, unknown> {
  const file = debugPath(out);
  const sheet = renderDebugSheet(compiled, recipe.anchors, { backdrop });
  const target = resolve(cwd, file);
  writeOut(target, sheet.png);
  return {
    out: file,
    width: sheet.width,
    height: sheet.height,
    bytes: sheet.png.length,
    sha256: sha256Hex(sheet.png),
  };
}

/** Tightest rectangle around painted pixels, or null when nothing is painted. */
export function flattenBounds(
  flattened: Int16Array,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  return trimBounds(flattened, width, height);
}

/** Painted pixels in a flattened grid, without materialising a filtered copy. */
export function countPainted(flattened: Int16Array): number {
  let count = 0;
  for (const slot of flattened) {
    if (slot !== TRANSPARENT_SLOT) {
      count += 1;
    }
  }
  return count;
}

export function runValidate(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  const compiled = compileRecipe(recipe);

  return {
    file,
    canvas: { width: compiled.width, height: compiled.height },
    bounds: flattenBounds(compiled.flattened, compiled.width, compiled.height),
    pixel_count: countPainted(compiled.flattened),
    layers: compiled.layers.map((layer) => ({
      id: layer.id,
      painted: layer.canvas.paintedCount(),
    })),
    findings: lintCompiled(compiled),
    ...(compiled.cleanup === undefined ? {} : { cleanup: compiled.cleanup }),
    warnings: [...warnings, ...compiled.warnings],
  };
}
