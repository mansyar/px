/**
 * Recipe model. These types describe the canonical (expanded) form only; the
 * compact tuple form is an input convenience handled by the parser.
 */

import type { ScaleProfile } from '../profile.js';

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
  /**
   * Explicit scale profile (FR-12). Absent means "derive it from the canvas",
   * which is also the only form older recipes ever had, so it is written back
   * only when the recipe declared it.
   */
  profile?: ScaleProfile;
}

export type Anchor = [number, number];

export type Anchors = Record<string, Anchor>;

/**
 * A gloss profile is the closed set of surface responses the lighting pass can
 * express (FR-6). It is a property of the material, not of the palette: the
 * family supplies colours, the part supplies semantics.
 */
export type GlossProfile = 'matte' | 'metal' | 'gem' | 'cloth';

export const GLOSS_PROFILES: readonly GlossProfile[] = ['matte', 'metal', 'gem', 'cloth'];

/**
 * One declared part. `material` names a palette family; `gloss` defaults to
 * `matte`; `z` orders parts for shading questions and never decides which
 * pixels exist (FR-3). Part masks are derived on replay, never stored.
 */
export interface Part {
  material: string;
  gloss: GlossProfile;
  z: number;
}

export type Parts = Record<string, Part>;

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

/** How `light` shapes a part: no form shading, a silhouette band, or bands. */
export type LightForm = 'flat' | 'bevel' | 'round';
export const LIGHT_FORMS: readonly LightForm[] = ['flat', 'bevel', 'round'];

/** How `light` treats a part's boundary against transparency and neighbours. */
export type LightRim = 'none' | 'edge' | 'selective';
export const LIGHT_RIMS: readonly LightRim[] = ['none', 'edge', 'selective'];

export type OutlineMode = '4-way' | '8-way';
export const OUTLINE_MODES: readonly OutlineMode[] = ['4-way', '8-way'];

export type OutlineWhere = 'inner' | 'outer';
export const OUTLINE_WHERES: readonly OutlineWhere[] = ['inner', 'outer'];

export type DitherPattern = 'checker_50' | 'bayer_25';
export const DITHER_PATTERNS: readonly DitherPattern[] = ['checker_50', 'bayer_25'];

/** Every op may carry a stable id; `px edit` addresses ops by it. */
export interface OpBase {
  id?: string;
  /**
   * The part this op's pixels belong to. Only the pixel-creating ops accept it;
   * an undeclared name is `E_PART_UNKNOWN`.
   */
  part?: string;
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

/**
 * The lighting pass. Ownership comes from the layer it reads, never from the
 * op, so `part` is not an accepted key. Every field is written explicitly by
 * the canonical serializer, so a round trip never depends on a default.
 */
export interface LightOp extends OpBase {
  op: 'light';
  angle: LightDir;
  form: LightForm;
  /** Ambient occlusion, on by default. */
  ao: boolean;
  /** Caster part name, or null for no cast shadow. */
  cast: string | null;
  /** Shadow offset in pixels along the light vector, 1-4. */
  castOffset: number;
  rim: LightRim;
  targetLayer?: string;
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
  | ReplaceSlotOp
  | LightOp;

export type OpName = Op['op'];

/**
 * The ops that create or change pixels, and therefore accept `part`. Ops that
 * transform existing pixels or post-process a layer inherit ownership from the
 * pixels they read, so a `part` key on them stays a validation error (FR-2).
 */
export const PART_TAGGED_OPS: readonly OpName[] = [
  'set_pixels',
  'line',
  'rect',
  'ellipse',
  'polygon',
  'flood_fill',
  'dither_fill',
  'ascii_blit',
];

/** Ops that read a source layer and write their own; they can be a no-op. */
export const POST_PASS_OPS: readonly OpName[] = [
  'auto_outline',
  'auto_shade',
  'ramp_fill',
  'light',
];

export interface Layer {
  id: string;
  ops: Op[];
}

/**
 * The version literal a recipe was read with. `1` is the legacy numeric form of
 * 1.0; both it and `"1.0"` are preserved verbatim on write so a 1.0 recipe is
 * byte-identical after a read-write cycle (FR-1).
 */
export type RecipeVersion = 1 | '1.0' | '1.1';

/** Versions this engine accepts on input. */
export const ACCEPTED_VERSIONS: readonly RecipeVersion[] = [1, '1.0', '1.1'];

/** The version a recipe is written with once it declares parts. */
export const LATEST_RECIPE_VERSION: RecipeVersion = '1.1';

export interface Recipe {
  version: RecipeVersion;
  meta: RecipeMeta;
  palette: Palette;
  /** Optional: absent and empty both mean every pixel is unassigned. */
  parts?: Parts;
  anchors: Anchors;
  layers: Layer[];
}

/** Declared parts, with the absent case folded to an empty map. */
export function recipeParts(recipe: Recipe): Parts {
  return recipe.parts ?? {};
}

/** The legacy numeric literal `px init` still writes. */
export const RECIPE_VERSION = 1;

export const MIN_CANVAS_SIZE = 8;
export const MAX_CANVAS_SIZE = 256;

/** Op parameter order used by the canonical writer and the tuple reader. */
export const OP_PARAM_ORDER: Record<OpName, readonly string[]> = {
  set_pixels: ['points', 'color'],
  rect: ['x', 'y', 'w', 'h', 'color'],
  line: ['x1', 'y1', 'x2', 'y2', 'color'],
  ellipse: ['x', 'y', 'w', 'h', 'color', 'fill'],
  polygon: ['points', 'color'],
  flood_fill: ['x', 'y', 'color', 'connectivity'],
  dither_fill: ['x', 'y', 'w', 'h', 'color', 'pattern'],
  ascii_blit: ['x', 'y', 'grid', 'legend'],
  mirror: ['axis', 'pivot'],
  auto_outline: ['mode', 'where', 'color', 'selective', 'target_layer'],
  auto_shade: ['light_dir', 'target_layer'],
  ramp_fill: ['bands', 'light_dir', 'target_layer'],
  light: ['angle', 'form', 'ao', 'cast', 'cast_offset', 'rim', 'target_layer'],
  replace_slot: ['from', 'to'],
};
