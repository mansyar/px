#!/usr/bin/env node
/**
 * Rubric scorer for the seven authored assets.
 *
 * This script is the *only* thing in the repository that talks to an image model.
 * It is never imported by the engine or by the test suite, and CI never runs it.
 * It asks a vision model for six integer criteria scores against a rendered PNG
 * (or the debug sheet), validates the reply, and appends the record to
 * `test/art/scores.json`. `test/art/rubric.test.ts` later verifies the *recorded*
 * scores; it does not score anything itself.
 *
 * Usage:
 *   PX_RUBRIC_API_KEY=... node scripts/rubric.mjs --asset potion --pass 1
 *   node scripts/rubric.mjs --asset scene --artifact .conductor/evidence/art/scene.debug.png \
 *     --pass 2 --model openai/gpt-4o --replace
 *
 * Env:
 *   PX_RUBRIC_API_KEY   credential for the endpoint (required)
 *   PX_RUBRIC_ENDPOINT  OpenAI-compatible chat-completions URL
 *                       (default https://api.openai.com/v1/chat/completions)
 *   PX_RUBRIC_MODEL     model id (default gpt-4o)
 *
 * Exit codes: 0 recorded, 1 usage/validation/network failure, 2 no credential.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SCORES = join(ROOT, 'test/art/scores.json');
const EVIDENCE = join(ROOT, '.conductor/evidence/art');

export const CRITERIA = [
  'silhouette',
  'value_separation',
  'lighting',
  'edge_language',
  'cluster_discipline',
  'palette_craft',
];

export const ANCHORS = {
  silhouette: {
    1: 'reads as an unidentifiable blob at 1x',
    3: 'recognisable only after being told what it is, or only with colour',
    5: 'identifiable at 1x with no colour information',
  },
  value_separation: {
    1: 'parts merge into one mass',
    3: 'parts separate, but one adjacent pair is within one step',
    5: 'every part distinguishable in a 16-level posterisation',
  },
  lighting: {
    1: 'light comes from two or more directions, or shading contradicts the form',
    3: 'one direction, but one mass is shaded against it',
    5: 'one direction everywhere; every mass reads lit and shadowed consistently',
  },
  edge_language: {
    1: 'outline noise; edges switch treatment row to row with no reason',
    3: 'outline is consistent but detail edges are indistinguishable from silhouette',
    5: 'silhouette, material and detail edges each have a deliberate, consistent treatment',
  },
  cluster_discipline: {
    1: 'single-pixel confetti; clusters too small to read',
    3: 'some clusters under the profile minimum but they are accents',
    5: 'no cluster smaller than the profile minimum except deliberate 1px highlights',
  },
  palette_craft: {
    1: 'palette is arbitrary; hues and values fight',
    3: 'coherent but flat: one hue dominates, ramps do not step evenly',
    5: 'ramps step evenly, shadows run cool and highlights warm, hues are chosen for the subject',
  },
};

function usage(message) {
  process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    'usage: node scripts/rubric.mjs --asset <name> [--artifact <png>] [--pass 1|2] ' +
      '[--model <id>] [--note <text>] [--replace]\n',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const options = { asset: null, artifact: null, pass: null, model: null, note: null, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case '--asset':
        options.asset = value;
        index += 1;
        break;
      case '--artifact':
        options.artifact = value;
        index += 1;
        break;
      case '--pass':
        options.pass = Number(value);
        index += 1;
        break;
      case '--model':
        options.model = value;
        index += 1;
        break;
      case '--note':
        options.note = value;
        index += 1;
        break;
      case '--replace':
        options.replace = true;
        break;
      default:
        usage(`unknown argument: ${flag}`);
    }
  }
  return options;
}

const ASSETS = ['potion', 'sword', 'humanoid', 'chest', 'character', 'prop', 'scene'];

function prompt(asset) {
  const lines = [
    `You are scoring the pixel-art asset "${asset}" against a fixed rubric.`,
    'Score each of the six criteria with an integer from 1 to 5 and one sentence of rationale.',
    'Anchor descriptions (1 / 3 / 5); a 2 or 4 sits between two anchors:',
  ];
  for (const criterion of CRITERIA) {
    const anchor = ANCHORS[criterion];
    lines.push(`- ${criterion}: 1 = ${anchor[1]} | 3 = ${anchor[3]} | 5 = ${anchor[5]}`);
  }
  lines.push(
    'Judge the image at 1x as a game sprite, not as a painting; do not reward detail that',
    'disappears when the image is scaled down. Reply with JSON only, no prose, no markdown:',
    '{"criteria":{"<name>":{"score":<1-5>,"rationale":"<one sentence>"}, ...}}',
    `The response must contain exactly these keys: ${CRITERIA.join(', ')}.`,
  );
  return lines.join('\n');
}

function readRecord(asset, pass, replace) {
  let record = { v: 1, assets: {} };
  try {
    record = JSON.parse(readFileSync(SCORES, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`cannot read ${SCORES}: ${error.message}`);
    }
  }
  record.assets ??= {};
  record.assets[asset] ??= { passes: [] };
  const existing = record.assets[asset].passes ?? [];
  if (existing.some((entry) => entry.pass === pass) && !replace) {
    throw new Error(
      `${asset} pass ${pass} is already recorded; pass --replace to overwrite it`,
    );
  }
  return { record, existing };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.asset) {
    usage('--asset is required');
  }
  if (!ASSETS.includes(options.asset)) {
    usage(`unknown asset "${options.asset}"; expected one of ${ASSETS.join(', ')}`);
  }
  if (options.pass !== 1 && options.pass !== 2) {
    usage('--pass must be 1 or 2');
  }

  const apiKey = process.env.PX_RUBRIC_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      'rubric: no model credential configured.\n' +
        'Set PX_RUBRIC_API_KEY (and optionally PX_RUBRIC_ENDPOINT, PX_RUBRIC_MODEL) and re-run.\n' +
        'This script is the only networked component; the engine and the test suite never score art.\n',
    );
    process.exit(2);
  }

  const endpoint = process.env.PX_RUBRIC_ENDPOINT ?? 'https://api.openai.com/v1/chat/completions';
  const model = options.model ?? process.env.PX_RUBRIC_MODEL ?? 'gpt-4o';
  const artifact = resolve(
    ROOT,
    options.artifact ?? join(EVIDENCE, `${options.asset}.png`),
  );
  const png = readFileSync(artifact);
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;

  const { record, existing } = readRecord(options.asset, options.pass, options.replace);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt(options.asset) },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    process.stderr.write(`rubric: model call failed: ${response.status} ${await response.text()}\n`);
    process.exit(1);
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    process.stderr.write('rubric: model returned no message content\n');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    process.stderr.write(`rubric: reply was not JSON:\n${text}\n`);
    process.exit(1);
  }

  const criteria = parsed?.criteria;
  const problems = [];
  for (const criterion of CRITERIA) {
    const entry = criteria?.[criterion];
    if (entry === undefined) {
      problems.push(`${criterion}: missing`);
      continue;
    }
    if (!Number.isInteger(entry.score) || entry.score < 1 || entry.score > 5) {
      problems.push(`${criterion}: score must be an integer 1-5, got ${JSON.stringify(entry.score)}`);
    }
    if (typeof entry.rationale !== 'string' || entry.rationale.trim().length < 10) {
      problems.push(`${criterion}: rationale must be a sentence`);
    }
  }
  if (problems.length > 0) {
    process.stderr.write(`rubric: model reply failed validation:\n- ${problems.join('\n- ')}\n`);
    process.exit(1);
  }

  const scored = {};
  for (const criterion of CRITERIA) {
    scored[criterion] = {
      score: criteria[criterion].score,
      rationale: criteria[criterion].rationale.trim(),
    };
  }

  const entry = {
    pass: options.pass,
    model,
    date: new Date().toISOString().slice(0, 10),
    artifact: artifact.startsWith(ROOT) ? artifact.slice(ROOT.length + 1).replaceAll('\\', '/') : artifact,
    criteria: scored,
  };
  if (options.note) {
    entry.note = options.note;
  }

  const passes = existing.filter((previous) => previous.pass !== options.pass);
  passes.push(entry);
  passes.sort((a, b) => a.pass - b.pass);
  record.assets[options.asset].passes = passes;
  writeFileSync(SCORES, `${JSON.stringify(record, null, 2)}\n`);

  const values = CRITERIA.map((criterion) => scored[criterion].score);
  process.stdout.write(
    `${options.asset} pass ${options.pass} (${model}): ${CRITERIA.map(
      (criterion, index) => `${criterion}=${values[index]}`,
    ).join(' ')}\nrecorded in ${SCORES}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`rubric: ${error.message}\n`);
  process.exit(1);
});
