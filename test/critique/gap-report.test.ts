/**
 * FR-11 / AC-9: the critique is a deterministic, ranked whole-image report and
 * every fix it proposes is a complete op that the engine can apply as-is.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CliIo } from '../../src/cli/main.js';
import { runCli } from '../../src/cli/main.js';
import { normalizeOp } from '../../src/core/recipe/normalize.js';
import { callTool } from '../../src/mcp/tools.js';

const dirs: string[] = [];

const DESIGN = {
  subject: 'prop',
  light: 'top-left',
  hierarchy: ['body'],
  values: { body: 3 },
  edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
  materials: ['steel'],
  style: '@project',
};

function workspace(withPixels: boolean): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-critique-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['steel'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'top-left',
      min_contrast: 2,
      value_rules: {},
    }),
  );
  const out = io(dir);
  const init = [
    'init',
    '--file',
    'hero.px.json',
    '--width',
    '32',
    '--height',
    '32',
    '--palette',
    JSON.stringify({
      steel: {
        ramp: {
          outline: '#000000',
          shadow: '#333333',
          base: '#888888',
          highlight: '#ffffff',
        },
      },
    }),
    '--parts',
    JSON.stringify({ body: { material: 'steel' } }),
    '--design',
    JSON.stringify(DESIGN),
  ];
  expect(runCli(init, out)).toBe(0);
  if (withPixels) {
    const draw = runCli(
      [
        'draw',
        '--file',
        'hero.px.json',
        '--ops',
        JSON.stringify([
          { op: 'rect', x: 8, y: 8, w: 12, h: 12, color: 'steel.base', part: 'body' },
        ]),
      ],
      out,
    );
    expect(draw).toBe(0);
  }
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

interface FindingsEnvelope {
  ok: boolean;
  command: string;
  fingerprint: string;
  render_sha256: string;
  criteria: Array<{
    criterion: string;
    intended: string;
    observed: string;
    gap: number;
    met: boolean;
  }>;
  findings: Array<{
    index: number;
    criterion: string;
    intended: string;
    observed: string;
    gap: number;
    fix: { op: unknown; why: string; expected_delta: string };
  }>;
  fixes_total: number;
  truncated: boolean;
  warnings?: Array<{ code: string }>;
}

function critique(dir: string): FindingsEnvelope {
  const out = io(dir);
  expect(runCli(['critique', '--file', 'hero.px.json'], out), out.state.text).toBe(0);
  return JSON.parse(out.state.text) as FindingsEnvelope;
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('px critique gap report', () => {
  it('reports intended vs observed for all six criteria', () => {
    const report = critique(workspace(true));
    expect(report.ok).toBe(true);
    expect(report.command).toBe('critique');
    expect(report.criteria.map((entry) => entry.criterion)).toEqual([
      'silhouette',
      'value_separation',
      'lighting',
      'edge_language',
      'cluster_discipline',
      'palette_craft',
    ]);
    for (const entry of report.criteria) {
      expect(entry.intended.length).toBeGreaterThan(0);
      expect(entry.observed.length).toBeGreaterThan(0);
      expect(entry.gap).toBeGreaterThanOrEqual(0);
    }
  });

  it('ranks findings by gap then criterion, with contiguous indices and complete fixes', () => {
    const report = critique(workspace(true));
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.map((finding) => finding.index)).toEqual(
      report.findings.map((_finding, index) => index),
    );
    for (let i = 1; i < report.findings.length; i += 1) {
      const prev = report.findings[i - 1];
      const current = report.findings[i];
      expect(prev !== undefined && current !== undefined).toBe(true);
      if (prev === undefined || current === undefined) {
        continue;
      }
      expect(prev.gap).toBeGreaterThanOrEqual(current.gap);
    }
    for (const finding of report.findings) {
      expect(finding.intended.length).toBeGreaterThan(0);
      expect(finding.observed.length).toBeGreaterThan(0);
      expect(finding.gap).toBeGreaterThan(0);
      expect(typeof finding.fix.op).toBe('object');
      expect(finding.fix.op).not.toBeNull();
      expect(finding.fix.why.length).toBeGreaterThan(0);
      expect(finding.fix.expected_delta).toMatch(/^\w+: [+-]\d/);
      // The source-checked claim: every fix.op is a complete op px fix can apply.
      expect(() => normalizeOp(finding.fix.op, 0, 'base')).not.toThrow();
    }
    expect(report.fixes_total).toBe(report.findings.length);
    expect(report.truncated).toBe(false);
  });

  it('explains the edge fix with the op it actually emits', () => {
    const report = critique(workspace(true));
    const edge = report.findings.find((finding) => finding.criterion === 'edge_language');
    expect(edge).toBeDefined();
    expect(edge?.fix.op).toMatchObject({ op: 'auto_outline' });
    expect(edge?.fix.why).toContain('auto_outline');
    expect(edge?.fix.why).not.toContain('harmonize');
    expect(edge?.fix.why.endsWith('.')).toBe(true);
  });

  it('is deterministic: the same recipe renders the same report and fingerprint', () => {
    const dir = workspace(true);
    expect(critique(dir)).toEqual(critique(dir));
  });

  it('reports an empty canvas with no fixes', () => {
    const report = critique(workspace(false));
    expect(report.findings).toEqual([]);
    expect(report.fixes_total).toBe(0);
    expect(report.truncated).toBe(false);
    expect(report.warnings?.map((warning) => warning.code)).toContain('W_CRITIQUE_EMPTY');
  });

  it('publishes the critique verb in help and the MCP tool returns the same report', () => {
    const helpOut = io(workspace(true));
    expect(runCli(['--help'], helpOut)).toBe(0);
    const help = JSON.parse(helpOut.state.text) as { commands: string[]; usage: string[] };
    expect(help.commands).toContain('critique');
    expect(help.usage.some((entry) => entry.includes('px critique'))).toBe(true);

    const dir = workspace(true);
    const result = callTool('px_critique', { file: 'hero.px.json' }, { cwd: dir });
    expect(result.isError).toBeUndefined();
    const block = result.content[0];
    const envelope = JSON.parse(block?.type === 'text' ? block.text : '{}') as FindingsEnvelope;
    expect(envelope.ok).toBe(true);
    expect(envelope.command).toBe('critique');
    expect(envelope.findings.length).toBeGreaterThan(0);
    for (const finding of envelope.findings) {
      expect(() => normalizeOp(finding.fix.op, 0, 'base')).not.toThrow();
    }
  });
});
