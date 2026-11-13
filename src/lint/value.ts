/**
 * `VALUE_COLLISION`: two parts that meet but read as one value.
 *
 * The comparison is between *materials*, not pixels: a shaded shape and its flat
 * neighbour can look identical even when a highlight pixel here is far from a
 * shadow pixel there. So each declared part contributes its material's base
 * tone, and any 4-adjacent boundary between two parts whose base tones are
 * closer than one synthesis step is reported once per pair.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { VALUE_COLLISION_MIN_DELTA } from './thresholds.js';
import type { LintContext, LintCoord, LintFinding, LintRule } from './types.js';
import { type PartView, partViews, slotLuminance } from './view.js';

const CODE = 'VALUE_COLLISION';
const SEVERITY = 'warning';

interface Collision {
  coord: LintCoord;
  /** Alphabetically first name, which is the finding's `part`. */
  first: string;
  second: string;
  firstSlot: string;
  secondSlot: string;
  delta: number;
  /** True when either side's tone came from the plane it paints. */
  plane: boolean;
}

/**
 * The tone each part actually paints, for parts that declare a plane.
 *
 * `facing` picks a plane, but the light direction lives on the op that shaded
 * it, not in the lint context, so the rule cannot re-derive the role a part was
 * given. What it can read is the render: a part's dominant slot is the plane
 * tone it ended up wearing, which is exactly what an eye compares across a
 * seam. Parts with no facing keep their material base tone, so a 1.0-style
 * recipe and every existing finding are unchanged.
 */
function planeToneSlots(
  views: readonly PartView[],
  owners: Int16Array,
  context: LintContext,
): Array<number | undefined> {
  const counts = new Map<number, number>();
  for (let index = 0; index < owners.length; index += 1) {
    const owner = owners[index] ?? -1;
    if (owner < 0 || views[owner]?.facing === undefined) {
      continue;
    }
    const slot = context.flattened[index] ?? TRANSPARENT_SLOT;
    if (slot === TRANSPARENT_SLOT) {
      continue;
    }
    const key = owner * 1e6 + slot;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const best: Array<{ slot: number; count: number } | undefined> = views.map(() => undefined);
  for (const [key, count] of counts) {
    const owner = Math.floor(key / 1e6);
    const slot = key % 1e6;
    const current = best[owner];
    if (
      current === undefined ||
      count > current.count ||
      (count === current.count && slot < current.slot)
    ) {
      best[owner] = { slot, count };
    }
  }
  return best.map((entry) => entry?.slot);
}

export const valueCollisionRule: LintRule = {
  code: CODE,
  severity: SEVERITY,
  evaluate(context: LintContext): LintFinding[] {
    const collector = new FindingCollector(CODE, SEVERITY);
    const owners = context.owners;
    const views = partViews(context);
    if (owners === undefined || views.length === 0) {
      return collector.finish();
    }

    const collisions = new Map<string, Collision>();
    const { width, height } = context;
    const planeTones = planeToneSlots(views, owners, context);

    const consider = (firstOwner: number, secondOwner: number, coord: LintCoord): void => {
      const first = views[firstOwner];
      const second = views[secondOwner];
      if (first === undefined || second === undefined || firstOwner === secondOwner) {
        return;
      }
      const firstTone = planeTones[firstOwner] ?? first.baseSlot;
      const secondTone = planeTones[secondOwner] ?? second.baseSlot;
      if (firstTone === undefined || secondTone === undefined) {
        return;
      }
      const key =
        firstOwner < secondOwner ? `${firstOwner}:${secondOwner}` : `${secondOwner}:${firstOwner}`;
      if (collisions.has(key)) {
        return;
      }
      const delta = Math.abs(
        slotLuminance(context, firstTone) - slotLuminance(context, secondTone),
      );
      if (delta >= VALUE_COLLISION_MIN_DELTA) {
        return;
      }
      const [low, high] = first.name < second.name ? [first, second] : [second, first];
      const lowTone = low === first ? firstTone : secondTone;
      const highTone = high === first ? firstTone : secondTone;
      collisions.set(key, {
        coord,
        first: low.name,
        second: high.name,
        firstSlot: context.slots.names[lowTone] ?? low.material,
        secondSlot: context.slots.names[highTone] ?? high.material,
        delta,
        plane: low.facing !== undefined || high.facing !== undefined,
      });
    };

    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        const owner = owners[row + x] ?? -1;
        if (owner < 0) {
          continue;
        }
        if (x + 1 < width) {
          consider(owner, owners[row + x + 1] ?? -1, [x, y]);
        }
        if (y + 1 < height) {
          consider(owner, owners[row + width + x] ?? -1, [x, y]);
        }
      }
    }

    for (const collision of collisions.values()) {
      collector.add({
        message:
          `Parts "${collision.first}" (${collision.firstSlot}) and "${collision.second}" ` +
          `(${collision.secondSlot}) sit ${collision.delta.toFixed(3)} apart in luminance; ` +
          `adjacent parts need at least ${VALUE_COLLISION_MIN_DELTA}` +
          `${collision.plane ? ' (plane-resolved)' : ''}`,
        coord: collision.coord,
        part: collision.first,
      });
    }

    return collector.finish();
  },
};
