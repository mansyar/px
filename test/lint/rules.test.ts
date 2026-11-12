import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { lintCompiled } from '../../src/lint/index.js';
import type { LintCode, LintFinding } from '../../src/lint/types.js';

function sprite(
  ops: unknown[],
  width = 8,
  height = 8,
  palette: Record<string, unknown> = { main: { colors: ['#000000', '#ffffff'] } },
): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'fixture', width, height, alpha_mode: 'binary' },
    palette,
    anchors: {},
    layers: [{ id: 'base', ops }],
  });
}

function ofCode(text: string, code: LintCode): LintFinding[] {
  return lintCompiled(compileRecipe(parseRecipe(text).recipe)).filter(
    (finding) => finding.code === code,
  );
}

describe('OUT_OF_BOUNDS', () => {
  it('reports one finding per clipped op with the first clipped coordinate', () => {
    const findings = ofCode(sprite([['rect', -2, -1, 4, 3, 'main.0']]), 'OUT_OF_BOUNDS');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'OUT_OF_BOUNDS',
      severity: 'warning',
      coord: [-2, -1],
      layer: 'base',
      op_index: 0,
    });
    expect(findings[0]?.message).toContain('wrote outside');
  });

  it('stays silent when every op lands inside the canvas', () => {
    expect(ofCode(sprite([['rect', 0, 0, 8, 8, 'main.0']]), 'OUT_OF_BOUNDS')).toEqual([]);
  });

  it('reports an op that falls entirely outside once', () => {
    const findings = ofCode(sprite([['rect', 20, 20, 2, 2, 'main.0']]), 'OUT_OF_BOUNDS');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.coord).toEqual([20, 20]);
  });

  it('never reports an anchor warning as an out-of-bounds pixel', () => {
    const text = JSON.stringify({
      version: 1,
      meta: { name: 'anchor', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: { pivot: [9, 9] },
      layers: [{ id: 'base', ops: [['rect', 0, 0, 2, 2, 'main.0']] }],
    });
    expect(ofCode(text, 'OUT_OF_BOUNDS')).toEqual([]);
  });
});

describe('ORPHAN_PIXEL', () => {
  it('fires on a lone pixel', () => {
    const findings = ofCode(sprite([['set_pixels', [[2, 3]], 'main.0']]), 'ORPHAN_PIXEL');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'warning', coord: [2, 3] });
    expect(findings[0]?.message).toContain('(2, 3)');
  });

  it('stays silent when pixels touch 4-way', () => {
    expect(
      ofCode(
        sprite([
          [
            'set_pixels',
            [
              [1, 1],
              [2, 1],
              [1, 2],
              [2, 2],
            ],
            'main.0',
          ],
        ]),
        'ORPHAN_PIXEL',
      ),
    ).toEqual([]);
  });

  it('counts a diagonal neighbour as a neighbour', () => {
    const findings = ofCode(
      sprite([
        [
          'set_pixels',
          [
            [1, 1],
            [2, 2],
          ],
          'main.0',
        ],
      ]),
      'ORPHAN_PIXEL',
    );
    expect(findings).toEqual([]);
  });

  it('reads the flattened grid, so a later layer can rescue a pixel', () => {
    const text = JSON.stringify({
      version: 1,
      meta: { name: 'layers', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000', '#ffffff'] } },
      anchors: {},
      layers: [
        { id: 'under', ops: [['set_pixels', [[4, 4]], 'main.0']] },
        { id: 'over', ops: [['set_pixels', [[5, 4]], 'main.1']] },
      ],
    });
    expect(ofCode(text, 'ORPHAN_PIXEL')).toEqual([]);
  });

  it('is bounded on a stipple of isolated pixels', () => {
    // Every fourth pixel in both axes: 64 dots, four apart, so none is within
    // reach of another and each one is a true orphan; the collector hits its cap.
    const points: Array<[number, number]> = [];
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x += 4) {
        points.push([x, y]);
      }
    }
    const findings = ofCode(sprite([['set_pixels', points, 'main.0']], 32, 32), 'ORPHAN_PIXEL');

    expect(findings).toHaveLength(51);
    const marker = findings.at(-1) as LintFinding;
    expect(marker.truncated).toBe(true);
    expect(marker.count).toBe(64);
  });

  it('ignores transparent pixels', () => {
    expect(ofCode(sprite([]), 'ORPHAN_PIXEL')).toEqual([]);
  });

  it('stays silent on a 1-px diagonal line, which the engine draws', () => {
    expect(ofCode(sprite([['line', 0, 0, 7, 7, 'main.0']]), 'ORPHAN_PIXEL')).toEqual([]);
  });

  it('stays silent on a 50% checker dither, which the engine draws', () => {
    expect(
      ofCode(sprite([['dither_fill', 0, 0, 8, 8, 'main.0', 'checker_50']]), 'ORPHAN_PIXEL'),
    ).toEqual([]);
  });

  it('stays silent on a bayer_25 dither over transparency, which the engine draws', () => {
    // bayer_25 lights (0,0), (2,0), (0,2) and (2,2) of every 4x4 tile, so its
    // nearest neighbour is two pixels away in both axes. A 1-px radius cannot
    // tell this sanctioned fade from a defect; the rule's radius of 2 can.
    expect(
      ofCode(sprite([['dither_fill', 0, 0, 8, 8, 'main.0', 'bayer_25']]), 'ORPHAN_PIXEL'),
    ).toEqual([]);
  });

  it('treats a pixel two away as a neighbour, pinning the radius boundary', () => {
    expect(
      ofCode(
        sprite([
          [
            'set_pixels',
            [
              [2, 2],
              [4, 2],
            ],
            'main.0',
          ],
        ]),
        'ORPHAN_PIXEL',
      ),
    ).toEqual([]);
  });

  it('flags a lone pixel whose nearest painted pixel is three away in any direction', () => {
    for (const partner of [
      [7, 4],
      [4, 7],
      [7, 7],
    ]) {
      const findings = ofCode(
        sprite([['set_pixels', [[4, 4], partner], 'main.0']]),
        'ORPHAN_PIXEL',
      );
      // Both pixels sit outside each other's radius-2 neighbourhood, so both
      // report rather than one rescuing the other.
      expect(findings.map((finding) => finding.coord)).toEqual([[4, 4], partner]);
    }
  });
});
