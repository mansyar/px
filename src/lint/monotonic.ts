/**
 * `RAMP_NONMONOTONIC`: a palette family whose tones do not darken in order.
 *
 * The rule reads the palette, not the canvas, so it has nothing to attribute to
 * a part and carries no coordinate. A family is in declared order: `t0` upward
 * for tone families, highlight to shadow for the classic roles. Two adjacent
 * tones that fail to get darker are the pair the message names.
 */

import type { FamilySlots, SlotTable } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { relativeLuminance } from './contrast.js';
import type { LintContext, LintFinding, LintRule } from './types.js';
import { hexOf } from './view.js';

const RAMP = 'RAMP_NONMONOTONIC';

/** Lightest to darkest, the order a classic role family is expected to follow. */
const ROLE_ORDER = ['highlight', 'base', 'shadow'] as const;

const TONE_SUFFIX = /\.t([0-9]+)$/;

interface Tone {
  slot: number;
  name: string;
}

/** The family's tones in declared order, or null when it exposes fewer than 3. */
export function familyTones(slots: SlotTable, family: FamilySlots): Tone[] | null {
  const tones: Array<{ index: number; tone: Tone }> = [];
  for (const name of family.slots) {
    const match = TONE_SUFFIX.exec(name);
    if (match === null) {
      continue;
    }
    const slot = slots.resolve(name);
    if (slot !== undefined) {
      tones.push({ index: Number(match[1]), tone: { slot, name } });
    }
  }
  if (tones.length >= 3) {
    return tones.sort((a, b) => a.index - b.index).map((entry) => entry.tone);
  }
  const roles: Tone[] = [];
  for (const role of ROLE_ORDER) {
    const name = family.slots.find((candidate) => candidate.endsWith(`.${role}`));
    const slot = name === undefined ? undefined : slots.resolve(name);
    if (name !== undefined && slot !== undefined) {
      roles.push({ slot, name });
    }
  }
  return roles.length >= 3 ? roles : null;
}

export const rampNonmonotonicRule: LintRule = {
  code: RAMP,
  severity: 'warning',
  evaluate(context: LintContext): LintFinding[] {
    const collector = new FindingCollector(RAMP, 'warning');
    for (const family of context.slots.families) {
      const tones = familyTones(context.slots, family);
      if (tones === null) {
        continue;
      }
      for (let index = 0; index + 1 < tones.length; index += 1) {
        const lighter = tones[index];
        const darker = tones[index + 1];
        if (lighter === undefined || darker === undefined) {
          continue;
        }
        const light = context.slots.rgba[lighter.slot];
        const dark = context.slots.rgba[darker.slot];
        if (light === undefined || dark === undefined) {
          continue;
        }
        if (relativeLuminance(light) > relativeLuminance(dark)) {
          continue;
        }
        collector.add({
          message:
            `Palette family "${family.name}" is non-monotonic: ${lighter.name} (${hexOf(light)}) ` +
            `is not lighter than ${darker.name} (${hexOf(dark)}); a ramp must darken from ` +
            'highlight to shadow',
        });
        break;
      }
    }
    return collector.finish();
  },
};
