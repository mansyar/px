/**
 * Shared bits of the post-pass ops: the location an error reports, and the one
 * error they share. `E_NO_RAMP` always names `--derive-ramps`, because that flag
 * is the fix when a family has no ramped colour to write.
 */

import { PxError } from '../errors.js';
import type { RampRole } from '../recipe/types.js';

export interface PassSite {
  opIndex: number;
  layerId: string;
}

const DERIVE_HINT =
  'Declare the role in the family ramp, or derive ramps from flat colours with --derive-ramps.';

function rampError(
  family: string,
  role: RampRole,
  tail: string,
  location: { layer?: string; op_index?: number; coord?: [number, number] },
): PxError {
  return new PxError(
    'E_NO_RAMP',
    `Family "${family}" has no "${role}" role ${tail}`,
    DERIVE_HINT,
    location,
  );
}

export function noRampError(
  opName: string,
  family: string,
  role: RampRole,
  site: PassSite,
  coord?: [number, number],
): PxError {
  const where = coord === undefined ? '' : ` at (${coord[0]}, ${coord[1]})`;
  const location: { layer: string; op_index: number; coord?: [number, number] } = {
    layer: site.layerId,
    op_index: site.opIndex,
  };
  if (coord !== undefined) {
    location.coord = coord;
  }
  return rampError(family, role, `for ${opName} to write${where}`, location);
}

/**
 * The same missing role, reported against a declared part rather than an op:
 * a material has to resolve all four roles before anything can shade it.
 */
export function partRampError(part: string, family: string, role: RampRole): PxError {
  return rampError(family, role, `for part "${part}" to shade with`, {});
}
