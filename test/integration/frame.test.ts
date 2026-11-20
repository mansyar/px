import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Recipe } from '../../src/core/recipe/types.js';

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  error?: { code: string; message: string; hint: string };
  [key: string]: unknown;
}

interface RunResult {
  code: number;
  envelope: Envelope;
  raw: string;
}

interface FrameRowView {
  index: number;
  id: string | null;
  duration?: number;
  layers: number;
  ops: number;
}

interface SheetMeta {
  generic: {
    sheet?: unknown[];
    timeline?: { frames: unknown[]; total_ms: number };
  };
}

const FOUR_OPS =
  '[["rect",1,1,3,3,"steel.base"],["rect",2,2,3,3,"steel.shadow"],["rect",3,3,3,3,"steel.outline"],["rect",4,4,3,3,"steel.highlight"]]';
const ONE_OP = '[["rect",2,2,2,2,"steel.base"]]';

let workspace = '';

function run(args: string[]): RunResult {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Envelope, raw };
}

function pathOf(name: string): string {
  return join(workspace, name);
}

function textOf(name: string): string {
  return readFileSync(pathOf(name), 'utf8');
}

function recipeOf(name: string): Recipe {
  return parseRecipe(textOf(name)).recipe;
}

function rows(result: RunResult): FrameRowView[] {
  return result.envelope.frames as FrameRowView[];
}

function init(name: string): void {
  const result = run(['init', '--file', name, '--width', '12', '--height', '12']);
  expect(result.code).toBe(0);
}

function drawFrame0(name: string): void {
  const result = run(['draw', '--file', name, '--ops', FOUR_OPS]);
  expect(result.code).toBe(0);
}

