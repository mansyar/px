/**
 * Design intent model and project style handling (FR-1, FR-3, FR-4).
 *
 * This module owns the closed `design` shape and the hand-written reader for
 * `px.style.json`. It intentionally has no ambient state: every filesystem
 * lookup takes an explicit base directory so the CLI and MCP paths resolve the
 * same file for the same recipe.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PxError } from './errors.js';
import {
  DESIGN_EDGE_CLASSES,
  DESIGN_FIELDS,
  DESIGN_VALUE_MAX,
  DESIGN_VALUE_MIN,
  type Design,
  type DesignEdges,
  LIGHT_DIRS,
  type LightDir,
  PROJECT_STYLE,
  type Recipe,
  recipeParts,
} from './recipe/types.js';

/** The style file name resolved by `"style": "@project"`. */
export const STYLE_FILE_NAME = 'px.style.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PxError('E_BAD_PARAM', `design.${field} must be a non-empty string`);
  }
  return value;
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry === '')) {
    throw new PxError('E_BAD_PARAM', `design.${field} must be an array of non-empty strings`);
  }
  return [...value] as string[];
}

function unknownDesignKeys(value: Record<string, unknown>): void {
  const extra = Object.keys(value).filter((key) => !DESIGN_FIELDS.includes(key as keyof Design));
  if (extra.length > 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `design has unknown keys: ${extra.join(', ')}`,
      `design accepts only ${DESIGN_FIELDS.join(', ')}.`,
    );
  }
}

function normalizeEdges(value: unknown): DesignEdges {
  if (!isRecord(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      'design.edges must be an object with silhouette, material and detail',
    );
  }
  const extra = Object.keys(value).filter((key) => !DESIGN_EDGE_CLASSES.includes(key as never));
  if (extra.length > 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `design.edges has unknown keys: ${extra.join(', ')}`,
      `design.edges accepts only ${DESIGN_EDGE_CLASSES.join(', ')}.`,
    );
  }
  const edges: DesignEdges = {
    silhouette: nonEmptyString(value.silhouette, 'edges.silhouette'),
    material: nonEmptyString(value.material, 'edges.material'),
    detail: nonEmptyString(value.detail, 'edges.detail'),
  };
  return edges;
}

function normalizeValues(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      'design.values must be an object mapping part names to target values',
    );
  }
  const values: Record<string, number> = {};
  for (const [part, raw] of Object.entries(value)) {
    if (part === '') {
      throw new PxError('E_BAD_PARAM', 'design.values has an empty part name');
    }
    if (
      typeof raw !== 'number' ||
      !Number.isInteger(raw) ||
      raw < DESIGN_VALUE_MIN ||
      raw > DESIGN_VALUE_MAX
    ) {
      throw new PxError(
        'E_INTENT_VALUE',
        `design.values[${JSON.stringify(part)}] is ${JSON.stringify(raw)}, which is outside ${DESIGN_VALUE_MIN}–${DESIGN_VALUE_MAX}`,
      );
    }
    values[part] = raw;
  }
  return values;
}

/**
 * Parse the structural shape of a `design` block. Light and value checks need
 * no style file or part table, so they live here; the checks that do need them
 * (hierarchy, edges, ramps) run during intent validation.
 */
export function normalizeDesign(raw: unknown): Design {
  if (!isRecord(raw)) {
    throw new PxError('E_BAD_PARAM', 'design must be an object');
  }
  unknownDesignKeys(raw);

  const light = raw.light;
  if (typeof light !== 'string' || !LIGHT_DIRS.includes(light as LightDir)) {
    throw new PxError(
      'E_INTENT_LIGHT',
      `design.light is ${JSON.stringify(light)}, expected one of ${LIGHT_DIRS.join(', ')}`,
    );
  }

  const hierarchy = stringList(raw.hierarchy, 'hierarchy');
  if (hierarchy.length === 0) {
    throw new PxError('E_BAD_PARAM', 'design.hierarchy must name at least one part');
  }

  return {
    subject: nonEmptyString(raw.subject, 'subject'),
    light: light as LightDir,
    hierarchy,
    values: normalizeValues(raw.values),
    edges: normalizeEdges(raw.edges),
    materials: stringList(raw.materials, 'materials'),
    style: nonEmptyString(raw.style, 'style'),
  };
}

/** The constraints a project style file supplies (FR-3). */
export interface ProjectStyle {
  allowedRamps: string[];
  edgeVocabulary: string[];
  defaultLight?: LightDir;
  minContrast: number;
  valueRules: Record<string, unknown>;
}

const STYLE_KEYS = [
  'allowed_ramps',
  'edge_vocabulary',
  'default_light',
  'min_contrast',
  'value_rules',
] as const;

function styleError(path: string, message: string, hint?: string): PxError {
  return new PxError(
    'E_BAD_PARAM',
    `${path}: ${message}`,
    hint ?? `px.style.json accepts only ${STYLE_KEYS.join(', ')}.`,
  );
}

