/**
 * FR-12 / AC-9: a ranked fix is applied as a complete recipe op, the recipe is
 * only appended to, and staleness is detected against the current render.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const STEEL = { outline: '#000000', shadow: '#333333', base: '#888888', highlight: '#ffffff' };

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

function workspace(options: { noop?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-fix-'));
  dirs.push(dir);
  const design = options.noop === true ? { ...DESIGN, materials: ['steel', 'wood'] } : DESIGN;
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: options.noop === true ? ['steel', 'wood'] : ['steel'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'top-left',
      min_contrast: 0,
      value_rules: {},
    }),
  );
  const out = io(dir);
  const palette =
    options.noop === true
      ? {
          steel: { ramp: STEEL },
          wood: {
            ramp: {
              outline: '#888888',
              shadow: '#888888',
              base: '#888888',
              highlight: '#888888',
            },
          },
        }
      : { steel: { ramp: STEEL } };
  expect(
    runCli(
      [
        'init',
        '--file',
        'hero.px.json',
        '--width',
        '32',
        '--height',
        '32',
        '--palette',
        JSON.stringify(palette),
        '--parts',
        JSON.stringify({ body: { material: 'steel' } }),
        '--design',
        JSON.stringify(design),
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
          { op: 'rect', x: 8, y: 8, w: 12, h: 12, color: 'steel.base', part: 'body' },
        ]),
      ],
      out,
    ),
  ).toBe(0);
  return dir;
}

interface Envelope {
  ok: boolean;
  error?: { code: string; message: string };
  fingerprint: string;
  render_sha256: string;
  findings: Array<{
    index: number;
    criterion: string;
    fix: { op: Record<string, unknown>; why: string; expected_delta: string };
  }>;
  fix?: { index: number; op: Record<string, unknown>; before_sha256: string; after_sha256: string };
  warnings?: Array<{ code: string }>;
}

function envelope(text: string): Envelope {
  return JSON.parse(text) as Envelope;
}

function critique(dir: string): Envelope {
  const out = io(dir);
  expect(runCli(['critique', '--file', 'hero.px.json'], out), out.state.text).toBe(0);
  return envelope(out.state.text);
}

function fix(dir: string, finding: number, sha256?: string): { code: number; body: Envelope } {
  const out = io(dir);
  const argv = ['fix', '--file', 'hero.px.json', '--finding', String(finding)];
  if (sha256 !== undefined) {
    argv.push('--sha256', sha256);
  }
  const code = runCli(argv, out);
  return { code, body: envelope(out.state.text) };
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('px fix', () => {
  it('appends the complete op without rewriting existing ops or digests', () => {
    const dir = workspace();
    const before = critique(dir);
    const target = before.findings[0];
    expect(target).toBeDefined();
    if (target === undefined) {
      return;
    }
    const opsBefore = (
      JSON.parse(readFileSync(join(dir, 'hero.px.json'), 'utf8')) as {
        layers: Array<{ ops: unknown[] }>;
      }
    ).layers[0]?.ops;
    const result = fix(dir, target.index, before.render_sha256);
    expect(result.code, JSON.stringify(result.body)).toBe(0);
    expect(result.body.fix?.index).toBe(target.index);
    expect(result.body.fix?.op).toEqual(target.fix.op);
    expect(result.body.fix?.before_sha256).toBe(before.render_sha256);
    expect(result.body.fix?.after_sha256).toMatch(/^[0-9a-f]{64}$/);
    const opsAfter = (
      JSON.parse(readFileSync(join(dir, 'hero.px.json'), 'utf8')) as {
        layers: Array<{ ops: unknown[] }>;
      }
    ).layers[0]?.ops;
    expect(opsAfter?.slice(0, opsBefore?.length)).toEqual(opsBefore);
    const appended = opsAfter?.at(-1);
    expect(appended).toBeDefined();
    const expected = normalizeOp(target.fix.op, opsBefore?.length ?? 0, 'base');
    const actual = normalizeOp(appended, opsBefore?.length ?? 0, 'base');
    // The serializer drops the default outline width, so compare the semantic
    // core of the op rather than a field the canonical form omits.
    expect({ ...expected, width: undefined }).toEqual({ ...actual, width: undefined });
  });

  it('each ranked fix changes the render when applied (AC-9)', () => {
    const indices = critique(workspace()).findings.map((finding) => finding.index);
    expect(indices.length).toBeGreaterThan(0);
    for (const index of indices) {
      const dir = workspace();
      const before = critique(dir);
      const finding = before.findings.find((entry) => entry.index === index);
      expect(finding).toBeDefined();
      if (finding === undefined) {
        continue;
      }
      expect(String(finding.fix.op.op).length).toBeGreaterThan(0);
      expect(finding.fix.why.length).toBeGreaterThan(0);
      expect(finding.fix.expected_delta).toMatch(/^\w+: [+-]\d/);
      const result = fix(dir, index, before.render_sha256);
      expect(result.code, `${finding.criterion}: ${JSON.stringify(result.body)}`).toBe(0);
      expect(
        result.body.fix?.after_sha256,
        `finding ${index} (${finding.criterion}) did not change the render: ${JSON.stringify(result.body.fix?.op)}`,
      ).not.toBe(before.render_sha256);
    }
  });

  it('rejects a finding that is not in the current report', () => {
    const dir = workspace();
    const result = fix(dir, 99);
    expect(result.code).toBe(1);
    expect(result.body.ok).toBe(false);
    expect(result.body.error?.code).toBe('E_FIX_STALE');
    expect(result.body.error?.message).toContain('99');
    expect(result.body.error?.message).toMatch(/[0-9a-f]{64}/);
  });

  it('rejects a finding when the picture changed after the critique', () => {
    const dir = workspace();
    const report = critique(dir);
    const out = io(dir);
    expect(
      runCli(
        [
          'draw',
          '--file',
          'hero.px.json',
          '--ops',
          JSON.stringify([
            { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.highlight', part: 'body' },
          ]),
        ],
        out,
      ),
    ).toBe(0);
    const result = fix(dir, 0, report.render_sha256);
    expect(result.code).toBe(1);
    expect(result.body.error?.code).toBe('E_FIX_STALE');
    expect(result.body.error?.message).toContain(report.render_sha256);
    expect(result.body.error?.message).toMatch(/current digest [0-9a-f]{64}/);
  });

  it('reports W_FIX_NOOP when the applied op leaves the render unchanged', () => {
    const dir = workspace({ noop: true });
    const report = critique(dir);
    const target = report.findings.find((finding) => finding.criterion === 'palette_craft');
    expect(target).toBeDefined();
    if (target === undefined) {
      return;
    }
    const result = fix(dir, target.index, report.render_sha256);
    expect(result.code, JSON.stringify(result.body)).toBe(0);
    expect(result.body.fix?.op).toEqual(target.fix.op);
    expect(result.body.fix?.after_sha256).toBe(result.body.fix?.before_sha256);
    expect(result.body.warnings?.some((warning) => warning.code === 'W_FIX_NOOP')).toBe(true);
  });

  it('exposes the same fix through MCP', () => {
    const dir = workspace();
    const report = critique(dir);
    const first = callTool('px_fix', { file: 'hero.px.json', finding: 0 }, { cwd: dir }).content[0];
    const text = first !== undefined && 'text' in first ? first.text : undefined;
    expect(text).toBeDefined();
    const result = envelope(text ?? '{}');
    expect(result.ok).toBe(true);
    expect(result.fix?.index).toBe(0);
    expect(result.fix?.before_sha256).toBe(report.render_sha256);
    expect(result.fix?.after_sha256).not.toBe(report.render_sha256);
  });
});
