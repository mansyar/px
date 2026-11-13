/**
 * Deterministic PNG writer. No image library: IHDR, one IDAT, IEND, filter 0 on
 * every scanline, deflate level 9 with the default strategy. Anything that could
 * vary per run or per machine is left out on purpose.
 */

import { constants, deflateSync, inflateSync } from 'node:zlib';
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

export interface DecodedPng {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function badPng(why: string): PxError {
  return new PxError(
    'E_BAD_PARAM',
    `The comparison image is not a readable PNG: ${why}`,
    'Pass a PNG written by `px render`, or a sha256:<hex> of a previous render.',
  );
}

/**
 * Reads the only PNG shape this project writes: 8-bit RGBA, no interlace, one
 * or more IDAT chunks, filter types 0-4. It is a reader for our own output, not
 * a general decoder, so it rejects anything else instead of guessing.
 */
export function decodePng(bytes: Uint8Array): DecodedPng {
  if (bytes.length < PNG_SIGNATURE.length) {
    throw badPng('the file is shorter than the signature');
  }
  for (const [index, byte] of PNG_SIGNATURE.entries()) {
    if (bytes[index] !== byte) {
      throw badPng('the file does not start with the PNG signature');
    }
  }
  let width = 0;
  let height = 0;
  let sawHeader = false;
  const idat: Uint8Array[] = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) {
      throw badPng(`the ${type} chunk is truncated`);
    }
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      if (length !== 13) {
        throw badPng('the header chunk is not 13 bytes');
      }
      width = readUint32BE(data, 0);
      height = readUint32BE(data, 4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw badPng('only 8-bit RGBA without interlace is supported');
      }
      sawHeader = true;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4; // skip the chunk CRC; the writer's own bytes are trusted
  }
  if (!sawHeader || width < 1 || height < 1) {
    throw badPng('the header chunk is missing');
  }
  const inflated = inflateSync(concat(idat));
  const stride = width * 4;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    if (rowStart + 1 + stride > inflated.length) {
      throw badPng('the pixel data is shorter than the header promises');
    }
    const filter = inflated[rowStart] ?? 0;
    for (let index = 0; index < stride; index += 1) {
      const raw = inflated[rowStart + 1 + index] ?? 0;
      const left = index >= 4 ? (rgba[y * stride + index - 4] ?? 0) : 0;
      const up = y > 0 ? (rgba[(y - 1) * stride + index] ?? 0) : 0;
      let value: number;
      if (filter === 0) {
        value = raw;
      } else if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + ((left + up) >> 1);
      } else if (filter === 4) {
        const upLeft = y > 0 && index >= 4 ? (rgba[(y - 1) * stride + index - 4] ?? 0) : 0;
        value = raw + paeth(left, up, upLeft);
      } else {
        throw badPng(`scanline ${y} uses filter ${filter}`);
      }
      rgba[y * stride + index] = value & 0xff;
    }
  }
  return { width, height, rgba };
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
}
