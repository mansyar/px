/**
 * The debug sheet: three panels, one PNG, opt-in only.
 *
 *   A  8× nearest-neighbour with a 1px grid, a checkerboard under transparent
 *      pixels, coordinate rulers on the top and left, and a crosshair plus a
 *      box marker at every anchor.
 *   B  1× over a backdrop, so silhouette readability is judged at real size.
 *   C  black silhouette on white, so the shape reads without any palette at all.
 *
 * Every cue is shape or luminance, never hue: the sheet has to survive a
 * grayscale view. The composer is pure — no clock, no environment, no font
 * file — so the same recipe always yields the same bytes.
 */

import type { CompiledRecipe } from '../../core/compile.js';
import { PxError } from '../../core/errors.js';
import { hasBinaryAlpha, parseHex, type Rgba, TRANSPARENT_SLOT } from '../../core/palette.js';
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

/** Device pixels per source pixel in panel A. */
export const PANEL_SCALE = 8;

const CELL_GAP = 1;
const CELL_PITCH = PANEL_SCALE + CELL_GAP;
const PAD = 4;
const RULER_PAD = 2;
const LABEL_SCALE = 2;
const RULER_HEIGHT = GLYPH_HEIGHT + RULER_PAD * 2;

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const GRID: Rgba = { r: 128, g: 128, b: 128, a: 255 };
const CHECKER_LIGHT: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const CHECKER_DARK: Rgba = { r: 204, g: 204, b: 204, a: 255 };

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
  /** The scaled image area of each panel; panel A's rulers sit outside it. */
  panels: { a: PanelRect; b: PanelRect; c: PanelRect };
}

/** Where one source pixel lands in panel A, in sheet coordinates. */
export function panelACell(panel: PanelRect, x: number, y: number): PanelRect {
  return {
    x: panel.x + CELL_GAP + x * CELL_PITCH,
    y: panel.y + CELL_GAP + y * CELL_PITCH,
    w: PANEL_SCALE,
    h: PANEL_SCALE,
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

/** Digits per axis, so the left ruler is wide enough for the largest label. */
function labelStep(buffer: PixelBuffer, largest: number): number {
  const width = buffer.textWidth(String(largest));
  return Math.max(1, Math.ceil(width / CELL_PITCH));
}

function drawCells(buffer: PixelBuffer, panel: PanelRect, compiled: CompiledRecipe): void {
  const { width, height, flattened, slots } = compiled;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = panelACell(panel, x, y);
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

function drawGrid(buffer: PixelBuffer, panel: PanelRect, width: number, height: number): void {
  for (let x = 0; x <= width; x += 1) {
    buffer.fillRect(panel.x + x * CELL_PITCH, panel.y, CELL_GAP, panel.h, GRID);
  }
  for (let y = 0; y <= height; y += 1) {
    buffer.fillRect(panel.x, panel.y + y * CELL_PITCH, panel.w, CELL_GAP, GRID);
  }
}

function drawRulers(buffer: PixelBuffer, panel: PanelRect, width: number, height: number): void {
  const stepX = labelStep(buffer, width - 1);
  for (let x = 0; x < width; x += stepX) {
    const label = String(x);
    const cell = panelACell(panel, x, 0);
    const textX = cell.x + Math.floor((PANEL_SCALE - buffer.textWidth(label)) / 2);
    buffer.drawText(label, textX, panel.y - RULER_HEIGHT + RULER_PAD, BLACK);
  }

  const stepY = labelStep(buffer, height - 1);
  for (let y = 0; y < height; y += stepY) {
    const label = String(y);
    const cell = panelACell(panel, 0, y);
    const textX = panel.x - RULER_PAD - buffer.textWidth(label);
    const textY = cell.y + Math.floor((PANEL_SCALE - GLYPH_HEIGHT) / 2);
    buffer.drawText(label, textX, textY, BLACK);
  }
}

/**
 * A dashed two-tone crosshair that spans the panel, plus a box marker at the
 * anchor itself: a 3×3 black core inside a 5×5 white ring. Both read in
 * grayscale and neither depends on the sprite's colours.
 */
function drawAnchor(buffer: PixelBuffer, panel: PanelRect, anchorX: number, anchorY: number): void {
  const cell = panelACell(panel, anchorX, anchorY);
  const centreX = cell.x + Math.floor(PANEL_SCALE / 2);
  const centreY = cell.y + Math.floor(PANEL_SCALE / 2);

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

export function renderDebugSheet(
  compiled: CompiledRecipe,
  anchors: Anchors,
  options: DebugSheetOptions = {},
): DebugSheet {
  const { width, height } = compiled;
  const rgba = rasterizeSlots(compiled.flattened, width, height, compiled.slots);

  const imageWidth = width * CELL_PITCH + CELL_GAP;
  const imageHeight = height * CELL_PITCH + CELL_GAP;
  const digits = String(height - 1).length;
  const rulerWidth = digits * GLYPH_WIDTH + (digits - 1) + RULER_PAD * 2;
  const labelWidth = GLYPH_WIDTH * LABEL_SCALE;
  const imageX = PAD + labelWidth + PAD + rulerWidth;
  const imageY = PAD + RULER_HEIGHT;

  const a: PanelRect = { x: imageX, y: imageY, w: imageWidth, h: imageHeight };
  const b: PanelRect = { x: imageX, y: imageY + imageHeight + PAD, w: width, h: height };
  const c: PanelRect = { x: imageX, y: b.y + height + PAD, w: width, h: height };

  const sheetWidth = imageX + imageWidth + PAD;
  const sheetHeight = c.y + height + PAD;
  const buffer = new PixelBuffer(sheetWidth, sheetHeight);
  buffer.fillRect(0, 0, sheetWidth, sheetHeight, WHITE);

  drawCells(buffer, a, compiled);
  drawGrid(buffer, a, width, height);
  drawRulers(buffer, a, width, height);
  for (const anchor of Object.values(anchors)) {
    const [anchorX, anchorY] = anchor;
    if (anchorX < 0 || anchorY < 0 || anchorX >= width || anchorY >= height) {
      continue;
    }
    drawAnchor(buffer, a, anchorX, anchorY);
  }

  drawBackdropPanel(buffer, b, rgba, width, height, resolveBackdrop(options.backdrop));
  drawSilhouettePanel(buffer, c, rgba, width, height);

  buffer.drawGlyph('A', PAD, a.y, BLACK, LABEL_SCALE);
  buffer.drawGlyph('B', PAD, b.y, BLACK, LABEL_SCALE);
  buffer.drawGlyph('C', PAD, c.y, BLACK, LABEL_SCALE);

  return {
    png: encodePng(sheetWidth, sheetHeight, buffer.rgba),
    rgba: buffer.rgba,
    width: sheetWidth,
    height: sheetHeight,
    panels: { a, b, c },
  };
}
