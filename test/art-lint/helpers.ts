/**
 * Shared fixtures for the art-lint suite.
 *
 * Every fixture is a compiled recipe, because the art rules judge the compiled
 * result: flattened slots plus the owners buffer the compiler produces. Parts are
 * 1.1, so the builders always write a version that can carry them.
 */

import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import type { ScaleProfile } from '../../src/core/profile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';
import type { LintCode, LintFinding } from '../../src/lint/types.js';

export interface SpriteOptions {
  width?: number;
  height?: number;
  palette?: Palette;
  parts?: Record<
    string,
    {
      material: string;
      gloss?: string;
      z?: number;
      facing?: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | [number, number, number];
    }
  >;
  profile?: ScaleProfile;
}

/** A one-layer recipe compiled to the shape every rule reads. */
export function compileSprite(ops: unknown[], options: SpriteOptions = {}): CompiledRecipe {
  const width = options.width ?? 16;
  const height = options.height ?? 16;
  const meta: Record<string, unknown> = {
    name: 'art',
    width,
    height,
    alpha_mode: 'binary',
  };
  if (options.profile !== undefined) {
    meta.profile = options.profile;
  }
  const recipe: Record<string, unknown> = {
    version: '1.1',
    meta,
    palette: options.palette ?? { main: { colors: ['#000000', '#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops }],
  };
  if (options.parts !== undefined) {
    recipe.parts = options.parts;
  }
  return compileRecipe(parseRecipe(JSON.stringify(recipe)).recipe);
}

export function ofCode(findings: readonly LintFinding[], code: LintCode): LintFinding[] {
  return findings.filter((finding) => finding.code === code);
}

/** A single-tone family: every shading role resolves to the same colour. */
export function baseOnly(hex: string): {
  ramp: { shadow: string; base: string; highlight: string };
} {
  return { ramp: { shadow: hex, base: hex, highlight: hex } };
}
