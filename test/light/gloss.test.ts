import { describe, expect, it } from 'vitest';
import { compiled, errorOf, roleRows } from './helpers.js';

function part(gloss: string, extra: Record<string, unknown> = {}, width = 4) {
  return compiled({
    parts: { body: { material: 'steel', gloss } },
    ops: [
      { op: 'rect', x: 1, y: 1, w: width, h: width, color: 'steel.base', part: 'body' },
      { op: 'light', form: 'bevel', ao: false, rim: 'none', ...extra },
    ],
  });
}

/** The part as the window the fixture paints. */
function window(rows: string[]): string[] {
  return rows.slice(1, 5).map((row) => row.slice(1, 5));
}

describe('light gloss: matte', () => {
  it('is exactly the form output', () => {
    // The default gloss and an explicit matte must be indistinguishable: matte
    // adds no writes of its own.
    const explicit = roleRows(part('matte'));
    const byDefault = roleRows(
      compiled({
        parts: { body: { material: 'steel' } },
        ops: [
          { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
          { op: 'light', form: 'bevel', ao: false, rim: 'none' },
        ],
      }),
    );
    expect(explicit).toEqual(byDefault);
    expect(window(explicit)).toEqual(['hhhh', 'hbbs', 'hbbs', 'hsss']);
  });
});

describe('light gloss: metal', () => {
  it('keeps a hard specular band per light-axis rank instead of bands', () => {
    // Flat form leaves the streak alone: rank 1 is the second anti-diagonal from
    // the lit corner, so a 4x4 shows exactly two specular pixels.
    const rows = roleRows(part('metal', { form: 'flat' }));
    expect(rows[1]).toBe('.bhbb...');
    expect(rows[2]).toBe('.hbbb...');
    expect(rows[3]).toBe('.bbbb...');
  });

  it('shows a single specular pixel on a single rank', () => {
    const compiledRecipe = compiled({
      parts: { body: { material: 'steel', gloss: 'metal' } },
      ops: [
        { op: 'set_pixels', points: [[3, 3]], color: 'steel.base', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    expect(roleRows(compiledRecipe)[3]?.[3]).toBe('h');
  });

  it('drops the shadow-side bevel band and every round band', () => {
    // No dark band anywhere: the lit bevel survives, the rest stays at base.
    expect(window(roleRows(part('metal')))).toEqual(['hhhh', 'hbbb', 'hbbb', 'hbbb']);
    expect(window(roleRows(part('metal', { form: 'round' })))).toEqual([
      'hhhh',
      'hbbb',
      'hbbb',
      'hbbb',
    ]);
  });

  it('rejects a metal material whose ramp has no highlight role', () => {
    const error = errorOf(() =>
      compiled({
        palette: { steel: { ramp: { shadow: '#101820', base: '#8090a0' } } },
        parts: { body: { material: 'steel', gloss: 'metal' } },
        ops: [
          { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'body' },
          { op: 'light', form: 'flat', ao: false, rim: 'none' },
        ],
      }),
    );
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('Family "steel"');
    expect(error.message).toContain('highlight');
    expect(error.hint).toContain('--derive-ramps');
  });
});

describe('light gloss: gem', () => {
  it('lights the silhouette and the middle third of ranks', () => {
    expect(window(roleRows(part('gem')))).toEqual(['hhhh', 'hbhh', 'hhhh', 'hhhh']);
  });
});

describe('light gloss: cloth', () => {
  it('dithers the shadow band instead of stopping dead', () => {
    // The dither is applied to the band form produced, so gloss runs after form.
    expect(window(roleRows(part('cloth')))).toEqual(['hhhh', 'hbbs', 'hbbb', 'hsbs']);
  });

  it('leaves a flat form alone because there is no shadow band', () => {
    expect(window(roleRows(part('cloth', { form: 'flat' })))).toEqual([
      'bbbb',
      'bbbb',
      'bbbb',
      'bbbb',
    ]);
  });
});
