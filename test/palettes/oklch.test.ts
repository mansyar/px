import { describe, expect, it } from 'vitest';
import { parseHex } from '../../src/core/palette.js';
import {
  linearToSrgbChannel,
  normaliseHue,
  oklchToHex,
  rgbaToOklch,
  shortestHueArc,
  srgbChannelToLinear,
} from '../../src/palettes/oklch.js';

const CHANNELS = Array.from({ length: 256 }, (_unused, index) => index);

const HEXES = [
  '#000000',
  '#ffffff',
  '#808080',
  '#0f380f',
  '#306230',
  '#8bac0f',
  '#9bbc0f',
  '#b13e53',
  '#5d275d',
  '#ef7d57',
  '#1a1c2c',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#010101',
  '#fefefe',
  '#123456',
  '#fedcba',
];

describe('sRGB transfer function', () => {
  it('round-trips every 8-bit channel exactly', () => {
    for (const channel of CHANNELS) {
      expect(linearToSrgbChannel(srgbChannelToLinear(channel))).toBe(channel);
    }
  });

  it('uses the exact piecewise breakpoint', () => {
    expect(srgbChannelToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 12);
    expect(srgbChannelToLinear(11)).toBeCloseTo(((11 / 255 + 0.055) / 1.055) ** 2.4, 12);
  });

  it('clamps linear light outside the sRGB cube', () => {
    expect(linearToSrgbChannel(-1)).toBe(0);
    expect(linearToSrgbChannel(2)).toBe(255);
  });
});

describe('OKLCH conversion', () => {
  it('round-trips 8-bit hex within one channel step', () => {
    for (const hex of HEXES) {
      const rgba = parseHex(hex);
      expect(rgba).not.toBeNull();
      const back = parseHex(oklchToHex(rgbaToOklch(rgba ?? { r: 0, g: 0, b: 0, a: 255 })));
      expect(back).not.toBeNull();
      expect(Math.abs((back?.r ?? 0) - (rgba?.r ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((back?.g ?? 0) - (rgba?.g ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((back?.b ?? 0) - (rgba?.b ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  it('places black, white and grey where OKLab says they are', () => {
    const black = rgbaToOklch({ r: 0, g: 0, b: 0, a: 255 });
    const white = rgbaToOklch({ r: 255, g: 255, b: 255, a: 255 });
    expect(black.l).toBeCloseTo(0, 4);
    expect(black.c).toBeCloseTo(0, 4);
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.c).toBeCloseTo(0, 4);
    for (const value of [0x40, 0x80, 0xc0]) {
      const grey = rgbaToOklch({ r: value, g: value, b: value, a: 255 });
      expect(grey.c).toBeLessThan(0.004);
    }
  });

  it('reports the standard red hue', () => {
    const red = rgbaToOklch({ r: 255, g: 0, b: 0, a: 255 });
    expect(red.l).toBeCloseTo(0.6279, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it('wraps hues and takes the short way around the circle', () => {
    expect(normaliseHue(-10)).toBeCloseTo(350, 9);
    expect(normaliseHue(370)).toBeCloseTo(10, 9);
    expect(shortestHueArc(350, 10)).toBeCloseTo(20, 9);
    expect(shortestHueArc(10, 350)).toBeCloseTo(-20, 9);
    expect(Math.abs(shortestHueArc(0, 180))).toBe(180);
  });
});
