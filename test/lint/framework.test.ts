import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import type { PxWarning } from '../../src/core/errors.js';
import { buildSlotTable } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { FindingCollector } from '../../src/lint/collector.js';
import { compareFindings, lint, lintBlocks, lintCompiled } from '../../src/lint/index.js';
import { MAX_FINDINGS_PER_CODE } from '../../src/lint/thresholds.js';
import type { LintCode, LintContext, LintFinding, LintSeverity } from '../../src/lint/types.js';

function cleanRecipe(width = 8, height = 8): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'clean', width, height, alpha_mode: 'binary' },
    palette: { main: { colors: ['#000000', '#ffffff'] } },
    anchors: { pivot: [3, 3] },
    layers: [
      {
        id: 'base',
        ops: [
          ['rect', 1, 1, 6, 6, 'main.0'],
          // Two stripes break the stacked equal runs, so the fixture is clean
          // under BANDING too: it tests the framework, not one rule.
          ['rect', 1, 2, 6, 1, 'main.1'],
          ['rect', 1, 5, 6, 1, 'main.1'],
        ],
      },
    ],
  });
}

function synthetic(code: LintCode, severity: LintSeverity, coord?: [number, number]): LintFinding {
  const finding: LintFinding = { code, severity, message: `${code} at fixture` };
  if (coord !== undefined) {
    finding.coord = coord;
  }
  return finding;
}

function emptyContext(warnings: PxWarning[] = []): LintContext {
  return {
    width: 8,
    height: 8,
    flattened: new Int16Array(64).fill(-1),
    slots: buildSlotTable({ main: { colors: ['#000000'] } }),
    layers: [{ id: 'base', slots: new Int16Array(64).fill(-1) }],
    warnings,
  };
}

describe('linter framework', () => {
  it('reports nothing for a clean sprite', () => {
    const compiled = compileRecipe(parseRecipe(cleanRecipe()).recipe);
    expect(lintCompiled(compiled)).toEqual([]);
  });

  it('accepts an empty context without findings', () => {
    expect(lint(emptyContext())).toEqual([]);
  });

  it('orders findings by severity, then code, then coordinate', () => {
    const ordered = [
      synthetic('LOW_CONTRAST', 'info', [0, 0]),
      synthetic('ORPHAN_PIXEL', 'warning', [3, 4]),
      synthetic('ORPHAN_PIXEL', 'warning', [1, 4]),
      synthetic('ORPHAN_PIXEL', 'warning', [7, 2]),
      synthetic('JAGGY_LINE', 'warning', [0, 0]),
      synthetic('OUT_OF_BOUNDS', 'error', [9, 9]),
    ].sort(compareFindings);

    expect(
      ordered.map((finding) => `${finding.severity}/${finding.code}/${finding.coord}`),
    ).toEqual([
      'error/OUT_OF_BOUNDS/9,9',
      'warning/JAGGY_LINE/0,0',
      'warning/ORPHAN_PIXEL/7,2',
      'warning/ORPHAN_PIXEL/1,4',
      'warning/ORPHAN_PIXEL/3,4',
      'info/LOW_CONTRAST/0,0',
    ]);
  });

  it('sorts findings without a coordinate last within their code', () => {
    const withMarker: LintFinding = {
      code: 'ORPHAN_PIXEL',
      severity: 'warning',
      message: 'truncated',
      truncated: true,
      count: 90,
    };
    const ordered = [withMarker, synthetic('ORPHAN_PIXEL', 'warning', [2, 2])].sort(
      compareFindings,
    );
    expect(ordered[0]?.coord).toEqual([2, 2]);
    expect(ordered[1]?.truncated).toBe(true);
  });

  it('bounds each code at the configured cap and states the total', () => {
    const collector = new FindingCollector('ORPHAN_PIXEL', 'warning');
    for (let index = 0; index < MAX_FINDINGS_PER_CODE + 7; index += 1) {
      collector.add({ message: `orphan ${index}`, coord: [index, 0] });
    }
    const findings = collector.finish();

    expect(findings).toHaveLength(MAX_FINDINGS_PER_CODE + 1);
    const marker = findings.at(-1) as LintFinding;
    expect(marker).toMatchObject({
      code: 'ORPHAN_PIXEL',
      severity: 'warning',
      truncated: true,
      count: MAX_FINDINGS_PER_CODE + 7,
    });
    expect(marker.coord).toBeUndefined();
    expect(marker.message).toContain(String(MAX_FINDINGS_PER_CODE + 7));
    expect(findings[0]?.coord).toEqual([0, 0]);
  });

  it('adds no marker when a code is exactly at the cap', () => {
    const collector = new FindingCollector('JAGGY_LINE', 'info');
    for (let index = 0; index < MAX_FINDINGS_PER_CODE; index += 1) {
      collector.add({ message: `edge ${index}`, coord: [index, 0] });
    }
    const findings = collector.finish();
    expect(findings).toHaveLength(MAX_FINDINGS_PER_CODE);
    expect(findings.some((finding) => finding.truncated === true)).toBe(false);
  });

  it('gates on warnings only under strict', () => {
    const info = [synthetic('JAGGY_LINE', 'info', [0, 0])];
    const warning = [synthetic('ORPHAN_PIXEL', 'warning', [0, 0])];
    const error = [synthetic('OUT_OF_BOUNDS', 'error')];

    expect(lintBlocks(info, false)).toBe(false);
    expect(lintBlocks(info, true)).toBe(false);
    expect(lintBlocks(warning, false)).toBe(false);
    expect(lintBlocks(warning, true)).toBe(true);
    expect(lintBlocks(error, false)).toBe(true);
    expect(lintBlocks([], true)).toBe(false);
  });
});
