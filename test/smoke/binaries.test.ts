import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

interface Manifest {
  type: string;
  private: boolean;
  engines: { node: string };
  bin: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Manifest;

describe('package surface', () => {
  it('is a private ESM package pinned to Node 24', () => {
    expect(manifest.type).toBe('module');
    expect(manifest.private).toBe(true);
    expect(manifest.engines.node).toBe('>=24 <25');
    expect(readFileSync(join(root, '.node-version'), 'utf8').trim()).toBe('24');
  });

  it('declares exactly one runtime dependency', () => {
    expect(Object.keys(manifest.dependencies)).toEqual(['@modelcontextprotocol/sdk']);
  });

  it('points both bins at build output', () => {
    expect(manifest.bin).toEqual({ px: './dist/cli.js', 'px-mcp': './dist/mcp/server.js' });
  });
});

describe('px binary', () => {
  const tsx = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');

  it('starts and prints a JSON envelope for --help', () => {
    expect(existsSync(tsx)).toBe(true);
    const result = spawnSync(process.execPath, [tsx, 'src/cli.ts', '--help'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    const envelope = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(envelope).toMatchObject({ v: 1, ok: true, command: 'help' });
    expect(result.stderr).toBe('');
  });

  it('exits 1 on an unknown command', () => {
    const result = spawnSync(process.execPath, [tsx, 'src/cli.ts', 'nope'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    const envelope = JSON.parse(result.stdout) as { ok: boolean; error: { code: string } };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe('E_USAGE');
  });
});
