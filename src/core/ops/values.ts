/**
 * Design target values (FR-7). A value is a position on the family's existing
 * tone ladder: 1 is darkest, 5 is lightest, 3 is the middle, and the in-between
 * values take the nearest tone with ties going darker. No colour is invented:
 * the result is always a slot the palette already declares.
 */

import { roleSlot, type SlotRoles, type SlotTable } from '../palette.js';

/** Ownership and declared values, built once per op from the entry snapshot. */
export interface IntentValues {
  values: Record<string, number>;
  ownerNames: ReadonlyMap<number, string>;
  owners: Int16Array;
}

/** The target value for a painted pixel, when its owner declares one. */
export function valueForPixel(intent: IntentValues, index: number): number | undefined {
  const name = intent.ownerNames.get(intent.owners[index] ?? -1);
  return name === undefined ? undefined : intent.values[name];
}

/**
 * Resolve a 1–5 value against the slot's family. Synthesised ramps carry
 * numbered tones lightest-first; hand-written ramps carry only shading roles,
 * so their highlight/base/shadow slots serve as a three-step ladder.
 */
export function resolveValueSlot(
  slots: SlotTable,
  roles: SlotRoles,
  here: number,
  value: number,
): number | undefined {
  const familyIndex = roles.familyOfSlot[here];
  const family = familyIndex === undefined ? undefined : slots.families[familyIndex];
  if (family === undefined || family.kind === 'flat') {
    return undefined;
  }

  const tones: Array<{ index: number; slot: number }> = [];
  for (const name of family.slots) {
    const suffix = name.slice(name.lastIndexOf('.') + 1);
    if (!suffix.startsWith('t')) {
      continue;
    }
    const index = Number(suffix.slice(1));
    const slot = slots.resolve(name);
    if (Number.isInteger(index) && slot !== undefined) {
      tones.push({ index, slot });
    }
  }
  const ladder =
    tones.length > 0
      ? tones.sort((a, b) => a.index - b.index).map((entry) => entry.slot)
      : (['highlight', 'base', 'shadow'] as const)
          .map((role) => roleSlot(roles, here, role))
          .filter((slot): slot is number => slot !== undefined);
  if (ladder.length === 0) {
    return undefined;
  }
  // (5 - value) runs 0..4 from lightest to darkest. Rounding .5 up moves to the
  // higher index, which is the darker tone, as the closed vocabulary requires.
  const position = Math.round(((5 - value) / 4) * (ladder.length - 1));
  return ladder[Math.min(ladder.length - 1, Math.max(0, position))];
}
