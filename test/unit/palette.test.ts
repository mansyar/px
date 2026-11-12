import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import {
  buildSlotTable,
  hasBinaryAlpha,
  normalizeFamily,
  parseHex,
  slotNamesForFamily,
  TRANSPARENT_SLOT,
} from '../../src/core/palette.js';

const STEEL = {
  ramp: {
    outline: '#1a1c2c',
    shadow: '#5d275d',
    base: '#b13e53',
    highlight: '#ef7d57',
  },
};

const FLAT = { colors: ['#ffcd75', '#a7f070'] };

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX_ERROR';
  }
  return 'NO_THROW';
}

describe('hex parsing', () => {
  it('parses #rrggbb as opaque', () => {
    expect(parseHex('#b13e53')).toEqual({ r: 177, g: 62, b: 83, a: 255 });
  });

  it('parses #rrggbbaa and keeps the alpha byte', () => {
    expect(parseHex('#000000ff')).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(parseHex('#00000000')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('rejects malformed spellings', () => {
    for (const bad of ['#fff', 'b13e53', '#b13e5', '#gg0000', '']) {
      expect(parseHex(bad), bad).toBeNull();
    }
    expect(parseHex(12 as unknown as string)).toBeNull();
  });

  it('accepts only alpha 0 or 255 as binary', () => {
    expect(hasBinaryAlpha({ r: 0, g: 0, b: 0, a: 0 })).toBe(true);
    expect(hasBinaryAlpha({ r: 0, g: 0, b: 0, a: 255 })).toBe(true);
    expect(hasBinaryAlpha({ r: 0, g: 0, b: 0, a: 128 })).toBe(false);
  });
});

describe('palette families', () => {
  it('expands ramp families in canonical role order', () => {
    expect(slotNamesForFamily('steel', STEEL)).toEqual([
      'steel.outline',
      'steel.shadow',
      'steel.base',
      'steel.highlight',
    ]);
  });

  it('expands flat families by index', () => {
    expect(slotNamesForFamily('skin', FLAT)).toEqual(['skin.0', 'skin.1']);
  });

  it('rejects a family that is both a ramp and a flat list', () => {
    expect(() => normalizeFamily('steel', { ...STEEL, colors: ['#000000'] })).toThrow(PxError);
  });

  it('rejects an empty ramp or an unknown role', () => {
    expect(() => normalizeFamily('steel', { ramp: {} })).toThrow(PxError);
    expect(() => normalizeFamily('steel', { ramp: { mid: '#000000' } })).toThrow(PxError);
  });

  it('rejects translucent colours at parse time', () => {
    try {
      normalizeFamily('steel', { ramp: { base: '#b13e5380' } });
      expect.unreachable('translucent colour was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(PxError);
      expect((error as PxError).code).toBe('E_BAD_ALPHA');
    }
  });

  it('rejects a malformed family body with a distinct palette error', () => {
    expect(codeOf(() => normalizeFamily('steel', { ramp: '#000000' }))).toBe('E_BAD_PALETTE');
    expect(codeOf(() => normalizeFamily('steel', { colors: '#000000' }))).toBe('E_BAD_PALETTE');
    expect(codeOf(() => normalizeFamily('steel', { colors: [] }))).toBe('E_BAD_PALETTE');
    expect(codeOf(() => normalizeFamily('steel', {}))).toBe('E_BAD_PALETTE');
    expect(codeOf(() => normalizeFamily('steel', 'steel'))).toBe('E_BAD_PALETTE');
  });
});

describe('slot table', () => {
  it('assigns one letter per family and interns slots in family name order', () => {
    const slots = buildSlotTable({ skin: FLAT, steel: STEEL });
    expect(slots.names).toEqual([
      'skin.0',
      'skin.1',
      'steel.outline',
      'steel.shadow',
      'steel.base',
      'steel.highlight',
    ]);
    expect(slots.families.map((family) => [family.name, family.letter])).toEqual([
      ['skin', 'a'],
      ['steel', 'b'],
    ]);
    expect(slots.resolve('steel.base')).toBe(4);
    expect(slots.resolve('steel.brass')).toBeUndefined();
    expect(slots.rgba[4]).toEqual({ r: 177, g: 62, b: 83, a: 255 });
  });

  it('keeps the transparent slot out of the palette', () => {
    const slots = buildSlotTable({ steel: STEEL });
    expect(slots.names).not.toContain('transparent');
    expect(slots.resolve('')).toBeUndefined();
    expect(TRANSPARENT_SLOT).toBe(-1);
  });

  it('rejects a family name that is not a lower-case identifier', () => {
    expect(codeOf(() => buildSlotTable({ 'Steel-2': STEEL }))).toBe('E_BAD_PALETTE');
  });
});
