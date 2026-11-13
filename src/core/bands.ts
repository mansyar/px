/**
 * Band detection: equal-width parallel runs of one tone, stacked in rows.
 *
 * This is the shape `BANDING` reports and `deband` breaks, so both read it from
 * here — one detector, or the cleanup pass would drift from the rule that
 * justifies it.
 *
 * Per row, a run is a maximal stretch of one tone owned by one part. A band is a
 * maximal sequence of three or more consecutive rows whose runs share a start,
 * an end, a tone and an owner. A one-row gap ends a band.
 */

import { UNOWNED } from './canvas.js';
import { TRANSPARENT_SLOT } from './palette.js';

export interface Band {
  /** First row of the band. */
  start: number;
  /** Last row of the band, inclusive. */
  end: number;
  /** First column of the run. */
  from: number;
  /** Last column of the run, inclusive. */
  to: number;
  tone: number;
  /** Owner index, `UNOWNED` for the implicit single group. */
  owner: number;
}

export interface BandGrid {
  width: number;
  height: number;
  slots: Int16Array;
  /**
   * Part index per pixel, or null to group every painted pixel as one part.
   * `deband` uses null on a recipe that declares no parts.
   */
  owners: Int16Array | null;
  /** Declared parts; pixels owned outside `0 .. partCount-1` are ignored. */
  partCount: number;
}

interface Run {
  tone: number;
  owner: number;
  from: number;
  to: number;
  rows: number[];
}

function rowRuns(grid: BandGrid): Run[] {
  const runs = new Map<string, Run>();
  for (let y = 0; y < grid.height; y += 1) {
    let start = 0;
    let current: { tone: number; owner: number } | null = null;
    for (let x = 0; x <= grid.width; x += 1) {
      let cell: { tone: number; owner: number } | null = null;
      if (x < grid.width) {
        const offset = y * grid.width + x;
        const tone = grid.slots[offset];
        if (tone !== undefined && tone !== TRANSPARENT_SLOT) {
          const owner = grid.owners === null ? UNOWNED : (grid.owners[offset] ?? UNOWNED);
          if (grid.owners === null || (owner >= 0 && owner < grid.partCount)) {
            cell = { tone, owner };
          }
        }
      }
      const same =
        cell !== null &&
        current !== null &&
        cell.tone === current.tone &&
        cell.owner === current.owner;
      if (same) {
        continue;
      }
      if (current !== null) {
        const key = `${current.owner}:${current.tone}:${start}:${x - 1}`;
        const run = runs.get(key);
        if (run === undefined) {
          runs.set(key, { ...current, from: start, to: x - 1, rows: [y] });
        } else {
          run.rows.push(y);
        }
      }
      if (x < grid.width) {
        current = cell;
        start = x;
      } else {
        current = null;
      }
    }
  }
  return [...runs.values()];
}

/** Every band in the grid, in first-row order. */
export function findBands(grid: BandGrid): Band[] {
  const bands: Band[] = [];
  for (const run of rowRuns(grid)) {
    let first = run.rows[0];
    let count = 1;
    for (let index = 1; index <= run.rows.length; index += 1) {
      const row = run.rows[index];
      if (row !== undefined && first !== undefined && row === first + count) {
        count += 1;
        continue;
      }
      if (first !== undefined && count >= 3) {
        bands.push({
          start: first,
          end: first + count - 1,
          from: run.from,
          to: run.to,
          tone: run.tone,
          owner: run.owner,
        });
      }
      first = row;
      count = 1;
    }
  }
  return bands;
}

/** The pixels of a band's first row, or of its middle row when asked. */
export function bandRow(band: Band, middle: boolean): Array<[number, number]> {
  const row = middle ? band.start + Math.floor((band.end - band.start) / 2) : band.start;
  const coords: Array<[number, number]> = [];
  for (let x = band.from; x <= band.to; x += 1) {
    coords.push([x, row]);
  }
  return coords;
}
