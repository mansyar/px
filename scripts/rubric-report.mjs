#!/usr/bin/env node
/**
 * Read the recorded rubric scores back as prose.
 *
 * `scripts/rubric.mjs` stores a `why` string beside every criterion score, and
 * `test/art/rubric.test.ts` only checks the numbers, so the model's reasoning has
 * been written into `test/art/scores.json` and never read. This script prints it.
 * It reads the record only: no network call, no credential, no write.
 *
 * Usage:
 *   node scripts/rubric-report.mjs                 # every asset, every pass
 *   node scripts/rubric-report.mjs --asset scene   # one asset
 *   node scripts/rubric-report.mjs --below 4       # only the weak criteria
 *   node scripts/rubric-report.mjs --pass B        # one pass across assets
 *
 * Exit codes: 0 printed, 1 usage or unreadable record.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SCORES = join(ROOT, 'test/art/scores.json');

const WIDTH = 78;

function usage(message) {
  process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    'usage: node scripts/rubric-report.mjs [--asset <name>] [--pass A|B] [--below <1-5>]\n',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const options = { asset: null, pass: null, below: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--asset') {
      if (value === undefined) {
        usage('--asset needs a name');
      }
      options.asset = value;
      index += 1;
    } else if (arg === '--pass') {
      if (value !== 'A' && value !== 'B') {
        usage('--pass takes A or B');
      }
      options.pass = value;
      index += 1;
    } else if (arg === '--below') {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        usage('--below takes an integer from 1 to 5');
      }
      options.below = parsed;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      usage('print the recorded rubric reasoning');
    } else {
      usage(`unknown argument ${arg}`);
    }
  }
  return options;
}

/** Greedy wrap with a hanging indent, so a long reason stays readable. */
function wrap(text, indent) {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = line.length > 0 ? `${line} ${word}` : word;
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }
  return lines.map((entry) => `${indent}${entry}`).join('\n');
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  let record;
  try {
    record = JSON.parse(readFileSync(SCORES, 'utf8'));
  } catch (error) {
    process.stderr.write(`rubric-report: cannot read ${SCORES}: ${error.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(record.assets) || record.assets.length === 0) {
    process.stderr.write(`rubric-report: ${SCORES} has no assets\n`);
    process.exit(1);
  }

  const assets = record.assets.filter(
    (entry) => options.asset === null || entry.asset === options.asset,
  );
  if (assets.length === 0) {
    usage(`no asset named ${options.asset}`);
  }

  const passes = assets.flatMap((entry) =>
    entry.passes
      .filter((pass) => options.pass === null || pass.pass === options.pass)
      .map((pass) => ({ asset: entry.asset, pass })),
  );
  if (passes.length === 0) {
    usage(`no pass ${options.pass} recorded for ${options.asset ?? 'these assets'}`);
  }

  const verdict = record.verdict ?? {};
  const lines = [];
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  lines.push(
    `rubric report — ${plural(assets.length, 'asset', 'assets')}, ` +
      plural(passes.length, 'pass', 'passes'),
  );
  lines.push(
    `record: mean ${verdict.mean ?? '?'} · ${verdict.result ?? '?'} · ` +
      `scored by ${record.scored_by ?? 'unknown'}`,
  );

  const perCriterion = new Map();
  for (const { pass } of passes) {
    for (const [criterion, entry] of Object.entries(pass.scores)) {
      const list = perCriterion.get(criterion) ?? [];
      list.push(entry.score);
      perCriterion.set(criterion, list);
    }
  }
  if (perCriterion.size > 0) {
    lines.push('');
    lines.push('criterion means');
    for (const [criterion, values] of perCriterion) {
      lines.push(
        `  ${criterion.padEnd(20)} ${mean(values).toFixed(2)}  (${plural(values.length, 'pass', 'passes')})`,
      );
    }
  }

  for (const { asset, pass } of passes) {
    const values = Object.values(pass.scores).map((entry) => entry.score);
    lines.push('');
    lines.push(
      `## ${asset} · pass ${pass.pass} · ${mean(values).toFixed(2)} · ` +
        `${pass.model ?? 'unknown model'} · ${pass.view ?? 'unknown view'}`,
    );
    for (const [criterion, entry] of Object.entries(pass.scores)) {
      if (options.below !== null && entry.score > options.below) {
        continue;
      }
      lines.push(`  ${criterion.padEnd(20)} ${entry.score}`);
      if (typeof entry.why === 'string' && entry.why.length > 0) {
        lines.push(wrap(entry.why, '      '));
      }
    }
  }

  if (typeof verdict.note === 'string' && verdict.note.length > 0) {
    lines.push('');
    lines.push('verdict note');
    lines.push(wrap(verdict.note, '  '));
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

main();
