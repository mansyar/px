/**
 * Pure frame authoring engine for the 1.4 recipe format.
 *
 * Frame 0 is the top-level `layers`; it is never redeclared. The `frames`
 * array holds only additional frames. Logical indices follow the rest of the
 * engine: 0 is frame 0, and 1..N address `frames[0..N-1]`. A string selector
 * addresses a declared frame by its case-sensitive id. The destination of a
 * move is instead a zero-based position inside `frames`, because frame 0 can
 * never be reordered.
 *
 * Every operation is pure: it validates its arguments, throws a `PxError`
 * before producing anything invalid, and returns a new `Recipe`. The caller
 * serializes and re-parses that recipe to validate it before writing, and
 * must not write when an operation throws. Serialization is already
 * byte-deterministic in `serialize.ts`, so no operation reorders existing
 * content.
 */

import { PxError } from '../errors.js';
import { normalizeOp } from './normalize.js';
import type {
  AddFrameOptions,
  EditFrameOptions,
  Frame,
  FrameRow,
  FrameSelector,
  Layer,
  RawOp,
  Recipe,
} from './types.js';

export type { AddFrameOptions, EditFrameOptions, FrameRow, FrameSelector } from './types.js';

type FrameLocation = { kind: 'base' } | { kind: 'declared'; index: number; frame: Frame };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  // Canonical frame content is plain JSON: no cycles, no prototypes and no
  // meaningful `undefined` fields survive normalization, so a JSON round-trip
  // is an exact deep clone. The type assertion stays inside this one boundary.
  return JSON.parse(JSON.stringify(value)) as T;
}

function validateFrameId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PxError(
      'E_BAD_META',
      `Frame id ${JSON.stringify(value)} is not a non-empty string`,
      'Give the frame a name such as "idle" or "walk".',
    );
  }
  return value;
}

function validateDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new PxError(
      'E_BAD_META',
      `Frame duration ${JSON.stringify(value)} is not a positive integer`,
      'Duration is a whole number of milliseconds greater than zero, or omit it entirely.',
    );
  }
  return value;
}

function assertUniqueFrameId(frames: readonly Frame[] | undefined, id: string): void {
  if (frames?.some((frame) => frame.id === id)) {
    throw new PxError(
      'E_BAD_META',
      `Frame id "${id}" already exists`,
      'Frame ids are unique and case-sensitive; choose a different id.',
    );
  }
}

function nextFrameId(frames: readonly Frame[] | undefined): string {
  const used = new Set(frames?.map((frame) => frame.id) ?? []);
  let candidate = (frames?.length ?? 0) + 1;
  while (used.has(`frame-${candidate}`)) {
    candidate += 1;
  }
  return `frame-${candidate}`;
}

function unknownTarget(selector: unknown, frames: readonly Frame[]): PxError {
  const known = frames.map((frame) => frame.id);
  return new PxError(
    'E_BAD_PARAM',
    `No frame matches ${JSON.stringify(selector)}`,
    `Use 0 for frame 0, an index from 1 to ${frames.length}, or an id: ${known.join(', ') || '(none declared)'}.`,
  );
}

function resolveFrame(recipe: Recipe, selector: FrameSelector): FrameLocation {
  const frames = recipe.frames ?? [];
  if (typeof selector === 'string') {
    const index = frames.findIndex((frame) => frame.id === selector);
    if (index < 0) {
      throw unknownTarget(selector, frames);
    }
    return { kind: 'declared', index, frame: frames[index] };
  }
  if (!Number.isInteger(selector) || selector < 0 || selector > frames.length) {
    throw unknownTarget(selector, frames);
  }
  if (selector === 0) {
    return { kind: 'base' };
  }
  return { kind: 'declared', index: selector - 1, frame: frames[selector - 1] };
}

function assertMutable(
  location: FrameLocation,
  verb: string,
): asserts location is { kind: 'declared'; index: number; frame: Frame } {
  if (location.kind === 'base') {
    throw new PxError(
      'E_BAD_PARAM',
      `Frame 0 cannot be ${verb}`,
      'Frame 0 is the top-level layers; frame commands only address added frames.',
    );
  }
}

function normalizeRawLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PxError(
      'E_BAD_META',
      'Frame layers must be a non-empty array',
      'Declare "layers": [{"id": "<id>", "ops": [...]}].',
    );
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new PxError(
        'E_BAD_META',
        `Frame layer at index ${index} is not an object`,
        'Each layer needs an "id" and an "ops" array.',
      );
    }
    const id = entry.id;
    if (typeof id !== 'string' || id.trim() === '') {
      throw new PxError(
        'E_BAD_META',
        `Frame layer at index ${index} needs a non-empty id`,
        'Give the layer a name such as "base".',
      );
    }
    if (seen.has(id)) {
      throw new PxError(
        'E_DUPLICATE_LAYER',
        `Frame layer id "${id}" is duplicated`,
        'Layer ids are unique within a frame.',
      );
    }
    seen.add(id);
    const rawOps = entry.ops;
    if (rawOps !== undefined && !Array.isArray(rawOps)) {
      throw new PxError(
        'E_BAD_META',
        `Layer "${id}" ops must be an array`,
        'Declare "ops": [] for an empty layer.',
      );
    }
    return { id, ops: (rawOps ?? []).map((op, opIndex) => normalizeOp(op, opIndex, id)) };
  });
}

function normalizeReplacementOps(raw: unknown, layerId: string, startIndex: number): RawOp[] {
  if (!Array.isArray(raw)) {
    throw new PxError(
      'E_BAD_PARAM',
      'Frame ops must be an array',
      'Pass a list of ops, for example [["rect", 1, 1, 2, 2, "c.0"]].',
    );
  }
  return raw.map((op, index) => normalizeOp(op, startIndex + index, layerId));
}

function resolveLayerIndex(frame: Frame, selector: string | number | undefined): number {
  if (selector === undefined) {
    return 0;
  }
  if (typeof selector === 'string') {
    const index = frame.layers.findIndex((layer) => layer.id === selector);
    if (index < 0) {
      throw new PxError(
        'E_BAD_PARAM',
        `Frame "${frame.id}" has no layer "${selector}"`,
        `Choose one of: ${frame.layers.map((layer) => layer.id).join(', ')}.`,
      );
    }
    return index;
  }
  if (!Number.isInteger(selector) || selector < 0 || selector >= frame.layers.length) {
    throw new PxError(
      'E_BAD_PARAM',
      `Frame "${frame.id}" has no layer at index ${selector}`,
      `Choose an index from 0 to ${frame.layers.length - 1}.`,
    );
  }
  return selector;
}

function replaceDeclaredFrame(recipe: Recipe, index: number, frame: Frame): Recipe {
  return {
    ...recipe,
    frames: (recipe.frames ?? []).map((candidate, position) =>
      position === index ? frame : candidate,
    ),
  };
}

function row(
  index: number,
  id: string | null,
  layers: readonly Layer[],
  duration?: number,
): FrameRow {
  return {
    index,
    id,
    ...(duration === undefined ? {} : { duration }),
    layers: layers.length,
    ops: layers.reduce((total, layer) => total + layer.ops.length, 0),
  };
}

/**
 * Add an additional frame, cloning layers from `from` and/or normalizing
 * explicit `layers`. Promotes legacy recipes to version 1.4 because frames
 * are a 1.4 feature. Frame 0 is only ever read as a clone source.
 */
export function addFrame(recipe: Recipe, options: AddFrameOptions): Recipe {
  const frames = recipe.frames ?? [];
  const id = options.id === undefined ? nextFrameId(frames) : validateFrameId(options.id);
  assertUniqueFrameId(frames, id);
  const duration = options.duration === undefined ? undefined : validateDuration(options.duration);

  let layers: Layer[];
  if (options.layers !== undefined) {
    layers = normalizeRawLayers(options.layers);
  } else if (options.from !== undefined) {
    const source = resolveFrame(recipe, options.from);
    layers = cloneJson(source.kind === 'base' ? recipe.layers : source.frame.layers);
  } else {
    layers = [{ id: 'base', ops: [] }];
  }

  return {
    ...recipe,
    version: '1.4',
    frames: [...frames, { id, layers, ...(duration === undefined ? {} : { duration }) }],
  };
}