function addClone(name: string, id: string, duration?: string): RunResult {
  return run([
    'frame',
    'add',
    '--file',
    name,
    '--from',
    '0',
    '--id',
    id,
    ...(duration === undefined ? [] : ['--duration', duration]),
  ]);
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-frame-'));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('px frame CLI', () => {
  it('AC-1: add --from 0 deep-clones frame 0 and stays valid and independent', () => {
    const name = 'clone.px.json';
    init(name);
    drawFrame0(name);

    const added = addClone(name, 'walk', '120');
    expect(added.code).toBe(0);
    expect(added.envelope).toMatchObject({
      v: 1,
      ok: true,
      command: 'frame',
      subcommand: 'add',
      frame: 'walk',
    });

    const before = recipeOf(name);
    expect(before.version).toBe('1.4');
    expect(before.frames).toHaveLength(1);
    expect(before.frames?.[0]?.layers).toEqual(before.layers);
    expect(before.frames?.[0]?.layers).not.toBe(before.layers);
    expect(serializeRecipe(parseRecipe(textOf(name)).recipe)).toBe(textOf(name));

    // Frame 0 changes must not leak into an already-authored clone.
    expect(run(['draw', '--file', name, '--ops', ONE_OP]).code).toBe(0);
    expect(recipeOf(name).frames?.[0]?.layers).toEqual(before.frames?.[0]?.layers);
    expect(run(['validate', '--file', name]).code).toBe(0);
  });

  it('AC-2: add --ops writes exactly the supplied ops into the chosen layer', () => {
    const name = 'ops.px.json';
    init(name);
    const added = run([
      'frame',
      'add',
      '--file',
      name,
      '--id',
      'still',
      '--ops',
      ONE_OP,
      '--layer',
      'overlay',
    ]);
    expect(added.code).toBe(0);
    expect(recipeOf(name).frames?.[0]?.layers).toEqual([
      { id: 'overlay', ops: [{ op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'steel.base' }] },
    ]);
  });

  it('documented precedence: explicit --ops win over --from when both are supplied', () => {
    const name = 'precedence.px.json';
    init(name);
    drawFrame0(name);
    const added = run([
      'frame',
      'add',
      '--file',
      name,
      '--id',
      'override',
      '--from',
      '0',
      '--ops',
      ONE_OP,
    ]);
    expect(added.code).toBe(0);
    expect(recipeOf(name).frames?.[0]?.layers).toEqual([
      { id: 'base', ops: [{ op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'steel.base' }] },
    ]);
  });

  it('AC-3: edit --op-index 3 changes only op 3 of an addressed frame', () => {
    const name = 'edit-index.px.json';
    init(name);
    drawFrame0(name);
    expect(addClone(name, 'walk').code).toBe(0);
    const before = recipeOf(name);
    const originalOps = before.frames?.[0]?.layers[0]?.ops;
    expect(originalOps).toHaveLength(4);

    const edited = run([
      'frame',
      'edit',
      '--file',
      name,
      '--frame',
      '1',
      '--op-index',
      '3',
      '--ops',
      '[["rect",9,9,2,2,"steel.highlight"]]',
    ]);
    expect(edited.code).toBe(0);
    expect(edited.envelope).toMatchObject({
      v: 1,
      ok: true,
      command: 'frame',
      subcommand: 'edit',
      frame: '1',
    });
    const after = recipeOf(name);
    expect(after.frames?.[0]?.layers[0]?.ops?.slice(0, 3)).toEqual(originalOps?.slice(0, 3));
    expect(after.frames?.[0]?.layers[0]?.ops?.[3]).toEqual({
      op: 'rect',
      x: 9,
      y: 9,
      w: 2,
      h: 2,
      color: 'steel.highlight',
    });
    expect(after.layers).toEqual(before.layers);
  });

  it('AC-4: edit --replace swaps the whole ops list', () => {
    const name = 'edit-replace.px.json';
    init(name);
    drawFrame0(name);
    expect(addClone(name, 'walk').code).toBe(0);

    const replaced = run([
      'frame',
      'edit',
      '--file',
      name,
      '--frame',
      'walk',
      '--replace',
      '--ops',
      ONE_OP,
    ]);
    expect(replaced.code).toBe(0);
    expect(replaced.envelope).toMatchObject({ subcommand: 'edit', replace: true });
    expect(recipeOf(name).frames?.[0]?.layers[0]?.ops).toEqual([
      { op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'steel.base' },
    ]);
  });

  it('AC-5: remove works by id and index, and refuses frame 0', () => {
    const name = 'remove.px.json';
    init(name);
    drawFrame0(name);
    expect(addClone(name, 'walk').code).toBe(0);
    expect(addClone(name, 'run').code).toBe(0);

    const byId = run(['frame', 'remove', '--file', name, '--frame', 'walk']);
    expect(byId.code).toBe(0);
    expect(byId.envelope).toMatchObject({ subcommand: 'remove', frame: 'walk' });
    expect(recipeOf(name).frames?.map((frame) => frame.id)).toEqual(['run']);

    const byIndex = run(['frame', 'remove', '--file', name, '--frame', '1']);
    expect(byIndex.code).toBe(0);
    expect(recipeOf(name).frames).toBeUndefined();
    expect(textOf(name)).not.toContain('"frames"');

    expect(addClone(name, 'again').code).toBe(0);
    const before = textOf(name);
    const base = run(['frame', 'remove', '--file', name, '--frame', '0']);
    expect(base.code).toBe(1);
    expect(base.envelope.error?.code).toBe('E_BAD_PARAM');
    expect(textOf(name)).toBe(before);
  });

  it('AC-6: list reports one row per frame, including frame 0', () => {
    const name = 'list.px.json';
    init(name);
    drawFrame0(name);
    expect(addClone(name, 'walk', '120').code).toBe(0);
    expect(addClone(name, 'run').code).toBe(0);

    const listed = run(['frame', 'list', '--file', name]);
    expect(listed.code).toBe(0);
    expect(listed.envelope).toMatchObject({ v: 1, ok: true, command: 'frame', subcommand: 'list' });
    expect(rows(listed)).toEqual([
      { index: 0, id: null, layers: 1, ops: 4 },
      { index: 1, id: 'walk', duration: 120, layers: 1, ops: 4 },
      { index: 2, id: 'run', layers: 1, ops: 4 },
    ]);
    expect(textOf(name)).not.toContain('"frames": []');
  });

  it('AC-7: set-duration sets, clears, and rejects bad durations without writing', () => {
    const name = 'duration.px.json';
    init(name);
    expect(addClone(name, 'walk').code).toBe(0);

    const set = run(['frame', 'set-duration', '--file', name, '--frame', '1', '--duration', '120']);
    expect(set.code).toBe(0);
    expect(set.envelope).toMatchObject({ subcommand: 'set-duration', duration: 120 });
    expect(recipeOf(name).frames?.[0]?.duration).toBe(120);

    const cleared = run(['frame', 'set-duration', '--file', name, '--frame', 'walk']);
    expect(cleared.code).toBe(0);
    expect(cleared.envelope).toMatchObject({ duration: null });
    expect(recipeOf(name).frames?.[0]?.duration).toBeUndefined();

    for (const bad of ['0', '1.5']) {
      const before = textOf(name);
      const result = run([
        'frame',
        'set-duration',
        '--file',
        name,
        '--frame',
        'walk',
        '--duration',
        bad,
      ]);
      expect(result.code, `duration ${bad}`).toBe(1);
      expect(result.envelope.ok, `duration ${bad}`).toBe(false);
      expect(textOf(name)).toBe(before);
    }
  });

  it('AC-8: move --to 0 reorders declared frames and rejects out-of-range moves', () => {
    const name = 'move.px.json';
    init(name);
    expect(addClone(name, 'a').code).toBe(0);
    expect(addClone(name, 'b').code).toBe(0);

    const moved = run(['frame', 'move', '--file', name, '--frame', '2', '--to', '0']);
    expect(moved.code).toBe(0);
    expect(moved.envelope).toMatchObject({ subcommand: 'move', frame: '2', to: 0 });
    expect(recipeOf(name).frames?.map((frame) => frame.id)).toEqual(['b', 'a']);

    const before = textOf(name);
    const far = run(['frame', 'move', '--file', name, '--frame', 'a', '--to', '9']);
    expect(far.code).toBe(1);
    expect(far.envelope.error?.code).toBe('E_BAD_PARAM');
    expect(textOf(name)).toBe(before);

    const base = run(['frame', 'move', '--file', name, '--frame', '0', '--to', '0']);
    expect(base.code).toBe(1);
    expect(textOf(name)).toBe(before);
  });

  it('AC-10: bad ids, targets and ops fail before any write', () => {
    const name = 'guards.px.json';
    init(name);
    expect(addClone(name, 'walk').code).toBe(0);

    const cases: string[][] = [
      ['frame', 'add', '--file', name, '--id', 'walk', '--from', '0'],
      ['frame', 'add', '--file', name, '--id', 'ghost', '--from', 'missing'],
      ['frame', 'edit', '--file', name, '--frame', '9', '--ops', ONE_OP],
      ['frame', 'edit', '--file', name, '--frame', 'walk', '--op-index', '9', '--ops', ONE_OP],
      ['frame', 'edit', '--file', name, '--frame', 'walk', '--ops', '[42]'],
      ['frame', 'remove', '--file', name, '--frame', 'nope'],
      ['frame', 'move', '--file', name, '--frame', 'walk'],
    ];
    for (const args of cases) {
      const before = textOf(name);
      const result = run(args);
      expect(result.code, args.join(' ')).toBe(1);
      expect(result.envelope.ok, args.join(' ')).toBe(false);
      expect(result.envelope.error?.code, args.join(' ')).toBeTruthy();
      expect(textOf(name), args.join(' ')).toBe(before);
    }
  });

  it('writes to --out and leaves the source recipe untouched', () => {
    const source = 'out-source.px.json';
    const target = 'out-target.px.json';
    init(source);
    const before = textOf(source);
    const added = run(['frame', 'add', '--file', source, '--out', target, '--from', '0']);
    expect(added.code).toBe(0);
    expect(added.envelope.file).toBe(target);
    expect(textOf(source)).toBe(before);
    expect(recipeOf(target).frames).toHaveLength(1);
  });

  it('rejects an unknown frame subcommand with E_USAGE', () => {
    init('usage.px.json');
    const result = run(['frame', 'dance', '--file', 'usage.px.json']);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_USAGE');
    expect(run(['frame', 'list']).envelope.error?.code).toBe('E_USAGE');
  });

  it('AC-11: repeated identical sequences produce byte-identical recipes', () => {
    const build = (name: string) => {
      expect(
        run(['init', '--file', name, '--name', 'determinism', '--width', '12', '--height', '12'])
          .code,
      ).toBe(0);
      drawFrame0(name);
      expect(
        run(['frame', 'add', '--file', name, '--from', '0', '--id', 'a', '--duration', '100']).code,
      ).toBe(0);
      expect(run(['frame', 'add', '--file', name, '--ops', ONE_OP, '--id', 'b']).code).toBe(0);
      expect(run(['frame', 'move', '--file', name, '--frame', '2', '--to', '0']).code).toBe(0);
      expect(
        run(['frame', 'set-duration', '--file', name, '--frame', 'a', '--duration', '50']).code,
      ).toBe(0);
    };
    build('determinism-a.px.json');
    build('determinism-b.px.json');
    expect(textOf('determinism-a.px.json')).toBe(textOf('determinism-b.px.json'));
    expect(run(['validate', '--file', 'determinism-a.px.json']).code).toBe(0);
  });

  it('help documents the frame verb, selectors and clone precedence', () => {
    const help = run(['--help']);
    expect(help.code).toBe(0);
    expect(help.envelope.command).toBe('help');
    const commands = help.envelope.commands as string[];
    expect(commands).toContain('frame');
    const usage = help.envelope.usage as string[];
    expect(usage.some((line) => line.startsWith('px frame add'))).toBe(true);
    expect(usage.some((line) => line.includes('--ops wins over --from'))).toBe(true);
    const flags = help.envelope.flags as string[];
    for (const flag of ['--frame', '--to', '--duration', '--replace']) {
      expect(flags).toContain(flag);
    }
  });

  it('AC-12: an authored recipe exports a sheet with a matching timeline', () => {
    const name = 'walk.px.json';
    init(name);
    drawFrame0(name);
    // Build the entire animation through the CLI: no hand-edited JSON.
    expect(addClone(name, 'step', '120').code).toBe(0);
    expect(
      run([
        'frame',
        'add',
        '--file',
        name,
        '--ops',
        '[["rect",5,5,2,2,"steel.highlight"]]',
        '--id',
        'pause',
        '--duration',
        '80',
      ]).code,
    ).toBe(0);
    expect(
      run(['frame', 'edit', '--file', name, '--frame', 'step', '--op-index', '0', '--ops', ONE_OP])
        .code,
    ).toBe(0);

    const exported = run(['render', '--file', name, '--out', 'out/walk.png', '--export']);
    expect(exported.code).toBe(0);
    expect(existsSync(pathOf('out/walk.sheet.png'))).toBe(true);
    expect(existsSync(pathOf('out/walk.sheet.meta.json'))).toBe(true);

    const meta = JSON.parse(textOf('out/walk.sheet.meta.json')) as SheetMeta;
    expect(meta.generic.sheet).toHaveLength(3);
    expect(meta.generic.timeline?.frames).toHaveLength(3);
    expect(meta.generic.timeline?.total_ms).toBe(200);
    expect(meta.generic.timeline?.frames[0]).toMatchObject({ index: 0, start_ms: 0 });
    expect(meta.generic.timeline?.frames[1]).toMatchObject({
      index: 1,
      id: 'step',
      duration_ms: 120,
      start_ms: 0,
    });
    expect(meta.generic.timeline?.frames[2]).toMatchObject({
      index: 2,
      id: 'pause',
      duration_ms: 80,
      start_ms: 120,
    });
  });
});
