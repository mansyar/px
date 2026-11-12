/**
 * Shared bits of the post-pass ops: the location an error reports, and the one
 * error they share. `E_NO_RAMP` always names `--derive-ramps`, because that flag
 * is the fix once Phase 4 lands it.
 */

import { PxError } from '../errors.js';
import type { RampRole } from '../recipe/types.js';

export interface PassSite {
  opIndex: number;
  layerId: string;
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
  return new PxError(
    'E_NO_RAMP',
    `Family "${family}" has no "${role}" role for ${opName} to write${where}`,
    'Declare the role in the family ramp, or derive ramps from flat colours with --derive-ramps.',
    location,
  );
}
