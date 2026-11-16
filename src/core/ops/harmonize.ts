/**
 * `harmonize`: re-apply the declared light, edge treatments and value targets
 * to pixels that already exist.
 *
 * It never creates, erases or reassigns a pixel. The painted-slot mask and the
 * owner buffer captured before the pass are the only addresses it may write;
 * every derived colour passes through that mask before it reaches the canvas.
 * A recipe with no design, or one whose declared intent resolves to the same
 * colours, returns zero and the compiler reports `W_HARMONIZE_NOOP`.
 */

import { SlotCanvas } from '../canvas.js';
import type { SlotRoles, SlotTable } from '../palette.js';
import { TRANSPARENT_SLOT } from '../palette.js';
import type { Design, OutlineWhere, Parts } from '../recipe/types.js';
import { applyIntentEdges } from './intent-edges.js';
import { applyLight } from './light.js';
import type { PassSite } from './pass.js';
import { type IntentValues, resolveValueSlot, valueForPixel } from './values.js';

export interface HarmonizeInput {
  canvas: SlotCanvas;
  source: Int16Array;
  owners: Int16Array;
  roles: SlotRoles;
  slots: SlotTable;
  parts: Parts;
  ownerNames: ReadonlyMap<number, string>;
  design: Design;
  site: PassSite;
  where: OutlineWhere;
}

/** Copy a snapshot into a scratch canvas without changing ownership. */
function scratch(width: number, height: number, slots: Int16Array, owners: Int16Array): SlotCanvas {
  const canvas = new SlotCanvas(width, height);
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index] === TRANSPARENT_SLOT) {
      continue;
    }
    canvas.set(index % width, Math.floor(index / width), slots[index] ?? TRANSPARENT_SLOT);
    canvas.owners[index] = owners[index] ?? -1;
  }
  return canvas;
}

/** Keep only writes that landed on an originally painted pixel. */
function masked(source: Int16Array, painted: Uint8Array, candidate: Int16Array): Int16Array {
  const out = Int16Array.from(source);
  for (let index = 0; index < out.length; index += 1) {
    if (painted[index] === 1 && candidate[index] !== TRANSPARENT_SLOT) {
      out[index] = candidate[index];
    }
  }
  return out;
}

/** Returns how many existing pixels changed colour; zero means a no-op. */
export function harmonize(input: HarmonizeInput): number {
  const { canvas, source, owners, roles, slots, design } = input;
  const { width, height } = canvas;
  const painted = new Uint8Array(width * height);
  for (let index = 0; index < source.length; index += 1) {
    painted[index] = source[index] === TRANSPARENT_SLOT ? 0 : 1;
  }
  const values: IntentValues = {
    values: design.values,
    ownerNames: input.ownerNames,
    owners,
  };

  // Light re-orients only the plane term. Cast and rim would add or erase pixels,
  // which harmonize forbids, so they are explicitly disabled here.
  const lit = scratch(width, height, source, owners);
  applyLight(
    lit,
    source,
    owners,
    roles,
    slots,
    input.parts,
    {
      angle: design.light,
      form: 'flat',
      ao: false,
      cast: null,
      castOffset: 1,
      rim: 'none',
    },
    input.site,
  );
  const afterLight = masked(source, painted, lit.slots);

  const edged = scratch(width, height, afterLight, owners);
  applyIntentEdges(edged, {
    source,
    owners,
    roles,
    parts: input.parts,
    ownerNames: input.ownerNames,
    design,
    where: input.where,
  });
  const afterEdges = masked(afterLight, painted, edged.slots);

  const final = Int16Array.from(afterEdges);
  for (let index = 0; index < final.length; index += 1) {
    if (painted[index] !== 1) {
      continue;
    }
    const value = valueForPixel(values, index);
    if (value === undefined) {
      continue;
    }
    const slot = resolveValueSlot(slots, roles, afterEdges[index] ?? TRANSPARENT_SLOT, value);
    if (slot !== undefined) {
      final[index] = slot;
    }
  }

  let changed = 0;
  for (let index = 0; index < final.length; index += 1) {
    if (painted[index] !== 1 || final[index] === source[index]) {
      continue;
    }
    canvas.set(index % width, Math.floor(index / width), final[index] ?? TRANSPARENT_SLOT);
    changed += 1;
  }
  return changed;
}
