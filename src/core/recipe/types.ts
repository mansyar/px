/**
 * Recipe model. These types describe the canonical (expanded) form only; the
 * compact tuple form is an input convenience handled by the parser.
 */

import type { ScaleProfile } from '../profile.js';

export type RampRole = 'outline' | 'shadow' | 'base' | 'highlight';

/** Role order is fixed: it is both the slot order and the canonical write order. */
export const RAMP_ROLES: readonly RampRole[] = ['outline', 'shadow', 'base', 'highlight'];

/**
 * A synthesised ramp stores numbered tones instead of duplicating them under
 * role names: `t0` is the lightest and `t(n-1)` the darkest. The roles are
 * derived from that order, so the recipe holds one colour per tone and nothing
 * about how the ramp was produced.
 */
export type RampTone = `t${number}`;

export type Ramp = Partial<Record<RampRole, string>> & Partial<Record<RampTone, string>>;

/** Matches a tone key such as `t0` or `t5`. */
export const RAMP_TONE_PATTERN = /^t(0|[1-9][0-9]*)$/;

/** The numeric suffix of a tone key, or undefined when the key is not a tone. */
export function rampToneIndex(key: string): number | undefined {
  const match = RAMP_TONE_PATTERN.exec(key);
  if (match === null) {
    return undefined;
  }
  return Number.parseInt(match[1] ?? '', 10);
}

/** The tone indices a ramp declares, ascending. */
export function rampTones(ramp: Ramp): number[] {
  const tones: number[] = [];
  for (const key of Object.keys(ramp)) {
    const tone = rampToneIndex(key);
    if (tone !== undefined) {
      tones.push(tone);
    }
  }
  return tones.sort((left, right) => left - right);
}

/** Keys of a ramp in canonical order: roles first, then tones lightest first. */
export function rampSuffixes(ramp: Ramp): string[] {
  const roles = RAMP_ROLES.filter((role) => ramp[role] !== undefined);
  return [...roles, ...rampTones(ramp).map((tone) => `t${tone}`)];
}

export interface RampFamily {
  ramp: Ramp;
}

export interface FlatFamily {
  colors: string[];
}

/** One base colour expanded to N tones, shadows cool and highlights warm. */
export interface DeriveFamily {
  derive: { base: string; stops?: number };
}

export type PaletteFamily = RampFamily | FlatFamily | DeriveFamily;

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
 * A coordinate that names geometry instead of counting pixels (FR-22):
 * `{"ref": "blade.top"}` or `{"ref": "anchor.grip_pivot"}`, with an optional
 * pixel offset applied after resolution.
 *
 * Only the six scalar coordinate fields accept one. `polygon.points` and
 * `set_pixels.points` stay integer arrays: a ref inside a points array has no
 * single resolution order (is the whole array resolved at once, or point by
 * point?), so widening them is a different design and nothing in this phase
 * needs it.
 */
export interface CoordRef {
  /** `<part>.<where>` or `anchor.<name>`; written back verbatim. */
  ref: string;
  dx?: number;
  dy?: number;
}

export type Coord = number | CoordRef;

/** The points a part ref can name: a box edge or centre, or its first pixel. */
export type RefWhere = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'edge';

export const REF_WHERES: readonly RefWhere[] = ['top', 'bottom', 'left', 'right', 'center', 'edge'];

/** The prefix that turns a ref into an anchor lookup instead of a part lookup. */
export const ANCHOR_REF_PREFIX = 'anchor.';

export function isCoordRef(value: unknown): value is CoordRef {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A gloss profile is the closed set of surface responses the lighting pass can
 * express (FR-6). It is a property of the material, not of the palette: the
 * family supplies colours, the part supplies semantics.
 */
export type GlossProfile = 'matte' | 'metal' | 'gem' | 'cloth';

export const GLOSS_PROFILES: readonly GlossProfile[] = ['matte', 'metal', 'gem', 'cloth'];

/** The six named directions a part's broad surface can look. */
export type FacingName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export const FACING_NAMES: readonly FacingName[] = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
];

