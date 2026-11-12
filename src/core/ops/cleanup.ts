/**
 * Cleanup passes: `seal`, `strays`, `deband`.
 *
 * Each pass reads a snapshot and writes into the active layer, so replaying a
 * recipe is deterministic and a pass never consumes its own output. None of them
 * iterates to a fixed point: one pass, bounded work, so render time follows the
 * canvas rather than the artwork.
 */

import { type Band, bandRow, findBands } from '../bands.js';
import { type SlotCanvas, UNOWNED } from '../canvas.js';
import { roleSlot, type SlotRoles, type SlotTable, TRANSPARENT_SLOT } from '../palette.js';

export type CleanupCoord = [number, number];

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function indexOf(width: number, x: number, y: number): number {
  return y * width + x;
}

/**
 * Fill enclosed transparent holes of at most 2x2 pixels with the tone that
 * already surrounds them. Transparent pixels reachable from the border are open
 * air; only the ones the flood fill cannot reach are holes.
 */
export function seal(
  canvas: SlotCanvas,
  source: Int16Array,
  width: number,
  height: number,
): CleanupCoord[] {
  const open = new Uint8Array(width * height);
  const queue: number[] = [];
  const reach = (x: number, y: number): void => {
    const index = indexOf(width, x, y);
    if (open[index] === 1 || source[index] !== TRANSPARENT_SLOT) {
      return;
    }
    open[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    reach(x, 0);
    reach(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    reach(0, y);
    reach(width - 1, y);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head] ?? 0;
    const x = index % width;
    const y = (index - x) / width;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
        reach(nx, ny);
      }
    }
  }

  const changed: CleanupCoord[] = [];
  for (let start = 0; start < width * height; start += 1) {
    if (open[start] === 1 || source[start] !== TRANSPARENT_SLOT) {
      continue;
    }
    const hole: number[] = [start];
    open[start] = 1;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    const tally = new Map<number, number>();
    for (let head = 0; head < hole.length; head += 1) {
      const index = hole[head] ?? 0;
      const x = index % width;
      const y = (index - x) / width;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const next = indexOf(width, nx, ny);
        const tone = source[next] ?? TRANSPARENT_SLOT;
        if (tone === TRANSPARENT_SLOT) {
          if (open[next] === 0) {
            open[next] = 1;
            hole.push(next);
          }
          continue;
        }
        tally.set(tone, (tally.get(tone) ?? 0) + 1);
      }
    }
    if (maxX - minX >= 2 || maxY - minY >= 2) {
      continue;
    }
    let fill: number | undefined;
    let best = 0;
    for (const [tone, count] of tally) {
      if (count > best || (count === best && fill !== undefined && tone < fill)) {
        fill = tone;
        best = count;
      }
    }
    if (fill === undefined) {
      continue;
    }
    for (const member of hole) {
      const x = member % width;
      const y = (member - x) / width;
      canvas.set(x, y, fill);
      changed.push([x, y]);
    }
  }
  return changed;
}

/** Erase 4-connected painted components smaller than the profile minimum. */
export function strays(
  canvas: SlotCanvas,
  source: Int16Array,
  width: number,
  height: number,
  minCluster: number,
): CleanupCoord[] {
  const seen = new Uint8Array(width * height);
  const changed: CleanupCoord[] = [];
  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] === 1 || source[start] === TRANSPARENT_SLOT) {
      continue;
    }
    const members: number[] = [start];
    seen[start] = 1;
    for (let head = 0; head < members.length; head += 1) {
      const index = members[head] ?? 0;
      const x = index % width;
      const y = (index - x) / width;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const next = indexOf(width, nx, ny);
        if (seen[next] === 1 || source[next] === TRANSPARENT_SLOT) {
          continue;
        }
        seen[next] = 1;
        members.push(next);
      }
    }
    if (members.length >= minCluster) {
      continue;
    }
    for (const member of members) {
      const x = member % width;
      const y = (member - x) / width;
      canvas.set(x, y, TRANSPARENT_SLOT, UNOWNED);
      changed.push([x, y]);
    }
  }
  return changed;
}

/** The next darker tone in a slot's own family, or undefined at the darkest end. */
export function darkerSlot(slots: SlotTable, roles: SlotRoles, slot: number): number | undefined {
  const familyIndex = roles.familyOfSlot[slot];
  const family = familyIndex === undefined ? undefined : slots.families[familyIndex];
  if (family === undefined || family.kind !== 'ramp') {
    return undefined;
  }
  const name = slots.names[slot] ?? '';
  const suffix = name.slice(name.lastIndexOf('.') + 1);
  const tone = /^t([0-9]+)$/.exec(suffix);
  if (tone !== null) {
    return slots.resolve(`${family.name}.t${Number(tone[1]) + 1}`);
  }
  if (suffix === 'highlight') {
    return roleSlot(roles, slot, 'base');
  }
  if (suffix === 'base') {
    return roleSlot(roles, slot, 'shadow');
  }
  return undefined;
}

/**
 * Step the middle run of every BANDING band one tone darker. The darkest tone of
 * a family has nowhere to go, so that band is left alone.
 */
export function deband(
  canvas: SlotCanvas,
  source: Int16Array,
  owners: Int16Array | null,
  partCount: number,
  width: number,
  height: number,
  slots: SlotTable,
  roles: SlotRoles,
): CleanupCoord[] {
  const changed: CleanupCoord[] = [];
  const bands: Band[] = findBands({ width, height, slots: source, owners, partCount });
  for (const band of bands) {
    const next = darkerSlot(slots, roles, band.tone);
    if (next === undefined) {
      continue;
    }
    for (const [x, row] of bandRow(band, true)) {
      if (x < 0 || x >= width || row < 0 || row >= height) {
        continue;
      }
      canvas.set(x, row, next);
      changed.push([x, row]);
    }
  }
  return changed;
}

/** One entry per cleanup pass that actually ran, with exact counts. */
export interface CleanupReport {
  op: 'seal' | 'strays' | 'deband';
  changed: number;
  coords: CleanupCoord[];
}
