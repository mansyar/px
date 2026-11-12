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
  /** The CLI flag this parameter is expected to emit. */
  flag: string;
  tool: string;
  params: Params;
  /** Expected argv token after the flag; omitted for switches. */
  value?: string;
}

/**
 * One row per (flag, tool) pair. A flag can be reachable through more than one
 * tool — `--name` is both `px_init`'s recipe name and `px_anchor`'s anchor name
 * — and each pair needs its own row, or the reverse check below cannot tell
 * that a declared schema property is never actually sent.
 */
const MAPPINGS: Mapping[] = [
  { flag: 'file', tool: 'px_inspect', params: { file: 'hero.px.json' }, value: 'hero.px.json' },
  {
    flag: 'layer',
    tool: 'px_draw',
    params: { file: 'hero.px.json', layer: 'base', ops: [] },
    value: 'base',
  },
  {
    flag: 'layer',
    tool: 'px_edit',
    params: { file: 'hero.px.json', layer: 'base', ops: [] },
    value: 'base',
  },
  { flag: 'ops', tool: 'px_draw', params: { file: 'hero.px.json', ops: [] }, value: '[]' },
  {
    flag: 'out',
    tool: 'px_draw',
    params: { file: 'hero.px.json', ops: [], out: 'copy.px.json' },
    value: 'copy.px.json',
  },
  {
    flag: 'out',
    tool: 'px_edit',
    params: { file: 'hero.px.json', ops: [], out: 'copy.px.json' },
    value: 'copy.px.json',
  },
  {
    flag: 'out',
    tool: 'px_anchor',
    params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2, out: 'copy.px.json' },
    value: 'copy.px.json',
  },
  {
    flag: 'id',
    tool: 'px_edit',
    params: { file: 'hero.px.json', ops: [], id: 'body' },
    value: 'body',
  },
  {
    flag: 'op-index',
    tool: 'px_edit',
    params: { file: 'hero.px.json', ops: [], op_index: 0 },
    value: '0',
  },
  {
    flag: 'x',
    tool: 'px_anchor',
    params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 },
    value: '1',
  },
  {
    flag: 'y',
    tool: 'px_anchor',
    params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 },
    value: '2',
  },
  {
    flag: 'name',
    tool: 'px_anchor',
    params: { file: 'hero.px.json', name: 'tip', x: 1, y: 2 },
    value: 'tip',
  },
  { flag: 'name', tool: 'px_init', params: { file: 'hero.px.json', name: 'hero' }, value: 'hero' },
  { flag: 'width', tool: 'px_init', params: { file: 'hero.px.json', width: 16 }, value: '16' },
  { flag: 'height', tool: 'px_init', params: { file: 'hero.px.json', height: 16 }, value: '16' },
  {
    flag: 'palette',
    tool: 'px_init',
    params: { file: 'hero.px.json', palette: '#000000,#ffffff' },
    value: '#000000,#ffffff',
  },
  { flag: 'derive-ramps', tool: 'px_init', params: { file: 'hero.px.json', derive_ramps: true } },
  {
    flag: 'synthesize',
    tool: 'px_init',
    params: { file: 'hero.px.json', synthesize: ['leaf=#4a8f3c:5'] },
    value: 'leaf=#4a8f3c:5',
  },
  { flag: 'force', tool: 'px_init', params: { file: 'hero.px.json', force: true } },
  {
    flag: 'region',
    tool: 'px_inspect',
    params: { file: 'hero.px.json', regions: ['0,0,2,2'] },
    value: '0,0,2,2',
  },
  { flag: 'summary', tool: 'px_inspect', params: { file: 'hero.px.json', summary: true } },
  {
    flag: 'debug',
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', debug: true },
  },
  {
    flag: 'export',
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', export: true },
  },
  {
    flag: 'backdrop',
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', debug: true, backdrop: '#102030' },
    value: '#102030',
  },
  {
    flag: 'swap',
    tool: 'px_render',
    params: { file: 'hero.px.json', out: 'hero.png', swap: ['steel=gold'] },
    value: 'steel=gold',
  },
  { flag: 'strict', tool: 'px_validate', params: { file: 'hero.px.json', strict: true } },
  // Every tool declares `strict`, so every tool needs a row that proves it
  // forwards it; px_validate alone would leave the other six unproven.
  { flag: 'strict', tool: 'px_init', params: { file: 'hero.px.json', strict: true } },
  { flag: 'strict', tool: 'px_draw', params: { file: 'hero.px.json', strict: true } },
  { flag: 'strict', tool: 'px_edit', params: { file: 'hero.px.json', strict: true } },
  { flag: 'strict', tool: 'px_anchor', params: { file: 'hero.px.json', strict: true } },
  { flag: 'strict', tool: 'px_inspect', params: { file: 'hero.px.json', strict: true } },
  { flag: 'strict', tool: 'px_render', params: { file: 'hero.px.json', strict: true } },
];

const NOT_AGENT_FLAGS = new Set([
  'pretty',
  'color',
  'help',
  // `px synthesize` edits one recipe in place; FR-22 keeps the MCP surface at
  // seven tools, so agents synthesise at creation time via `px_init.synthesize`.
  'family',
  'from',
  'steps',
]);

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
      const rows = MAPPINGS.filter((mapping) => mapping.flag === flag);
      expect(rows.length, `no MCP tool parameter reaches --${flag}`).toBeGreaterThan(0);

      for (const mapping of rows) {
        const argv = argvFor(mapping.tool, mapping.params);
        const at = argv.indexOf(`--${flag}`);
        expect(at, `${mapping.tool} did not emit --${flag}`).toBeGreaterThanOrEqual(0);
        if (mapping.value !== undefined) {
          expect(argv[at + 1], `${mapping.tool} gave --${flag} the wrong value`).toBe(
            mapping.value,
          );
        }
      }
    }
  });

  it('declares in the published schema every parameter a mapping sends', () => {
    for (const mapping of MAPPINGS) {
      const definition = TOOL_DEFINITIONS.find((tool) => tool.name === mapping.tool);
      expect(definition, `${mapping.tool} is not a published tool`).toBeDefined();
      const schema = definition?.inputSchema;
      expect(schema, `${mapping.tool} publishes no input schema`).toBeDefined();
      const properties = schema?.properties ?? {};

      for (const param of Object.keys(mapping.params)) {
        expect(
          Object.hasOwn(properties, param),
          `${mapping.tool} reads ${param} for --${mapping.flag} but never declares it to the agent`,
        ).toBe(true);
      }
    }
  });

  it('reaches every declared schema property through some mapping', () => {
    for (const tool of TOOL_DEFINITIONS) {
      const properties = Object.keys(tool.inputSchema.properties ?? {});
      expect(properties.length, `${tool.name} declares no parameters`).toBeGreaterThan(0);

      for (const param of properties) {
        const reached = MAPPINGS.some(
          (mapping) => mapping.tool === tool.name && Object.hasOwn(mapping.params, param),
        );
        expect(reached, `${tool.name} declares ${param} but no mapping ever sends it`).toBe(true);
      }
    }
  });
});
