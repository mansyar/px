/**
 * The part view every ownership-aware rule reads.
 *
 * A rule asked to name the part it blames needs three things the raw grid does
 * not carry: which owner index belongs to which declared name, which slot that
 * part's material uses for its base tone, and how many tones the material
 * exposes. Resolving them once here keeps the rules about pixels.
 */

import { UNOWNED } from '../core/canvas.js';
import { buildSlotRoles, type Rgba, type SlotRoles, TRANSPARENT_SLOT } from '../core/palette.js';
import { relativeLuminance } from './contrast.js';
import type { LintContext } from './types.js';

export interface PartView {
  /** Part index, as stored in the owners buffer. */
  owner: number;
  name: string;
  material: string;
  /** Index into `SlotTable.families`, or -1 when the material is not declared. */
  familyIndex: number;
  /** The material's base tone, when the family resolves one. */
  baseSlot: number | undefined;
  /** Slots (ramp tones or flat colours) the material exposes. */
  toneCount: number;
}

/** Every declared part, indexed by its owner. Empty without parts. */
export function partViews(context: LintContext): PartView[] {
  const parts = context.parts;
  if (parts === undefined || parts.length === 0) {
    return [];
  }
  const roles: SlotRoles = buildSlotRoles(context.slots);
  return parts.map((part, owner) => {
    const familyIndex = context.slots.familyNames.indexOf(part.material);
    const family = familyIndex === -1 ? undefined : context.slots.families[familyIndex];
    return {
      owner,
      name: part.name,
      material: part.material,
      familyIndex,
      baseSlot: familyIndex === -1 ? undefined : roles.roleSlots[familyIndex]?.base,
      toneCount: family === undefined ? 0 : family.slots.length,
    };
  });
}

/** The view for an owner index, or undefined when nothing declared owns it. */
export function viewAt(views: readonly PartView[], owner: number): PartView | undefined {
  return owner === UNOWNED ? undefined : views[owner];
}

/** True when the pixel belongs to a declared part. */
export function owns(views: readonly PartView[], owner: number): boolean {
  return viewAt(views, owner) !== undefined;
}

/** WCAG relative luminance of a slot, `0` for a slot the table does not have. */
export function slotLuminance(context: LintContext, slot: number): number {
  const rgba = context.slots.rgba[slot];
  return rgba === undefined ? 0 : relativeLuminance(rgba);
}

/** The transparency test the rules share. */
export function painted(slot: number): boolean {
  return slot !== TRANSPARENT_SLOT;
}

/** `#rrggbb`, so a message can quote the colour a caller passed. */
export function hexOf(rgba: Rgba): string {
  const channel = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`;
}
