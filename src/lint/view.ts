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
import type { Facing } from '../core/recipe/types.js';
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
  /** The plane the part declared; absent when it is viewer-facing. */
  facing: Facing | undefined;
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
      facing: part.facing,
      toneCount: family === undefined ? 0 : family.slots.length,
    };
  });
}

/** The owner index the whole canvas stands in as when no parts are declared. */
export const WHOLE_CANVAS_OWNER = 0;

/**
 * The regions a rule judges.
 *
 * A recipe with declared parts hands the rule one region per part, exactly as
 * the ownership buffer says. A recipe with no parts is not a recipe with nothing
 * to judge: the flattened grid itself is one region, so region-scoped rules keep
 * working on plain artwork. Such a region carries an empty name and no material,
 * and its findings never name a part.
 */
export interface LintRegions {
  views: PartView[];
  owners: Int16Array;
  /** True when the regions are declared parts; false for the whole canvas. */
  partScoped: boolean;
}

export function lintRegions(context: LintContext): LintRegions {
  const parts = context.parts;
  if (parts !== undefined && parts.length > 0 && context.owners !== undefined) {
    return { views: partViews(context), owners: context.owners, partScoped: true };
  }
  const { width, height, flattened } = context;
  const owners = new Int16Array(width * height).fill(UNOWNED);
  const tones = new Set<number>();
  for (let index = 0; index < flattened.length; index += 1) {
    const slot = flattened[index];
    if (slot === undefined || slot === TRANSPARENT_SLOT) {
      continue;
    }
    owners[index] = WHOLE_CANVAS_OWNER;
    tones.add(slot);
  }
  return {
    views: [
      {
        owner: WHOLE_CANVAS_OWNER,
        name: '',
        material: '',
        familyIndex: -1,
        baseSlot: undefined,
        facing: undefined,
        toneCount: tones.size,
      },
    ],
    owners,
    partScoped: false,
  };
}

/** How a rule names what it judges: the part, or the whole artwork. */
export function subjectOf(view: PartView, partScoped: boolean): string {
  return partScoped ? `Part "${view.name}"` : 'The artwork';
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
