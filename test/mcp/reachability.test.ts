import { describe, expect, it } from 'vitest';
import { BOOLEAN_FLAGS, VALUE_FLAGS } from '../../src/cli/args.js';
import { argvFor, MCP_TOOLS, type Params, TOOL_DEFINITIONS } from '../../src/mcp/tools.js';

/**
 * FR-22: the MCP surface exposes the same verbs as the CLI. A CLI flag no tool
 * can set is a dead surface for an agent that only speaks MCP — which is how
 * `--derive-ramps` shipped unreachable. This table is exhaustive on purpose:
 * every flag the parser accepts must have a mapping here, or the test fails.
 *
 * `--pretty`, `--color` and `--help` are excluded: they shape a human's terminal
 * or answer discovery, and an agent reads the envelope either way.
 */

interface Mapping {
  tool: string;
  params: Params;
  /** Expected argv token after the flag; omitted for switches. */
  value?: string;
}

const MAPPINGS: Record<string, Mapping> = {
  file: { tool: 'px_inspect', params: { file: 'hero.px.json' }, value: 'hero.px.json' },
  layer: {
    tool: 'px_draw',
    params: { file: 'hero.px.json', layer: 'base', ops: [] },
    value: 'base',
  },
  ops: { tool: 'px_draw', params: { file: 'hero.px.json', ops: [] }, value: '[]' },
  out: {
    tool: 'px_draw',
    params: { file: 'hero.px.json', ops: [], out: 'copy.px.json' },
    value: 'copy.px.json',
  },
  id: { tool: 'px_edit', params: { file: 'hero.px.json', ops: [], id: 'body' }, value: 'body' },
  'op-index': {
    tool: 'px_edit',
    params: { file: 'hero.px.json', ops: [], op_index: 0 },
    value: '0',
  },
  x: { tool: 'px_anchor', params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 }, value: '1' },
  y: { tool: 'px_anchor', params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 }, value: '2' },
  name: {
    tool: 'px_anchor',
    params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 },
    value: 'tip',
  },
  width: { tool: 'px_init', params: { file: 'hero.px.json', width: 16 }, value: '16' },
  height: { tool: 'px_init', params: { file: 'hero.px.json', height: 16 }, value: '16' },
  palette: {
    tool: 'px_init',
    params: { file: 'hero.px.json', palette: '#000000,#ffffff' },
    value: '#000000,#ffffff',
  },
  'derive-ramps': { tool: 'px_init', params: { file: 'hero.px.json', derive_ramps: true } },
  force: { tool: 'px_init', params: { file: 'hero.px.json', force: true } },
  region: {
    tool: 'px_inspect',
    params: { file: 'hero.px.json', regions: ['0,0,2,2'] },
    value: '0,0,2,2',
  },
  summary: { tool: 'px_inspect', params: { file: 'hero.px.json', summary: true } },
  debug: {
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', debug: true },
  },
  export: {
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', export: true },
  },
  backdrop: {
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', debug: true, backdrop: '#102030' },
    value: '#102030',
  },
  strict: { tool: 'px_validate', params: { file: 'hero.px.json', strict: true } },
};

const NOT_AGENT_FLAGS = new Set(['pretty', 'color', 'help']);

describe('MCP flag reachability', () => {
  it('publishes seven tools, each with a definition', () => {
    expect([...MCP_TOOLS].sort()).toEqual(TOOL_DEFINITIONS.map((tool) => tool.name).sort());
    expect(MCP_TOOLS).toContain('px_validate');
  });

  it('maps px_validate to the validate verb without writing a PNG', () => {
    expect(argvFor('px_validate', { file: 'hero.px.json' })).toEqual([
      'validate',
      '--file',
      'hero.px.json',
    ]);
  });

  it('maps a null backdrop to the literal null, not a missing flag', () => {
    const argv = argvFor('px_render', {
      file: 'hero.px.json',
      out: 'hero.png',
      debug: true,
      backdrop: null,
    });
    expect(argv.slice(-2)).toEqual(['--backdrop', 'null']);
  });

  it('reaches every CLI flag through some tool parameter', () => {
    const flags = [...VALUE_FLAGS, ...BOOLEAN_FLAGS].filter((flag) => !NOT_AGENT_FLAGS.has(flag));
    expect(flags.length).toBeGreaterThan(0);

    for (const flag of flags) {
      const mapping = MAPPINGS[flag];
      expect(mapping, `no MCP tool parameter reaches --${flag}`).toBeDefined();
      if (mapping === undefined) {
        continue;
      }
      const argv = argvFor(mapping.tool, mapping.params);
      const at = argv.indexOf(`--${flag}`);
      expect(at, `${mapping.tool} did not emit --${flag}`).toBeGreaterThanOrEqual(0);
      if (mapping.value !== undefined) {
        expect(argv[at + 1], `${mapping.tool} gave --${flag} the wrong value`).toBe(mapping.value);
      }
    }
  });
});
