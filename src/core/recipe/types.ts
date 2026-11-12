/**
 * Recipe model. These types describe the canonical (expanded) form only; the
 * compact tuple form is an input convenience handled by the parser.
 */

export type RampRole = 'outline' | 'shadow' | 'base' | 'highlight';

/** Role order is fixed: it is both the slot order and the canonical write order. */
export const RAMP_ROLES: readonly RampRole[] = ['outline', 'shadow', 'base', 'highlight'];

export interface RampFamily {
  ramp: Partial<Record<RampRole, string>>;
}

export interface FlatFamily {
  colors: string[];
}

export type PaletteFamily = RampFamily | FlatFamily;

export type Palette = Record<string, PaletteFamily>;

export interface RecipeMeta {
  name: string;
  width: number;
  height: number;
  alphaMode: 'binary';
}

export type Anchor = [number, number];

export type Anchors = Record<string, Anchor>;

export interface SetPixelsOp {
  op: 'set_pixels';
  points: Array<[number, number]>;
  color: string;
}

export interface RectOp {
  op: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface LineOp {
  op: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  pixelPerfect?: boolean;
}

export type Op = SetPixelsOp | RectOp | LineOp;

export type OpName = Op['op'];

export interface Layer {
  id: string;
  ops: Op[];
}

export interface Recipe {
  version: 1;
  meta: RecipeMeta;
  palette: Palette;
  anchors: Anchors;
  layers: Layer[];
}

export const RECIPE_VERSION = 1;

export const MIN_CANVAS_SIZE = 8;
export const MAX_CANVAS_SIZE = 256;

/** Op parameter order used by the canonical writer and the tuple reader. */
export const OP_PARAM_ORDER: Record<OpName, readonly string[]> = {
  set_pixels: ['points', 'color'],
  rect: ['x', 'y', 'w', 'h', 'color'],
  line: ['x1', 'y1', 'x2', 'y2', 'color', 'pixel_perfect'],
};
