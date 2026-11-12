/**
 * Deterministic PNG writer. No image library: IHDR, one IDAT, IEND, filter 0 on
 * every scanline, deflate level 9 with the default strategy. Anything that could
 * vary per run or per machine is left out on purpose.
 */

import { constants, deflateSync } from 'node:zlib';
import { PxError } from '../core/errors.js';

export const PNG_SIGNATURE: Uint8Array = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const CRC_TABLE: Uint32Array = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

/** CRC-32 (IEEE 802.3), as required by the PNG chunk layout. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    const index = (crc ^ byte) & 0xff;
    crc = (CRC_TABLE[index] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }
  return bytes;
}

function writeUint32BE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** One chunk: length, type, data, CRC over type plus data. */
export function encodeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32BE(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcInput = concat([typeBytes, data]);
  writeUint32BE(chunk, 8 + data.length, crc32(crcInput));
  return chunk;
}

function ihdrData(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  writeUint32BE(data, 0, width);
  writeUint32BE(data, 4, height);
  data[8] = 8; // bit depth
  data[9] = 6; // colour type 6: truecolour with alpha
  data[10] = 0; // compression method: deflate
  data[11] = 0; // filter method: adaptive
  data[12] = 0; // interlace: none
  return data;
}

function filterScanlines(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const destination = y * (stride + 1);
    raw[destination] = 0; // filter type 0: none
    raw.set(rgba.subarray(y * stride, y * stride + stride), destination + 1);
  }
  return raw;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new PxError(
      'E_INTERNAL',
      `PNG encoder received an invalid size ${width}x${height}`,
      'Width and height must be positive integers.',
    );
  }
  if (rgba.length !== width * height * 4) {
    throw new PxError(
      'E_INTERNAL',
      `PNG encoder expected ${width * height * 4} RGBA bytes, received ${rgba.length}`,
      'Rasterize the canvas to width*height*4 bytes before encoding.',
    );
  }
  const idat = deflateSync(filterScanlines(width, height, rgba), {
    level: 9,
    strategy: constants.Z_DEFAULT_STRATEGY,
  });
  return concat([
    PNG_SIGNATURE,
    encodeChunk('IHDR', ihdrData(width, height)),
    encodeChunk('IDAT', idat),
    encodeChunk('IEND', new Uint8Array(0)),
  ]);
}