/**
 * Replace one op or the whole ops list of a declared frame's layer. Every
 * other op and layer is copied by reference, so only the addressed op changes.
 */
export function editFrame(recipe: Recipe, options: EditFrameOptions): Recipe {
  const location = resolveFrame(recipe, options.frame);
  assertMutable(location, 'edited');
  const layerIndex = resolveLayerIndex(location.frame, options.layer);
  const layer = location.frame.layers[layerIndex];

  let ops: RawOp[];
  if (options.replace) {
    ops = normalizeReplacementOps(options.ops, layer.id, 0);
  } else {
    const at = options.opIndex;
    if (typeof at !== 'number' || !Number.isInteger(at) || at < 0 || at >= layer.ops.length) {
      throw new PxError(
        'E_BAD_PARAM',
        `Op index ${String(at)} is out of range for layer "${layer.id}" (${layer.ops.length} ops)`,
        `Choose an index from 0 to ${layer.ops.length - 1}, or pass replace: true.`,
      );
    }
    const replacement = normalizeReplacementOps(options.ops, layer.id, at);
    ops = [...layer.ops.slice(0, at), ...replacement, ...layer.ops.slice(at + 1)];
  }

  const nextLayers = location.frame.layers.map((candidate, index) =>
    index === layerIndex ? { ...candidate, ops } : candidate,
  );
  return replaceDeclaredFrame(recipe, location.index, { ...location.frame, layers: nextLayers });
}

/** Remove a declared frame by id or logical index. Removing the last frame drops the `frames` key. */
export function removeFrame(recipe: Recipe, target: FrameSelector): Recipe {
  const location = resolveFrame(recipe, target);
  assertMutable(location, 'removed');
  const frames = recipe.frames ?? [];
  const remaining = [...frames.slice(0, location.index), ...frames.slice(location.index + 1)];
  // `frames: undefined` makes canonicalRecipe omit the key; spreading alone
  // would copy the old array from `recipe`.
  return { ...recipe, frames: remaining.length === 0 ? undefined : remaining };
}

/** List frame 0 and every declared frame with its id, duration and content counts. */
export function listFrames(recipe: Recipe): FrameRow[] {
  const rows = [row(0, null, recipe.layers)];
  (recipe.frames ?? []).forEach((frame, index) => {
    rows.push(row(index + 1, frame.id, frame.layers, frame.duration));
  });
  return rows;
}

/** Set or clear the duration of a declared frame. Frame 0 has no duration. */
export function setFrameDuration(
  recipe: Recipe,
  target: FrameSelector,
  duration: number | undefined,
): Recipe {
  const location = resolveFrame(recipe, target);
  assertMutable(location, 'retimed');
  const validated = duration === undefined ? undefined : validateDuration(duration);
  return replaceDeclaredFrame(recipe, location.index, {
    id: location.frame.id,
    layers: location.frame.layers,
    ...(validated === undefined ? {} : { duration: validated }),
  });
}

/** Move a declared frame to a zero-based position inside `frames`. Frame 0 never moves. */
export function moveFrame(recipe: Recipe, target: FrameSelector, toIndex: number): Recipe {
  const location = resolveFrame(recipe, target);
  assertMutable(location, 'moved');
  const frames = recipe.frames ?? [];
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= frames.length) {
    throw new PxError(
      'E_BAD_PARAM',
      `Move destination ${String(toIndex)} is out of range`,
      `Choose a position from 0 to ${frames.length - 1}.`,
    );
  }
  if (location.index === toIndex) {
    return recipe;
  }
  const ordered = [...frames];
  const [moved] = ordered.splice(location.index, 1);
  ordered.splice(toIndex, 0, moved);
  return { ...recipe, frames: ordered };
}
