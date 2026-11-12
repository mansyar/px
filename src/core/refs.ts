/**
 * Named coordinate refs (FR-22).
 *
 * A ref resolves against the mask of its part **as of the start of the op** —
 * the entry snapshot — never against geometry the op is drawing itself. That is
 * the whole determinism argument: resolve one op's refs before it writes
 * anything, and the same recipe yields the same coordinates no matter where in
 * the op the resolution happens. Resolving lazily against the live mask would
 * make a fill's second corner depend on its first, and the same recipe would
 * stop being reproducible.
 *
 * `edge` deliberately means the part's raster-first painted pixel (smallest y,
 * then smallest x), not "a point on the silhouette": a silhouette has no single
 * pixel without a direction to walk it from. It is a starting point; `dx`/`dy`
 * move it.
 */

import type { SlotCanvas } from './canvas.js';
import { PxError } from './errors.js';
import { TRANSPARENT_SLOT } from './palette.js';
import { partHint } from './parts.js';
import {
  ANCHOR_REF_PREFIX,
  type Anchors,
  type Coord,
  type CoordRef,
  type Op,
  type Parts,
  type RawOp,
  REF_WHERES,
  type RefWhere,
} from './recipe/types.js';

/** The one sentence every grammar error repeats, so callers learn the shape once. */
export const REF_GRAMMAR =
  'A coordinate ref is {"ref": "<part>.<where>"} with <where> one of top, bottom, left, right, center, edge, or {"ref": "anchor.<name>"} for a declared anchor; dx and dy are optional integer offsets applied after resolution.';

export type RefTarget =
  | { kind: 'part'; part: string; where: RefWhere }
  | { kind: 'anchor'; name: string };

export interface RefSite {
  layer: string;
  opIndex: number;
  opName: string;
}

function site(spec: RefSite) {
  return { layer: spec.layer, op_index: spec.opIndex };
}

function at(spec: RefSite): string {
  return `op ${spec.opIndex} (${spec.opName}) of layer "${spec.layer}"`;
}

/** Read a ref string into a lookup target, enforcing the grammar. */
export function parseRef(text: string, spec: RefSite): RefTarget {
  if (text.startsWith(ANCHOR_REF_PREFIX)) {
    const name = text.slice(ANCHOR_REF_PREFIX.length);
    if (name === '') {
      throw new PxError(
        'E_BAD_PARAM',
        `Coordinate ref "${text}" in ${at(spec)} has an empty anchor name`,
        REF_GRAMMAR,
        site(spec),
      );
    }
    return { kind: 'anchor', name };
  }

  const dot = text.lastIndexOf('.');
  if (dot <= 0 || dot === text.length - 1) {
    throw new PxError(
      'E_BAD_PARAM',
      `Coordinate ref "${text}" in ${at(spec)} is not "<part>.<where>" or "anchor.<name>"`,
      REF_GRAMMAR,
      site(spec),
    );
  }

  const part = text.slice(0, dot);
  const where = text.slice(dot + 1);
  const match = REF_WHERES.find((entry) => entry === where);
  if (match === undefined) {
    throw new PxError(
      'E_BAD_PARAM',
      `Coordinate ref "${text}" in ${at(spec)} names "${where}", which is not a ref point`,
      REF_GRAMMAR,
      site(spec),
    );
  }
  return { kind: 'part', part, where: match };
}

/** One part's painted extent at a given moment, plus its raster-first pixel. */
export interface PartMask {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  first: [number, number];
}

/**
 * The extent of `part` across `layers` as they stand now. `null` when the part
 * owns nothing yet: a caller that read a ref early gets E_EMPTY_PART rather than
 * a coordinate derived from an empty box.
 */
export function partMask(
  layers: ReadonlyArray<Pick<SlotCanvas, 'slots' | 'owners'>>,
  part: number,
  width: number,
  height: number,
): PartMask | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let firstX = -1;
  let firstY = -1;

  for (const layer of layers) {
    for (let index = 0; index < layer.slots.length; index += 1) {
      if (layer.slots[index] === TRANSPARENT_SLOT) {
        continue;
      }
      if (layer.owners[index] !== part) {
        continue;
      }
      const y = Math.floor(index / width);
      const x = index - y * width;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
      if (firstY === -1 || y < firstY || (y === firstY && x < firstX)) {
        firstX = x;
        firstY = y;
      }
    }
  }

  if (maxX === -1) {
    return null;
  }
  return { minX, minY, maxX, maxY, first: [firstX, firstY] };
}

/** The point a resolved part ref names on a mask. */
export function maskPoint(mask: PartMask, where: RefWhere): [number, number] {
  const centerX = Math.floor((mask.minX + mask.maxX) / 2);
  const centerY = Math.floor((mask.minY + mask.maxY) / 2);
  switch (where) {
    case 'top':
      return [centerX, mask.minY];
    case 'bottom':
      return [centerX, mask.maxY];
    case 'left':
      return [mask.minX, centerY];
    case 'right':
      return [mask.maxX, centerY];
    case 'center':
      return [centerX, centerY];
    case 'edge':
      return [mask.first[0], mask.first[1]];
  }
}

