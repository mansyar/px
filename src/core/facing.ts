/**
 * Plane facing: which way a part's broad surface looks, compared against the
 * direction the `light` pass says the light comes from.
 *
 * ## The frame, pinned
 *
 * Right-handed: `+x` right, `+y` **up**, `+z` toward the viewer. A part that
 * declares no `facing` is viewer-facing, `[0, 0, 1]` (FR-1).
 *
 * Screen space grows downward, so the 2D step `towardLight` already uses (`y`
 * down) enters this frame with `y` negated: a screen step `(tx, ty)` is the
 * frame vector `(tx, -ty)`. The light lies in the picture plane, `z = 0`: the
 * pass models one directional light raking across the artwork, not a lamp in
 * front of it. So the third component of a light vector is always `0`, and a
 * viewer-facing plane is perpendicular to every light this pass can express.
 *
 * `dot(facing, towardLight)` is therefore
 *
 *     fx * lx + fy * ly        with (lx, ly) = (tx, -ty) / hypot(tx, ty)
 *
 * Everything downstream follows from that one identity — including AC-1, where
 * a `right`-facing part is darker than a `front`-facing one under a `top-left`
 * light because `lx = -1/sqrt(2)`. The sign is decided here and nowhere else.
 *
 * ## Tones
 *
 * A plane takes a role from the same three-band arithmetic `ramp_fill` and
 * `light`'s round form already use (`bandRole`): `dot = +1` is the lightest
 * band, `dot = -1` the darkest, `dot = 0` the middle. Three is the ceiling for
 * every family, not only an explicit three-role one: AO, cloth's dither and
 * `deband` all resolve a pixel's ramp *role*, so a plane tone that is not a role
 * would drop out of every later refinement. A synthesised family's derived roles
 * are `t0`, the middle tone and `t(n-1)` — the honest subset of its ladder —
 * and its remaining tones are intermediate colours of that same ramp, not extra
 * planes.
 *
 * A fourth distinct facing therefore quantises onto the nearest of the three
 * bands and shares its tone with its neighbour. The API does not claim
 * otherwise: `facing` selects a plane, and the palette decides how many planes
 * can be told apart.
 */

import { bandRole } from './ops/ramp.js';
import type { Facing, FacingName, FacingVector, LightDir, RampRole } from './recipe/types.js';

/**
 * How far from 1 a vector's length may be and still count as unit. A hand-typed
 * `[0, 0.7071, 0.7071]` is 0.99999 short of 1 and must parse; `[0, 1, 1]` is
 * 0.414 out and must not.
 */
export const FACING_UNIT_EPSILON = 1e-3;

/** The frame vector for each name, in the frame pinned above. */
export const FACING_VECTORS: Record<FacingName, FacingVector> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

/** Direction the light travels, i.e. the offset of a cast shadow, per corner. */
export const SHADOW_STEP: Record<LightDir, readonly [number, number]> = {
  'top-left': [1, 1],
  'top-right': [-1, 1],
  'bottom-left': [1, -1],
  'bottom-right': [-1, -1],
};

/**
 * Unit vector toward the light source in screen space, `y` down; this is what
 * an outward normal faces. Light travels *from* the named corner, so a
 * `top-left` light throws a shadow toward the bottom-right and this vector is
 * `(-1, -1)`.
 */
export function towardLight(angle: LightDir): readonly [number, number] {
  const [dx, dy] = SHADOW_STEP[angle];
  return [-dx, -dy];
}

/** The same direction in the pinned frame, unit length, `z = 0`. */
export function towardLightVector(angle: LightDir): FacingVector {
  const [tx, ty] = towardLight(angle);
  const length = Math.hypot(tx, ty);
  return [tx / length, -ty / length, 0];
}

/** The frame vector a declared facing stands for. */
export function facingVector(facing: Facing): FacingVector {
  if (typeof facing !== 'string') {
    return [facing[0], facing[1], facing[2]];
  }
  const vector = FACING_VECTORS[facing];
  return [vector[0], vector[1], vector[2]];
}

/** `dot(facing, towardLight(angle))`, in `[-1, 1]`. */
export function planeDot(facing: Facing, angle: LightDir): number {
  const [fx, fy] = facingVector(facing);
  const [lx, ly] = towardLightVector(angle);
  return fx * lx + fy * ly;
}

/** How many plane bands a family can express; three is the shading-role ceiling. */
export const PLANE_BANDS = 3;

/**
 * The role a plane takes from its dot product with the light direction.
 *
 * The dot is mapped to a position on `[-1, 1]` and split into `PLANE_BANDS`
 * equal bands, so the boundaries sit at `dot = ±1/3`: a plane turned more than
 * 70.5 degrees from the light is dark, one turned that far away from it is lit,
 * and the perpendicular face keeps the middle tone. `bandRole` decides the role
 * from the band index, which is the same three-band arithmetic the rest of the
 * pass uses.
 */
export function planeRole(dot: number): RampRole {
  const position = (1 - dot) / 2;
  const band = Math.min(PLANE_BANDS - 1, Math.floor(position * PLANE_BANDS));
  return bandRole(band, PLANE_BANDS);
}
