import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type CliIo, runCli } from '../../src/cli/main.js';
import { normalizeDesign } from '../../src/core/design.js';
import { callTool } from '../../src/mcp/tools.js';

/**
 * FR-9 / AC-7: the verb and its MCP tool are one surface, and both are pure
 * planners. The only observable output is stdout (or the MCP text block).
 */

const dirs: string[] = [];

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-brief-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'hero.px.json'), '{"version":"1","sentinel":true}');
  return dir;
}

function io(dir: string): CliIo & { state: { text: string } } {
  const state = { text: '' };
  return {
    cwd: dir,
    stdout: (chunk: string) => {
      state.text += chunk;
    },
    stderr: () => undefined,
    state,
  };
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('px brief verb', () => {
  it('prints a scaffold with parts, proportions, hero and a valid design block', () => {
    const dir = workspace();
    const before = readdirSync(dir).sort();
    const recipeBefore = readFileSync(join(dir, 'hero.px.json'), 'utf8');
    const out = io(dir);
    expect(runCli(['brief', 'character', '--size', '32'], out)).toBe(0);
    const envelope = JSON.parse(out.state.text) as {
      command: string;
      ok: boolean;
      subject: string;
      size: number;
      hero: string;
      parts: Array<{ name: string; proportion: { min: number; max: number } }>;
      design: Parameters<typeof normalizeDesign>[0];
    };
    expect(envelope.ok).toBe(true);
    expect(envelope.command).toBe('brief');
    expect(envelope.subject).toBe('character');
    expect(envelope.size).toBe(32);
    expect(envelope.parts.length).toBeGreaterThanOrEqual(3);
    expect(envelope.parts.every((part) => part.proportion.min < part.proportion.max)).toBe(true);
    expect(envelope.hero).toBe('torso');
    expect(() => normalizeDesign(envelope.design)).not.toThrow();

    // AC-7: apart from stdout, the working directory is byte-for-byte untouched.
    expect(readdirSync(dir).sort()).toEqual(before);
    expect(readFileSync(join(dir, 'hero.px.json'), 'utf8')).toBe(recipeBefore);
  });

  it('accepts --subject as the MCP-friendly spelling of the positional', () => {
    const out = io(workspace());
    expect(runCli(['brief', '--subject', 'prop', '--size', '24'], out)).toBe(0);
    const envelope = JSON.parse(out.state.text) as { subject: string };
    expect(envelope.subject).toBe('prop');
  });

  it('reports an unknown subject with every known subject in the hint', () => {
    const out = io(workspace());
    expect(runCli(['brief', 'dragon', '--size', '32'], out)).toBe(1);
    const envelope = JSON.parse(out.state.text) as {
      ok: boolean;
      error: { code: string; hint: string };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe('E_SUBJECT_UNKNOWN');
    for (const name of ['character', 'prop', 'scene']) {
      expect(envelope.error.hint).toContain(name);
    }
  });

  it('advertises the verb in help', () => {
    const out = io(workspace());
    expect(runCli(['--help'], out)).toBe(0);
    const help = JSON.parse(out.state.text) as {
      commands: string[];
      flags: string[];
      usage: string[];
    };
    expect(help.commands).toContain('brief');
    expect(help.flags).toContain('--subject');
    expect(help.flags).toContain('--size');
    expect(help.usage.some((entry) => entry.includes('px brief'))).toBe(true);
  });
});

describe('px_brief MCP tool', () => {
  it('returns the scaffold in the text envelope and no image block, writing nothing', () => {
    const dir = workspace();
    const before = readdirSync(dir).sort();
    const result = callTool('px_brief', { subject: 'scene', size: 40 }, { cwd: dir });
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe('text');
    const envelope = JSON.parse(
      result.content[0]?.type === 'text' ? result.content[0].text : '{}',
    ) as {
      command: string;
      subject: string;
      design: Parameters<typeof normalizeDesign>[0];
    };
    expect(envelope.command).toBe('brief');
    expect(envelope.subject).toBe('scene');
    expect(() => normalizeDesign(envelope.design)).not.toThrow();
    expect(readdirSync(dir).sort()).toEqual(before);
  });

  it('surfaces the unknown-subject error rather than crashing', () => {
    const result = callTool('px_brief', { subject: 'dragon' }, { cwd: workspace() });
    expect(result.isError).toBe(true);
    const block = result.content[0];
    const envelope = JSON.parse(block?.type === 'text' ? block.text : '{}') as {
      error: { code: string };
    };
    expect(envelope.error.code).toBe('E_SUBJECT_UNKNOWN');
  });
});
