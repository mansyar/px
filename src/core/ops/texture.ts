/**
 * `texture` — deterministic marks over a declared part's pixels.
 *
 * The profile decides the grain. A mark is `profile.minCluster` pixels on a
 * side, and the gap between marks is a multiple of that same number, so no legal
 * texture can produce a `CLUSTER_THIN` finding at the profile in force (FR-10).
 * Density 1-3 scales only the gap — 3x, 2x, 1x the mark size — never the mark,
 * so a denser pattern stays legal instead of becoming noise.
 *
 * A mark is painted only when every one of its pixels already belongs to the
 * target part. That is what keeps the rule true at a shape's boundary: clipping
 * a mark would leave a 1-2 px sliver, and a sliver is exactly what the cluster
 * floor forbids. Texture therefore stops at the edge of the part rather than
 * bleeding across it, which is the behaviour pixel art wants anyway.
 *
 * Every pattern keys off absolute canvas coordinates, so the same pattern over
 * the same mask renders the same bytes. `grain` and `mottle` use a fixed integer
 * hash of the cell, not a random source: the engine has no entropy and must not
 * gain one, and the hash is integer-only so it is identical on every platform.
 */

import type { SlotCanvas } from '../canvas.js';
import { TRANSPARENT_SLOT } from '../palette.js';
import type { TexturePattern } from '../recipe/types.js';

/** Mark size plus the gap it leaves; both derive from the profile minimum. */
export type TextureFitName = 'full' | 'region';

export interface TextureLattice {
  mark: number;
  gap: number;
  spacing: number;
}

/**
 * `density` 3 is the tightest legal spacing (a gap of one mark), 1 the loosest
 * (three marks). Mark size never moves with density, so the cluster floor holds
 * at every density and at every profile.
 */
export function textureLattice(minCluster: number, density: number): TextureLattice {
  const mark = Math.max(1, minCluster);
  const gap = mark * (4 - density);
  return { mark, gap, spacing: mark + gap };
}

