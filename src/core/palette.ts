/**
 * Palette resolution and slot interning.
 *
 * A slot is the authored identity of a colour. The canvas stores slot indices,
 * never channels, so a palette swap rewrites colours without touching pixels.
 */

import { PxError } from './errors.js';
import {
  type Palette,
  type PaletteFamily,
  RAMP_ROLES,
  type Ramp,
  type RampRole,
  rampSuffixes,
  rampToneIndex,
} from './recipe/types.js';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const TRANSPARENT_SLOT = -1;
export const TRANSPARENT_RGBA: Rgba = { r: 0, g: 0, b: 0, a: 0 };

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
export const FAMILY_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
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
    return rampSuffixes(family.ramp).map((suffix) => `${name}.${suffix}`);
  }
  if (!('colors' in family)) {
    return [];
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
  if ('derive' in candidate) {
    return deriveFamily(name, candidate.derive);
  }
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
    const tones: number[] = [];
    for (const key of Object.keys(roles)) {
      if (RAMP_ROLES.includes(key as RampRole)) {
        continue;
      }
      const tone = rampToneIndex(key);
      if (tone === undefined) {
        throw new PxError(
          'E_BAD_PALETTE',
          `Palette family "${name}" declares unknown ramp key "${key}"`,
          `Ramp roles are ${RAMP_ROLES.join(', ')}; a synthesised ramp uses contiguous tones t0 … t(n-1).`,
        );
      }
      tones.push(tone);
    }
    tones.sort((left, right) => left - right);
    tones.forEach((tone, position) => {
      if (tone !== position) {
        throw new PxError(
          'E_BAD_PALETTE',
          `Palette family "${name}" has a gap in its tones: expected "t${position}", found "t${tone}"`,
          'Tones run t0 … t(n-1) lightest first, with no gaps.',
        );
      }
    });
    // A role may name a tone instead of a hex (`base: "t3"`). Tones are read
    // first so the reference has something to resolve against; an unknown tone
    // is an error naming both sides rather than a silent fallback.
    const toneHex = new Map<string, string>();
    for (const tone of tones) {
      toneHex.set(`t${tone}`, requireColor(roles[`t${tone}`], `tone "t${tone}"`, name).text);
    }
    if (Object.keys(roles).length === 0) {
      throw new PxError(
        'E_BAD_PALETTE',
        `Palette family "${name}" has an empty ramp`,
        `Declare at least one of ${RAMP_ROLES.join(', ')}, or a tone.`,
      );
    }
    const rampOut: Ramp = {};
    const slots: string[] = [];
    const rgba: Rgba[] = [];
    for (const role of RAMP_ROLES) {
      const value = roles[role];
      if (value === undefined) {
        continue;
      }
      const text = typeof value === 'string' && /^t\d+$/.test(value) ? toneHex.get(value) : value;
      if (text === undefined) {
        throw new PxError(
          'E_BAD_PALETTE',
          `Palette family "${name}" role "${role}" names tone "${String(value)}", which the family does not declare`,
          'A tone reference is "t0" … "t(n-1)" and must exist alongside the role.',
        );
      }
      const color = requireColor(text, `role "${role}"`, name);
      rampOut[role] = color.text;
      slots.push(`${name}.${role}`);
      rgba.push(color.rgba);
    }
    for (const tone of tones) {
      const color = requireColor(roles[`t${tone}`], `tone "t${tone}"`, name);
      rampOut[`t${tone}`] = color.text;
      slots.push(`${name}.t${tone}`);
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
  /** A flat family cannot express ramp roles, which `E_NO_RAMP` reports. */
  kind: 'ramp' | 'flat';
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
    families.push({
      name,
      letter,
      slots: normalized.slots,
      kind: isRampFamily(normalized.family) ? 'ramp' : 'flat',
    });
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

/**
 * A derived family: one base colour, N tones, with the hue carrying the form.
 *
 * The value step is even — tone `i` sits at `i / (N - 1)` of the way from the
 * lightest to the darkest stop — and the hue moves with it: highlights rotate
 * toward a warm anchor, shadows toward a cool one, so a ramp reads as lit rather
 * than as one colour at four brightnesses. The rotation is capped, so a palette
 * never turns a wood tone into a blue.
 *
 * Explicit ramps are untouched: `derive` is additive, and `normalizeFamily`
 * only takes this path when the key is present.
 */
export function deriveRamp(base: string, stops: number): Ramp {
  const rgba = parseHex(base);
  if (rgba === null) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Ramp base "${base}" is not a hex colour`,
      'Use #rrggbb or #rrggbbaa.',
    );
  }
  if (!Number.isInteger(stops) || stops < 2 || stops > 8) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Ramp stops is ${String(stops)}; a derived ramp has 2 to 8 stops`,
      'Two stops is a highlight and a shadow; eight is the most a 1x sprite can show.',
    );
  }
  const { h, s, l } = rgbToHsl(rgba);
  const lightest = Math.min(0.88, l + 0.28);
  const darkest = Math.max(0.06, l - 0.3);
  const warm = signedRotation(h, 45, 18);
  const cool = signedRotation(h, 220, 24);
  const ramp: Ramp = {};
  for (let index = 0; index < stops; index += 1) {
    const t = stops === 1 ? 0 : index / (stops - 1);
    const tone = hslToRgb(
      normalizeHue(h + warm + (cool - warm) * t),
      Math.min(1, s + 0.04 + 0.06 * t),
      lightest + (darkest - lightest) * t,
    );
    ramp[`t${index}`] = toHex(tone);
  }
  return ramp;
}

