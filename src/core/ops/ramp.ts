/**
 * `ramp_fill`: band the target layer along the light axis.
 *
 * Each non-transparent pixel is projected onto the axis inside the layer's
 * bounding box, normalised to `[0, 1)` and bucketed into `bands` slices. The
 * light-most slice takes `highlight`, the dark-most `shadow`, and every slice
 * between them `base`, resolved from the pixel's own family. All of it is
 * integer arithmetic on `t` and the axis length, so the same input produces the
 * same bands with no per-pixel randomness and no floating-point rounding.
 */

import type { SlotCanvas } from '../canvas.js';
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

  const axisLength = box.maxX - box.minX + (box.maxY - box.minY);
  const denominator = axisLength + 1;
  let painted = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const here = source[y * width + x] ?? TRANSPARENT_SLOT;
      if (here === TRANSPARENT_SLOT) {
        continue;
      }

      const t = axisProjection(x, y, box, lightDir);
      // `t` is below `denominator`, so the bucket is always below `bands`.
      const bucket = Math.floor((t * bands) / denominator);
      const role = bandRole(bucket, bands);

      const familyIndex = roles.familyOfSlot[here];
      const family = familyIndex === undefined ? undefined : slots.families[familyIndex];
      if (family === undefined) {
        continue;
      }
      if (family.kind === 'flat') {
        throw noRampError('ramp_fill', family.name, role, site, [x, y]);
      }
      const target = roleSlot(roles, here, role);
      if (target === undefined) {
        throw noRampError('ramp_fill', family.name, role, site, [x, y]);
      }
      canvas.set(x, y, target);
      painted += 1;
    }
  }

  return painted;
}
