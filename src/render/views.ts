/**
 * Judgement views: blockout and posterised values (FR-10, AC-8).
 *
 * Both are views of an already compiled sprite, not new raster ops. They reuse
 * `rasterizeSlots` and `encodePng` — the same colour and PNG path a normal render
 * uses — and they never touch the recipe or the normal render's bytes. The
 * normal render is computed first as usual, so findings still describe the real
 * art; only the PNG written to disk changes.
 */

import { UNOWNED } from '../core/canvas.js';
import type { CompiledFrame, CompiledRecipe } from '../core/compile.js';
import { PxError } from '../core/errors.js';
import { bandRole, rankProjections } from '../core/ops/ramp.js';
import { buildSlotRoles, TRANSPARENT_SLOT } from '../core/palette.js';
import type { LightDir, RampRole } from '../core/recipe/types.js';
import { rasterizeSlots } from './flatten.js';
import { encodePng } from './png.js';

/** Three flat bands: the only roles a ramp family can express. */
export const BLOCKOUT_BANDS = 3;
export const BLOCKOUT_ROLES: readonly RampRole[] = ['highlight', 'base', 'shadow'];

/** Fixed posterise range. Outside it the grey steps stop being distinguishable. */
export const VALUES_MIN = 2;
export const VALUES_MAX = 8;

/**
 * The fixed grey mapping, documented here and echoed in the render payload:
 * Rec.709 luma weights on the encoded sRGB bytes, `floor(luma * steps)` clamped
 * to `steps - 1`, then an even spread of grey bytes from 0 to 255. No dithering,
 * no randomness, and alpha is copied unchanged so transparent stays transparent.
 */
export const VALUES_MAPPING =
  'grey = round(255 * clamp(floor((0.2126*r + 0.7152*g + 0.0722*b)/255 * steps), 0, steps-1) / (steps-1))';

export interface RenderView {
  png: Uint8Array;
  rgba: Uint8Array;
}

export type ViewSpec =
  | { kind: 'blockout' }
  | { kind: 'values'; steps: number }
  | { kind: 'onion'; index: number };

/** The onion strip is always prev | selected | next, at full canvas size. */
export const ONION_PANELS = 3;

/** Where a view PNG goes: a sibling of `--out`, never `--out` itself. */
export function viewPath(out: string, view: ViewSpec): string {
  const stem = out.endsWith('.png') ? out.slice(0, -'.png'.length) : out;
  const suffix =
    view.kind === 'blockout'
      ? 'blockout'
      : view.kind === 'values'
        ? `values${view.steps}`
        : `onion${view.index}`;
  const candidate = `${stem}.${suffix}.png`;
  return candidate === out ? `${stem}.${suffix}-view.png` : candidate;
}

/** Parse `--values N` once, with one range and one error code. */
export function parseSteps(value: string | undefined): number {
  if (value === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      '--values is missing a step count',
      `Use ${VALUES_MIN} to ${VALUES_MAX}.`,
    );
  }
  const steps = Number(value);
  if (!Number.isInteger(steps) || steps < VALUES_MIN || steps > VALUES_MAX) {
    throw new PxError(
      'E_BAD_PARAM',
      `--values is ${value}, expected a whole number from ${VALUES_MIN} to ${VALUES_MAX}`,
      `Pass --values with a step count from ${VALUES_MIN} to ${VALUES_MAX}.`,
    );
  }
  return steps;
}

/** Parse `--onion N` once. The concrete upper bound depends on the recipe; the
 * CLI passes `frameCount` to name it, and rechecks the range after reading the
 * recipe so an out-of-range index is caught before any file is written. */
export function parseOnionIndex(value: string | undefined, frameCount?: number): number {
  const range = frameCount === undefined ? '[0, frames.length]' : `[0, ${frameCount}]`;
  if (value === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      '--onion is missing a frame index',
      `Pass --onion with a non-negative whole-number frame index in ${range}.`,
    );
  }
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || value.trim() === '') {
    throw new PxError(
      'E_BAD_PARAM',
      `--onion is ${value}, expected a non-negative whole number`,
      `Pass --onion with a whole-number frame index in ${range}.`,
    );
  }
  return index;
}

/**
 * Reject a family with no ramp roles by borrowing the first ramp family. If the
 * palette has no ramp at all, the pixel keeps its original slot: a view must
 * still show something, even for a flat-only palette.
 */
function roleResolver(compiled: CompiledRecipe): (slot: number, role: RampRole) => number {
  const roles = buildSlotRoles(compiled.slots);
  // Every non-transparent slot belongs to exactly one family, so the first ramp
  // with roles is the same fallback for every part.
  let fallback = -1;
  compiled.slots.families.forEach((family, index) => {
    if (
      fallback < 0 &&
      family.kind === 'ramp' &&
      Object.keys(roles.roleSlots[index] ?? {}).length > 0
    ) {
      fallback = index;
    }
  });
  return (slot: number, role: RampRole): number => {
    const familyIndex = roles.familyOfSlot[slot];
    const own = familyIndex === undefined ? undefined : roles.roleSlots[familyIndex]?.[role];
    if (own !== undefined) {
      return own;
    }
    const borrowed = fallback < 0 ? undefined : roles.roleSlots[fallback]?.[role];
    return borrowed ?? slot;
  };
}

