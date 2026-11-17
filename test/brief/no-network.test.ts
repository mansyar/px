import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NFR-5 for briefs, made checkable: the templates are local data. This reads
 * every module under `src/brief` and inspects its import specifiers, so a later
 * edit that reaches for a socket or a scoring script fails here.
 */

const BRIEF_DIR = join(process.cwd(), 'src', 'brief');

const NETWORK_MODULES = [
  'node:http',
  'node:https',
  'node:http2',
  'node:net',
  'node:tls',
  'node:dgram',
  'node:dns',
  'undici',
  'axios',
  'ws',
];

const SCORING_MODULES = ['rubric', 'upscale', 'scripts/rubric', 'scripts/upscale'];

function sources(): Array<{ file: string; text: string }> {
  return readdirSync(BRIEF_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => ({
      file: entry.name,
      text: readFileSync(join(BRIEF_DIR, entry.name), 'utf8'),
    }));
}

function specifiers(text: string): string[] {
  const found: string[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(pattern)) {
    if (match[1] !== undefined) {
      found.push(match[1]);
    }
  }
  return found;
}

describe('brief templates are local data (NFR-5)', () => {
  it('finds the brief modules', () => {
    expect(sources().map((entry) => entry.file)).toContain('templates.ts');
  });

  it('imports no network transport', () => {
    for (const { file, text } of sources()) {
      for (const specifier of specifiers(text)) {
        expect(NETWORK_MODULES, `${file} imports ${specifier}`).not.toContain(specifier);
      }
    }
  });

  it('imports no scoring script', () => {
    for (const { file, text } of sources()) {
      for (const specifier of specifiers(text)) {
        const bare = specifier.replace(/\.(?:mjs|js|ts)$/, '');
        expect(SCORING_MODULES, `${file} imports ${specifier}`).not.toContain(bare);
      }
    }
  });

  it('imports only node builtins and local modules', () => {
    for (const { file, text } of sources()) {
      for (const specifier of specifiers(text)) {
        const allowed = specifier.startsWith('node:') || specifier.startsWith('.');
        expect(allowed, `${file} imports the third-party module ${specifier}`).toBe(true);
      }
    }
  });
});
