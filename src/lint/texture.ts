/**
 * Texture lint: `DITHER_NOISE` and `CLUSTER_THIN`.
 *
 * Both judge the grain of one part rather than its outline. Dither is a fade
 * tool; where the material has no tones to fade through, or the profile says the
 * canvas is too small for grain, the same pattern reads as noise. Thin clusters
 * are the other end of the scale: single pixels where the profile expects marks.
 */

import { UNOWNED } from '../core/canvas.js';
import { TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { lintNumbers } from './context.js';
import { DITHER_MIN_TILES, MAX_COORDS_PER_FINDING } from './thresholds.js';
import type { LintContext, LintCoord, LintFinding, LintRule } from './types.js';
import { partViews } from './view.js';

const DITHER = 'DITHER_NOISE';
const CLUSTER = 'CLUSTER_THIN';

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Checkerboard tiles inside one part: 2x2 blocks with two single-tone diagonals. */
export function countDitherTiles(context: LintContext, owners: Int16Array, owner: number): number {
  const { width, height, flattened } = context;
  let tiles = 0;
  for (let y = 0; y + 1 < height; y += 1) {
    for (let x = 0; x + 1 < width; x += 1) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      if (
        owners[a] !== owner ||
        owners[b] !== owner ||
        owners[c] !== owner ||
        owners[d] !== owner
      ) {
        continue;
      }
      const first = flattened[a] ?? TRANSPARENT_SLOT;
      const second = flattened[d] ?? TRANSPARENT_SLOT;
      const third = flattened[b] ?? TRANSPARENT_SLOT;
      const fourth = flattened[c] ?? TRANSPARENT_SLOT;
      if (first === second && third === fourth && first !== third) {
        tiles += 1;
      }
    }
  }
  return tiles;
}

export const ditherNoiseRule: LintRule = {
  code: DITHER,
  severity: 'info',
  evaluate(context: LintContext): LintFinding[] {
    const collector = new FindingCollector(DITHER, 'info');
    const owners = context.owners;
    const views = partViews(context);
    if (owners === undefined || views.length === 0) {
      return collector.finish();
    }
    const numbers = lintNumbers(context);
    for (const view of views) {
      const tiles = countDitherTiles(context, owners, view.owner);
      if (tiles < DITHER_MIN_TILES) {
        continue;
      }
      const allowed = numbers.ditherAllowed && view.toneCount >= numbers.ditherMinTones;
      if (allowed) {
        continue;
      }
      const why = numbers.ditherAllowed
        ? `a fade needs ${numbers.ditherMinTones}`
        : 'this profile does not sanction dithering at all';
      collector.add({
        message:
          `Part "${view.name}" dithers with ${tiles} checkerboard tiles over ` +
          `${view.toneCount} tones: ${why}. Dither is a fade, not a texture`,
        part: view.name,
      });
    }
    return collector.finish();
  },
};

/** Sum of clusters below the profile minimum, with one coordinate each. */
function thinClusters(
  context: LintContext,
  owners: Int16Array,
  owner: number,
  minCluster: number,
  visited: Uint8Array,
): { count: number; coords: LintCoord[] } {
  const { width, height, flattened } = context;
  const coords: LintCoord[] = [];
  let count = 0;
  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] === 1 || owners[start] !== owner) {
      continue;
    }
    const tone = flattened[start];
    if (tone === undefined || tone === TRANSPARENT_SLOT) {
      continue;
    }
    const members: number[] = [start];
    visited[start] = 1;
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
        const next = ny * width + nx;
        if (visited[next] === 1 || owners[next] !== owner || flattened[next] !== tone) {
          continue;
        }
        visited[next] = 1;
        members.push(next);
      }
    }
    if (members.length >= minCluster) {
      continue;
    }
    count += 1;
    for (const member of members) {
      if (coords.length >= MAX_COORDS_PER_FINDING) {
        break;
      }
      const mx = member % width;
      coords.push([mx, (member - mx) / width]);
    }
  }
  return { count, coords };
}

export const clusterThinRule: LintRule = {
  code: CLUSTER,
  severity: 'info',
  evaluate(context: LintContext): LintFinding[] {
    const collector = new FindingCollector(CLUSTER, 'info');
    const owners = context.owners ?? null;
    const views = partViews(context);
    if (owners === null || views.length === 0) {
      return collector.finish();
    }
    const minCluster = lintNumbers(context).minCluster;
    const visited = new Uint8Array(context.width * context.height);
    for (const view of views) {
      if (view.owner === UNOWNED) {
        continue;
      }
      const thin = thinClusters(context, owners, view.owner, minCluster, visited);
      if (thin.count === 0) {
        continue;
      }
      const capped = thin.count > thin.coords.length;
      collector.add({
        message:
          `Part "${view.name}" has ${thin.count} cluster(s) smaller than ${minCluster} px: ` +
          `at this scale pixels under ${minCluster} px read as specks, not marks` +
          (capped ? `; the first ${MAX_COORDS_PER_FINDING} coordinates are quoted` : ''),
        ...(thin.coords.length > 0 ? { coord: thin.coords[0], coords: thin.coords } : {}),
        part: view.name,
      });
    }
    return collector.finish();
  },
};
