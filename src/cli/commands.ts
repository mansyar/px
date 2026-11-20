/**
 * Command wiring. Each command is a pure-ish function of parsed arguments and
 * the working directory, returning the payload that goes inside the envelope.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { briefScaffold } from '../brief/index.js';
import {
  type CompiledRecipe,
  compileRecipe,
  compileRecipeFrames,
  type Deviation,
} from '../core/compile.js';
import { resolveDesign } from '../core/design.js';
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
import {
  addFrame,
  editFrame,
  type FrameSelector,
  listFrames,
  moveFrame,
  removeFrame,
  setFrameDuration,
} from '../core/recipe/frames.js';
import { normalizeOp } from '../core/recipe/normalize.js';
import { parseRecipe } from '../core/recipe/parse.js';
import { serializeRecipe } from '../core/recipe/serialize.js';
import {
  type Design,
  isCleanupOp,
  LATEST_RECIPE_VERSION,
  type Palette,
  type Parts,
  RAMP_ROLES,
  type RawOp,
  RECIPE_VERSION,
  type Recipe,
  recipeParts,
} from '../core/recipe/types.js';
import { buildCritique, emptyCritiqueFingerprint } from '../critique/index.js';
import { lintBlocks, lintCompiled, lintCompiledFrames } from '../lint/index.js';
import { trimBounds } from '../meta/bounds.js';
import {
  buildMetadata,
  buildSheetFrames,
  metadataPath,
  type SheetFrame,
  serializeMetadata,
} from '../meta/index.js';
import { DERIVATION_NOTE, deriveRamps, PALETTE_NAMES, paletteByName } from '../palettes/index.js';
import { applySwaps } from '../palettes/swap.js';
import { parseStepCount, synthesizeFamily } from '../palettes/synthesize.js';
import { BACKDROP_FORMS, renderDebugSheet } from '../render/debug/sheet.js';
import { rasterizeSlots } from '../render/flatten.js';
import { decodePng, encodePng } from '../render/png.js';
import { renderRecipe, sha256Hex } from '../render/render.js';
import {
  BLOCKOUT_BANDS,
  BLOCKOUT_ROLES,
  ONION_PANELS,
  parseOnionIndex,
  parseSteps,
  renderOnion,
  renderView,
  VALUES_MAPPING,
  type ViewSpec,
  viewPath,
} from '../render/views.js';
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
  return parseRecipe(readFileSync(target, 'utf8'), { baseDir: dirname(resolve(target)) });
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
      'Each part is {"material": "<family>", "gloss": "matte|metal|gem|cloth", "z": 0, "facing": "front|back|left|right|top|bottom" or [x, y, z]}.',
    );
  }
  return raw as Parts;
}

/**
 * `--design` takes an inline JSON object or a path to one, resolved against the
 * caller cwd. Resolution happens here, at authoring time, so the style file is
 * read from the same directory the CLI was invoked from.
 */
