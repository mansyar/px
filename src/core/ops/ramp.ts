/**
 * `ramp_fill`: band the target layer along the light axis.
 *
 * Each non-transparent pixel is projected onto the axis inside the layer's
 * bounding box. The bands are cut by the *occupied* projections, not by the
 * bounding-box extent: a region with a gap still has to show every band, so a
 * pixel's band comes from its rank among the distinct positions the layer
 * actually paints. The light-most band takes `highlight`, the dark-most
 * `shadow`, and every band between them `base`, resolved from the pixel's own
 * family. All of it is integer arithmetic on the rank and the band count, so the
 * same input produces the same bands with no per-pixel randomness and no
 * floating-point rounding.
 */

import type { SlotCanvas } from '../canvas.js';
import { PxError } from '../errors.js';
import { roleSlot, type SlotRoles, type SlotTable, TRANSPARENT_SLOT } from '../palette.js';
import type { LightDir, RampRole } from '../recipe/types.js';
import { noRampError, type PassSite } from './pass.js';

/** Distance from the dark corner along the light axis. */
function axisProjection(x: number, y: number, box: Box, lightDir: LightDir): number {
  switch (lightDir) {
    case 'top-left':
      return x - box.minX + (y - box.minY);
    case 'top-right':
      return box.maxX - x + (y - box.minY);
    case 'bottom-left':
      return x - box.minX + (box.maxY - y);
    case 'bottom-right':
      return box.maxX - x + (box.maxY - y);
  }
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PaintedCell {
  x: number;
  y: number;
  projection: number;
}

function boundingBox(source: Int16Array, width: number, height: number): Box | undefined {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (source[y * width + x] === TRANSPARENT_SLOT) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) {
    return undefined;
  }
  return { minX, minY, maxX, maxY };
}

/** Every painted pixel with its projection onto the light axis. */
function paintedCells(
  source: Int16Array,
  width: number,
  height: number,
  box: Box,
  lightDir: LightDir,
): PaintedCell[] {
  const cells: PaintedCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (source[y * width + x] === TRANSPARENT_SLOT) {
        continue;
      }
      cells.push({ x, y, projection: axisProjection(x, y, box, lightDir) });
    }
  }
  return cells;
}

/**
 * Which ramp role a bucket index maps to, for a band count.
 *
 * Three is the ceiling, not an arbitrary limit: a family carries exactly three
 * shading roles, so a fourth band could only repeat one of them. The parser
 * rejects a higher count with `E_BANDS_RANGE` instead of saturating silently.
 */
export function bandRole(bucket: number, bands: number): RampRole {
  if (bucket <= 0) {
    return 'highlight';
  }
  if (bucket >= bands - 1) {
    return 'shadow';
  }
  return 'base';
}

export function rampFill(
  canvas: SlotCanvas,
  source: Int16Array,
  roles: SlotRoles,
  slots: SlotTable,
  bands: number,
  lightDir: LightDir,
  site: PassSite,
): number {
  const { width, height } = canvas;
  const box = boundingBox(source, width, height);
  if (box === undefined) {
    return 0;
  }

  const cells = paintedCells(source, width, height, box, lightDir);
  const occupiedCount = new Set(cells.map((cell) => cell.projection)).size;
  if (bands > occupiedCount) {
    // A region with fewer occupied positions than bands can never fill every
    // band, so it would silently deliver fewer transitions than AC-12 promises.
    // With one position occupied no legal band count is displayable, so only
    // the "paint more positions" remedy is offered: `bands` below 2 is
    // `E_BANDS_RANGE`, which would make a band-count hint a second dead end.
    const hint =
      occupiedCount < 2
        ? 'ramp_fill needs at least two light-axis positions: paint one more position along the light direction.'
        : `Pass bands ${occupiedCount} or fewer, or paint more positions along the light direction.`;
    throw new PxError(
      'E_REGION_TOO_THIN',
      `Op ${site.opIndex} (ramp_fill) asked for ${bands} bands, but this region occupies only ${occupiedCount} light-axis position${occupiedCount === 1 ? '' : 's'} and supports at most ${occupiedCount}`,
      hint,
      { layer: site.layerId, op_index: site.opIndex },
    );
  }

  // Sorting by projection means `rank` only advances when the projection
  // changes, so it is exactly the index of that projection among the occupied
  // ones. `band = floor(rank * bands / occupiedCount)` never skips a band,
  // because the ratio is at most one and the rank spans every value up to
  // `occupiedCount - 1`: every band therefore contains at least one painted
  // pixel, so N bands always produce N-1 transitions — AC-12, unqualified.
  cells.sort((a, b) => a.projection - b.projection);
  let rank = -1;
  let previousProjection = Number.NaN;
  let painted = 0;

  for (const cell of cells) {
    if (cell.projection !== previousProjection) {
      previousProjection = cell.projection;
      rank += 1;
    }
    const bucket = Math.floor((rank * bands) / occupiedCount);
    const role = bandRole(bucket, bands);
    const here = source[cell.y * width + cell.x] ?? TRANSPARENT_SLOT;

    const familyIndex = roles.familyOfSlot[here];
    const family = familyIndex === undefined ? undefined : slots.families[familyIndex];
    if (family === undefined) {
      continue;
    }
    if (family.kind === 'flat') {
      throw noRampError('ramp_fill', family.name, role, site, [cell.x, cell.y]);
    }
    const target = roleSlot(roles, here, role);
    if (target === undefined) {
      throw noRampError('ramp_fill', family.name, role, site, [cell.x, cell.y]);
    }
    canvas.set(cell.x, cell.y, target);
    painted += 1;
  }

  return painted;
}