export interface TextureMark {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lattice cells to cover a span, plus one so a mark starting past the edge is seen. */
function cells(limit: number, spacing: number): number {
  return Math.ceil(limit / spacing) + 1;
}

/** Deterministic integer hash of a cell, stable across platforms. */
function cellHash(column: number, row: number): number {
  let hash = Math.imul(column ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(row ^ 0x27d4eb2f, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 13), 0x85ebca6b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * The mark list for one pattern, in canvas coordinates and in a fixed order.
 *
 * - `stipple`: one mark per cell of the square lattice.
 * - `brick`: the same lattice with alternate rows offset by half a period, so
 *   the gaps read as mortar.
 * - `grain`: the lattice with two of every three cells kept by a fixed hash,
 *   which scatters the marks without ever moving one.
 * - `mottle`: one blob of twice the mark size per doubled cell, shifted by the
 *   hash inside the slack its block allows, so the blobs read as patches.
 * - `hatch`: one long dash per row, staggered by half a period per row, which
 *   reads as stitched hatching rather than as dots.
 */
export function textureMarks(
  pattern: TexturePattern,
  width: number,
  height: number,
  lattice: TextureLattice,
): TextureMark[] {
  const { mark, gap, spacing } = lattice;
  const half = Math.floor(spacing / 2);
  const marks: TextureMark[] = [];

  if (pattern === 'stipple') {
    for (let row = 0; row < cells(height, spacing); row += 1) {
      for (let column = 0; column < cells(width, spacing); column += 1) {
        marks.push({ x: column * spacing, y: row * spacing, w: mark, h: mark });
      }
    }
    return marks;
  }

  if (pattern === 'brick') {
    for (let row = 0; row < cells(height, spacing); row += 1) {
      const offset = row % 2 === 0 ? 0 : half;
      for (let column = -1; column < cells(width, spacing); column += 1) {
        marks.push({ x: column * spacing + offset, y: row * spacing, w: mark, h: mark });
      }
    }
    return marks;
  }

  if (pattern === 'grain') {
    for (let row = 0; row < cells(height, spacing); row += 1) {
      for (let column = 0; column < cells(width, spacing); column += 1) {
        if (cellHash(column, row) % 3 === 0) {
          continue;
        }
        marks.push({ x: column * spacing, y: row * spacing, w: mark, h: mark });
      }
    }
    return marks;
  }

  if (pattern === 'mottle') {
    const block = spacing * 2;
    for (let row = 0; row < cells(height, block); row += 1) {
      for (let column = 0; column < cells(width, block); column += 1) {
        const shift = cellHash(column, row) % (gap + 1);
        marks.push({
          x: column * block + shift,
          y: row * block + shift,
          w: mark * 2,
          h: mark * 2,
        });
      }
    }
    return marks;
  }

  const dash = spacing * 2 - gap;
  for (let row = 0; row < cells(height, spacing); row += 1) {
    const offset = row % 2 === 0 ? 0 : half;
    for (let column = -1; column < cells(width, spacing * 2); column += 1) {
      marks.push({ x: column * spacing * 2 + offset, y: row * spacing, w: dash, h: mark });
    }
  }
  return marks;
}

/** True when the mark is on the canvas and every pixel already belongs to the part. */
function fits(
  mark: TextureMark,
  width: number,
  height: number,
  owners: Int16Array,
  source: Int16Array,
  part: number,
): boolean {
  if (mark.x < 0 || mark.y < 0 || mark.x + mark.w > width || mark.y + mark.h > height) {
    return false;
  }
  for (let y = mark.y; y < mark.y + mark.h; y += 1) {
    for (let x = mark.x; x < mark.x + mark.w; x += 1) {
      const index = y * width + x;
      if (owners[index] !== part || source[index] === TRANSPARENT_SLOT) {
        return false;
      }
    }
  }
  return true;
}

export interface TextureOutcome {
  /** Marks painted whole. */
  marks: number;
  /** Pixels those marks cover. */
  painted: number;
  /** The lattice the profile and density produced, for the report and the sheet. */
  mark: number;
  gap: number;
}

/**
 * Paint every mark that fits wholly inside the part. The snapshot is what the
 * mask is read from, so the pass never consumes its own output and replaying it
 * is order-independent; the writes carry the part as their owner, so the part's
 * pixel count and bounds stay truthful.
 */
export function applyTexture(
  canvas: SlotCanvas,
  source: Int16Array,
  owners: Int16Array,
  part: number,
  slot: number,
  owner: number,
  pattern: TexturePattern,
  minCluster: number,
  density: number,
  fit: TextureFitName = 'full',
): TextureOutcome {
  const lattice = textureLattice(minCluster, density);
  const marks = textureMarks(pattern, canvas.width, canvas.height, lattice);
  let painted = 0;
  let drawn = 0;
  for (const mark of marks) {
    if (!fits(mark, canvas.width, canvas.height, owners, source, part)) {
      continue;
    }
    drawn += 1;
    for (let y = mark.y; y < mark.y + mark.h; y += 1) {
      for (let x = mark.x; x < mark.x + mark.w; x += 1) {
        canvas.set(x, y, slot, owner);
        painted += 1;
      }
    }
  }
  if (fit === 'region' && drawn === 0) {
    const anchor = regionMark(canvas.width, canvas.height, owners, source, part, lattice.mark);
    if (anchor !== undefined) {
      for (let y = anchor.y; y < anchor.y + anchor.h; y += 1) {
        for (let x = anchor.x; x < anchor.x + anchor.w; x += 1) {
          canvas.set(x, y, slot, owner);
          painted += 1;
        }
      }
      drawn = 1;
    }
  }
  return { marks: drawn, painted, mark: lattice.mark, gap: lattice.gap };
}

/**
 * The first whole mark anchored on a pixel the part already owns.
 *
 * Region fit exists for shapes smaller than one lattice period: the lattice can
 * legitimately put every mark on a boundary, and a part that asked for grain
 * should get one legal mark rather than none. The mark is never clipped — a
 * sliver would break the cluster floor that makes `texture` legal at all — so a
 * part thinner than one mark still gets nothing, which the compiler already
 * reports as a cleanup no-op.
 */
function regionMark(
  width: number,
  height: number,
  owners: Int16Array,
  source: Int16Array,
  part: number,
  mark: number,
): TextureMark | undefined {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (owners[index] !== part || source[index] === TRANSPARENT_SLOT) {
        continue;
      }
      const candidate: TextureMark = { x, y, w: mark, h: mark };
      if (fits(candidate, width, height, owners, source, part)) {
        return candidate;
      }
    }
  }
  return undefined;
}
