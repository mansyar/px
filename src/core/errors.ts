/**
 * Error codes, corrective hints, and the structured error object every surface
 * returns. Codes are stable API: agents match on them, so a new failure mode
 * gets a new code rather than a reworded message.
 */

export type ErrorCode =
  | 'E_USAGE'
  | 'E_FILE_NOT_FOUND'
  | 'E_FILE_EXISTS'
  | 'E_WRITE_FAILED'
  | 'E_PARSE'
  | 'E_BAD_VERSION'
  | 'E_BAD_META'
  | 'E_BAD_CANVAS'
  | 'E_BAD_PALETTE'
  | 'E_BAD_LAYER'
  | 'E_DUPLICATE_LAYER'
  | 'E_NO_SUCH_LAYER'
  | 'E_BAD_ANCHOR'
  | 'E_BAD_ALPHA'
  | 'E_UNKNOWN_SLOT'
  | 'E_UNKNOWN_OP'
  | 'E_MISSING_PARAM'
  | 'E_MISSING_COLOR'
  | 'E_BAD_PARAM'
  | 'E_BAD_LEGEND'
  | 'E_BAD_GRID'
  | 'E_UNKNOWN_GLYPH'
  | 'E_BAD_POLYGON'
  | 'E_NO_RAMP'
  | 'E_BANDS_RANGE'
  | 'E_REGION_TOO_THIN'
  | 'E_NO_SUCH_OP'
  | 'E_DUPLICATE_OP_ID'
  | 'E_PART_UNKNOWN'
  | 'E_EMPTY_PART'
  | 'E_MATERIAL_UNKNOWN'
  | 'E_GLOSS_UNKNOWN'
  | 'E_PROFILE_UNKNOWN'
  | 'E_RAMP_STEPS_RANGE'
  | 'E_FAMILY_EXISTS'
  | 'E_FAMILY_UNKNOWN'
  | 'E_SWAP_INCOMPATIBLE'
  | 'E_LINT_GATE'
  | 'E_DIFF_SIZE'
  | 'E_INTERNAL';

export type WarningCode =
  | 'W_OUT_OF_BOUNDS'
  | 'W_ANCHOR_OUT_OF_BOUNDS'
  | 'W_PASS_NOOP'
  | 'W_PART_OVERWRITE'
  | 'W_CLEANUP_NOOP'
  | 'W_DIFF_HASH_ONLY'
  | 'W_PROFILE_MISMATCH';

export interface PxErrorLocation {
  op_index?: number;
  layer?: string;
  coord?: [number, number];
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  hint: string;
  op_index?: number;
  layer?: string;
  coord?: [number, number];
}

export interface PxWarning {
  code: WarningCode;
  message: string;
  hint: string;
  layer?: string;
  op_index?: number;
  /** First coordinate the op wrote outside the canvas, when the op clipped. */
  coord?: [number, number];
}

/**
 * Canonical fix text per code. Individual throws may be more specific, but
 * every code carries a baseline hint so no error is ever a dead end.
 */
