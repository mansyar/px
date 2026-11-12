/**
 * The debug sheet: three panels, one PNG, opt-in only.
 *
 *   A  nearest-neighbour at the profile's zoom (8× up to 48 px, 4× up to 128,
 *      2× above), with a 1px grid, a checkerboard under transparent pixels,
 *      coordinate rulers on the top and left, and a crosshair plus a box marker
 *      at every anchor.
 *   B  1× over a backdrop, so silhouette readability is judged at real size.
 *   C  black silhouette on white, so the shape reads without any palette at all.
 *
 * The zoom is a profile number (FR-13): at 8× a 256 px canvas would be 2,048 px
 * per side, which is neither legible nor bounded, so the sheet steps down as the
 * art grows. Ruler labels keep a constant 32 device pixels between them, which
 * is why the interval doubles each time the zoom halves.
 *
 * Every cue is shape or luminance, never hue: the sheet has to survive a
 * grayscale view. The composer is pure — no clock, no environment, no font
 * file — so the same recipe always yields the same bytes.
 */

import type { CompiledRecipe } from '../../core/compile.js';
import { PxError } from '../../core/errors.js';
import { hasBinaryAlpha, parseHex, type Rgba, TRANSPARENT_SLOT } from '../../core/palette.js';
import type { CompiledPart } from '../../core/parts.js';
import { profileNumbers, type ScaleProfile } from '../../core/profile.js';
import type { Anchors } from '../../core/recipe/types.js';
import { DEFAULT_BACKDROP_HEX, LOW_CONTRAST_BACKDROP } from '../../lint/thresholds.js';
import { rasterizeSlots } from '../flatten.js';
import { encodePng } from '../png.js';
import { GLYPH_HEIGHT, GLYPH_WIDTH } from './font.js';
import { PixelBuffer } from './pixels.js';

/**
 * The accepted backdrop forms, shared with the `--backdrop` flag parser so the
 * two hints cannot drift apart: a translucent panel would be the one place the
 * engine emits a partially transparent pixel.
 */
export const BACKDROP_FORMS =
  'Backdrop alpha is binary: use #rrggbb, or #rrggbbaa with aa equal to 00 or ff; pass "null" for a transparent panel.';

/**
 * Device pixels per source pixel at the zooms that still use 8×: a canvas up to
 * 48 px. It is also the default of `panelACell`, so a caller that does not care
 * about the profile gets the geometry the sheet had before profiles existed.
 */
export const PANEL_SCALE = 8;

/** Gap between cells, in device pixels. It is the grid line at every zoom. */
const CELL_GAP = 1;

/**
 * Device pixels between ruler labels. Keeping this constant while the zoom
 * changes is what keeps the numbers readable: 4 source px apart at 8×, 8 at 4×,
 * 16 at 2×.
 */
const RULER_SPACING = 32;

const PAD = 4;
const RULER_PAD = 2;
const LABEL_SCALE = 2;
const RULER_HEIGHT = GLYPH_HEIGHT + RULER_PAD * 2;

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const GRID: Rgba = { r: 128, g: 128, b: 128, a: 255 };
const CHECKER_LIGHT: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const CHECKER_DARK: Rgba = { r: 204, g: 204, b: 204, a: 255 };

/**
 * Crop strip bounds: at most this many parts, each zoomed as far as an integer
 * factor lets it fill a cell this many device pixels across. Both numbers are
 * ceilings, so a recipe with many parts adds rows, never unbounded width.
 */
const CROP_LIMIT = 6;
const CROP_TARGET = 48;
const CROP_MAX_ZOOM = 8;

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DebugSheetOptions {
  /** Backdrop behind panel B. Omit for the default grey, `null` for none. */
  backdrop?: string | null;
}

export interface DebugSheet {
  png: Uint8Array;
  rgba: Uint8Array;
  width: number;
  height: number;
  /** The regime the sheet was composed for. */
  profile: ScaleProfile;
  /** Device pixels per source pixel in panel A, read from that profile. */
  zoom: number;
  /** The scaled image area of each panel; panel A's rulers sit outside it. */
  panels: { a: PanelRect; b: PanelRect; c: PanelRect };
  /** The per-part crop strip, present only when the recipe declares parts. */
  strip?: PanelRect;
  /** One entry per drawn crop, in strip order: which part, where, at what zoom. */
  crops?: Array<{ part: string; rect: PanelRect }>;
}

/** Distance between the same corner of two neighbouring cells, at this zoom. */
function pitchOf(zoom: number): number {
  return zoom + CELL_GAP;
}

