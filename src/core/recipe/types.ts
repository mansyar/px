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

/**
 * A colour is a palette slot name, or null to erase. The null is significant and
 * must never be confused with an omitted colour, which is a parse error.
 */
export type SlotRef = string | null;

/** Which way the light comes from. The four diagonals shade opposite rims. */
export type LightDir = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export const LIGHT_DIRS: readonly LightDir[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export type OutlineMode = '4-way' | '8-way';
export const OUTLINE_MODES: readonly OutlineMode[] = ['4-way', '8-way'];

export type OutlineWhere = 'inner' | 'outer';
export const OUTLINE_WHERES: readonly OutlineWhere[] = ['inner', 'outer'];

export type DitherPattern = 'checker_50' | 'bayer_25';
export const DITHER_PATTERNS: readonly DitherPattern[] = ['checker_50', 'bayer_25'];

/** Every op may carry a stable id; `px edit` addresses ops by it. */
export interface OpBase {
  id?: string;
}

export interface SetPixelsOp extends OpBase {
  op: 'set_pixels';
  points: Array<[number, number]>;
  color: SlotRef;
}

export interface RectOp extends OpBase {
  op: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: SlotRef;
}

export interface LineOp extends OpBase {
  op: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: SlotRef;
  pixelPerfect?: boolean;
}

export interface EllipseOp extends OpBase {
  op: 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  color: SlotRef;
  fill?: boolean;
}

export interface PolygonOp extends OpBase {
  op: 'polygon';
  points: Array<[number, number]>;
  color: SlotRef;
}

export interface FloodFillOp extends OpBase {
  op: 'flood_fill';
  x: number;
  y: number;
  color: SlotRef;
  connectivity?: 4 | 8;
}

export interface DitherFillOp extends OpBase {
  op: 'dither_fill';
  x: number;
  y: number;
  w: number;
  h: number;
  color: SlotRef;
  pattern: DitherPattern;
}

export interface AsciiBlitOp extends OpBase {
  op: 'ascii_blit';
  x: number;
  y: number;
  grid: string[];
  legend: Record<string, string>;
}

export interface MirrorOp extends OpBase {
  op: 'mirror';
  axis: 'x' | 'y';
  pivot: number;
}

export interface AutoOutlineOp extends OpBase {
  op: 'auto_outline';
  mode?: OutlineMode;
  where?: OutlineWhere;
  /** Required unless `selective` supplies the colour from each family. */
  color?: SlotRef;
  selective?: boolean;
  targetLayer?: string;
}

export interface AutoShadeOp extends OpBase {
  op: 'auto_shade';
  lightDir: LightDir;
  targetLayer?: string;
}

export interface RampFillOp extends OpBase {
  op: 'ramp_fill';
  /** 2 or 3: three shading roles cap the transitions at two. */
  bands: number;
  lightDir: LightDir;
  targetLayer?: string;
}

export interface ReplaceSlotOp extends OpBase {
  op: 'replace_slot';
  from: string;
  to: string;
}

export type Op =
  | SetPixelsOp
  | RectOp
  | LineOp
  | EllipseOp
  | PolygonOp
  | FloodFillOp
  | DitherFillOp
  | AsciiBlitOp
  | MirrorOp
  | AutoOutlineOp
  | AutoShadeOp
  | RampFillOp
  | ReplaceSlotOp;

export type OpName = Op['op'];

/** Ops that read a source layer and write their own; they can be a no-op. */
export const POST_PASS_OPS: readonly OpName[] = ['auto_outline', 'auto_shade', 'ramp_fill'];

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
  ellipse: ['x', 'y', 'w', 'h', 'color', 'fill'],
  polygon: ['points', 'color'],
  flood_fill: ['x', 'y', 'color', 'connectivity'],
  dither_fill: ['x', 'y', 'w', 'h', 'color', 'pattern'],
  ascii_blit: ['x', 'y', 'grid', 'legend'],
  mirror: ['axis', 'pivot'],
  auto_outline: ['mode', 'where', 'color', 'selective', 'target_layer'],
  auto_shade: ['light_dir', 'target_layer'],
  ramp_fill: ['bands', 'light_dir', 'target_layer'],
  replace_slot: ['from', 'to'],
};
