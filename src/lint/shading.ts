/**
 * Shading lint: `BANDING` and `PILLOW_SHADE`.
 *
 * Both read one region at a time. Banding is a repetition the eye reads as a
 * rule (equal-width parallel runs stacked three deep); pillow shading is a light
 * direction that never made a decision, so the shadow rings every edge. A recipe
 * with declared parts judges each part; a recipe with none judges the flattened
 * grid as one region, so plain artwork is still linted.
 */

import { type Band, findBands } from '../core/bands.js';
import { buildSlotRoles, type SlotRoles } from '../core/palette.js';
import type { RampRole } from '../core/recipe/types.js';
import { FindingCollector } from './collector.js';
import { MAX_COORDS_PER_FINDING } from './thresholds.js';
import type { LintContext, LintCoord, LintFinding, LintRule } from './types.js';
import { lintRegions, type PartView, subjectOf } from './view.js';

const BANDING = 'BANDING';
const PILLOW = 'PILLOW_SHADE';

/** Fewer boundary pixels than this and a part has no edge worth judging. */
const PILLOW_MIN_BOUNDARY = 8;

const SIDES = ['top', 'bottom', 'left', 'right'] as const;
type Side = (typeof SIDES)[number];

/** Tie-break order from the brief: shadow beats highlight beats base. */
const ROLE_PRIORITY: readonly RampRole[] = ['shadow', 'highlight', 'base'];

function slotName(context: LintContext, slot: number): string {
  return context.slots.names[slot] ?? `slot ${slot}`;
}

function bandCoords(band: Band): LintCoord[] {
  const coords: LintCoord[] = [];
  const limit = Math.min(band.to - band.from + 1, MAX_COORDS_PER_FINDING);
  for (let index = 0; index < limit; index += 1) {
    coords.push([band.from + index, band.start]);
  }
  return coords;
}

export const bandingRule: LintRule = {
  code: BANDING,
  severity: 'info',
  evaluate(context: LintContext): LintFinding[] {
    const { width, height } = context;
    const regions = lintRegions(context);
    const collector = new FindingCollector(BANDING, 'info');
    const bands = findBands({
      width,
      height,
      slots: context.flattened,
      owners: regions.owners,
      partCount: regions.views.length,
    });
    for (const band of bands) {
      const view = regions.views[band.owner];
      if (view === undefined) {
        continue;
      }
      const lines = band.end - band.start + 1;
      const span = band.to - band.from + 1;
      collector.add({
        message:
          `${subjectOf(view, regions.partScoped)} stacks ${lines} rows of ` +
          `${slotName(context, band.tone)} in equal runs of ${span} px ` +
          `(y ${band.start}-${band.end}): equal-width parallel runs read as banding`,
        coord: [band.from, band.start],
        coords: bandCoords(band),
        ...(regions.partScoped ? { part: view.name } : {}),
      });
    }
    return collector.finish();
  },
};

/** Role a tone plays, in its own family or, on the whole canvas, in any family. */
function roleOf(roles: SlotRoles, view: PartView, slot: number): RampRole | undefined {
  if (view.familyIndex !== -1) {
    const family = roles.roleSlots[view.familyIndex];
    if (family === undefined) {
      return undefined;
    }
    for (const role of ROLE_PRIORITY) {
      if (family[role] === slot) {
        return role;
      }
    }
    return undefined;
  }
  for (const family of roles.roleSlots) {
    for (const role of ROLE_PRIORITY) {
      if (family[role] === slot) {
        return role;
      }
    }
  }
  return undefined;
}

/** The sides a boundary pixel sits on: one or two, never more. */
function sidesOf(
  owners: Int16Array,
  width: number,
  height: number,
  owner: number,
  x: number,
  y: number,
): Side[] {
  const outside = (nx: number, ny: number): boolean => {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      return true;
    }
    return (owners[ny * width + nx] ?? -1) !== owner;
  };
  const sides: Side[] = [];
  if (outside(x, y - 1)) {
    sides.push('top');
  }
  if (outside(x, y + 1)) {
    sides.push('bottom');
  }
  if (outside(x - 1, y)) {
    sides.push('left');
  }
  if (outside(x + 1, y)) {
    sides.push('right');
  }
  return sides;
}

/** Dominant role per side, ties broken shadow > highlight > base. */
function shadowSides(counts: Map<Side, Map<RampRole, number>>): Side[] {
  const shadow: Side[] = [];
  for (const side of SIDES) {
    const byRole = counts.get(side);
    if (byRole === undefined || byRole.size === 0) {
      continue;
    }
    let best: RampRole | undefined;
    let bestCount = -1;
    for (const role of ROLE_PRIORITY) {
      const count = byRole.get(role) ?? 0;
      if (count > bestCount) {
        best = role;
        bestCount = count;
      }
    }
    if (best === 'shadow') {
      shadow.push(side);
    }
  }
  return shadow;
}

function listSides(sides: readonly Side[]): string {
  if (sides.length === 1) {
    return sides[0] ?? '';
  }
  return `${sides.slice(0, -1).join(', ')} and ${sides[sides.length - 1] ?? ''}`;
}

export const pillowShadeRule: LintRule = {
  code: PILLOW,
  severity: 'warning',
  evaluate(context: LintContext): LintFinding[] {
    const { width, height } = context;
    const regions = lintRegions(context);
    const collector = new FindingCollector(PILLOW, 'warning');
    const roles = buildSlotRoles(context.slots);
    for (const view of regions.views) {
      const counts = new Map<Side, Map<RampRole, number>>();
      let boundary = 0;
      let first: LintCoord | undefined;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (regions.owners[index] !== view.owner) {
            continue;
          }
          const sides = sidesOf(regions.owners, width, height, view.owner, x, y);
          if (sides.length === 0) {
            continue;
          }
          boundary += 1;
          first ??= [x, y];
          const role = roleOf(roles, view, context.flattened[index] ?? -1);
          if (role === undefined) {
            continue;
          }
          for (const side of sides) {
            const byRole = counts.get(side) ?? new Map<RampRole, number>();
            byRole.set(role, (byRole.get(role) ?? 0) + 1);
            counts.set(side, byRole);
          }
        }
      }
      if (boundary < PILLOW_MIN_BOUNDARY) {
        continue;
      }
      const shadow = shadowSides(counts);
      if (shadow.length < 3) {
        continue;
      }
      collector.add({
        message:
          `${subjectOf(view, regions.partScoped)} is pillow-shaded: shadow dominates the ` +
          `${listSides(shadow)} edges; pick a light direction so one side highlights ` +
          'and the opposite one shadows',
        ...(first === undefined ? {} : { coord: first }),
        ...(regions.partScoped ? { part: view.name } : {}),
      });
    }
    return collector.finish();
  },
};
