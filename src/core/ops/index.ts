/**
 * Op dispatch. The switch is exhaustive: adding an op to the union without
 * wiring it here is a type error.
 *
 * Every op gets the active layer (the only write target) plus the palette views
 * it needs. Ops that read take an immutable snapshot at the moment the op runs,
 * so nothing consumes its own output and every op is order-independent.
 */

import { type SlotCanvas, UNOWNED } from '../canvas.js';
import { PxError } from '../errors.js';
import { type SlotRoles, type SlotTable, slotHint, TRANSPARENT_SLOT } from '../palette.js';
import type { ProfileNumbers } from '../profile.js';
import {
  type Op,
  type Parts,
  RAMP_ROLES,
  type RecipeVersion,
  type TextureOp,
} from '../recipe/types.js';
import { drawAsciiBlit } from './ascii-blit.js';
import { type CleanupReport, deband, seal, strays } from './cleanup.js';
import { drawEllipse } from './ellipse.js';
import { drawDitherFill, floodFill } from './fills.js';
import { applyLight } from './light.js';
import { drawLine } from './line.js';
import { drawMirror } from './mirror.js';
import { autoOutline } from './outline.js';
import { partRampError } from './pass.js';
import { drawPolygon } from './polygon.js';
import { rampFill } from './ramp.js';
import { drawRect } from './rect.js';
import { replaceSlot } from './replace-slot.js';
import { drawSetPixels } from './set-pixels.js';
import { autoShade } from './shade.js';
import { drawStroke } from './stroke.js';
import { applyTexture } from './texture.js';

export interface OpContext {
  /** The active layer. Every write lands here, through the clipped writer. */
  canvas: SlotCanvas;
  layerId: string;
  opIndex: number;
  slots: SlotTable;
  roles: SlotRoles;
  /** Every layer's buffer, in recipe order. */
  layers: ReadonlyMap<string, SlotCanvas>;
  /**
   * Part index this op's pixels belong to, `UNOWNED` when the op carries no
   * `part`. Painting ops write it; transforms inherit from the pixels they read.
   */
  owner: number;
  /** Declared parts; the lighting pass reads `material`, `gloss` and `z`. */
  parts: Parts;
  /** Declared part name to owner index, in canonical declaration order. */
  partIndexes: ReadonlyMap<string, number>;
  /**
   * The schema version the recipe declared. Defaults that were introduced after
   * 1.0 are gated on it, so a 1.0 recipe keeps rendering the bytes it always did.
   */
  version: RecipeVersion;
  /** The numbers the active profile gives every pass, resolved once per compile. */
  profile: ProfileNumbers;
}

export interface OpResult {
  /** True when at least one write fell outside the canvas. */
  clipped: boolean;
  /** True when a post-pass had nothing to change. */
  noop: boolean;
  /** Present only for cleanup passes, which report exactly what they changed. */
  cleanup?: CleanupReport;
  /**
   * Present when a pass dropped destinations that left the canvas for a reason
   * of its own, so the warning can name the count and the lever that caused it.
   */
  clippedDetail?: { dropped: number; hint: string };
}

const WRITTEN: OpResult = { clipped: false, noop: false };

function result(clipped: boolean): OpResult {
  return { clipped, noop: false };
}

function unknownSlot(context: OpContext, name: string): PxError {
  return new PxError(
    'E_UNKNOWN_SLOT',
    `Unknown slot "${name}" in op ${context.opIndex} of layer "${context.layerId}"`,
    slotHint(name, context.slots),
    { layer: context.layerId, op_index: context.opIndex },
  );
}

/** A slot name to its index; an explicit null erases. */
function colorSlot(context: OpContext, color: string | null): number {
  if (color === null) {
    return TRANSPARENT_SLOT;
  }
  const slot = context.slots.resolve(color);
  if (slot === undefined) {
    throw unknownSlot(context, color);
  }
  return slot;
}

/**
 * A texture colour: an explicit slot, or a bare ramp role resolved against the
 * material of the part being textured. A family without the role is `E_NO_RAMP`
 * with the shared hint machinery, never a silent skip.
 */
function textureSlot(context: OpContext, op: TextureOp): number {
  if (op.color === null) {
    return TRANSPARENT_SLOT;
  }
  const role = RAMP_ROLES.find((candidate) => candidate === op.color);
  if (role === undefined) {
    return colorSlot(context, op.color);
  }
  const part = op.part === undefined ? undefined : context.parts[op.part];
  const family = part?.material;
  if (family === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      `Op ${context.opIndex} (texture) names role "${role}" but carries no part`,
      'A role resolves against the material of the part being textured; add "part": "<name>".',
      { layer: context.layerId, op_index: context.opIndex },
    );
  }
  const slot = context.slots.resolve(`${family}.${role}`);
  if (slot === undefined) {
    throw partRampError(op.part ?? '', family, role);
  }
  return slot;
}

function requiredSlot(context: OpContext, name: string): number {
  const slot = context.slots.resolve(name);
  if (slot === undefined) {
    throw unknownSlot(context, name);
  }
  return slot;
}