function designFromFlag(value: string | undefined, cwd: string): Design | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw usageError(
      '--design is empty',
      'Pass an inline object, e.g. --design \'{"subject":"hero","light":"top-left","hierarchy":["body"],"values":{"body":3},"edges":{"silhouette":"hard","material":"soft","detail":"soft"},"materials":["ink"],"style":"@project"}\', or a JSON file.',
    );
  }
  let text = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      text = readFileSync(resolve(cwd, trimmed), 'utf8');
    } catch (cause) {
      throw new PxError(
        'E_FILE_NOT_FOUND',
        `Cannot read design file ${trimmed}: ${causeMessage(cause)}`,
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
      `Design is not valid JSON: ${causeMessage(cause)}`,
      'Check for a trailing comma, a missing quote, or an unquoted key.',
    );
  }
  return resolveDesign(raw, cwd).design;
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
  const design = designFromFlag(args.design, cwd);
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
    // Parts are a 1.1 feature and design is 1.2; a recipe with neither keeps
    // the legacy numeric literal (FR-1, FR-17).
    version:
      design !== undefined ? '1.2' : parts === undefined ? RECIPE_VERSION : LATEST_RECIPE_VERSION,
    meta,
    palette,
    anchors: { pivot: [Math.floor(width / 2), Math.floor(height / 2)] },
    layers: [{ id: DEFAULT_LAYER_ID, ops: [] }],
  };
  if (design !== undefined) {
    recipe.design = design;
  }
  if (parts !== undefined) {
    recipe.parts = parts;
  }

  const text = serializeRecipe(recipe);
  const parsed = parseRecipe(text, { derivedRamps: args.deriveRamps, baseDir: cwd });
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
  const parsed = parseRecipe(text, { baseDir: dirname(resolve(cwd, file)) });
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
 * What the reporting passes changed, plus the warnings compiling them raised,
 * when the recipe uses one. Compiling is the only way to know, so recipes with
 * neither a cleanup pass nor a texture pass pay nothing and their responses
 * stay byte-identical.
 */
function cleanupOf(recipe: Recipe): {
  cleanup?: CleanupReport[];
  warnings: PxWarning[];
} {
  const uses = recipe.layers.some((layer) =>
    layer.ops.some((op) => isCleanupOp(op.op) || op.op === 'texture'),
  );
  if (!uses) {
    return { warnings: [] };
  }
  const compiled = compileRecipe(recipe);
  return {
    warnings: compiled.warnings,
    ...(compiled.cleanup === undefined ? {} : { cleanup: compiled.cleanup }),
  };
}

