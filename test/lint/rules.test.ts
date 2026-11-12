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

  it('counts a diagonal neighbour as no neighbour', () => {
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
    expect(findings.map((finding) => finding.coord)).toEqual([
      [1, 1],
      [2, 2],
    ]);
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

  it('is bounded on a dense checkerboard', () => {
    const points: Array<[number, number]> = [];
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        if ((x + y) % 2 === 0) {
          points.push([x, y]);
        }
      }
    }
    const findings = ofCode(sprite([['set_pixels', points, 'main.0']], 16, 16), 'ORPHAN_PIXEL');

    expect(findings).toHaveLength(51);
    const marker = findings.at(-1) as LintFinding;
    expect(marker.truncated).toBe(true);
    expect(marker.count).toBe(128);
  });

  it('ignores transparent pixels', () => {
    expect(ofCode(sprite([]), 'ORPHAN_PIXEL')).toEqual([]);
  });
});
