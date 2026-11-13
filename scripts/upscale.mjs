#!/usr/bin/env node
/**
 * Nearest-neighbour upscaler for scoring artifacts.
 *
 * A 16–48 px sprite is resampled by whatever views it before a vision model sees it, so
 * a scoring pass must be handed a faithful enlargement instead of the raw file. This
 * script decodes the PNG, repeats every pixel `--factor` times and writes a new PNG with
 * no filtering, so the model sees exactly the authored pixels.
 *
 * Zero dependencies: `node:zlib` for the compression, a local CRC table for the chunks.
 * It is scoring tooling, not part of the engine, and no test imports it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** Decode an 8-bit non-interlaced PNG into {width, height, rgba}. */
function decodePng(bytes) {
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) {
        throw new Error(`only 8-bit PNGs are supported (got ${bitDepth})`);
      }
      if (data[12] !== 0) {
        throw new Error('interlaced PNGs are not supported');
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (channels === 0) {
    throw new Error(`unsupported colour type ${colorType}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = previous[i] ?? 0;
      const c = i >= channels ? (previous[i - channels] ?? 0) : 0;
      let value = line[i] ?? 0;
      if (filter === 1) {
        value += a;
      } else if (filter === 2) {
        value += b;
      } else if (filter === 3) {
        value += (a + b) >> 1;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = value & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      const source = x * channels;
      out[target] = line[source] ?? 0;
      out[target + 1] = line[source + 1] ?? 0;
      out[target + 2] = line[source + 2] ?? 0;
      out[target + 3] = channels === 4 ? (line[source + 3] ?? 0) : 0xff;
    }
    previous = line;
  }
  return { width, height, rgba: out };
}

/** Repeat every pixel by `factor` with no filtering. */
function upscale({ width, height, rgba }, factor) {
  const outWidth = width * factor;
  const outHeight = height * factor;
  const out = Buffer.alloc(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y += 1) {
    const sourceY = Math.floor(y / factor);
    for (let x = 0; x < outWidth; x += 1) {
      const source = (sourceY * width + Math.floor(x / factor)) * 4;
      const target = (y * outWidth + x) * 4;
      out[target] = rgba[source] ?? 0;
      out[target + 1] = rgba[source + 1] ?? 0;
      out[target + 2] = rgba[source + 2] ?? 0;
      out[target + 3] = rgba[source + 3] ?? 0;
    }
  }
  return { width: outWidth, height: outHeight, rgba: out };
}

function encodePng({ width, height, rgba }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function usage() {
  return [
    'usage: node scripts/upscale.mjs <input.png> [--out <file>] [--factor <n>]',
    '',
    'Writes a nearest-neighbour enlargement (default 8x) of a scoring artifact.',
    'Default output: <input>.8x.png next to the input.',
  ].join('\n');
}

const argv = process.argv.slice(2);
let input;
let out;
let factor = 8;
for (let index = 0; index < argv.length; index += 1) {
  const token = argv[index];
  if (token === '--out') {
    out = argv[(index += 1)];
  } else if (token === '--factor') {
    factor = Number.parseInt(argv[(index += 1)] ?? '', 10);
  } else if (token.startsWith('--')) {
    console.error(`unknown argument: ${token}`);
    console.error(usage());
    process.exit(1);
  } else if (input === undefined) {
    input = token;
  } else {
    console.error(`unexpected argument: ${token}`);
    console.error(usage());
    process.exit(1);
  }
}

if (input === undefined) {
  console.error('an input PNG is required');
  console.error(usage());
  process.exit(1);
}
if (!Number.isInteger(factor) || factor < 2 || factor > 32) {
  console.error('--factor must be an integer between 2 and 32');
  process.exit(1);
}

const target = out ?? join(dirname(input), `${basename(input, extname(input))}.8x.png`);
const decoded = decodePng(readFileSync(input));
const enlarged = upscale(decoded, factor);
writeFileSync(target, encodePng(enlarged));
console.log(`${target} ${enlarged.width}x${enlarged.height} (${factor}x)`);
