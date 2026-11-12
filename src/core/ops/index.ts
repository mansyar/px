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
import type { Op } from '../recipe/types.js';
import { drawAsciiBlit } from './ascii-blit.js';
import { drawEllipse } from './ellipse.js';
import { drawDitherFill, floodFill } from './fills.js';
import { drawLine } from './line.js';
import { drawMirror } from './mirror.js';
import { autoOutline } from './outline.js';
import { drawPolygon } from './polygon.js';
import { rampFill } from './ramp.js';
import { drawRect } from './rect.js';
import { replaceSlot } from './replace-slot.js';
import { drawSetPixels } from './set-pixels.js';
import { autoShade } from './shade.js';

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
}

export interface OpResult {
  /** True when at least one write fell outside the canvas. */
  clipped: boolean;
  /** True when a post-pass had nothing to change. */
  noop: boolean;
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
    case 'replace_slot':
      replaceSlot(
        context.canvas,
        Int16Array.from(context.canvas.slots),
        requiredSlot(context, op.from),
        requiredSlot(context, op.to),
      );
      return WRITTEN;
  }
}

export { drawAsciiBlit } from './ascii-blit.js';
export { drawEllipse, ellipseRowSpan, ellipseSpans } from './ellipse.js';
export { BAYER_4, ditherPaints, drawDitherFill, floodFill } from './fills.js';
export { bresenham } from './line.js';
export { drawMirror } from './mirror.js';
export { autoOutline } from './outline.js';
export { drawPolygon, polygonSpans } from './polygon.js';
export { bandRole, rampFill } from './ramp.js';
export { drawRect } from './rect.js';
export { replaceSlot } from './replace-slot.js';
export { drawSetPixels } from './set-pixels.js';
export { autoShade } from './shade.js';
export { writePoints } from './write-points.js';
