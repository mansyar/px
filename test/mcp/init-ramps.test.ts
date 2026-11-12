import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { callTool, type ToolResult } from '../../src/mcp/tools.js';

/**
 * `px_init` over MCP must be able to do what `px init --derive-ramps` does.
 *
 * Without it a flat palette produces positional slots only (`main.0`, `main.1`),
 * so `auto_shade`, `ramp_fill` and every `.shadow` / `.highlight` reference are
 * unreachable — the ramp-dependent half of the op surface works over the CLI and
 * silently does not exist over MCP. Found by dogfooding an MCP-only sprite.
 */

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'px-mcp-init-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function envelope(result: ToolResult): Record<string, unknown> {
  const block = result.content.find((entry) => entry.type === 'text');
  if (block === undefined || block.type !== 'text') {
    throw new Error('expected a text content block');
  }
  return JSON.parse(block.text) as Record<string, unknown>;
}

const PALETTE = '#0d0a08,#3b2416,#5e3a22';

describe('px_init palette options', () => {
  it('derives ramped slots when derive_ramps is true', () => {
    const body = envelope(
      callTool(
        'px_init',
        {
          file: 'ramped.px.json',
          name: 'ramped',
          width: 16,
          height: 16,
          palette: PALETTE,
          derive_ramps: true,
        },
        { cwd: dir },
      ),
    );

    expect(body.ok).toBe(true);
    const slots = body.slots as string[];
    expect(slots).toContain('c1.shadow');
    expect(slots).toContain('c1.highlight');
    expect(slots).toContain('c1.outline');
  });

  it('derives ramps from an array palette, the shape an MCP caller produces', () => {
    const body = envelope(
      callTool(
        'px_init',
        {
          file: 'array.px.json',
          name: 'array',
          width: 16,
          height: 16,
          palette: PALETTE.split(','),
          derive_ramps: true,
        },
        { cwd: dir },
      ),
    );

    expect(body.ok).toBe(true);
    expect(body.slots as string[]).toContain('c1.base');
  });

  it('keeps positional slots when derive_ramps is absent', () => {
    const body = envelope(
      callTool(
        'px_init',
        { file: 'flat.px.json', name: 'flat', width: 16, height: 16, palette: PALETTE },
        { cwd: dir },
      ),
    );

    expect(body.ok).toBe(true);
    expect(body.slots).toEqual(['main.0', 'main.1', 'main.2']);
  });
});