/** Snapshot of the layer a post-pass reads, taken before it writes. */
function snapshot(context: OpContext, targetLayer: string | undefined): Int16Array {
  return Int16Array.from(sourceCanvas(context, targetLayer).slots);
}

/** Ownership alongside the colour snapshot, for passes that inherit it. */
function snapshotOwners(context: OpContext, targetLayer: string | undefined): Int16Array {
  return Int16Array.from(sourceCanvas(context, targetLayer).owners);
}

function sourceCanvas(context: OpContext, targetLayer: string | undefined): SlotCanvas {
  const source = targetLayer === undefined ? context.canvas : context.layers.get(targetLayer);
  if (source === undefined) {
    throw new PxError(
      'E_NO_SUCH_LAYER',
      `Op ${context.opIndex} reads target_layer "${String(targetLayer)}", which does not exist`,
      `Layers are ${[...context.layers.keys()].join(', ') || 'none'}.`,
      { layer: context.layerId, op_index: context.opIndex },
    );
  }
  return source;
}

/**
 * An erase removes both colour and ownership, so a `part` on an erase op must
 * not leave a mask behind.
 */
function ownerFor(context: OpContext, color: string | null): number {
  return color === null ? UNOWNED : context.owner;
}

/**
 * The depth `auto_outline` uses when the op names no `width`. Before profiles
 * existed the pass drew one pixel and nothing else, so `1` and `"1.0"` keep that
 * border (AC-1: a 1.0 recipe renders byte-identically); a 1.1 recipe may take the
 * profile's recommendation (FR-13).
 */
function outlineDepth(context: OpContext): number {
  return context.version === 1 || context.version === '1.0' ? 1 : context.profile.outlineWidth;
}

