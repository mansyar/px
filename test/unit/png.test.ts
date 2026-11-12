import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildSlotTable } from '../../src/core/palette.js';
import { rasterizeSlots } from '../../src/render/flatten.js';
import { crc32, encodePng, PNG_SIGNATURE } from '../../src/render/png.js';

interface Chunk {
  type: string;
  data: Uint8Array;
}

function readChunks(png: Uint8Array): Chunk[] {
  const chunks: Chunk[] = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < png.length) {
    const view = new DataView(png.buffer, png.byteOffset + offset, 8);
    const length = view.getUint32(0);
    const type = String.fromCharCode(...png.slice(offset + 4, offset + 8));
    const data = png.slice(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 8 + length + 4;
  }
  return chunks;
}

function solid(width: number, height: number, rgba: [number, number, number, number]): Uint8Array {
  const bytes = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    bytes.set(rgba, index * 4);
  }
  return bytes;
}

describe('CRC-32', () => {
  it('matches the reference check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('PNG encoder', () => {
  it('emits exactly IHDR, one IDAT, and IEND', () => {
    const png = encodePng(3, 2, solid(3, 2, [255, 0, 0, 255]));
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const chunks = readChunks(png);
    expect(chunks.map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('writes RGBA8 truecolour with no interlacing', () => {
    const png = encodePng(3, 2, solid(3, 2, [255, 0, 0, 255]));
    const ihdr = readChunks(png)[0]?.data;
    expect(ihdr).toBeDefined();
    const view = new DataView((ihdr as Uint8Array).buffer, (ihdr as Uint8Array).byteOffset, 13);
    expect(view.getUint32(0)).toBe(3);
    expect(view.getUint32(4)).toBe(2);
    expect(view.getUint8(8)).toBe(8);
    expect(view.getUint8(9)).toBe(6);
    expect(view.getUint8(10)).toBe(0);
    expect(view.getUint8(11)).toBe(0);
    expect(view.getUint8(12)).toBe(0);
  });

  it('uses filter 0 on every scanline inside a single IDAT', () => {
    const width = 3;
    const height = 2;
    const png = encodePng(width, height, solid(width, height, [1, 2, 3, 255]));
    const idat = readChunks(png).find((chunk) => chunk.type === 'IDAT');
    expect(idat).toBeDefined();
    const raw = inflateSync(idat?.data as Uint8Array);
    expect(raw.length).toBe(height * (1 + width * 4));
    for (let row = 0; row < height; row += 1) {
      expect(raw[row * (1 + width * 4)]).toBe(0);
    }
  });

  it('is byte-identical across repeated encodes of the same pixels', () => {
    const bytes = solid(4, 4, [10, 20, 30, 255]);
    expect(Array.from(encodePng(4, 4, bytes))).toEqual(Array.from(encodePng(4, 4, bytes)));
  });

  it('changes output when a single pixel changes', () => {
    const before = solid(4, 4, [0, 0, 0, 255]);
    const after = solid(4, 4, [0, 0, 0, 255]);
    after[0] = 255;
    expect(Array.from(encodePng(4, 4, before))).not.toEqual(Array.from(encodePng(4, 4, after)));
  });

  it('rejects a byte count that does not match the canvas', () => {
    expect(() => encodePng(4, 4, new Uint8Array(8))).toThrowError(/bytes/);
  });
});

describe('flatten', () => {
  it('resolves slots to RGBA and leaves transparent pixels at zero alpha', () => {
    const slots = buildSlotTable({ main: { colors: ['#010203'] } });
    const flattened = new Int16Array(4).fill(-1);
    flattened[1] = 0;
    const rgba = rasterizeSlots(flattened, 2, 2, slots);
    expect(Array.from(rgba.slice(0, 8))).toEqual([0, 0, 0, 0, 1, 2, 3, 255]);
  });
});
