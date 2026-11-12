/**
 * `auto_shade`: a one-pixel rim only, never an interior gradient.
 *
 * For `light_dir: "top-left"` a pixel with a transparent up or left neighbour is
 * light-facing and takes its family's `highlight`; a pixel with a transparent
 * down or right neighbour is dark-facing and takes `shadow`. Pixels on the
 * canvas edge have an implicit transparent neighbour outside it, so a rim that
 * runs along the edge still shades. Highlight is tested first, so a one-pixel
 * diagonal stroke resolves to one role rather than both.
 *
 * A ramp family that lacks the needed role is left untouched; that is a tuning
 * gap the linter reports, not a reason to fail the op. A flat family cannot
 * express a ramp at all, so it is `E_NO_RAMP` — the op would otherwise silently
 * change nothing on a palette that never had ramps.
 */

import type { SlotCanvas } from '../canvas.js';
import { roleSlot, type SlotRoles, type SlotTable, TRANSPARENT_SLOT } from '../palette.js';
import type { LightDir, RampRole } from '../recipe/types.js';
import { noRampError, type PassSite } from './pass.js';

type Offset = readonly [number, number];

/** Which neighbours face the light and which face away, per light direction. */
const ADJACENCY: Record<LightDir, { highlight: readonly Offset[]; shadow: readonly Offset[] }> = {
  'top-left': {
    highlight: [
      [0, -1],
      [-1, 0],
    ],
    shadow: [
      [0, 1],
      [1, 0],
    ],
  },
  'top-right': {
    highlight: [
      [0, -1],
      [1, 0],
    ],
    shadow: [
      [0, 1],
      [-1, 0],
    ],
  },
  'bottom-left': {
    highlight: [
      [0, 1],
      [-1, 0],
    ],
    shadow: [
      [0, -1],
      [1, 0],
    ],
  },
  'bottom-right': {
    highlight: [
      [0, 1],
      [1, 0],
    ],
    shadow: [
      [0, -1],
      [-1, 0],
    ],
  },
};

function facesGap(
  source: Int16Array,
  width: number,
  height: number,
  x: number,
  y: number,
  offsets: readonly Offset[],
): boolean {
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      return true;
    }
    if (source[ny * width + nx] === TRANSPARENT_SLOT) {
      return true;
    }
  }
  return false;
}

export function autoShade(
  canvas: SlotCanvas,
  source: Int16Array,
  roles: SlotRoles,
  slots: SlotTable,
  lightDir: LightDir,
  site: PassSite,
): number {
  const { width, height } = canvas;
  const adjacency = ADJACENCY[lightDir];
  let painted = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const here = source[index] ?? TRANSPARENT_SLOT;
      if (here === TRANSPARENT_SLOT) {
        continue;
      }

      let role: RampRole;
      if (facesGap(source, width, height, x, y, adjacency.highlight)) {
        role = 'highlight';
      } else if (facesGap(source, width, height, x, y, adjacency.shadow)) {
        role = 'shadow';
      } else {
        continue;
      }

      const familyIndex = roles.familyOfSlot[here];
      const family = familyIndex === undefined ? undefined : slots.families[familyIndex];
      if (family === undefined) {
        continue;
      }
      if (family.kind === 'flat') {
        throw noRampError('auto_shade', family.name, role, site, [x, y]);
      }
      const target = roleSlot(roles, here, role);
      if (target === undefined) {
        continue;
      }
      canvas.set(x, y, target);
      painted += 1;
    }
  }

  return painted;
}