/** Hand-written reader for px.style.json: no schema dependency, closed keys. */
export function parseProjectStyle(text: string, stylePath: string): ProjectStyle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw styleError(
      stylePath,
      'is not valid JSON',
      'Rewrite it as a JSON object with the five style keys.',
    );
  }
  if (!isRecord(raw)) {
    throw styleError(stylePath, 'must be a JSON object');
  }
  const extra = Object.keys(raw).filter((key) => !STYLE_KEYS.includes(key as never));
  if (extra.length > 0) {
    throw styleError(stylePath, `has unknown keys ${extra.join(', ')}`);
  }
  for (const key of STYLE_KEYS) {
    if (key !== 'default_light' && !(key in raw)) {
      throw styleError(stylePath, `is missing ${key}`);
    }
  }

  const allowedRamps = stringList(raw.allowed_ramps, 'allowed_ramps');
  const edgeVocabulary = stringList(raw.edge_vocabulary, 'edge_vocabulary');
  let defaultLight: LightDir | undefined;
  if (raw.default_light !== undefined) {
    const light = raw.default_light;
    if (typeof light !== 'string' || !LIGHT_DIRS.includes(light as LightDir)) {
      throw styleError(stylePath, `default_light must be one of ${LIGHT_DIRS.join(', ')}`);
    }
    defaultLight = light as LightDir;
  }
  const minContrast = raw.min_contrast;
  if (typeof minContrast !== 'number' || !Number.isFinite(minContrast)) {
    throw styleError(stylePath, 'min_contrast must be a number');
  }
  if (!isRecord(raw.value_rules)) {
    throw styleError(stylePath, 'value_rules must be an object');
  }
  return {
    allowedRamps,
    edgeVocabulary,
    ...(defaultLight === undefined ? {} : { defaultLight }),
    minContrast,
    valueRules: raw.value_rules,
  };
}

/** Read the project style from an explicitly supplied base directory. */
export function readProjectStyle(baseDir: string): { style: ProjectStyle; stylePath: string } {
  const stylePath = resolve(baseDir, STYLE_FILE_NAME);
  if (!existsSync(stylePath)) {
    throw new PxError('E_STYLE_MISSING', `Project style not found: ${stylePath}`);
  }
  const style = parseProjectStyle(readFileSync(stylePath, 'utf8'), stylePath);
  return { style, stylePath };
}

export interface ResolvedDesign {
  design: Design;
  style: ProjectStyle;
  stylePath: string;
}

/**
 * Resolve a raw design block against its style and normalize it. Style values
 * are defaults only: an explicit field always wins, and a required field that
 * is still absent is an error rather than a guess. The base directory is passed
 * in by the caller so CLI and MCP resolve the same file.
 */
export function resolveDesign(raw: unknown, baseDir: string): ResolvedDesign {
  if (!isRecord(raw)) {
    throw new PxError('E_BAD_PARAM', 'design must be an object');
  }
  const styleRef = raw.style;
  if (typeof styleRef !== 'string' || styleRef === '') {
    throw new PxError('E_BAD_PARAM', 'design.style is required, e.g. "@project"');
  }
  const stylePath =
    styleRef === PROJECT_STYLE ? resolve(baseDir, STYLE_FILE_NAME) : resolve(baseDir, styleRef);
  if (!existsSync(stylePath)) {
    throw new PxError('E_STYLE_MISSING', `Style file not found: ${stylePath}`);
  }
  const style = parseProjectStyle(readFileSync(stylePath, 'utf8'), stylePath);

  const merged: Record<string, unknown> = { ...raw };
  if (merged.light === undefined) {
    if (style.defaultLight === undefined) {
      throw new PxError(
        'E_INTENT_LIGHT',
        `design.light is absent after resolving ${stylePath}, and the style declares no default_light`,
      );
    }
    merged.light = style.defaultLight;
  }
  return { design: normalizeDesign(merged), style, stylePath };
}

/**
 * FR-4: cross-check resolved intent against the recipe and its style. Every
 * rejection is an actionable E_INTENT_* error that names the offending token,
 * the legal alternative and (where relevant) the style file that defines it.
 */
export function validateIntent(recipe: Recipe, resolved: ResolvedDesign): void {
  const design = recipe.design;
  if (design === undefined) return;
  const { style, stylePath } = resolved;

  if (!LIGHT_DIRS.includes(design.light)) {
    throw new PxError(
      'E_INTENT_LIGHT',
      `design.light "${design.light}" is not a supported direction`,
      `Use one of ${LIGHT_DIRS.join(', ')}; see ${stylePath}.`,
    );
  }

  const declared = recipeParts(recipe);
  for (const part of design.hierarchy) {
    if (!(part in declared)) {
      throw new PxError(
        'E_INTENT_HIERARCHY',
        `design.hierarchy names undeclared part "${part}"`,
        `Declare "${part}" in recipe.parts or remove it from the hierarchy; see ${stylePath}.`,
      );
    }
  }

  for (const [part, value] of Object.entries(design.values)) {
    if (!(part in declared)) {
      throw new PxError(
        'E_INTENT_HIERARCHY',
        `design.values names undeclared part "${part}"`,
        `Declare "${part}" in recipe.parts or remove its value; see ${stylePath}.`,
      );
    }
    if (!Number.isInteger(value) || value < DESIGN_VALUE_MIN || value > DESIGN_VALUE_MAX) {
      throw new PxError(
        'E_INTENT_VALUE',
        `design.values["${part}"] is ${String(value)}, outside ${DESIGN_VALUE_MIN}-${DESIGN_VALUE_MAX}`,
        `Use a whole target value from ${DESIGN_VALUE_MIN} to ${DESIGN_VALUE_MAX}; see ${stylePath}.`,
      );
    }
  }

  for (const edgeClass of DESIGN_EDGE_CLASSES) {
    const treatment = design.edges[edgeClass];
    if (!style.edgeVocabulary.includes(treatment)) {
      throw new PxError(
        'E_INTENT_EDGE',
        `design.edges.${edgeClass} uses unknown treatment "${treatment}"`,
        `Choose from ${style.edgeVocabulary.join(', ')} declared in ${stylePath}.`,
      );
    }
  }

  for (const material of design.materials) {
    if (!style.allowedRamps.includes(material)) {
      throw new PxError(
        'E_INTENT_RAMP',
        `design.materials uses unknown ramp "${material}"`,
        `Choose from ${style.allowedRamps.join(', ')} declared in ${stylePath}.`,
      );
    }
  }
}
