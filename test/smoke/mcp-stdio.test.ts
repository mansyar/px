import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The smoke layer the workflow asks for: a real MCP `initialize` handshake over
 * stdio, against the same entry point the `px-mcp` bin points at.
 */

const root = process.cwd();
const tsx = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const entry = join(root, 'src', 'mcp', 'server.ts');

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

interface ToolCallResult {
  content: Array<TextContent | ImageContent>;
  isError?: boolean;
}

function envelopeOf(result: ToolCallResult): Record<string, unknown> {
  const block = result.content.find((entry) => entry.type === 'text') as TextContent | undefined;
  return JSON.parse(block?.text ?? '{}') as Record<string, unknown>;
}

function imagesOf(result: ToolCallResult): ImageContent[] {
  return result.content.filter((entry): entry is ImageContent => entry.type === 'image');
}

let workspace = '';
let client: Client;

beforeAll(async () => {
  workspace = mkdtempSync(join(tmpdir(), 'px-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsx, entry],
    cwd: workspace,
    stderr: 'pipe',
  });
  client = new Client({ name: 'px-smoke', version: '1.0.0' });
  await client.connect(transport);
}, 30000);

afterAll(async () => {
  await client.close();
  rmSync(workspace, { recursive: true, force: true });
});

describe('px-mcp over stdio', () => {
  it('completes the initialize handshake and lists eight tools', async () => {
    expect(client.getServerVersion()?.name).toBe('px');
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      'px_anchor',
      'px_diff',
      'px_draw',
      'px_edit',
      'px_init',
      'px_inspect',
      'px_render',
      'px_validate',
    ]);
    for (const tool of listed.tools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  }, 20000);

  it('runs the authoring verbs and returns one image block for render', async () => {
    const init = (await client.callTool({
      name: 'px_init',
      arguments: { file: 'hero.px.json', name: 'hero', width: 16, height: 16 },
    })) as ToolCallResult;
    expect(envelopeOf(init)).toMatchObject({ v: 1, ok: true, command: 'init' });

    const draw = (await client.callTool({
      name: 'px_draw',
      arguments: {
        file: 'hero.px.json',
        ops: [
          ['rect', 4, 4, 8, 8, 'steel.base'],
          ['set_pixels', [[6, 6]], 'steel.outline'],
        ],
      },
    })) as ToolCallResult;
    expect(envelopeOf(draw)).toMatchObject({ ok: true, command: 'draw', added: 2 });

    const anchor = (await client.callTool({
      name: 'px_anchor',
      arguments: { file: 'hero.px.json', name: 'grip_pivot', x: 8, y: 23 },
    })) as ToolCallResult;
    expect(envelopeOf(anchor)).toMatchObject({ ok: true, command: 'anchor' });

    const inspect = (await client.callTool({
      name: 'px_inspect',
      arguments: { file: 'hero.px.json', regions: ['4,4,8,2'] },
    })) as ToolCallResult;
    const inspected = envelopeOf(inspect);
    expect(inspected.ok).toBe(true);
    expect((inspected.regions as unknown[]).length).toBe(1);
    expect(inspected.legend).toBeTypeOf('object');

    const render = (await client.callTool({
      name: 'px_render',
      arguments: { file: 'hero.px.json', out: 'out/hero.png' },
    })) as ToolCallResult;
    const rendered = envelopeOf(render);
    expect(rendered.ok).toBe(true);
    const images = imagesOf(render);
    expect(images).toHaveLength(1);
    expect(images[0]?.mimeType).toBe('image/png');
    expect(Buffer.from(images[0]?.data ?? '', 'base64').subarray(0, 4)).toEqual(
      Buffer.from([137, 80, 78, 71]),
    );
    expect(readFileSync(join(workspace, 'out', 'hero.png')).length).toBe(rendered.bytes);

    const withDebug = (await client.callTool({
      name: 'px_render',
      arguments: { file: 'hero.px.json', out: 'out/debug.png', debug: true },
    })) as ToolCallResult;
    // Opt-in only: the 1x PNG plus the 8x sheet, never more.
    expect(imagesOf(withDebug)).toHaveLength(2);
  }, 30000);

  it('reports a failed call as an error envelope, not a crash', async () => {
    const missing = (await client.callTool({
      name: 'px_inspect',
      arguments: { file: 'missing.px.json' },
    })) as ToolCallResult;
    expect(missing.isError).toBe(true);
    const envelope = envelopeOf(missing);
    expect(envelope.ok).toBe(false);
    expect((envelope.error as { code: string }).code).toBe('E_FILE_NOT_FOUND');
  }, 20000);
});

describe('px-mcp process lifetime', () => {
  it('exits cleanly on stdin EOF without writing to stdout', async () => {
    const child = spawn(process.execPath, [tsx, entry], {
      cwd: workspace,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stdin.end();
    const code = await new Promise<number | null>((resolveCode) => {
      child.on('exit', (exitCode) => resolveCode(exitCode));
    });
    expect(code).toBe(0);
    expect(stdout).toBe('');
  }, 20000);
});
