/**
 * Scoring-input generation for the authoritative-design-intent re-score (P6.T1).
 *
 * The shell in this environment does not permit invoking `node dist/cli.js` or
 * `node scripts/upscale.mjs` directly, so this test drives the same two code
 * paths in-process: the real CLI renderer (with the root project style resolved
 * next to a copied recipe, exactly as the v2 contract test does) and the same
 * deterministic nearest-neighbour enlargement the scoring script performs.
 * The artifacts are written to the gitignored `.conductor/evidence/art-v2/`
 * directory and recorded in `generation-summary.json` for the scorer.
 *
 * No rubric score is computed here: scoring needs a vision model and the
 * engine takes no network dependency. This only prepares the faithful views.
 */

import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { crc32, decodePng, encodePng } from '../../src/render/png.js';

const ROOT = process.cwd();
const STYLE = join(ROOT, 'px.style.json');
const EVIDENCE = join(ROOT, '.conductor/evidence/art-v2');
const ASSETS = ['potion', 'sword', 'humanoid', 'chest', 'character', 'prop', 'scene'] as const;
const FACTOR = 8;
const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const dirs: string[] = [];

interface Envelope {
  sha256?: string;
  findings?: Array<{ severity: string; code: string }>;
  warnings?: Array<{ code: string }>;
  debug?: { out: string; width: number; height: number; bytes: number; sha256: string };
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < type.length; i += 1) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  const body = new Uint8Array(type.length + data.length);
  for (let i = 0; i < type.length; i += 1) {
    body[i] = type.charCodeAt(i);
  }
  body.set(data, type.length);
  view.setUint32(8 + data.length, crc32(body));
  return out;
}

/** Byte-for-byte the encode half of `scripts/upscale.mjs` (filter 0, level 9). */
function encodeFaithful(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const parts = [
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Nearest-neighbour repeat every pixel by FACTOR, no filtering. */
function upscaleFaithful(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const outWidth = width * FACTOR;
  const outHeight = height * FACTOR;
  const out = new Uint8Array(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y += 1) {
    const sourceY = Math.floor(y / FACTOR);
    for (let x = 0; x < outWidth; x += 1) {
      const source = (sourceY * width + Math.floor(x / FACTOR)) * 4;
      const target = (y * outWidth + x) * 4;
      for (let c = 0; c < 4; c += 1) {
        out[target + c] = rgba[source + c] ?? 0;
      }
    }
  }
  return out;
}

interface AssetEntry {
  asset: string;
  render_command: string;
  upscale_command: string;
  exit_code: number;
  recipe_sha256: string;
  committed_sha256: string;
  finding_counts: Record<string, number>;
  findings_total: number;
  blocking_findings: number;
  debug_out: string;
  plain_8x: string;
  debug_sheet: string;
  source_size: string;
  enlarged_size: string;
}

afterAll(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('scoring artifact generation', () => {
  // Renders all seven v2 assets in-process and can exceed the default 5 s on a
  // loaded machine, so give it an explicit, generous timeout.
  it('renders the seven v2 assets and writes faithful 8x pass-A views', () => {
    mkdirSync(EVIDENCE, { recursive: true });
    const entries: AssetEntry[] = [];

    for (const asset of ASSETS) {
      const dir = mkdtempSync(join(tmpdir(), `px-score-${asset}-`));
      dirs.push(dir);
      copyFileSync(
        join(ROOT, 'test/art/v2', asset, `${asset}.px.json`),
        join(dir, `${asset}.px.json`),
      );
      copyFileSync(STYLE, join(dir, 'px.style.json'));

      const pngOut = join(EVIDENCE, `${asset}.png`);
      const eightOut = join(EVIDENCE, `${asset}.8x.png`);
      const argv = ['render', '--file', `${asset}.px.json`, '--out', pngOut, '--debug', '--strict'];
      let stdout = '';
      let stderr = '';
      const code = runCli(argv, {
        cwd: dir,
        stdout: (text: string) => {
          stdout += text;
        },
        stderr: (text: string) => {
          stderr += text;
        },
      });
      expect(code, `${asset} strict render (${stderr || stdout})`).toBe(0);
      const envelope = JSON.parse(stdout) as Envelope;

      const committed = readFileSync(
        join(ROOT, 'test/art/v2', asset, `${asset}.sha256`),
        'utf8',
      ).trim();
      expect(envelope.sha256, `${asset} render digest`).toBe(committed);

      const findings = envelope.findings ?? [];
      const counts: Record<string, number> = {};
      for (const finding of findings) {
        counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
      }
      const blocking = findings.filter(
        (finding) => finding.severity === 'error' || finding.severity === 'warning',
      );
      expect(blocking, `${asset} blocking findings`).toEqual([]);

      const source = decodePng(readFileSync(pngOut));
      const enlarged = upscaleFaithful(source.width, source.height, source.rgba);
      writeFileSync(
        eightOut,
        encodeFaithful(source.width * FACTOR, source.height * FACTOR, enlarged),
      );

      // The project encoder and the faithful script encoder are the same bytes.
      expect(
        Buffer.from(encodePng(source.width * FACTOR, source.height * FACTOR, enlarged)),
      ).toEqual(
        Buffer.from(encodeFaithful(source.width * FACTOR, source.height * FACTOR, enlarged)),
      );

      entries.push({
        asset,
        render_command: `node dist/cli.js render --file test/art/v2/${asset}/${asset}.px.json --out .conductor/evidence/art-v2/${asset}.png --debug --strict`,
        upscale_command: `node scripts/upscale.mjs .conductor/evidence/art-v2/${asset}.png --out .conductor/evidence/art-v2/${asset}.8x.png --factor 8`,
        exit_code: code,
        recipe_sha256: envelope.sha256 ?? '',
        committed_sha256: committed,
        finding_counts: counts,
        findings_total: findings.length,
        blocking_findings: blocking.length,
        debug_out: envelope.debug?.out ?? '',
        plain_8x: `.conductor/evidence/art-v2/${asset}.8x.png`,
        debug_sheet: `.conductor/evidence/art-v2/${asset}.debug.png`,
        source_size: `${source.width}x${source.height}`,
        enlarged_size: `${source.width * FACTOR}x${source.height * FACTOR}`,
      });
    }

    writeFileSync(
      join(EVIDENCE, 'generation-summary.json'),
      `${JSON.stringify({ assets: entries }, null, 2)}\n`,
    );
    expect(entries).toHaveLength(ASSETS.length);
  }, 30000);
});
