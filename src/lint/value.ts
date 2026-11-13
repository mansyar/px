/**
 * `VALUE_COLLISION`: two parts that meet but read as one value.
 *
 * The comparison is between *materials*, not pixels: a shaded shape and its flat
 * neighbour can look identical even when a highlight pixel here is far from a
 * shadow pixel there. So each declared part contributes its material's base
 * tone, and any 4-adjacent boundary between two parts whose base tones are
 * closer than one synthesis step is reported once per pair.
 */

import { FindingCollector } from './collector.js';
import { VALUE_COLLISION_MIN_DELTA } from './thresholds.js';
import type { LintContext, LintCoord, LintFinding, LintRule } from './types.js';
import { partViews, slotLuminance } from './view.js';

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

    const consider = (firstOwner: number, secondOwner: number, coord: LintCoord): void => {
      const first = views[firstOwner];
      const second = views[secondOwner];
      if (first === undefined || second === undefined || firstOwner === secondOwner) {
        return;
      }
      if (first.baseSlot === undefined || second.baseSlot === undefined) {
        return;
      }
      const key =
        firstOwner < secondOwner ? `${firstOwner}:${secondOwner}` : `${secondOwner}:${firstOwner}`;
      if (collisions.has(key)) {
        return;
      }
      const delta = Math.abs(
        slotLuminance(context, first.baseSlot) - slotLuminance(context, second.baseSlot),
      );
      if (delta >= VALUE_COLLISION_MIN_DELTA) {
        return;
      }
      const [low, high] = first.name < second.name ? [first, second] : [second, first];
      collisions.set(key, {
        coord,
        first: low.name,
        second: high.name,
        firstSlot: context.slots.names[low.baseSlot ?? -1] ?? low.material,
        secondSlot: context.slots.names[high.baseSlot ?? -1] ?? high.material,
        delta,
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
          `adjacent parts need at least ${VALUE_COLLISION_MIN_DELTA}`,
        coord: collision.coord,
        part: collision.first,
      });
    }

    return collector.finish();
  },
};
