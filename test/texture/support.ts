/**
 * Scene builder for the texture tests: a 1.1 recipe with one declared part, so
 * the op is exercised through the real parser, validator and compiler.
 */

import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import type { ScaleProfile } from '../../src/core/profile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';

/** A full ramp, with an outline role so texture can name it. */
export const RAMP = {
  cloth: {
    ramp: { outline: '#000000', shadow: '#440000', base: '#880000', highlight: '#ff0000' },
  },
} as const;

/** The same ramp with no `outline`: the one role a declared part may lack. */
export const NO_OUTLINE = {
  cloth: { ramp: { shadow: '#440000', base: '#880000', highlight: '#ff0000' } },
} as const;

export interface SceneOptions {
  width?: number;
  height?: number;
  profile?: ScaleProfile;
  palette?: Record<string, unknown>;
}

export function sceneRecipe(ops: unknown[], options: SceneOptions = {}): Recipe {
  const width = options.width ?? 64;
  const height = options.height ?? 64;
  return parseRecipe(
    JSON.stringify({
      version: '1.1',
      meta: {
        name: 'texture',
        width,
        height,
        alpha_mode: 'binary',
        ...(options.profile === undefined ? {} : { profile: options.profile }),
      },
      palette: options.palette ?? RAMP,
      parts: { wall: { material: 'cloth', gloss: 'matte', z: 0 } },
      anchors: {},
      layers: [{ id: 'base', ops }],
    }),
  ).recipe;
}

export function compileScene(ops: unknown[], options: SceneOptions = {}): CompiledRecipe {
  return compileRecipe(sceneRecipe(ops, options));
}

/** A part covering the whole canvas, painted in the family's base tone. */
export function wall(width: number, height: number): unknown {
  return { op: 'rect', x: 0, y: 0, w: width, h: height, color: 'cloth.base', part: 'wall' };
}

/** Every pixel whose slot is the named one, in canvas order. */
export function pixelsOf(compiled: CompiledRecipe, slotName: string): Array<[number, number]> {
  const slot = compiled.slots.resolve(slotName);
  const points: Array<[number, number]> = [];
  for (let y = 0; y < compiled.height; y += 1) {
    for (let x = 0; x < compiled.width; x += 1) {
      if (compiled.flattened[y * compiled.width + x] === slot) {
        points.push([x, y]);
      }
    }
  }
  return points;
}

/** 4-connected component sizes of one slot, for the cluster assertions. */
export function clusterSizes(compiled: CompiledRecipe, slotName: string): number[] {
  const slot = compiled.slots.resolve(slotName);
  const seen = new Uint8Array(compiled.width * compiled.height);
  const sizes: number[] = [];
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] === 1 || compiled.flattened[start] !== slot) {
      continue;
    }
    const members: number[] = [start];
    seen[start] = 1;
    for (let head = 0; head < members.length; head += 1) {
      const index = members[head] ?? 0;
      const x = index % compiled.width;
      const y = (index - x) / compiled.width;
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= compiled.width || ny >= compiled.height) {
          continue;
        }
        const next = ny * compiled.width + nx;
        if (seen[next] === 1 || compiled.flattened[next] !== slot) {
          continue;
        }
        seen[next] = 1;
        members.push(next);
      }
    }
    sizes.push(members.length);
  }
  return sizes;
}