export function applyOp(context: OpContext, op: Op): OpResult {
  const site = { opIndex: context.opIndex, layerId: context.layerId };
  switch (op.op) {
    case 'set_pixels':
      return result(
        drawSetPixels(
          context.canvas,
          op.points,
          colorSlot(context, op.color),
          ownerFor(context, op.color),
        ),
      );
    case 'rect':
      return result(
        drawRect(
          context.canvas,
          op.x,
          op.y,
          op.w,
          op.h,
          colorSlot(context, op.color),
          ownerFor(context, op.color),
        ),
      );
    case 'line':
      return result(
        drawLine(
          context.canvas,
          op.x1,
          op.y1,
          op.x2,
          op.y2,
          colorSlot(context, op.color),
          ownerFor(context, op.color),
        ),
      );
    case 'stroke':
      return result(
        drawStroke(
          context.canvas,
          op,
          colorSlot(context, op.color),
          ownerFor(context, op.color),
          site,
        ),
      );
    case 'ellipse':
      return result(
        drawEllipse(
          context.canvas,
          op.x,
          op.y,
          op.w,
          op.h,
          colorSlot(context, op.color),
          op.fill === true,
          ownerFor(context, op.color),
        ),
      );
    case 'polygon':
      return result(
        drawPolygon(
          context.canvas,
          op.points,
          colorSlot(context, op.color),
          ownerFor(context, op.color),
        ),
      );
    case 'flood_fill':
      return result(
        floodFill(
          context.canvas,
          op.x,
          op.y,
          colorSlot(context, op.color),
          op.connectivity === 8 ? 8 : 4,
          ownerFor(context, op.color),
        ),
      );
    case 'dither_fill':
      return result(
        drawDitherFill(
          context.canvas,
          op.x,
          op.y,
          op.w,
          op.h,
          colorSlot(context, op.color),
          op.pattern,
          ownerFor(context, op.color),
        ),
      );
    case 'texture': {
      if (op.part === undefined) {
        throw new PxError(
          'E_BAD_PARAM',
          `Op ${context.opIndex} (texture) has no part to texture`,
          'Add "part": "<name>" so texture knows which pixels to cover.',
          { layer: context.layerId, op_index: context.opIndex },
        );
      }
      const part = context.partIndexes.get(op.part);
      if (part === undefined) {
        throw new PxError(
          'E_BAD_PARAM',
          `Op ${context.opIndex} (texture) names part "${op.part}", which is not declared`,
          'Declare the part in "parts" before texturing it.',
          { layer: context.layerId, op_index: context.opIndex },
        );
      }
      const outcome = applyTexture(
        context.canvas,
        snapshot(context, op.targetLayer),
        snapshotOwners(context, op.targetLayer),
        part,
        textureSlot(context, op),
        ownerFor(context, op.color),
        op.pattern,
        context.profile.minCluster,
        op.density ?? 2,
      );
      return {
        clipped: false,
        noop: outcome.painted === 0,
        // Counts only: a texture reports marks and pixels, never coordinates.
        cleanup: { op: 'texture', changed: outcome.painted, coords: [], marks: outcome.marks },
      };
    }
    case 'ascii_blit': {
      const cells = new Map<string, number>();
      for (const [glyph, name] of Object.entries(op.legend)) {
        cells.set(glyph, requiredSlot(context, name));
      }
      return result(drawAsciiBlit(context.canvas, op.x, op.y, op.grid, cells, context.owner));
    }
    case 'mirror':
      return result(drawMirror(context.canvas, op.axis, op.pivot));
    case 'auto_outline': {
      const painted = autoOutline(
        context.canvas,
        snapshot(context, op.targetLayer),
        context.roles,
        {
          mode: op.mode ?? '4-way',
          where: op.where ?? 'outer',
          selective: op.selective === true,
          color: op.color === undefined ? undefined : colorSlot(context, op.color),
          // The profile recommends a depth at 1.1; an explicit width always wins.
          thickness: op.width ?? outlineDepth(context),
        },
        snapshotOwners(context, op.targetLayer),
      );
      return { clipped: false, noop: painted === 0 };
    }
    case 'auto_shade': {
      const painted = autoShade(
        context.canvas,
        snapshot(context, op.targetLayer),
        context.roles,
        context.slots,
        op.lightDir,
        site,
      );
      return { clipped: false, noop: painted === 0 };
    }
    case 'ramp_fill': {
      const painted = rampFill(
        context.canvas,
        snapshot(context, op.targetLayer),
        context.roles,
        context.slots,
        op.bands,
        op.lightDir,
        site,
      );
      return { clipped: false, noop: painted === 0 };
    }
    case 'light': {
      const outcome = applyLight(
        context.canvas,
        snapshot(context, op.targetLayer),
        snapshotOwners(context, op.targetLayer),
        context.roles,
        context.slots,
        context.parts,
        {
          angle: op.angle,
          form: op.form,
          ao: op.ao,
          cast: op.cast === null ? null : (context.partIndexes.get(op.cast) ?? UNOWNED),
          castOffset: op.castOffset,
          rim: op.rim,
        },
        { opIndex: context.opIndex, layerId: context.layerId },
      );
      if (outcome.clipped !== null) {
        // The pass never wrote these pixels, but the caller still asked them
        // somewhere the canvas cannot hold; report it once, at the first one.
        context.canvas.clippedAt = outcome.clipped.first;
        return {
          clipped: true,
          noop: outcome.painted === 0,
          clippedDetail: {
            dropped: outcome.clipped.count,
            hint: `cast_offset is ${op.castOffset}; lower it, or set "cast": null to keep the shadow on the canvas.`,
          },
        };
      }
      return { clipped: false, noop: outcome.painted === 0 };
    }
    case 'replace_slot':
      replaceSlot(
        context.canvas,
        Int16Array.from(context.canvas.slots),
        requiredSlot(context, op.from),
        requiredSlot(context, op.to),
      );
      return WRITTEN;
    case 'seal': {
      const changed = seal(
        context.canvas,
        snapshot(context, op.targetLayer),
        context.canvas.width,
        context.canvas.height,
        snapshotOwners(context, op.targetLayer),
      );
      return {
        clipped: false,
        noop: changed.length === 0,
        cleanup: report('seal', changed.length, changed),
      };
    }
    case 'strays': {
      const changed = strays(
        context.canvas,
        snapshot(context, op.targetLayer),
        context.canvas.width,
        context.canvas.height,
        context.profile.minCluster,
      );
      return {
        clipped: false,
        noop: changed.length === 0,
        cleanup: report('strays', changed.length, changed),
      };
    }
    case 'deband': {
      const hasParts = context.partIndexes.size > 0;
      const changed = deband(
        context.canvas,
        snapshot(context, op.targetLayer),
        hasParts ? snapshotOwners(context, op.targetLayer) : null,
        context.partIndexes.size,
        context.canvas.width,
        context.canvas.height,
        context.slots,
        context.roles,
      );
      return {
        clipped: false,
        noop: changed.length === 0,
        cleanup: report('deband', changed.length, changed),
      };
    }
  }
}

/** The report a cleanup pass returns: exact count, coordinates capped at 50. */
const MAX_CLEANUP_COORDS = 50;

function report(
  op: CleanupReport['op'],
  changed: number,
  coords: CleanupReport['coords'],
): CleanupReport {
  return { op, changed, coords: coords.slice(0, MAX_CLEANUP_COORDS) };
}

export { drawAsciiBlit } from './ascii-blit.js';
export {
  type CleanupCoord,
  type CleanupReport,
  darkerSlot,
  deband,
  seal,
  strays,
} from './cleanup.js';
export { drawEllipse, ellipseRowSpan, ellipseSpans } from './ellipse.js';
export { BAYER_4, ditherPaints, drawDitherFill, floodFill } from './fills.js';
export { applyLight, facingRole, towardLight } from './light.js';
export { bresenham } from './line.js';
export { drawMirror } from './mirror.js';
export { autoOutline } from './outline.js';
export { drawPolygon, polygonSpans } from './polygon.js';
export { bandRole, rampFill } from './ramp.js';
export { drawRect } from './rect.js';
export { replaceSlot } from './replace-slot.js';
export { drawSetPixels } from './set-pixels.js';
export { autoShade } from './shade.js';
export {
  balancedSegment,
  drawStroke,
  pixelPerfect,
  roundedPath,
  strokePath,
} from './stroke.js';
export { applyTexture, textureLattice, textureMarks } from './texture.js';
export { writePoints } from './write-points.js';