/** Overrides recorded by the compiler, exposed only when the recipe declares intent. */
function deviationsOf(recipe: Recipe): Deviation[] {
  return compileRecipe(recipe).deviations ?? [];
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
  const parsed = parseRecipe(text, { baseDir: dirname(resolve(cwd, file)) });

  const outFile = args.out ?? file;
  const outTarget = resolve(cwd, outFile);
  writeOut(outTarget, text);

  const pass = cleanupOf(parsed.recipe);
  const allWarnings = mergeWarnings(sourceWarnings, parsed.warnings, pass.warnings);
  const deviations = deviationsOf(parsed.recipe);

  return {
    file: outFile,
    layer: layerId,
    added: appended.length,
    layer_ops: nextOps.length,
    op_index: opIndexMap(parsed.recipe),
    layers: parsed.recipe.layers.map((entry) => ({ id: entry.id, ops: entry.ops.length })),
    ...(pass.cleanup === undefined ? {} : { cleanup: pass.cleanup }),
    ...(deviations.length > 0 ? { deviations } : {}),
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
  const parsed = parseRecipe(text, { baseDir: dirname(resolve(cwd, file)) });

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
  const parsed = parseRecipe(text, { baseDir: dirname(resolve(cwd, file)) });
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
  if (compiled.deviations !== undefined && compiled.deviations.length > 0) {
    payload.deviations = compiled.deviations;
  }
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

/** Views are selectors on `render`, never verbs that write a recipe. */
function renderViewSpec(args: ParsedArgs): ViewSpec | undefined {
  if (args.blockout && args.values !== undefined) {
    throw usageError(
      '--blockout and --values are separate views',
      'Ask for one view at a time, e.g. --blockout or --values 5.',
    );
  }
  if (args.onion !== undefined && (args.blockout || args.values !== undefined)) {
    throw usageError(
      '--onion cannot be combined with --blockout or --values',
      'Ask for one view at a time, e.g. --onion 1.',
    );
  }
  if (args.blockout) {
    return { kind: 'blockout' };
  }
  if (args.values !== undefined) {
    return { kind: 'values', steps: parseSteps(args.values) };
  }
  if (args.onion !== undefined) {
    return { kind: 'onion', index: parseOnionIndex(args.onion) };
  }
  return undefined;
}

/**
 * `px brief <subject> --size n` returns a design plan and writes nothing. The
 * `design` member is a structurally valid 1.2 block; `parts`, `pixels` and
 * `hero` are the planning detail that does not belong in a recipe.
 */
export function runBrief(args: ParsedArgs, _cwd: string): Record<string, unknown> {
  const subject = args.subject;
  if (subject === undefined || subject === '') {
    throw usageError('Missing subject', 'Name a subject, e.g. px brief character --size 32.');
  }
  const scaffold = briefScaffold(subject, intFlag(args.size, 32, 'size'));
  return {
    subject: scaffold.subject,
    size: scaffold.size,
    canvas: scaffold.canvas,
    design: scaffold.design,
    parts: scaffold.parts,
    hero: scaffold.hero,
  };
}

/**
 * `critique` is a read-only whole-image report. It never writes a file and it
 * never remembers a streak: the caller supplies `--streak` and `--previous`
 * explicitly when it wants the stagnation finding.
 */
export function runCritique(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  let result: ReturnType<typeof renderRecipe>;
  try {
    result = renderRecipe(recipe);
  } catch (cause) {
    // A declared part with no pixels is still an empty canvas to critique: the
    // compiler refuses to build it, but the report is W_CRITIQUE_EMPTY, not an
    // error the caller has to fix before asking for feedback.
    if (cause instanceof PxError && cause.code === 'E_EMPTY_PART') {
      return {
        file,
        width: recipe.meta.width,
        height: recipe.meta.height,
        fingerprint: emptyCritiqueFingerprint(),
        criteria: [],
        findings: [],
        fixes_total: 0,
        truncated: false,
        warnings: mergeWarnings(warnings, [
          {
            code: 'W_CRITIQUE_EMPTY',
            message: 'The canvas is empty; there is nothing to critique.',
            hint: 'Draw something on the canvas before asking for a critique.',
          },
        ]),
      };
    }
    throw cause;
  }
  const report = buildCritique({
    recipe,
    compiled: result.compiled,
    png: result.png,
    lint: lintCompiled(result.compiled),
    streak: args.streak === undefined ? undefined : intFlag(args.streak, 0, 'streak'),
    previous: args.previous,
  });
  const payload: Record<string, unknown> = {
    file,
    width: result.width,
    height: result.height,
    fingerprint: report.fingerprint,
    render_sha256: report.render_sha256,
    criteria: report.criteria,
    findings: report.findings,
    fixes_total: report.fixes_total,
    truncated: report.truncated,
  };
  if (report.stagnation !== undefined) {
    payload.stagnation = report.stagnation;
  }
  const allWarnings = mergeWarnings(warnings, result.warnings, report.warnings);
  if (allWarnings.length > 0) {
    payload.warnings = allWarnings;
  }
  return payload;
}

/**
 * Applies exactly one finding's op to the current recipe. The report is
 * recomputed from the file on disk before anything is written, so a finding
 * from a stale critique is rejected instead of being applied to a different
 * picture. Existing ops are appended to, never rewritten, and no digest is
 * edited: the digest is always the render of whatever the recipe now says.
 */
export function runFix(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const file = requireFile(args);
  const target = resolve(cwd, file);
  const { recipe, warnings } = readSource(target, file);
  if (args.finding === undefined || args.finding === '') {
    throw usageError(
      'Missing --finding',
      'Choose a zero-based index from px critique, e.g. --finding 2.',
    );
  }
  const index = intFlag(args.finding, 0, 'finding');
  if (index < 0) {
    throw usageError('--finding must be a non-negative index', 'Critique indices start at 0.');
  }

  const current = renderRecipe(recipe);
  const report = buildCritique({
    recipe,
    compiled: current.compiled,
    png: current.png,
    lint: lintCompiled(current.compiled),
  });
  const currentDigest = report.render_sha256;
  const finding = report.findings.find((entry) => entry.index === index);
  if (finding === undefined) {
    throw new PxError(
      'E_FIX_STALE',
      `Finding ${index} is not in the current report (digest ${currentDigest}). Re-run px critique.`,
    );
  }
  if (
    args.sha256 !== undefined &&
    args.sha256 !== currentDigest &&
    args.sha256 !== report.fingerprint
  ) {
    throw new PxError(
      'E_FIX_STALE',
      `Finding ${index} is stale: expected digest ${args.sha256}, current digest ${currentDigest}. Re-run px critique.`,
    );
  }

  const rawOp = finding.fix.op;
  const wantedLayer =
    typeof rawOp.target_layer === 'string' ? rawOp.target_layer : DEFAULT_LAYER_ID;
  const foundLayer = recipe.layers.findIndex((layer) => layer.id === wantedLayer);
  const applyAt = foundLayer === -1 ? 0 : foundLayer;
  const layer = recipe.layers[applyAt];
  const normalized = normalizeOp(rawOp, layer.ops.length, layer.id);
  const nextLayers = recipe.layers.map((entry, position) =>
    position === applyAt ? { ...entry, ops: [...entry.ops, normalized] } : entry,
  );
  const nextRecipe: Recipe = { ...recipe, layers: nextLayers };
  const output = args.out === undefined || args.out === '' ? target : resolve(cwd, args.out);
  writeOut(output, serializeRecipe(nextRecipe));

  const after = renderRecipe(nextRecipe);
  const afterSha = sha256Hex(after.png);
  const nextReport = buildCritique({
    recipe: nextRecipe,
    compiled: after.compiled,
    png: after.png,
    lint: lintCompiled(after.compiled),
  });
  const payload: Record<string, unknown> = {
    file,
    width: after.width,
    height: after.height,
    fingerprint: nextReport.fingerprint,
    render_sha256: afterSha,
    criteria: nextReport.criteria,
    findings: nextReport.findings,
    fixes_total: nextReport.fixes_total,
    truncated: nextReport.truncated,
    fix: {
      index,
      op: rawOp,
      before_sha256: currentDigest,
      after_sha256: afterSha,
    },
  };
  if (nextReport.stagnation !== undefined) {
    payload.stagnation = nextReport.stagnation;
  }
  const allWarnings = mergeWarnings(warnings, after.warnings, nextReport.warnings);
  if (afterSha === currentDigest) {
    allWarnings.push({
      code: 'W_FIX_NOOP',
      message: `Fix ${index} was applied but the render is unchanged.`,
      hint: 'The op was applied but the render did not change; the fix had no visible effect on this picture.',
    });
  }
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
  const backdrop = backdropFlag(args.backdrop);
  if (backdrop !== undefined && !args.debug) {
    throw usageError(
      '--backdrop only affects the debug sheet',
      'Pass --debug as well, or drop --backdrop.',
    );
  }
  const view = renderViewSpec(args);
  if (view !== undefined && (args.debug || args.metaExport)) {
    throw usageError(
      'Render views cannot be combined with --debug or --export',
      'Ask for a view on its own, e.g. px render --file hero.px.json --out hero.png --blockout.',
    );
  }
  const { recipe, warnings } = readSource(resolve(cwd, file), file);
  let effective = recipe;
  if (args.swap.length > 0) {
    const palette = applySwaps(recipe.palette, args.swap);
    effective = { ...recipe, palette };
  }
  const result = renderRecipe(effective);

  // Compile the frame list once. Frame 0 is byte-identical to the legacy
  // compile; the onion view and frame-aware lint both consume this same list.
  const compiledFrames = compileRecipeFrames(effective);

  if (view?.kind === 'onion') {
    const frameCount = effective.frames?.length ?? 0;
    if (frameCount === 0) {
      throw new PxError(
        'E_BAD_PARAM',
        '--onion needs a framed recipe',
        'Add at least one frame to the recipe before asking for an onion view.',
      );
    }
    if (view.index > frameCount) {
      throw new PxError(
        'E_BAD_PARAM',
        `--onion ${view.index} is out of range; valid indices are [0, ${frameCount}]`,
        `Pass --onion with an integer from 0 to ${frameCount}.`,
      );
    }
  }

  // The view is drawn from this same compiled sprite. `result.png` is never
  // touched, so a committed digest and the caller's --out file stay untouched.
  const outFile = view === undefined ? args.out : viewPath(args.out, view);
  const outPng =
    view === undefined
      ? result.png
      : view.kind === 'onion'
        ? renderOnion(compiledFrames, view.index).png
        : renderView(view, result.compiled, result.rgba, effective.design?.light ?? 'top-left').png;
  writeOut(resolve(cwd, outFile), outPng);

  // Lint against the backdrop the caller asked to check, so a part that melts
  // into the panel is reported for that panel. Absent means the default grey.
  const lintBackdrop = typeof backdrop === 'string' ? (parseHex(backdrop) ?? undefined) : undefined;
  // Lint every frame so a warning confined to frame 1+ is reported and gates
  // under --strict. Frame 0 findings stay byte-identical to lintCompiled and
  // carry no `frame` field (lintCompiledFrames keeps frame 0 untagged).
  const frameFindings = lintCompiledFrames(compiledFrames, lintBackdrop);

  const payload: Record<string, unknown> = {
    file,
    out: outFile,
    // The onion view emits a 3-panel sibling strip, so the envelope must
    // report the emitted PNG's width rather than frame 0's canvas width.
    width: view?.kind === 'onion' ? result.width * ONION_PANELS : result.width,
    height: result.height,
    bytes: outPng.length,
    sha256: sha256Hex(outPng),
    findings: frameFindings,
  };
  if (view !== undefined) {
    payload.view =
      view.kind === 'blockout'
        ? {
            kind: 'blockout',
            bands: BLOCKOUT_BANDS,
            roles: BLOCKOUT_ROLES,
            outline: false,
            ao: false,
            texture: false,
          }
        : view.kind === 'onion'
          ? { kind: 'onion', index: view.index, panels: ONION_PANELS }
          : { kind: 'values', steps: view.steps, mapping: VALUES_MAPPING };
  }
  if (result.compiled.parts.length > 0) {
    payload.parts = result.compiled.parts;
  }
  if (result.compiled.deviations !== undefined && result.compiled.deviations.length > 0) {
    payload.deviations = result.compiled.deviations;
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
    // A blocking finding from any frame must suppress both sheet artifacts.
    // The normal PNG and the single-frame metadata projection are unchanged;
    // only the opt-in sheet pair is gated here, before main.ts returns exit 3.
    if (
      effective.frames !== undefined &&
      effective.frames.length > 0 &&
      !(args.strict && lintBlocks(frameFindings, true))
    ) {
      payload.sheet = writeSheet(args.out, recipe, result.compiled, effective, cwd);
    }
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
 * a client never has to guess whether a file was written. `sheet` is passed
 * only for a framed recipe's sheet meta; omitting it keeps single-frame output
 * byte-identical.
 */
function writeMetadata(
  out: string,
  recipe: Recipe,
  compiled: CompiledRecipe,
  cwd: string,
  paletteRecipe: Recipe = recipe,
  sheet?: readonly SheetFrame[],
): Record<string, unknown> {
  const metadata = buildMetadata(recipe, compiled, out, paletteRecipe, sheet);
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

/** `hero.png` pairs with `hero.sheet.png`; the normal PNG stays frame 0. */
export function sheetPath(out: string): string {
  return out.endsWith('.png') ? `${out.slice(0, -'.png'.length)}.sheet.png` : `${out}.sheet.png`;
}

export interface SheetRender {
  png: Uint8Array;
  width: number;
  height: number;
  frames: SheetFrame[];
}

/**
 * Pack every compiled frame into one left-to-right row. Each frame keeps its
 * full canvas; frames shorter than the tallest are transparently padded. The
 * output is a pure function of the recipe: no RNG, clocks or host ordering.
 */
export function renderSheet(recipe: Recipe): SheetRender {
  const compiledFrames = compileRecipeFrames(recipe);
  const declared = recipe.frames ?? [];
  const frames = buildSheetFrames(
    compiledFrames.map((frame) => ({
      index: frame.index,
      compiled: frame.compiled,
      ...(frame.id === undefined ? {} : { id: frame.id }),
      ...(frame.index === 0 ? {} : { duration: declared[frame.index - 1]?.duration }),
    })),
  );
  const width = frames.reduce((sum, frame) => sum + frame.width, 0);
  const height = frames.reduce((max, frame) => Math.max(max, frame.height), 0);
  const rgba = new Uint8Array(width * height * 4);
  compiledFrames.forEach((frame, index) => {
    const rect = frames[index];
    if (rect === undefined) {
      return;
    }
    const frameRgba = rasterizeSlots(
      frame.compiled.flattened,
      frame.compiled.width,
      frame.compiled.height,
      frame.compiled.slots,
    );
    const rowBytes = frame.compiled.width * 4;
    for (let row = 0; row < frame.compiled.height; row += 1) {
      rgba.set(
        frameRgba.subarray(row * rowBytes, (row + 1) * rowBytes),
        (row * width + rect.x) * 4,
      );
    }
  });
  return { png: encodePng(width, height, rgba), width, height, frames };
}

/** `--export` on a framed recipe writes the packed PNG and its additive meta. */
function writeSheet(
  out: string,
  recipe: Recipe,
  frame0: CompiledRecipe,
  paletteRecipe: Recipe,
  cwd: string,
): Record<string, unknown> {
  const sheet = renderSheet(paletteRecipe);
  const pngFile = sheetPath(out);
  writeOut(resolve(cwd, pngFile), sheet.png);
  return {
    out: pngFile,
    width: sheet.width,
    height: sheet.height,
    bytes: sheet.png.length,
    sha256: sha256Hex(sheet.png),
    metadata: writeMetadata(pngFile, recipe, frame0, cwd, paletteRecipe, sheet.frames),
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
    ...(compiled.deviations === undefined || compiled.deviations.length === 0
      ? {}
      : { deviations: compiled.deviations }),
    warnings: [...warnings, ...compiled.warnings],
  };
}

const FRAME_SUBCOMMANDS = ['add', 'edit', 'remove', 'list', 'set-duration', 'move'] as const;
type FrameSubcommand = (typeof FRAME_SUBCOMMANDS)[number];

function frameSubcommand(args: ParsedArgs): FrameSubcommand {
  const match = FRAME_SUBCOMMANDS.find((name) => name === args.frameCommand);
  if (match === undefined) {
    const value = args.frameCommand;
    throw usageError(
      value === undefined ? 'Missing frame subcommand' : `Unknown frame subcommand "${value}"`,
      `Use one of: px frame ${FRAME_SUBCOMMANDS.join(', ')}.`,
    );
  }
  return match;
}

/**
 * Numeric-looking arguments are logical frame indices; anything else is an
 * exact, case-sensitive frame id. Keeping the original spelling for ids avoids
 * silently rewriting `"01"` into frame 1.
 */
function frameSelector(value: string | undefined, flag: string): FrameSelector {
  if (value === undefined || value === '') {
    throw usageError(
      `Missing --${flag}`,
      'Address a frame with 0 for frame 0, a logical index from 1, or an exact frame id.',
    );
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && String(numeric) === value ? numeric : value;
}

/** Numbers reach the core engine unrounded so its own metadata rules decide. */
function frameNumberFlag(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw usageError(`--${flag} is not a number: "${value}"`, `Pass --${flag} as a number.`);
  }
  return numeric;
}

function frameOps(args: ParsedArgs): unknown[] {
  if (args.ops === undefined) {
    throw usageError(
      'Missing --ops',
      'Pass --ops as a JSON array of op objects or compact tuples.',
    );
  }
  return parseOpList(args.ops);
}

/** A flat op list becomes one frame layer; --layer names it. */
function frameLayers(args: ParsedArgs): unknown[] {
  return [{ id: args.layer ?? DEFAULT_LAYER_ID, ops: frameOps(args) }];
}

/**
 * Frame authoring CLI. Every mutation goes through the pure core engine, is
 * serialized and re-parsed for structural validation, and only then written.
 * A thrown error therefore always leaves the recipe on disk unchanged.
 */
export function runFrame(args: ParsedArgs, cwd: string): Record<string, unknown> {
  const subcommand = frameSubcommand(args);
  const file = requireFile(args);
  const target = resolve(cwd, file);
  const { recipe, warnings: sourceWarnings } = readSource(target, file);

  let next: Recipe;
  let details: Record<string, unknown>;
  switch (subcommand) {
    case 'list':
      return {
        file,
        subcommand,
        frames: listFrames(recipe),
        ...(sourceWarnings.length > 0 ? { warnings: sourceWarnings } : {}),
      };
    case 'add': {
      const duration = frameNumberFlag(args.duration, 'duration');
      const from = args.from === undefined ? undefined : frameSelector(args.from, 'from');
      const layers = args.ops === undefined ? undefined : frameLayers(args);
      next = addFrame(recipe, {
        ...(args.id === undefined ? {} : { id: args.id }),
        ...(duration === undefined ? {} : { duration }),
        ...(from === undefined ? {} : { from }),
        ...(layers === undefined ? {} : { layers }),
      });
      details = {
        frame: next.frames?.[next.frames.length - 1]?.id ?? null,
        ...(from === undefined ? {} : { from: args.from }),
        ...(duration === undefined ? {} : { duration }),
      };
      break;
    }
    case 'edit': {
      const selector = frameSelector(args.frame, 'frame');
      const opIndex = frameNumberFlag(args.opIndex, 'op-index');
      next = editFrame(recipe, {
        frame: selector,
        ...(args.layer === undefined ? {} : { layer: args.layer }),
        ...(opIndex === undefined ? {} : { opIndex }),
        ops: frameOps(args),
        replace: args.replace,
      });
      details = {
        frame: args.frame,
        replace: args.replace,
        ...(opIndex === undefined ? {} : { op_index: opIndex }),
      };
      break;
    }
    case 'remove': {
      const selector = frameSelector(args.frame, 'frame');
      next = removeFrame(recipe, selector);
      details = { frame: args.frame };
      break;
    }
    case 'set-duration': {
      const selector = frameSelector(args.frame, 'frame');
      const duration = frameNumberFlag(args.duration, 'duration');
      next = setFrameDuration(recipe, selector, duration);
      details = { frame: args.frame, duration: duration ?? null };
      break;
    }
    case 'move': {
      const selector = frameSelector(args.frame, 'frame');
      const to = frameNumberFlag(args.to, 'to');
      if (to === undefined) {
        throw usageError(
          'Missing --to',
          'Pass a zero-based position inside the declared frames, e.g. --to 0.',
        );
      }
      next = moveFrame(recipe, selector, to);
      details = { frame: args.frame, to };
      break;
    }
  }

  const text = serializeRecipe(next);
  const parsed = parseRecipe(text, { baseDir: dirname(target) });
  const outFile = args.out ?? file;
  writeOut(resolve(cwd, outFile), text);

  const allWarnings = mergeWarnings(sourceWarnings, parsed.warnings);
  return {
    file: outFile,
    subcommand,
    ...details,
    frames: listFrames(parsed.recipe),
    ...(allWarnings.length > 0 ? { warnings: allWarnings } : {}),
  };
}
