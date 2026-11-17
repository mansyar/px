/**
 * NFR-4 / AC-15: a large canvas still yields a bounded response. The cap is
 * applied after ranking; `fixes_total` reports what was found before the cut
 * and `truncated` says whether the cut removed anything.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CliIo } from '../../src/cli/main.js';
import { runCli } from '../../src/cli/main.js';
import { normalizeOp } from '../../src/core/recipe/normalize.js';
import {
  boundFindings,
  CRITIQUE_CRITERIA,
  CRITIQUE_MAX_FIXES,
  type CritiqueFinding,
} from '../../src/critique/index.js';

const dirs: string[] = [];

const DESIGN = {
  subject: 'scene',
  light: 'top-left',
  hierarchy: ['structure'],
  values: { structure: 3 },
  edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
  materials: ['wood'],
  style: '@project',
};

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-bounded-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['wood'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'top-left',
      min_contrast: 2,
      value_rules: {},
    }),
  );
  const out = io(dir);
  expect(
    runCli(
      [
        'init',
        '--file',
        'hero.px.json',
        '--width',
        '256',
        '--height',
        '256',
        '--palette',
        JSON.stringify({
          wood: {
            ramp: {
              outline: '#000000',
              shadow: '#333333',
              base: '#888888',
              highlight: '#ffffff',
            },
          },
        }),
        '--parts',
        JSON.stringify({ structure: { material: 'wood' } }),
        '--design',
        JSON.stringify(DESIGN),
      ],
      out,
    ),
  ).toBe(0);
  expect(
    runCli(
      [
        'draw',
        '--file',
        'hero.px.json',
        '--ops',
        JSON.stringify([
          { op: 'rect', x: 16, y: 16, w: 224, h: 224, color: 'wood.base', part: 'structure' },
        ]),
      ],
      out,
    ),
  ).toBe(0);
  return dir;
}

function io(cwd: string): CliIo & { state: { text: string } } {
  const state = { text: '' };
  return {
    cwd,
    stdout: (chunk: string) => {
      state.text += chunk;
    },
    stderr: () => undefined,
    state,
  };
}

interface BoundedEnvelope {
  ok: boolean;
  width: number;
  height: number;
  criteria: unknown[];
  findings: CritiqueFinding[];
  fixes_total: number;
  truncated: boolean;
  render_sha256: string;
}

function critique(dir: string): BoundedEnvelope {
  const out = io(dir);
  expect(runCli(['critique', '--file', 'hero.px.json'], out)).toBe(0);
  return JSON.parse(out.state.text) as BoundedEnvelope;
}

function findings(count: number): CritiqueFinding[] {
  return Array.from({ length: count }, (_unused, index) => ({
    index: 0,
    criterion: CRITIQUE_CRITERIA[index % CRITIQUE_CRITERIA.length] ?? 'silhouette',
    intended: 'target',
    observed: 'observed',
    gap: count - index,
    fix: {
      op: { op: 'deband', marker: index },
      why: 'synthetic finding for the cap test',
      expected_delta: 'deband: +1',
    },
  }));
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('bounded critique response', () => {
  it('enforces the cap after ranking and reports the true total', () => {
    expect(CRITIQUE_MAX_FIXES).toBe(20);
    const many = findings(25);
    const bounded = boundFindings(many);
    expect(bounded.findings).toHaveLength(20);
    expect(bounded.fixes_total).toBe(25);
    expect(bounded.truncated).toBe(true);
    expect(bounded.findings.map((finding) => finding.index)).toEqual(
      Array.from({ length: 20 }, (_unused, index) => index),
    );
    expect(bounded.findings.map((finding) => finding.gap)).toEqual(
      Array.from({ length: 20 }, (_unused, index) => 25 - index),
    );
    expect(bounded.findings.every((finding) => finding.fix.op !== undefined)).toBe(true);
  });

  it('does not mark a response truncated at or below the cap', () => {
    const exact = boundFindings(findings(20));
    expect(exact.findings).toHaveLength(20);
    expect(exact.fixes_total).toBe(20);
    expect(exact.truncated).toBe(false);
    const under = boundFindings(findings(19));
    expect(under.findings).toHaveLength(19);
    expect(under.fixes_total).toBe(19);
    expect(under.truncated).toBe(false);
  });

  it('returns a bounded, complete report for a 256x256 canvas', () => {
    const dir = workspace();
    const report = critique(dir);
    expect({ width: report.width, height: report.height }).toEqual({ width: 256, height: 256 });
    expect(report.criteria).toHaveLength(CRITIQUE_CRITERIA.length);
    expect(report.findings.length).toBeLessThanOrEqual(CRITIQUE_MAX_FIXES);
    expect(report.fixes_total).toBe(report.findings.length);
    expect(report.truncated).toBe(false);
    for (const finding of report.findings) {
      expect(finding.index).toBeGreaterThanOrEqual(0);
      expect(finding.fix.why.length).toBeGreaterThan(0);
      expect(finding.fix.expected_delta.length).toBeGreaterThan(0);
      expect(() => normalizeOp(finding.fix.op, 0, 'base')).not.toThrow();
    }
    expect(critique(dir).render_sha256).toBe(report.render_sha256);
  });

  it('adds no runtime dependency to the single MCP SDK', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies)).toEqual(['@modelcontextprotocol/sdk']);
  });
});