/**
 * A facing as an explicit unit vector.
 *
 * The frame is right-handed: `+x` right, `+y` up, `+z` toward the viewer. A part
 * that declares no facing is viewer-facing, `[0, 0, 1]`. Screen space grows
 * downward, so the `light` pass converts a screen step `(tx, ty)` into this frame
 * as `(tx, -ty)`; the light itself lies in the picture plane, `z = 0`. That whole
 * derivation lives in `src/core/facing.ts`, which is the single place the sign is
 * decided.
 */
export type FacingVector = [number, number, number];

/** A plane direction, by name or as an explicit unit vector. */
export type Facing = FacingName | FacingVector;

/**
 * One declared part. `material` names a palette family; `gloss` defaults to
 * `matte`; `z` orders parts for shading questions and never decides which
 * pixels exist (FR-3). `facing` is the plane the part's surface looks at, read
 * by the `light` pass only: a part without it keeps exactly the tone it is
 * painted with. Part masks are derived on replay, never stored.
 */
export interface Part {
  material: string;
  gloss: GlossProfile;
  z: number;
  facing?: Facing;
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

/** The closed set of texture patterns; every one is cluster-legal by construction. */
export type TexturePattern = 'stipple' | 'hatch' | 'grain' | 'brick' | 'mottle';
export const TEXTURE_PATTERNS: readonly TexturePattern[] = [
  'stipple',
  'hatch',
  'grain',
  'brick',
  'mottle',
];

/** 1 sparsest, 3 densest; scales the gap, never the mark. */
export type TextureDensity = 1 | 2 | 3;

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

export interface StrokeOp extends OpBase {
  op: 'stroke';
  /** Polyline vertices, chained in order; at least two distinct points. */
  path: Array<[number, number]>;
  color: SlotRef;
  /** Joins the last vertex to the first. */
  closed?: boolean;
  /** Chamfers interior vertices before rasterising. */
  smooth?: boolean;
  /** 1 (default) or 2 pixels wide. */
  width?: 1 | 2;
  /** How a corner closes; absent means `miter`, the pre-1.2 bytes. */
  corner?: 'miter' | 'round' | 'bevel';
  /** How an open path ends; absent means `butt`, the pre-1.2 bytes. */
  cap?: 'butt' | 'round';
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

/**
 * The texture pass. It reads a layer, masks on a declared part's pixels, and
 * writes marks into the active layer, so `part` is required rather than optional
 * in practice: the op has no mask without one. `color` is a slot name or one of
 * the four ramp roles, resolved against the part's material.
 */
export interface TextureOp extends OpBase {
  op: 'texture';
  pattern: TexturePattern;
  color: SlotRef;
  density?: TextureDensity;
  /** `full` needs a whole mark inside the part; `region` guarantees one if it can. */
  fit?: 'full' | 'region';
  targetLayer?: string;
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
  /**
   * Border depth in pixels (1-4). Absent, a 1.1 recipe takes the profile's
   * `outlineWidth` and a 1.0 recipe keeps the historical one pixel.
   */
  width?: number;
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
  /** Interior band count, 2–4. Absent means the pre-track three-band round form. */
  bands?: number;
  /** How band widths are measured. Absent means `thickness`. */
  bandScale?: 'thickness' | 'uniform';
  /** Only these parts are recoloured. Mutually exclusive with `skip`. */
  parts?: string[];
  /** These parts keep their authored tones. Mutually exclusive with `parts`. */
  skip?: string[];
  targetLayer?: string;
}

export type Op =
  | SetPixelsOp
  | RectOp
  | LineOp
  | StrokeOp
  | EllipseOp
  | PolygonOp
  | FloodFillOp
  | DitherFillOp
  | TextureOp
  | AsciiBlitOp
  | MirrorOp
  | AutoOutlineOp
  | AutoShadeOp
  | RampFillOp
  | ReplaceSlotOp
  | LightOp
  | SealOp
  | StraysOp
  | DebandOp;

export type CleanupOpName = 'seal' | 'strays' | 'deband';

/**
 * The fields a ref may occupy. `w`, `h`, `pivot`, `bands` and every colour or
 * name field measure or name something rather than locating a point, so they
 * stay numbers and strings.
 */
export const REF_COORD_FIELDS = ['x', 'y', 'x1', 'y1', 'x2', 'y2'] as const;

export type RefCoordField = (typeof REF_COORD_FIELDS)[number];

type WidenedCoord<O> = O extends unknown
  ? { [K in keyof O]: K extends RefCoordField ? Coord : O[K] }
  : never;

/**
 * An op as a recipe stores it: `Op`, except the six coordinate fields may be
 * refs. The compiler resolves them against the layer state at the start of the
 * op and only `Op` reaches the rasterizers, so nothing downstream of resolution
 * has to know refs exist.
 */
export type RawOp = WidenedCoord<Op>;

/** One op's widened form, for code that builds it field by field. */
export type RawOf<O extends Op> = WidenedCoord<O>;

/**
 * Cleanup passes. Each reads a snapshot of the layer it points at (its own when
 * `target_layer` is absent) and writes into the active layer, the same contract
 * the drawing post-passes follow.
 */
export interface CleanupOpBase extends OpBase {
  targetLayer?: string;
}

export interface SealOp extends CleanupOpBase {
  op: 'seal';
}

export interface StraysOp extends CleanupOpBase {
  op: 'strays';
}

export interface DebandOp extends CleanupOpBase {
  op: 'deband';
}

export type OpName = Op['op'];

/**
 * The ops that create or change pixels, and therefore accept `part`. Ops that
 * transform existing pixels or post-process a layer inherit ownership from the
 * pixels they read, so a `part` key on them stays a validation error (FR-2).
 */
export const PART_TAGGED_OPS: readonly OpName[] = [
  'set_pixels',
  'line',
  'stroke',
  'rect',
  'ellipse',
  'polygon',
  'flood_fill',
  'dither_fill',
  'texture',
  'ascii_blit',
];

/** Ops that read a source layer and write their own; they can be a no-op. */
export const POST_PASS_OPS: readonly OpName[] = [
  'auto_outline',
  'auto_shade',
  'ramp_fill',
  'light',
  'texture',
  'seal',
  'strays',
  'deband',
];

/** The cleanup passes, in one list for the reporter and the CLI. */
export const CLEANUP_OPS: readonly CleanupOpName[] = ['seal', 'strays', 'deband'];

export function isCleanupOp(name: OpName): name is CleanupOpName {
  return CLEANUP_OPS.includes(name as CleanupOpName);
}

export interface Layer {
  id: string;
  ops: RawOp[];
}

/**
 * The version literal a recipe was read with. `1` is the legacy numeric form of
 * 1.0; both it and `"1.0"` are preserved verbatim on write so a 1.0 recipe is
 * byte-identical after a read-write cycle (FR-1).
 */
export type RecipeVersion = 1 | '1.0' | '1.1' | '1.2';

/** Versions this engine accepts on input. */
export const ACCEPTED_VERSIONS: readonly RecipeVersion[] = [1, '1.0', '1.1', '1.2'];

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
  stroke: ['path', 'color', 'closed', 'smooth', 'width', 'corner', 'cap'],
  ellipse: ['x', 'y', 'w', 'h', 'color', 'fill'],
  polygon: ['points', 'color'],
  flood_fill: ['x', 'y', 'color', 'connectivity'],
  dither_fill: ['x', 'y', 'w', 'h', 'color', 'pattern'],
  texture: ['pattern', 'color', 'density', 'fit', 'target_layer'],
  ascii_blit: ['x', 'y', 'grid', 'legend'],
  mirror: ['axis', 'pivot'],
  auto_outline: ['mode', 'where', 'color', 'selective', 'width', 'target_layer'],
  auto_shade: ['light_dir', 'target_layer'],
  ramp_fill: ['bands', 'light_dir', 'target_layer'],
  light: [
    'angle',
    'form',
    'ao',
    'cast',
    'cast_offset',
    'rim',
    'bands',
    'band_scale',
    'parts',
    'skip',
    'target_layer',
  ],
  replace_slot: ['from', 'to'],
  seal: ['target_layer'],
  strays: ['target_layer'],
  deband: ['target_layer'],
};
