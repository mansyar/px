/**
 * FR-15: every design field is authorable through `px init --design` and the
 * same parameter on the existing px_init MCP tool, in the same surface.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXIT_OK } from '../../src/cli/envelope.js';
import { runCli } from '../../src/cli/main.js';
import { argvFor, callTool } from '../../src/mcp/tools.js';

const dirs: string[] = [];

const DESIGN = {
  subject: 'lantern',
  light: 'top-left',
  hierarchy: ['body'],
  values: { body: 3 },
  edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
  materials: ['ink'],
  style: '@project',
};

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-author-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['ink'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'bottom-right',
      min_contrast: 2,
      value_rules: {},
    }),
  );
  return dir;
}

function io(cwd: string) {
  let text = '';
  return {
    cwd,
    stdout: (chunk: string) => {
      text += chunk;
    },
    stderr: () => undefined,
    get text() {
      return text;
    },
  };
}

function initArgs(file = 'hero.px.json'): string[] {
  return [
    'init',
    '--file',
    file,
    '--width',
    '16',
    '--height',
    '16',
    '--palette',
    JSON.stringify({
      ink: {
        ramp: {
          outline: '#000000',
          shadow: '#333333',
          base: '#888888',
          highlight: '#ffffff',
        },
      },
    }),
    '--parts',
    JSON.stringify({ body: { material: 'ink' } }),
  ];
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('design authoring', () => {
  it('writes all design fields from an inline --design object', () => {
    const dir = makeDir();
    const out = io(dir);
    const code = runCli([...initArgs(), '--design', JSON.stringify(DESIGN)], out);
    expect(code).toBe(EXIT_OK);
    const text = readFileSync(join(dir, 'hero.px.json'), 'utf8');
    const written = JSON.parse(text) as Record<string, unknown>;
    expect(written.version).toBe('1.2');
    expect(written.design).toEqual(DESIGN);
    expect(Object.keys(written)).toEqual([
      'version',
      'meta',
      'design',
      'palette',
      'parts',
      'anchors',
      'layers',
    ]);
  });

  it('accepts --design as a JSON file path resolved against the caller cwd', () => {
    const dir = makeDir();
    writeFileSync(join(dir, 'intent.json'), JSON.stringify(DESIGN));
    const out = io(dir);
    expect(runCli([...initArgs(), '--design', 'intent.json'], out)).toBe(EXIT_OK);
    const written = JSON.parse(readFileSync(join(dir, 'hero.px.json'), 'utf8')) as {
      design: typeof DESIGN;
    };
    expect(written.design).toEqual(DESIGN);
  });

  it('publishes --design in help', () => {
    const out = io(makeDir());
    expect(runCli(['--help'], out)).toBe(EXIT_OK);
    const payload = JSON.parse(out.text) as { flags: string[]; usage: string[] };
    expect(payload.flags).toContain('--design');
    expect(payload.usage.some((entry) => entry.includes('--design'))).toBe(true);
  });

  it('does not write a design or bump the version when --design is absent', () => {
    const dir = makeDir();
    const out = io(dir);
    expect(runCli(initArgs(), out)).toBe(EXIT_OK);
    const written = JSON.parse(readFileSync(join(dir, 'hero.px.json'), 'utf8')) as {
      version: string;
      design?: unknown;
    };
    expect(written.version).toBe('1.1');
    expect(written.design).toBeUndefined();
  });

  it('emits --design from the existing px_init tool parameter', () => {
    expect(argvFor('px_init', { file: 'hero.px.json', design: DESIGN })).toContain('--design');
  });

  it('authors the same recipe through px_init', () => {
    const dir = makeDir();
    const result = callTool(
      'px_init',
      {
        file: 'mcp.px.json',
        width: 16,
        height: 16,
        palette: {
          ink: {
            ramp: {
              outline: '#000000',
              shadow: '#333333',
              base: '#888888',
              highlight: '#ffffff',
            },
          },
        },
        parts: { body: { material: 'ink' } },
        design: DESIGN,
      },
      { cwd: dir },
    );
    expect(result.isError).not.toBe(true);
    expect(existsSync(join(dir, 'mcp.px.json'))).toBe(true);
    const written = JSON.parse(readFileSync(join(dir, 'mcp.px.json'), 'utf8')) as {
      version: string;
      design: typeof DESIGN;
    };
    expect(written.version).toBe('1.2');
    expect(written.design).toEqual(DESIGN);
  });
});