/** Where one source pixel lands in panel A, in sheet coordinates. */
export function panelACell(
  panel: PanelRect,
  x: number,
  y: number,
  zoom: number = PANEL_SCALE,
): PanelRect {
  return {
    x: panel.x + CELL_GAP + x * pitchOf(zoom),
    y: panel.y + CELL_GAP + y * pitchOf(zoom),
    w: zoom,
    h: zoom,
  };
}

function resolveBackdrop(value: string | null | undefined): Rgba | null {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return LOW_CONTRAST_BACKDROP;
  }
  const parsed = parseHex(value);
  if (parsed === null) {
    throw new PxError(
      'E_BAD_PARAM',
      `Debug backdrop "${value}" is not a hex colour`,
      `${BACKDROP_FORMS} The default is ${DEFAULT_BACKDROP_HEX}.`,
    );
  }
  if (!hasBinaryAlpha(parsed)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Debug backdrop "${value}" has alpha ${parsed.a}; backdrop alpha is binary`,
      `${BACKDROP_FORMS} The default is ${DEFAULT_BACKDROP_HEX}.`,
    );
  }
  return parsed;
}

/**
 * Source pixels between ruler labels: the legible interval for this zoom, raised
 * if the widest label would not fit inside the step it is centred in.
 */
function labelStep(buffer: PixelBuffer, largest: number, zoom: number): number {
  const width = buffer.textWidth(String(largest));
  const legible = Math.ceil(RULER_SPACING / zoom);
  const fits = Math.ceil(width / pitchOf(zoom));
  return Math.max(1, legible, fits);
}

function drawCells(
  buffer: PixelBuffer,
  panel: PanelRect,
  compiled: CompiledRecipe,
  zoom: number,
): void {
  const { width, height, flattened, slots } = compiled;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = panelACell(panel, x, y, zoom);
      const slot = flattened[y * width + x];
      const color =
        slot === TRANSPARENT_SLOT
          ? (x + y) % 2 === 0
            ? CHECKER_LIGHT
            : CHECKER_DARK
          : slots.rgba[slot];
      if (color === undefined) {
        continue;
      }
      buffer.fillRect(cell.x, cell.y, cell.w, cell.h, color);
    }
  }
}

function drawGrid(
  buffer: PixelBuffer,
  panel: PanelRect,
  width: number,
  height: number,
  zoom: number,
): void {
  const pitch = pitchOf(zoom);
  for (let x = 0; x <= width; x += 1) {
    buffer.fillRect(panel.x + x * pitch, panel.y, CELL_GAP, panel.h, GRID);
  }
  for (let y = 0; y <= height; y += 1) {
    buffer.fillRect(panel.x, panel.y + y * pitch, panel.w, CELL_GAP, GRID);
  }
}

function drawRulers(
  buffer: PixelBuffer,
  panel: PanelRect,
  width: number,
  height: number,
  zoom: number,
): void {
  const stepX = labelStep(buffer, width - 1, zoom);
  for (let x = 0; x < width; x += stepX) {
    const label = String(x);
    const cell = panelACell(panel, x, 0, zoom);
    const textX = cell.x + Math.floor((zoom - buffer.textWidth(label)) / 2);
    buffer.drawText(label, textX, panel.y - RULER_HEIGHT + RULER_PAD, BLACK);
  }

  const stepY = labelStep(buffer, height - 1, zoom);
  for (let y = 0; y < height; y += stepY) {
    const label = String(y);
    const cell = panelACell(panel, 0, y, zoom);
    const textX = panel.x - RULER_PAD - buffer.textWidth(label);
    const textY = cell.y + Math.floor((zoom - GLYPH_HEIGHT) / 2);
    buffer.drawText(label, textX, textY, BLACK);
  }
}

/**
 * A dashed two-tone crosshair that spans the panel, plus a box marker at the
 * anchor itself: a 3×3 black core inside a 5×5 white ring. Both read in
 * grayscale and neither depends on the sprite's colours.
 */
function drawAnchor(
  buffer: PixelBuffer,
  panel: PanelRect,
  anchorX: number,
  anchorY: number,
  zoom: number,
): void {
  const cell = panelACell(panel, anchorX, anchorY, zoom);
  const centreX = cell.x + Math.floor(zoom / 2);
  const centreY = cell.y + Math.floor(zoom / 2);

  for (let y = panel.y; y < panel.y + panel.h; y += 1) {
    const dash = (y - panel.y) % 4 < 2;
    buffer.set(centreX, y, dash ? BLACK : WHITE);
    buffer.set(centreX + 1, y, dash ? WHITE : BLACK);
  }
  for (let x = panel.x; x < panel.x + panel.w; x += 1) {
    const dash = (x - panel.x) % 4 < 2;
    buffer.set(x, centreY, dash ? BLACK : WHITE);
    buffer.set(x, centreY + 1, dash ? WHITE : BLACK);
  }

  buffer.fillRect(centreX - 2, centreY - 2, 5, 5, WHITE);
  buffer.fillRect(centreX - 1, centreY - 1, 3, 3, BLACK);
}

function drawBackdropPanel(
  buffer: PixelBuffer,
  panel: PanelRect,
  rgba: Uint8Array,
  width: number,
  height: number,
  backdrop: Rgba | null,
): void {
  if (backdrop === null) {
    buffer.clearRect(panel.x, panel.y, width, height);
  } else {
    buffer.fillRect(panel.x, panel.y, width, height, backdrop);
  }
  buffer.overlay(rgba, width, height, panel.x, panel.y);
}

function drawSilhouettePanel(
  buffer: PixelBuffer,
  panel: PanelRect,
  rgba: Uint8Array,
  width: number,
  height: number,
): void {
  buffer.fillRect(panel.x, panel.y, width, height, WHITE);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] === 0) {
        continue;
      }
      buffer.set(panel.x + x, panel.y + y, BLACK);
    }
  }
}

/** Bounding box plus a one-pixel margin, clipped to the canvas. */
function cropRegion(part: CompiledPart, width: number, height: number): PanelRect | null {
  const bounds = part.bounds;
  if (bounds === null) {
    return null;
  }
  const left = Math.max(0, bounds.x - 1);
  const top = Math.max(0, bounds.y - 1);
  const right = Math.min(width - 1, bounds.x + bounds.w);
  const bottom = Math.min(height - 1, bounds.y + bounds.h);
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

interface CropCell {
  name: string;
  label: string;
  region: PanelRect;
  zoom: number;
  blockW: number;
  blockH: number;
}

/**
 * The six largest parts by painted pixels, ties broken by name, each with the
 * largest integer zoom that keeps its cropped bbox inside a CROP_TARGET cell.
 */
function cropCells(compiled: CompiledRecipe, available: number): CropCell[] {
  const ranked = [...compiled.parts]
    .sort((left, right) => right.painted - left.painted || (left.name < right.name ? -1 : 1))
    .slice(0, CROP_LIMIT);
  const cells: CropCell[] = [];
  for (const part of ranked) {
    const region = cropRegion(part, compiled.width, compiled.height);
    if (region === null) {
      continue;
    }
    const zoom = Math.max(
      1,
      Math.min(CROP_MAX_ZOOM, Math.floor(CROP_TARGET / Math.max(region.w, region.h))),
    );
    const label = part.name.toUpperCase();
    const cellW = region.w * zoom;
    const cellH = region.h * zoom;
    // Matches drawText's cursor: one blank column between glyphs.
    const labelW = label.length * (GLYPH_WIDTH + 1) - 1;
    cells.push({
      name: part.name,
      label,
      region,
      zoom,
      blockW: Math.min(available, Math.max(cellW, labelW)),
      blockH: cellH + 2 + GLYPH_HEIGHT,
    });
  }
  return cells;
}

/** One part crop: white ground, a grey frame, the part's own pixels at zoom. */
function drawCrop(
  buffer: PixelBuffer,
  cell: CropCell,
  x: number,
  y: number,
  compiled: CompiledRecipe,
): void {
  const { region, zoom } = cell;
  const cellW = region.w * zoom;
  const cellH = region.h * zoom;
  buffer.fillRect(x, y, cellW, cellH, WHITE);
  for (let sy = 0; sy < region.h; sy += 1) {
    for (let sx = 0; sx < region.w; sx += 1) {
      const slot = compiled.flattened[(region.y + sy) * compiled.width + (region.x + sx)];
      if (slot === undefined || slot === TRANSPARENT_SLOT) {
        continue;
      }
      const color = compiled.slots.rgba[slot];
      if (color === undefined) {
        continue;
      }
      buffer.fillRect(x + sx * zoom, y + sy * zoom, zoom, zoom, color);
    }
  }
  buffer.fillRect(x, y - 1, cellW, 1, GRID);
  buffer.fillRect(x, y + cellH, cellW, 1, GRID);
  buffer.fillRect(x - 1, y, 1, cellH, GRID);
  buffer.fillRect(x + cellW, y, 1, cellH, GRID);
  buffer.drawText(cell.label, x, y + cellH + 2, BLACK, 1);
}

export function renderDebugSheet(
  compiled: CompiledRecipe,
  anchors: Anchors,
  options: DebugSheetOptions = {},
): DebugSheet {
  const { width, height, profile } = compiled;
  const zoom = profileNumbers(profile).debugZoom;
  const pitch = pitchOf(zoom);
  const rgba = rasterizeSlots(compiled.flattened, width, height, compiled.slots);

  const imageWidth = width * pitch + CELL_GAP;
  const imageHeight = height * pitch + CELL_GAP;
  const digits = String(height - 1).length;
  const rulerWidth = digits * GLYPH_WIDTH + (digits - 1) + RULER_PAD * 2;
  const labelWidth = GLYPH_WIDTH * LABEL_SCALE;
  const imageX = PAD + labelWidth + PAD + rulerWidth;
  const imageY = PAD + RULER_HEIGHT;

  const a: PanelRect = { x: imageX, y: imageY, w: imageWidth, h: imageHeight };
  const b: PanelRect = { x: imageX, y: imageY + imageHeight + PAD, w: width, h: height };
  const c: PanelRect = { x: imageX, y: b.y + height + PAD, w: width, h: height };

  // One caption line under the panels: the regime and the zoom it produced, so a
  // sheet is self-describing when it is pasted into a review.
  const captionY = c.y + height + PAD;
  const captionHeight = GLYPH_HEIGHT * LABEL_SCALE;
  const caption = `${profile.toUpperCase()} ${zoom}X`;

  const sheetWidth = imageX + imageWidth + PAD;
  const available = sheetWidth - PAD * 2;

  // The crop strip packs left to right inside the sheet's existing width and
  // wraps into rows, so declaring many parts never widens the image.
  const cells = compiled.parts.length === 0 ? [] : cropCells(compiled, available);
  const stripCaptionY = captionY + captionHeight + PAD;
  const rowsStart = stripCaptionY + captionHeight + 2;
  const placed: Array<{ cell: CropCell; x: number; y: number }> = [];
  let cursorX = PAD;
  let cursorY = rowsStart;
  let rowHeight = 0;
  let bottom = captionY + captionHeight;
  for (const cell of cells) {
    if (cursorX > PAD && cursorX + cell.blockW > PAD + available) {
      cursorX = PAD;
      cursorY += rowHeight + PAD;
      rowHeight = 0;
    }
    placed.push({ cell, x: cursorX, y: cursorY });
    cursorX += cell.blockW + PAD;
    rowHeight = Math.max(rowHeight, cell.blockH);
    bottom = Math.max(bottom, cursorY + cell.blockH);
  }
  const strip: PanelRect | undefined =
    cells.length === 0
      ? undefined
      : { x: PAD, y: stripCaptionY, w: available, h: bottom + PAD - stripCaptionY };
  const sheetHeight = strip === undefined ? captionY + captionHeight + PAD : bottom + PAD;

  const buffer = new PixelBuffer(sheetWidth, sheetHeight);
  buffer.fillRect(0, 0, sheetWidth, sheetHeight, WHITE);

  drawCells(buffer, a, compiled, zoom);
  drawGrid(buffer, a, width, height, zoom);
  drawRulers(buffer, a, width, height, zoom);
  for (const anchor of Object.values(anchors)) {
    const [anchorX, anchorY] = anchor;
    if (anchorX < 0 || anchorY < 0 || anchorX >= width || anchorY >= height) {
      continue;
    }
    drawAnchor(buffer, a, anchorX, anchorY, zoom);
  }

  drawBackdropPanel(buffer, b, rgba, width, height, resolveBackdrop(options.backdrop));
  drawSilhouettePanel(buffer, c, rgba, width, height);

  buffer.drawGlyph('A', PAD, a.y, BLACK, LABEL_SCALE);
  buffer.drawGlyph('B', PAD, b.y, BLACK, LABEL_SCALE);
  buffer.drawGlyph('C', PAD, c.y, BLACK, LABEL_SCALE);
  buffer.drawText(caption, PAD, captionY, BLACK, LABEL_SCALE);

  if (strip !== undefined) {
    const hidden = compiled.parts.length - cells.length;
    const stripCaption = `PARTS ${cells.length}${hidden > 0 ? ` +${hidden} MORE` : ''}`;
    buffer.drawText(stripCaption, PAD, stripCaptionY, BLACK, LABEL_SCALE);
    for (const entry of placed) {
      drawCrop(buffer, entry.cell, entry.x, entry.y, compiled);
    }
  }

  const crops =
    strip === undefined
      ? undefined
      : placed.map((entry) => ({
          part: entry.cell.name,
          rect: {
            x: entry.x,
            y: entry.y,
            w: entry.cell.region.w * entry.cell.zoom,
            h: entry.cell.region.h * entry.cell.zoom,
          },
        }));

  return {
    png: encodePng(sheetWidth, sheetHeight, buffer.rgba),
    rgba: buffer.rgba,
    width: sheetWidth,
    height: sheetHeight,
    profile,
    zoom,
    panels: { a, b, c },
    ...(strip === undefined ? {} : { strip, crops }),
  };
}
