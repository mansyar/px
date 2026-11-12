/**
 * ASCII inspector (FR-19, AC-17).
 *
 * One character per pixel, role-coded: `o` outline, `s` shadow, `b` base,
 * `h` highlight, `w` highlight-on-white, `.` transparent. Flat palettes have no
 * roles, so their slots get sequential letters and the legend says so. When
 * more than one family contributes to a response every code carries that
 * family's 1-based ordinal (`b1`, `b2`) taken from the canonical family order,
 * so two families never share a code.
 *
 * The caller collects the slots once across every requested region, then renders
 * each region against that shared code table. That is what keeps a multi-region
 * response consistent and lets the legend cover exactly the codes in use.
 */

import { type Rgba, type SlotRoles, type SlotTable, TRANSPARENT_SLOT } from '../core/palette.js';
import { RAMP_ROLES, type RampRole } from '../core/recipe/types.js';
import { relativeLuminance } from '../palettes/luminance.js';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LegendEntry {
  family: string;
  role: string;
  hex: string;
  note?: string;
}

export interface Inspection {
  /** Code per slot index; `null` for slots no region shows. */
  codes: Array<string | null>;
  legend: Record<string, LegendEntry>;
}

export const ROLE_CODES: Record<RampRole, string> = {
  outline: 'o',
  shadow: 's',
  base: 'b',
  highlight: 'h',
};

/** Highlight-on-white threshold, measured on WCAG relative luminance. */
export const WHITE_LUMINANCE = 0.95;

/** Letters a flat slot can use; the role letters are reserved, and `.` is transparent. */
export const FLAT_LETTERS = 'acdefgijklmnpqrtuvxyz';

export function hexOf(rgba: Rgba): string {
  const pair = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${pair(rgba.r)}${pair(rgba.g)}${pair(rgba.b)}`;
}

function roleOf(slotName: string): string | undefined {
  const dot = slotName.lastIndexOf('.');
  return dot === -1 ? undefined : slotName.slice(dot + 1);
}

/**
 * Assign one code to every slot in `used`. Ramp slots map to their role letter;
 * a highlight whose relative luminance is at least `WHITE_LUMINANCE` maps to
 * `w`. Flat slots take the next sequential letter in their family.
 */
export function inspectCodes(slots: SlotTable, roles: SlotRoles, used: Set<number>): Inspection {
  const codes: Array<string | null> = new Array<string | null>(slots.names.length).fill(null);
  const legend: Record<string, LegendEntry> = {};
  const familiesUsed = new Set<number>();
  for (const slot of used) {
    const familyIndex = roles.familyOfSlot[slot];
    if (familyIndex !== undefined) {
      familiesUsed.add(familyIndex);
    }
  }
  const suffixed = familiesUsed.size > 1;

  const ordered = [...used].sort((left, right) => left - right);
  for (const slot of ordered) {
    const familyIndex = roles.familyOfSlot[slot] ?? 0;
    const family = slots.families[familyIndex];
    const hex = hexOf(slots.rgba[slot] ?? { r: 0, g: 0, b: 0, a: 255 });
    const suffix = suffixed ? String(familyIndex + 1) : '';
    const name = slots.names[slot] ?? '';
    let body: string;
    let role: string;
    let note: string | undefined;

    if (family?.kind === 'ramp') {
      const declared = roleOf(name);
      const rampRole = RAMP_ROLES.find((entry) => entry === declared);
      if (rampRole === undefined) {
        continue;
      }
      role = rampRole;
      body =
        rampRole === 'highlight' &&
        relativeLuminance(slots.rgba[slot] ?? { r: 0, g: 0, b: 0, a: 255 }) >= WHITE_LUMINANCE
          ? 'w'
          : ROLE_CODES[rampRole];
    } else if (family !== undefined) {
      const flatIndex = family.slots.indexOf(name);
      role = 'flat';
      body = FLAT_LETTERS[flatIndex % FLAT_LETTERS.length] ?? '?';
      note = 'flat palette: sequential letter code, no roles';
    } else {
      continue;
    }

    const code = `${body}${suffix}`;
    codes[slot] = code;
    legend[code] = { family: family?.name ?? '', role, hex };
    if (note !== undefined) {
      legend[code].note = note;
    }
  }
  return { codes, legend };
}

/** Every non-transparent slot index a region shows. */
export function usedSlots(flattened: Int16Array, width: number, region: Region): Set<number> {
  const used = new Set<number>();
  for (let y = region.y; y < region.y + region.h; y += 1) {
    for (let x = region.x; x < region.x + region.w; x += 1) {
      const slot = flattened[y * width + x];
      if (slot !== undefined && slot !== TRANSPARENT_SLOT) {
        used.add(slot);
      }
    }
  }
  return used;
}

/**
 * Render one region. Column headers are decimal indices, stacked most
 * significant digit first, and every cell is padded to the widest code so a
 * two-character code still lines up with a two-digit header.
 */
export function renderRegion(
  flattened: Int16Array,
  width: number,
  region: Region,
  codes: Array<string | null>,
): string {
  const cellWidth = Math.max(1, ...codes.map((code) => (code === null ? 1 : code.length)));
  const maxX = region.x + region.w - 1;
  const maxY = region.y + region.h - 1;
  const rowLabelWidth = Math.max(2, String(maxY).length);
  const columnLabelWidth = Math.max(2, String(maxX).length);
  const lines: string[] = [];

  for (let depth = 0; depth < columnLabelWidth; depth += 1) {
    let line = ' '.repeat(rowLabelWidth + 1);
    for (let column = 0; column < region.w; column += 1) {
      const label = String(region.x + column).padStart(columnLabelWidth, ' ');
      const char = label[depth] ?? ' ';
      const position = cellWidth - (columnLabelWidth - depth);
      const cell = ' '.repeat(cellWidth);
      line +=
        position >= 0 && position < cellWidth
          ? `${cell.slice(0, position)}${char}${cell.slice(position + 1)}`
          : cell;
    }
    lines.push(line);
  }

  for (let row = 0; row < region.h; row += 1) {
    const y = region.y + row;
    let line = `${String(y).padStart(rowLabelWidth, ' ')} `;
    for (let column = 0; column < region.w; column += 1) {
      const x = region.x + column;
      const slot = flattened[y * width + x];
      const code = slot === undefined || slot === TRANSPARENT_SLOT ? '.' : codes[slot];
      line += (code ?? '?').padStart(cellWidth, ' ');
    }
    lines.push(line);
  }

  return lines.join('\n');
}