export const ERROR_HINTS: Record<ErrorCode, string> = {
  E_USAGE: 'Run `px --help` for the accepted commands and flags.',
  E_FILE_NOT_FOUND:
    'Check the path passed to --file; it is resolved against the working directory.',
  E_FILE_EXISTS: 'Pass --force to overwrite the existing file.',
  E_WRITE_FAILED:
    'Pass --out as a path the process can write to, such as one under the working directory.',
  E_PARSE: 'The recipe must be valid JSON; check for a trailing comma or an unquoted key.',
  E_BAD_VERSION: 'Only recipe version 1 is accepted; set "version": 1.',
  E_BAD_META:
    'meta requires a non-empty name, an integer width and height, and alpha_mode "binary".',
  E_BAD_CANVAS: 'Canvas width and height are integers between 8 and 256 inclusive.',
  E_BAD_PALETTE:
    'A palette family is either {"ramp": {...roles}} with at least one role or {"colors": [hex, ...]}.',
  E_BAD_LAYER: 'A layer is {"id": "<name>", "ops": [...]} with a non-empty string id.',
  E_DUPLICATE_LAYER: 'Give every layer a unique id; ids address layers in draw and inspect.',
  E_NO_SUCH_LAYER: 'Run `px inspect` to list the layer ids in the recipe, then pass --layer.',
  E_BAD_ANCHOR: 'An anchor is a two-integer [x, y] point in recipe coordinates.',
  E_BAD_ALPHA:
    'Alpha is binary: #rrggbb or #rrggbbaa with aa equal to 00 or ff. Dither for partial coverage.',
  E_UNKNOWN_SLOT: 'Declare the slot in the palette as <family>.<role> or <family>.<index>.',
  E_UNKNOWN_OP:
    'Ops are set_pixels, rect, line, ellipse, polygon, flood_fill, dither_fill, ascii_blit, mirror, auto_outline, auto_shade, ramp_fill, light, replace_slot, seal, strays, and deband.',
  E_MISSING_PARAM:
    'Every op parameter listed in the recipe format is required unless marked optional.',
  E_MISSING_COLOR:
    'Pass "color": "<family>.<role>" to paint, or "color": null to erase. An omitted colour is an error.',
  E_BAD_PARAM: 'Check the parameter types and ranges for this op.',
  E_BAD_LEGEND: 'A legend maps single characters to declared palette slots.',
  E_BAD_GRID: 'Every ascii_blit row has the same number of characters.',
  E_UNKNOWN_GLYPH:
    'Add the character to the legend, or use "." for transparency, then re-run the op.',
  E_BAD_POLYGON: 'A polygon needs at least three points, each an [x, y] integer pair.',
  E_NO_RAMP:
    'Declare outline/shadow/base/highlight roles for the family, or derive a ramp from the flat colours with --derive-ramps.',
  E_BANDS_RANGE:
    'bands is 2 or 3: a family supplies three shading roles (shadow, base, highlight), so a band count above 3 cannot produce more transitions.',
  E_REGION_TOO_THIN:
    'A region that occupies fewer light-axis positions than the band count cannot fill every band: reduce bands, or paint more positions along the light direction.',
  E_NO_SUCH_OP: 'Run `px inspect` or read the op_index map from the last write to find the op.',
  E_DUPLICATE_OP_ID: 'Op ids are unique across the recipe; rename one of the duplicates.',
  E_PART_UNKNOWN:
    'Declare the part in "parts" with a material, or name one already declared there.',
  E_EMPTY_PART:
    'Paint at least one pixel with "part": "<name>", or remove the declaration from "parts".',
  E_MATERIAL_UNKNOWN:
    'A part material names a palette family; run `px inspect` to see the families this recipe declares.',
  E_GLOSS_UNKNOWN: 'Gloss is one of matte, metal, gem, cloth.',
  E_PROFILE_UNKNOWN: 'Profile is one of tiny, small, medium, large.',
  E_RAMP_STEPS_RANGE:
    'Steps is 3 to 6: three tones is the fewest a ramp can shade with, and six is more than any profile expects.',
  E_FAMILY_EXISTS: 'Pick a new family name, or pass --force to overwrite the existing family.',
  E_FAMILY_UNKNOWN: 'Name a family declared in the recipe palette.',
  E_SWAP_INCOMPATIBLE:
    'Swap onto a family that resolves every role or colour index the source provides.',
  E_LINT_GATE:
    'Fix the warnings above, or drop --strict to report them without failing the command.',
  E_DIFF_SIZE:
    'Diff compares renders pixel for pixel, so both images must share a canvas size; compare against a render of a recipe with the same width and height.',
  E_INTERNAL: 'This is an engine defect; re-run with --pretty and report the envelope.',
};

export class PxError extends Error {
  readonly code: ErrorCode;
  readonly hint: string;
  readonly location: PxErrorLocation;

  constructor(
    code: ErrorCode,
    message: string,
    hint: string = ERROR_HINTS[code],
    location: PxErrorLocation = {},
  ) {
    super(message);
    this.name = 'PxError';
    this.code = code;
    this.hint = hint;
    this.location = location;
  }
}

export function errorPayload(error: PxError): ErrorPayload {
  const payload: ErrorPayload = {
    code: error.code,
    message: error.message,
    hint: error.hint,
  };
  if (error.location.op_index !== undefined) {
    payload.op_index = error.location.op_index;
  }
  if (error.location.layer !== undefined) {
    payload.layer = error.location.layer;
  }
  if (error.location.coord !== undefined) {
    payload.coord = error.location.coord;
  }
  return payload;
}

/** Engine faults are the only errors that are not the caller's to fix. */
export function isInternalError(error: PxError): boolean {
  return error.code === 'E_INTERNAL';
}

/** Describe a thrown value even when it is not an Error instance. */
export function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function internalError(cause: unknown): PxError {
  return new PxError(
    'E_INTERNAL',
    `Unexpected engine failure: ${causeMessage(cause)}`,
    ERROR_HINTS.E_INTERNAL,
  );
}