/**
 * Three flat value bands per part: the light-most occupied projection gets
 * `highlight`, the dark-most `shadow`, everything between `base`. Outline, AO
 * and texture slots are never read. Unowned pixels use the first ramp family.
 */
export function renderBlockout(compiled: CompiledRecipe, lightDir: LightDir): RenderView {
  const { width, height, flattened, owners, parts } = compiled;
  const resolveRole = roleResolver(compiled);
  const view = new Int16Array(width * height).fill(TRANSPARENT_SLOT);

  const paint = (ownerGrid: Int16Array, ownerIndex?: number): void => {
    const ranked = rankProjections(flattened, width, height, lightDir, ownerGrid, ownerIndex);
    if (ranked === undefined) {
      return;
    }
    for (const cell of ranked.cells) {
      const index = cell.y * width + cell.x;
      const slot = flattened[index] ?? TRANSPARENT_SLOT;
      const bucket = Math.floor((cell.rank * BLOCKOUT_BANDS) / ranked.occupiedCount);
      view[index] = resolveRole(slot, bandRole(bucket, BLOCKOUT_BANDS));
    }
  };

  parts.forEach((_part, index) => {
    paint(owners, index);
  });
  paint(owners, UNOWNED);

  const rgba = rasterizeSlots(view, width, height, compiled.slots);
  return { png: encodePng(width, height, rgba), rgba };
}

/** Posterise an existing RGBA buffer into `steps` even grey steps. */
export function renderValues(
  width: number,
  height: number,
  rgba: Uint8Array,
  steps: number,
): RenderView {
  const checked = parseSteps(String(steps));
  const posterised = new Uint8Array(rgba.length);
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    const red = rgba[index] ?? 0;
    const green = rgba[index + 1] ?? 0;
    const blue = rgba[index + 2] ?? 0;
    const luma = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const bucket = Math.min(checked - 1, Math.max(0, Math.floor(luma * checked)));
    const grey = Math.round((255 * bucket) / (checked - 1));
    posterised[index] = grey;
    posterised[index + 1] = grey;
    posterised[index + 2] = grey;
    posterised[index + 3] = alpha;
  }
  return { png: encodePng(width, height, posterised), rgba: posterised };
}

/** Dispatch one view; the caller has already parsed the spec and flags. */
export function renderView(
  view: ViewSpec,
  compiled: CompiledRecipe,
  rgba: Uint8Array,
  lightDir: LightDir,
): RenderView {
  if (view.kind === 'onion') {
    // A frames-aware view cannot be built from a single CompiledRecipe. The CLI
    // dispatches it through renderOnion instead; this guard keeps the contract
    // of this single-compiled entry point explicit.
    throw new PxError(
      'E_INTERNAL',
      'renderView cannot build an onion view from one compiled recipe',
      'Use renderOnion with the compiled frame list.',
    );
  }
  return view.kind === 'blockout'
    ? renderBlockout(compiled, lightDir)
    : renderValues(compiled.width, compiled.height, rgba, view.steps);
}

/**
 * Composite prev | selected | next into one strip, each panel a full canvas.
 * This is a frames-aware view with its own dispatch: it never changes the
 * single-compiled `renderView`/`renderDebugSheet` contracts. Panels outside the
 * frame range stay fully transparent (the zero-filled buffer), giving a
 * deterministic blank at the boundaries. No RNG, clocks or host ordering.
 */
export function renderOnion(frames: readonly CompiledFrame[], index: number): RenderView {
  const selected = frames[index];
  if (frames.length === 0 || selected === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      `--onion ${index} is not a compiled frame`,
      `Pass --onion with an index from 0 to ${Math.max(0, frames.length - 1)}.`,
    );
  }
  const { width, height } = selected.compiled;
  const rgba = new Uint8Array(width * ONION_PANELS * height * 4);
  const sources = [index - 1, index, index + 1];
  sources.forEach((sourceIndex, panel) => {
    const frame = frames[sourceIndex];
    if (frame === undefined) {
      return;
    }
    const frameRgba = rasterizeSlots(frame.compiled.flattened, width, height, frame.compiled.slots);
    const rowBytes = width * 4;
    for (let row = 0; row < height; row += 1) {
      rgba.set(
        frameRgba.subarray(row * rowBytes, (row + 1) * rowBytes),
        (row * width * ONION_PANELS + panel * width) * 4,
      );
    }
  });
  return { png: encodePng(width * ONION_PANELS, height, rgba), rgba };
}
