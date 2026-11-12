/**
 * Material-level palette swaps (FR-18).
 *
 * A swap is applied when slot colours are resolved, so it reaches every output
 * that reads the palette — render, debug sheet, preview and the export palette
 * manifest — and leaves the recipe file alone. Resolution is by role, not by
 * slot index: a part whose material is swapped resolves highlight/base/shadow
 * in the target family, and a direct `steel.base` reference goes through the
 * same map, so untagged painting swaps too.
 */

import { PxError } from '../core/errors.js';
import { buildSlotTable, type SlotTable } from '../core/palette.js';
import { type Palette, RAMP_ROLES, type RampRole, rampToneIndex } from '../core/recipe/types.js';

function badEntry(entry: string): PxError {
  return new PxError(
    'E_BAD_PARAM',
    `Swap "${entry}" is not "from=to"`,
    'Write --swap from=to with two declared family names, e.g. --swap steel=gold.',
  );
}

function unknownFamily(name: string): PxError {
  return new PxError(
    'E_FAMILY_UNKNOWN',
    `Swap names family "${name}", which the recipe palette does not declare`,
    'Name a family declared in the recipe palette.',
  );
}

/** `from=to` entries into a single edge map; repeated pairs keep the last target. */
function edgesOf(entries: readonly string[]): Map<string, string> {
  const edges = new Map<string, string>();
  for (const raw of entries) {
    const entry = raw.trim();
    const equals = entry.indexOf('=');
    if (equals <= 0 || equals === entry.length - 1) {
      throw badEntry(entry);
    }
    const from = entry.slice(0, equals).trim();
    const to = entry.slice(equals + 1).trim();
    if (from.length === 0 || to.length === 0) {
      throw badEntry(entry);
    }
    if (from !== to) {
      edges.set(from, to);
    }
  }
  return edges;
}

function incompatibleRole(from: string, to: string, role: RampRole): PxError {
  return new PxError(
    'E_SWAP_INCOMPATIBLE',
    `Cannot swap family "${from}" onto "${to}": "${to}" has no "${role}" role`,
    `"${from}" provides "${role}"; swap onto a family that declares it, or paint with roles both share.`,
  );
}

function incompatibleColors(from: string, to: string, need: number, have: number): PxError {
  return new PxError(
    'E_SWAP_INCOMPATIBLE',
    `Cannot swap family "${from}" onto "${to}": "${from}" uses ${need} colours but "${to}" has ${have}`,
    'Swap onto a flat family with at least as many colours as the source.',
  );
}

function incompatibleTones(from: string, to: string, need: number, have: number): PxError {
  return new PxError(
    'E_SWAP_INCOMPATIBLE',
    `Cannot swap family "${from}" onto "${to}": "${from}" uses ${need} tones but "${to}" has ${have}`,
    'Swap onto a family with at least as many tones as the source.',
  );
}

function suffixesOf(table: SlotTable, index: number): string[] {
  const family = table.families[index];
  if (family === undefined) {
    return [];
  }
  const prefix = `${family.name}.`;
  return family.slots.map((slot) => slot.slice(prefix.length));
}

/**
 * A swap replaces the source family's colours with the target's, so every slot
 * the source exposes has to exist in the target — otherwise a recipe that
 * renders today would fail on an unknown slot. Role and index failures are
 * reported in those terms, not as a bare count.
 */
function ensureCompatible(
  table: SlotTable,
  fromIndex: number,
  from: string,
  toIndex: number,
  to: string,
): void {
  const targetSuffixes = new Set(suffixesOf(table, toIndex));
  const sourceSuffixes = suffixesOf(table, fromIndex);
  const source = table.families[fromIndex];
  const target = table.families[toIndex];
  for (const suffix of sourceSuffixes) {
    if (targetSuffixes.has(suffix)) {
      continue;
    }
    const role = RAMP_ROLES.find((candidate) => candidate === suffix);
    if (role !== undefined) {
      throw incompatibleRole(from, to, role);
    }
    if (rampToneIndex(suffix) !== undefined) {
      throw incompatibleTones(
        from,
        to,
        sourceSuffixes.length,
        target?.kind === 'ramp' ? targetSuffixes.size : 0,
      );
    }
    throw incompatibleColors(
      from,
      to,
      source?.kind === 'flat' ? source.slots.length : 0,
      target?.kind === 'flat' ? target.slots.length : 0,
    );
  }
}

/**
 * Resolve `from=to` entries into the final family map. Chains collapse to one
 * hop (`--swap a=b --swap b=c` makes `a` become `c`), and a cycle is rejected
 * rather than resolved to an arbitrary member.
 */
export function resolveSwapMap(palette: Palette, entries: readonly string[]): Map<string, string> {
  const edges = edgesOf(entries);
  if (edges.size === 0) {
    return new Map();
  }
  const table = buildSlotTable(palette);
  const indexes = new Map(table.familyNames.map((name, index) => [name, index]));

  const resolved = new Map<string, string>();
  for (const from of [...edges.keys()].sort()) {
    const start = indexes.get(from);
    if (start === undefined) {
      throw unknownFamily(from);
    }
    let to = edges.get(from) ?? from;
    const trail = new Set<string>([from]);
    while (edges.has(to)) {
      if (trail.has(to)) {
        throw new PxError(
          'E_BAD_PARAM',
          `Swap chain ${[...trail, to].join(' -> ')} is a cycle`,
          'Swaps resolve as one map; end the chain at a family that is not itself swapped.',
        );
      }
      trail.add(to);
      to = edges.get(to) ?? to;
    }
    const target = indexes.get(to);
    if (target === undefined) {
      throw unknownFamily(to);
    }
    ensureCompatible(table, start, from, target, to);
    resolved.set(from, to);
  }
  return resolved;
}

/**
 * The palette a render sees: the source key keeps its place and its role
 * structure, and receives the target family's colours verbatim.
 */
export function applySwaps(palette: Palette, entries: readonly string[]): Palette {
  const swap = resolveSwapMap(palette, entries);
  if (swap.size === 0) {
    return palette;
  }
  const next: Palette = { ...palette };
  for (const [from, to] of swap) {
    const target = palette[to];
    if (target !== undefined) {
      next[from] = target;
    }
  }
  return next;
}