function deriveFamily(name: string, raw: unknown): NormalizedFamily {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" has a non-object derive block`,
      'Use {"derive": {"base": "#8a5a2b", "stops": 5}}.',
    );
  }
  const block = raw as { base?: unknown; stops?: unknown };
  if (typeof block.base !== 'string') {
    throw new PxError(
      'E_BAD_PALETTE',
      `Palette family "${name}" derive block has no base colour`,
      'Give derive a "base" hex colour.',
    );
  }
  const ramp = deriveRamp(block.base, block.stops === undefined ? 5 : Number(block.stops));
  const slots = Object.keys(ramp).map((tone) => `${name}.${tone}`);
  const scale = Object.values(ramp)
    .filter((value): value is string => value !== undefined)
    .map((value) => parseHex(value) as Rgba);
  return { family: { ramp }, slots, rgba: scale };
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Rotation toward a target hue, capped so a derivation stays in the family. */
function signedRotation(hue: number, target: number, cap: number): number {
  const delta = ((target - hue + 540) % 360) - 180;
  return Math.sign(delta) * Math.min(Math.abs(delta), cap);
}

function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;
  if (max === red) {
    h = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
  } else if (max === green) {
    h = ((blue - red) / delta + 2) / 6;
  } else {
    h = ((red - green) / delta + 4) / 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgba {
  const h = normalizeHue(hue) / 360;
  if (saturation === 0) {
    const grey = Math.round(lightness * 255);
    return { r: grey, g: grey, b: grey, a: 255 };
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (t: number): number => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return {
    r: Math.round(channel(h + 1 / 3) * 255),
    g: Math.round(channel(h) * 255),
    b: Math.round(channel(h - 1 / 3) * 255),
    a: 255,
  };
}

function toHex({ r, g, b }: Rgba): string {
  const pair = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${pair(r)}${pair(g)}${pair(b)}`;
}

/** Spell out the roles a family defines, for an unknown-slot hint. */
export function slotHint(slot: string, slots: SlotTable): string {
  const separator = slot.lastIndexOf('.');
  const familyName = separator === -1 ? slot : slot.slice(0, separator);
  const family = slots.families.find((entry) => entry.name === familyName);
  if (family !== undefined) {
    const roles = family.slots.map((name) => name.slice(familyName.length + 1));
    return `Family "${familyName}" defines ${roles.join(', ')}.`;
  }
  const known = slots.familyNames.join(', ');
  return known === ''
    ? 'The palette declares no families; add one before drawing.'
    : `Palette defines ${known}.`;
}

/**
 * Slot-index view of the palette. Post-passes resolve a family's ramp role from
 * the slot they are looking at, so the lookup has to be by index, not by name.
 */
export interface SlotRoles {
  /** Slot index to the index of its family in `SlotTable.families`. */
  familyOfSlot: number[];
  /** Family index to its role slots, by role. Empty for flat families. */
  roleSlots: Array<Partial<Record<RampRole, number>>>;
}

export function buildSlotRoles(slots: SlotTable): SlotRoles {
  const familyOfSlot = new Array<number>(slots.names.length).fill(0);
  const roleSlots: Array<Partial<Record<RampRole, number>>> = [];

  slots.families.forEach((family, familyIndex) => {
    const roles: Partial<Record<RampRole, number>> = {};
    const tones = new Map<number, number>();
    for (const slotName of family.slots) {
      const slotIndex = slots.resolve(slotName);
      if (slotIndex === undefined) {
        continue;
      }
      familyOfSlot[slotIndex] = familyIndex;
      if (family.kind !== 'ramp') {
        continue;
      }
      const suffix = slotName.slice(slotName.lastIndexOf('.') + 1);
      if (RAMP_ROLES.includes(suffix as RampRole)) {
        roles[suffix as RampRole] = slotIndex;
        continue;
      }
      const tone = rampToneIndex(suffix);
      if (tone !== undefined) {
        tones.set(tone, slotIndex);
      }
    }
    // A synthesised family is stored as tones lightest first; its roles are
    // derived from that order, so one colour per tone is all the recipe holds.
    // An explicit role key still wins over a derived one.
    if (tones.size > 0) {
      const derived: Array<[RampRole, number]> = [
        ['highlight', 0],
        ['base', Math.floor((tones.size - 1) / 2)],
        ['shadow', tones.size - 1],
      ];
      for (const [role, tone] of derived) {
        const slotIndex = tones.get(tone);
        if (slotIndex !== undefined && roles[role] === undefined) {
          roles[role] = slotIndex;
        }
      }
    }
    roleSlots.push(roles);
  });

  return { familyOfSlot, roleSlots };
}

/** The slot a family uses for a role, or undefined when it does not define it. */
export function roleSlot(roles: SlotRoles, slotIndex: number, role: RampRole): number | undefined {
  const familyIndex = roles.familyOfSlot[slotIndex];
  if (familyIndex === undefined) {
    return undefined;
  }
  return roles.roleSlots[familyIndex]?.[role];
}
