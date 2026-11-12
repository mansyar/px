/**
 * Palette resolution and slot interning.
 *
 * A slot is the authored identity of a colour. The canvas stores slot indices,
 * never channels, so a palette swap rewrites colours without touching pixels.
 */

import { PxError } from './errors.js';
import { type Palette, type PaletteFamily, RAMP_ROLES, type RampRole } from './recipe/types.js';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const TRANSPARENT_SLOT = -1;
export const TRANSPARENT_RGBA: Rgba = { r: 0, g: 0, b: 0, a: 0 };

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FAMILY_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Parse `#rrggbb` or `#rrggbbaa`. Returns null when the shape is wrong. */
export function parseHex(value: string): Rgba | null {
  if (!HEX_PATTERN.test(value)) {
    return null;
  }
  const hex = value.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
  };
}

export function hasBinaryAlpha(rgba: Rgba): boolean {
  return rgba.a === 0 || rgba.a === 255;
}

export function isRampFamily(family: PaletteFamily): family is {
  ramp: Partial<Record<RampRole, string>>;
} {
  return 'ramp' in family;
}

export function slotNamesForFamily(name: string, family: PaletteFamily): string[] {
  if (isRampFamily(family)) {
    return RAMP_ROLES.filter((role) => family.ramp[role] !== undefined).map(
      (role) => `${name}.${role}`,
    );
  }
  return family.colors.map((_color, index) => `${name}.${index}`);
}

function requireColor(value: unknown, what: string, family: string): { text: string; rgba: Rgba } {
  if (typeof value !== 'string') {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette ${what} in family "${family}" is not a colour string`,
      'Write the colour as a hex string, e.g. "#5d275d".',
    );
  }
  const rgba = parseHex(value);
  if (rgba === null) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette ${what} in family "${family}" is not a hex colour: "${value}"`,
      'Use #rrggbb or #rrggbbaa.',
    );
  }
  if (!hasBinaryAlpha(rgba)) {
    throw new PxError(
      'E_BAD_ALPHA',
      `Palette ${what} in family "${family}" has alpha ${rgba.a}, which is not binary`,
      'Alpha is either 00 or ff. Dither for partial coverage.',
    );
  }
  return { text: value, rgba };
}

export interface NormalizedFamily {
  family: PaletteFamily;
  slots: string[];
  rgba: Rgba[];
}

/** Validate one palette family and resolve its slots in canonical order. */
export function normalizeFamily(name: string, raw: unknown): NormalizedFamily {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" is not an object`,
      'Use {"ramp": {"base": "#5d275d"}} or {"colors": ["#5d275d"]}.',
    );
  }

  const candidate = raw as Record<string, unknown>;
  const hasRamp = 'ramp' in candidate;
  const hasColors = 'colors' in candidate;

  if (hasRamp && hasColors) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" declares both a ramp and a colour list`,
      'A family is either a ramp or a flat list, not both.',
    );
  }

  if (hasRamp) {
    const ramp = candidate.ramp;
    if (typeof ramp !== 'object' || ramp === null || Array.isArray(ramp)) {
      throw new PxError(
        'E_BAD_PALETTE',
        `Palette family "${name}" has a non-object ramp`,
        'A ramp is an object mapping role names to hex colours.',
      );
    }
    const roles = ramp as Record<string, unknown>;
    for (const role of Object.keys(roles)) {
      if (!RAMP_ROLES.includes(role as RampRole)) {
        throw new PxError(
          'E_BAD_PALETTE',
          `Palette family "${name}" declares unknown ramp role "${role}"`,
          `Ramp roles are ${RAMP_ROLES.join(', ')}.`,
        );
      }
    }
    if (Object.keys(roles).length === 0) {
      throw new PxError(
        'E_BAD_PALETTE',
        `Palette family "${name}" has an empty ramp`,
        `Declare at least one of ${RAMP_ROLES.join(', ')}.`,
      );
    }
    const rampOut: Partial<Record<RampRole, string>> = {};
    const slots: string[] = [];
    const rgba: Rgba[] = [];
    for (const role of RAMP_ROLES) {
      const value = roles[role];
      if (value === undefined) {
        continue;
      }
      const color = requireColor(value, `role "${role}"`, name);
      rampOut[role] = color.text;
      slots.push(`${name}.${role}`);
      rgba.push(color.rgba);
    }
    return { family: { ramp: rampOut }, slots, rgba };
  }

  if (!hasColors) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" is neither a ramp nor a flat list`,
      'Use {"ramp": {...}} or {"colors": [...]}.',
    );
  }

  const colors = candidate.colors;
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" has no colours`,
      'A flat family is {"colors": ["#rrggbb", ...]} with at least one entry.',
    );
  }
  const flat: string[] = [];
  const rgba: Rgba[] = [];
  colors.forEach((value, index) => {
    const color = requireColor(value, `colour ${index}`, name);
    flat.push(color.text);
    rgba.push(color.rgba);
  });
  return { family: { colors: flat }, slots: flat.map((_color, index) => `${name}.${index}`), rgba };
}

export interface FamilySlots {
  name: string;
  letter: string;
  slots: string[];
}

export interface SlotTable {
  names: string[];
  rgba: Rgba[];
  familyNames: string[];
  families: FamilySlots[];
  resolve(name: string): number | undefined;
}

export function buildSlotTable(palette: Palette): SlotTable {
  const familyNames = Object.keys(palette).sort();
  const names: string[] = [];
  const rgba: Rgba[] = [];
  const families: FamilySlots[] = [];
  const byName = new Map<string, number>();

  familyNames.forEach((name, familyIndex) => {
    if (!FAMILY_NAME_PATTERN.test(name)) {
      throw new PxError(
        'E_BAD_PALETTE',
        `Palette family name "${name}" is not a valid identifier`,
        'Family names are lowercase letters, digits, and underscores, starting with a letter.',
      );
    }
    const normalized = normalizeFamily(name, palette[name]);
    const letter = LETTERS[familyIndex] ?? '?';
    normalized.slots.forEach((slot, index) => {
      byName.set(slot, names.length);
      names.push(slot);
      rgba.push(normalized.rgba[index]);
    });
    families.push({ name, letter, slots: normalized.slots });
  });

  return {
    names,
    rgba,
    familyNames,
    families,
    resolve(slot: string) {
      return byName.get(slot);
    },
  };
}
