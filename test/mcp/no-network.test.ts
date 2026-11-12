import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NFR-5, made checkable: the MCP server must stay on stdio. This reads every
 * module under `src/mcp` and inspects its import specifiers, so a future edit
 * that reaches for a socket fails here rather than in a security review.
 */

const MCP_DIR = join(process.cwd(), 'src', 'mcp');

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

function sources(): Array<{ file: string; text: string }> {
  return readdirSync(MCP_DIR)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => ({
      file: entry,
      text: readFileSync(join(MCP_DIR, entry), 'utf8'),
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

describe('MCP server pulls in no network transport', () => {
  it('imports no network-capable module', () => {
    for (const { file, text } of sources()) {
      for (const specifier of specifiers(text)) {
        expect(
          NETWORK_MODULES,
          `${file} imports ${specifier}; MCP is stdio-only (NFR-5)`,
        ).not.toContain(specifier);
      }
    }
  });

  it('takes its server and transport from the SDK entry points', () => {
    const all = sources().flatMap(({ text }) => specifiers(text));
    expect(all).toContain('@modelcontextprotocol/sdk/server/index.js');
    expect(all).toContain('@modelcontextprotocol/sdk/server/stdio.js');
  });

  it('imports nothing outside the SDK and node builtins', () => {
    for (const { file, text } of sources()) {
      for (const specifier of specifiers(text)) {
        const ok =
          specifier.startsWith('node:') ||
          specifier.startsWith('.') ||
          specifier.startsWith('@modelcontextprotocol/sdk/');
        expect(ok, `${file} imports the third-party module ${specifier}`).toBe(true);
      }
    }
  });
});
