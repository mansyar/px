import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { lintCompiled } from '../../src/lint/index.js';
import type { LintCode, LintFinding } from '../../src/lint/types.js';

function sprite(ops: unknown[], colors: string[] = ['#000000'], width = 8, height = 8): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'fixture', width, height, alpha_mode: 'binary' },
    palette: { main: { colors } },
    anchors: {},
    layers: [{ id: 'base', ops }],
  });
}

function ofCode(text: string, code: LintCode): LintFinding[] {
  return lintCompiled(compileRecipe(parseRecipe(text).recipe)).filter(
    (finding) => finding.code === code,
  );
}

/** Rows 0-5 whose left edge runs 2,1,3: the irregular staircase from the brief. */
function irregularStaircase(): unknown[] {
  const points: Array<[number, number]> = [];
  const spans: Array<[number, number]> = [
    [0, 5],
    [0, 5],
    [1, 5],
    [2, 5],
    [2, 5],
    [2, 5],
  ];
  spans.forEach(([from, to], y) => {
    for (let x = from; x <= to; x += 1) {
      points.push([x, y]);
    }
  });
  return [['set_pixels', points, 'main.0']];
}

describe('JAGGY_LINE', () => {
  it('reports the run of an uneven staircase as one finding with its pixels', () => {
    const findings = ofCode(sprite(irregularStaircase()), 'JAGGY_LINE');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'info', code: 'JAGGY_LINE' });
    expect(findings[0]?.message).toContain('2,1,3');
    expect(findings[0]?.message).toContain('left edge');
    expect(findings[0]?.coords).toEqual([
      [0, 0],
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [2, 5],
    ]);
  });

  it('stays silent on a regular 45-degree diagonal', () => {
    const findings = ofCode(
      sprite([
        [
          'set_pixels',
          [
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5],
          ],
          'main.0',
        ],
      ]),
      'JAGGY_LINE',
    );
    expect(findings).toEqual([]);
  });

  it('stays silent on a regular 2,2,2 staircase', () => {
    const findings = ofCode(
      sprite([
        [
          'set_pixels',
          [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
            [5, 0],
            [0, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [4, 1],
            [5, 1],
            [2, 2],
            [3, 2],
            [4, 2],
            [5, 2],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
            [4, 4],
            [5, 4],
            [4, 5],
            [5, 5],
          ],
          'main.0',
        ],
      ]),
      'JAGGY_LINE',
    );
    expect(findings).toEqual([]);
  });

  it('stays silent when the edge jumps by more than one pixel', () => {
    const findings = ofCode(
      sprite([
        [
          'set_pixels',
          [
            [0, 0],
            [1, 0],
            [4, 1],
            [5, 1],
            [6, 2],
            [7, 2],
          ],
          'main.0',
        ],
      ]),
      'JAGGY_LINE',
    );
    expect(findings).toEqual([]);
  });

  it('stays silent on an empty canvas', () => {
    expect(ofCode(sprite([]), 'JAGGY_LINE')).toEqual([]);
  });
});

describe('LOW_CONTRAST', () => {
  const NEAR_GREY = '#8a8a8a';

  it('fires on edge pixels that vanish into the default backdrop', () => {
    const findings = ofCode(sprite([['rect', 1, 1, 4, 4, 'main.0']], [NEAR_GREY]), 'LOW_CONTRAST');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'warning', code: 'LOW_CONTRAST' });
    expect(findings[0]?.message).toContain('#808080');
    expect(findings[0]?.message).toContain('12 of 12 edge pixels');
    expect(findings[0]?.message).toContain('100%');
    expect(findings[0]?.coords).toHaveLength(12);
  });

  it('reports the share of edge pixels, not the whole silhouette', () => {
    const findings = ofCode(
      sprite(
        [
          ['rect', 0, 0, 2, 2, 'main.0'],
          ['rect', 4, 4, 4, 4, 'main.1'],
        ],
        [NEAR_GREY, '#000000'],
      ),
      'LOW_CONTRAST',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('4 of 16 edge pixels');
    expect(findings[0]?.message).toContain('25%');
  });

  it('stays silent when every edge pixel clears the floor', () => {
    expect(ofCode(sprite([['rect', 1, 1, 4, 4, 'main.0']], ['#000000']), 'LOW_CONTRAST')).toEqual(
      [],
    );
    expect(ofCode(sprite([['rect', 1, 1, 4, 4, 'main.0']], ['#ffffff']), 'LOW_CONTRAST')).toEqual(
      [],
    );
  });

  it('caps the quoted coordinates and says so', () => {
    const points: Array<[number, number]> = [];
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        if ((x + y) % 2 === 0) {
          points.push([x, y]);
        }
      }
    }
    const findings = ofCode(
      sprite([['set_pixels', points, 'main.0']], [NEAR_GREY], 16, 16),
      'LOW_CONTRAST',
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.coords).toHaveLength(50);
    expect(findings[0]?.message).toContain('first 50 coordinates quoted');
  });

  it('stays silent on an empty canvas', () => {
    expect(ofCode(sprite([]), 'LOW_CONTRAST')).toEqual([]);
  });
});
