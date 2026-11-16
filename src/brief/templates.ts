/**
 * Built-in brief templates (FR-9, NFR-5).
 *
 * The templates are hand-written constants: no fetch, no telemetry, no scoring
 * script and no image generator. A template describes the masses of a subject
 * before any pixel is drawn — one material and one proportion range per part,
 * a hero part, and the target value each part should carry on the design's 1–5
 * scale. `briefScaffold` turns that plan into a structurally valid 1.2 `design`
 * block whose `hierarchy` and `values` agree part for part.
 */

import { PxError } from '../core/errors.js';
import {
  DESIGN_VALUE_MAX,
  DESIGN_VALUE_MIN,
  type Design,
  type DesignEdges,
  type LightDir,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  PROJECT_STYLE,
} from '../core/recipe/types.js';

export interface PartProportion {
  /** Fraction of the canvas' edge, with 0 < min <= max <= 1. */
  min: number;
  max: number;
}

export interface TemplatePart {
  name: string;
  /** A ramp name the subject intends to use; listed in `design.materials`. */
  material: string;
  proportion: PartProportion;
  /** Target value on the design's 1–5 scale. */
  value: number;
  hero: boolean;
}

export interface BriefTemplate {
  subject: string;
  light: LightDir;
  /** Back-to-front paint order; the hero is one of these parts. */
  parts: TemplatePart[];
  edges: DesignEdges;
  materials: string[];
  style: string;
}

/** One part with the caller's canvas size applied to its proportion range. */
export interface ScaffoldPart extends TemplatePart {
  pixels: { min: number; max: number };
}

/** A structured plan. `design` is the piece that pastes into a 1.2 recipe. */
export interface BriefScaffold {
  subject: string;
  size: number;
  canvas: { width: number; height: number };
  design: Design;
  parts: ScaffoldPart[];
  hero: string;
}

const EDGES: DesignEdges = {
  silhouette: 'outline',
  material: 'shadow',
  detail: 'highlight',
};

/** Subjects in the order reported by `E_SUBJECT_UNKNOWN`. */
export const SUBJECTS: readonly string[] = ['character', 'prop', 'scene'];

function part(
  name: string,
  material: string,
  min: number,
  max: number,
  value: number,
  hero: boolean,
): TemplatePart {
  return { name, material, proportion: { min, max }, value, hero };
}

const TEMPLATES = new Map<string, BriefTemplate>([
  [
    'character',
    {
      subject: 'character',
      light: 'top-left',
      parts: [
        part('torso', 'cloth', 0.28, 0.4, 3, true),
        part('head', 'skin', 0.16, 0.24, 4, false),
        part('arm', 'cloth', 0.2, 0.3, 2, false),
        part('leg', 'ink', 0.28, 0.4, 2, false),
      ],
      edges: { ...EDGES },
      materials: ['cloth', 'ink', 'skin'],
      style: PROJECT_STYLE,
    },
  ],
  [
    'prop',
    {
      subject: 'prop',
      light: 'top-left',
      parts: [
        part('body', 'steel', 0.4, 0.6, 3, true),
        part('grip', 'wood', 0.18, 0.28, 2, false),
        part('accent', 'gold', 0.08, 0.16, 5, false),
      ],
      edges: { ...EDGES },
      materials: ['gold', 'steel', 'wood'],
      style: PROJECT_STYLE,
    },
  ],
  [
    'scene',
    {
      subject: 'scene',
      light: 'top-right',
      parts: [
        part('ground', 'stone', 0.45, 0.65, 2, false),
        part('structure', 'wood', 0.25, 0.4, 3, true),
        part('sky', 'wash', 0.2, 0.35, 5, false),
        part('detail', 'foliage', 0.08, 0.18, 4, false),
      ],
      edges: { ...EDGES },
      materials: ['foliage', 'stone', 'wash', 'wood'],
      style: PROJECT_STYLE,
    },
  ],
]);

/** Every built-in subject name, for hints and reachability assertions. */
export function knownSubjects(): string[] {
  return [...SUBJECTS];
}

/** Look up a template by name, with an error that lists the legal subjects. */
export function getTemplate(subject: string): BriefTemplate {
  const key = subject.trim().toLowerCase();
  const found = TEMPLATES.get(key);
  if (found === undefined) {
    throw new PxError(
      'E_SUBJECT_UNKNOWN',
      `Unknown brief subject "${subject}"`,
      `Known subjects are ${knownSubjects().join(', ')}.`,
    );
  }
  return found;
}

function pixelRange(proportion: PartProportion, size: number): { min: number; max: number } {
  const min = Math.max(1, Math.floor(proportion.min * size));
  return { min, max: Math.max(min, Math.ceil(proportion.max * size)) };
}

/**
 * Build a plan for `size`. The `design` block is structurally valid on its own:
 * passing it through `normalizeDesign` needs no recipe or style file, because a
 * scaffold supplies its own light, edges, materials and `@project` reference.
 */
export function briefScaffold(subject: string, size: number): BriefScaffold {
  if (!Number.isInteger(size) || size < MIN_CANVAS_SIZE || size > MAX_CANVAS_SIZE) {
    throw new PxError(
      'E_BAD_PARAM',
      `Brief size is ${String(size)}, expected an integer from ${MIN_CANVAS_SIZE} to ${MAX_CANVAS_SIZE}`,
      `Pass --size as a whole number between ${MIN_CANVAS_SIZE} and ${MAX_CANVAS_SIZE}.`,
    );
  }
  const template = getTemplate(subject);
  const values: Record<string, number> = {};
  const parts: ScaffoldPart[] = template.parts.map((entry) => {
    if (
      entry.value < DESIGN_VALUE_MIN ||
      entry.value > DESIGN_VALUE_MAX ||
      !Number.isInteger(entry.value)
    ) {
      throw new PxError(
        'E_INTENT_VALUE',
        `Template part "${entry.name}" has target value ${String(entry.value)}`,
        `Templates must use a whole value from ${DESIGN_VALUE_MIN} to ${DESIGN_VALUE_MAX}.`,
      );
    }
    values[entry.name] = entry.value;
    return {
      ...entry,
      proportion: { ...entry.proportion },
      pixels: pixelRange(entry.proportion, size),
    };
  });
  const heroes = parts.filter((entry) => entry.hero);
  if (heroes.length !== 1) {
    throw new PxError(
      'E_BAD_PARAM',
      `Template "${template.subject}" declares ${heroes.length} hero parts`,
      'A brief template declares exactly one hero part.',
    );
  }
  const design: Design = {
    subject: template.subject,
    light: template.light,
    hierarchy: parts.map((entry) => entry.name),
    values,
    edges: { ...template.edges },
    materials: [...template.materials],
    style: template.style,
  };
  return {
    subject: template.subject,
    size,
    canvas: { width: size, height: size },
    design,
    parts,
    hero: heroes[0]?.name ?? '',
  };
}