export interface RefContext {
  /** Layer canvases as the op finds them: the entry snapshot. */
  layers: ReadonlyArray<Pick<SlotCanvas, 'slots' | 'owners'>>;
  width: number;
  height: number;
  parts: Parts;
  partIndexes: ReadonlyMap<string, number>;
  anchors: Anchors;
  site: RefSite;
}

/** Every ref this op carries, in field order. Empty for ops with no coordinates. */
export function coordRefsOf(op: RawOp): CoordRef[] {
  switch (op.op) {
    case 'rect':
    case 'ellipse':
    case 'flood_fill':
    case 'dither_fill':
    case 'ascii_blit':
      return refsIn([op.x, op.y]);
    case 'line':
      return refsIn([op.x1, op.y1, op.x2, op.y2]);
    default:
      return [];
  }
}

function refsIn(values: Coord[]): CoordRef[] {
  return values.filter((value): value is CoordRef => typeof value !== 'number');
}

/**
 * Rewrite an op's coordinate fields from refs to numbers against the entry
 * snapshot. Ops without refs come back untouched, and every other field is
 * carried over as-is, so resolution cannot change anything a ref did not name.
 */
export function resolveOpCoords(op: RawOp, context: RefContext): Op {
  const masks = new Map<number, PartMask | null>();
  const point = (coord: Coord | undefined): [number, number] => resolvePoint(coord, context, masks);
  // A ref names a point, so it can fill both halves of an x/y pair: `x` takes
  // the point's column and `y` its row. Two different refs in one pair are fine
  // and independent; they still read the same snapshot.
  const horizontal = (coord: Coord | undefined): number => point(coord)[0];
  const vertical = (coord: Coord | undefined): number => point(coord)[1];

  switch (op.op) {
    case 'rect':
      return { ...op, x: horizontal(op.x), y: vertical(op.y) };
    case 'line':
      return {
        ...op,
        x1: horizontal(op.x1),
        y1: vertical(op.y1),
        x2: horizontal(op.x2),
        y2: vertical(op.y2),
      };
    case 'ellipse':
      return { ...op, x: horizontal(op.x), y: vertical(op.y) };
    case 'flood_fill':
      return { ...op, x: horizontal(op.x), y: vertical(op.y) };
    case 'dither_fill':
      return { ...op, x: horizontal(op.x), y: vertical(op.y) };
    case 'ascii_blit':
      return { ...op, x: horizontal(op.x), y: vertical(op.y) };
    default:
      return op;
  }
}

function resolvePoint(
  coord: Coord | undefined,
  context: RefContext,
  masks: Map<number, PartMask | null>,
): [number, number] {
  if (coord === undefined) {
    throw new PxError(
      'E_INTERNAL',
      `Op ${context.site.opIndex} (${context.site.opName}) reached resolution with a missing coordinate`,
    );
  }
  if (typeof coord === 'number') {
    return [coord, coord];
  }
  return pointOf(coord, context, masks);
}

function pointOf(
  coord: CoordRef,
  context: RefContext,
  masks: Map<number, PartMask | null>,
): [number, number] {
  const target = parseRef(coord.ref, context.site);
  let base: [number, number];
  if (target.kind === 'anchor') {
    const anchor = context.anchors[target.name];
    if (anchor === undefined) {
      const declared = Object.keys(context.anchors).sort();
      throw new PxError(
        'E_BAD_PARAM',
        `Coordinate ref "${coord.ref}" in ${at(context.site)} names anchor "${target.name}", which is not declared`,
        declared.length === 0
          ? 'This recipe declares no anchors; add one with `px anchor --name ...`.'
          : `Declared anchors are ${declared.join(', ')}.`,
        site(context.site),
      );
    }
    base = [anchor[0], anchor[1]];
  } else {
    const index = context.partIndexes.get(target.part);
    if (index === undefined) {
      throw new PxError(
        'E_PART_UNKNOWN',
        `Coordinate ref "${coord.ref}" in ${at(context.site)} names part "${target.part}", which is not declared`,
        partHint(Object.keys(context.parts).sort()),
        site(context.site),
      );
    }
    if (!masks.has(index)) {
      masks.set(index, partMask(context.layers, index, context.width, context.height));
    }
    const mask = masks.get(index) ?? null;
    if (mask === null) {
      throw new PxError(
        'E_EMPTY_PART',
        `Coordinate ref "${coord.ref}" in ${at(context.site)} reads part "${target.part}", which owns no pixels before this op runs`,
        'Draw the part before addressing it by ref: a ref resolves against the mask as it stands when the op starts, never against pixels the op is drawing.',
        site(context.site),
      );
    }
    base = maskPoint(mask, target.where);
  }
  return [base[0] + (coord.dx ?? 0), base[1] + (coord.dy ?? 0)];
}
