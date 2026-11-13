/**
 * Shared bits of the post-pass ops: the location an error reports, and the one
 * error they share.
 *
 * The hint follows *how the ramp was made*, because the remedies differ. A
 * family written by hand is missing a role the author can declare, or can be
 * replaced by a derived ramp. A derived ramp can only fill a role from a
 * neighbouring palette colour, so a colour at either end of the luminance range
 * can never have that role — naming `--derive-ramps` there is a remedy that
 * cannot work, which is what an agent tried first.
 */

import { PxError } from '../errors.js';
import type { RampRole } from '../recipe/types.js';

export interface PassSite {
  opIndex: number;
  layerId: string;
}

const DERIVE_HINT =
  'Declare the role in the family ramp, or derive ramps from flat colours with --derive-ramps.';

/** What a role would need the palette to supply; `base` needs no direction. */
const ROLE_LACKS: Record<RampRole, string> = {
  highlight: 'no palette colour is lighter',
  shadow: 'no palette colour is darker',
  base: 'no palette colour sits beside it',
  outline: 'no palette colour is darker',
};

/**
 * Why a derived ramp cannot supply the role, and what does work: another
 * material, or an explicit role in the palette. Deliberately free of the
 * `--derive-ramps` flag, since that is already in effect when this reads.
 */
function derivedHint(role: RampRole): string {
  return `A derived ramp can only take "${role}" from another palette colour, and a colour at the end of the luminance range has none in the direction the role needs: ${ROLE_LACKS[role]}. Use a material whose colour has such a neighbour, or declare the role in the family ramp.`;
}

function rampError(
  family: string,
  role: RampRole,
  tail: string,
  location: { layer?: string; op_index?: number; coord?: [number, number] },
  derived: boolean,
): PxError {
  return new PxError(
    'E_NO_RAMP',
    `Family "${family}" has no "${role}" role ${tail}`,
    derived ? derivedHint(role) : DERIVE_HINT,
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
  return rampError(family, role, `for ${opName} to write${where}`, location, false);
}

/**
 * The same missing role, reported against a declared part rather than an op:
 * a material has to resolve all four roles before anything can shade it.
 *
 * `derived` says whether the palette came from flat colours, which validation
 * only knows at the moment of derivation — a written recipe holds explicit
 * roles, so the generic advice is the honest one there.
 */
export function partRampError(
  part: string,
  family: string,
  role: RampRole,
  derived = false,
): PxError {
  return rampError(family, role, `for part "${part}" to shade with`, {}, derived);
}
