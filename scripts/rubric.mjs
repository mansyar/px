#!/usr/bin/env node
/**
 * Rubric scorer for the seven authored assets.
 *
 * This script is the *only* thing in the repository that talks to an image model.
 * It is never imported by the engine or by the test suite, and CI never runs it.
 * It asks a vision model for six integer criteria scores against a rendered PNG
 * (or the debug sheet), validates the reply, and appends the pass to
 * `test/art/scores.json` in the schema-3 shape. `test/art/rubric.test.ts` later
 * verifies the *recorded* scores; it does not score anything itself.
 *
 * Usage:
 *   PX_RUBRIC_API_KEY=... node scripts/rubric.mjs --asset potion --pass A
 *   PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json \
 *     node scripts/rubric.mjs --asset scene --pass B \
 *     --artifact .conductor/evidence/art/scene.debug.png --model gemini-3.5-flash-lite
 *   node scripts/rubric.mjs --asset sword --pass A --dry-run
 *
 * Env:
 *   PX_RUBRIC_API_KEY       credential for the endpoint
 *   PX_RUBRIC_CREDENTIALS   path to an opencode config whose `mcp["agent-vision"]`
 *                           environment carries VISION_API_KEY / VISION_BASE_URL /
 *                           VISION_MODEL_NAME. Read in place; never copied, printed
 *                           or written into the repository.
 *   PX_RUBRIC_ENDPOINT      chat-completions URL (default OpenAI; a base URL is also
 *                           accepted and gets `/chat/completions` appended)
 *   PX_RUBRIC_MODEL         model id (default from credentials, else gpt-4o)
 *
 * Exit codes: 0 recorded, 1 usage/validation/network failure, 2 no credential.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
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

const ASSETS = ['potion', 'sword', 'humanoid', 'chest', 'character', 'prop', 'scene'];
const PASSES = ['A', 'B'];

function usage(message) {
  process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    'usage: node scripts/rubric.mjs --asset <name> [--artifact <png>] [--pass A|B|1|2] ' +
      '[--model <id>] [--note <text>] [--replace] [--dry-run]\n',
  );
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    asset: null,
    artifact: null,
    pass: null,
    model: null,
    note: null,
    replace: false,
    dryRun: false,
  };
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
        options.pass = String(value).toUpperCase().replace('1', 'A').replace('2', 'B');
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
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        usage(`unknown argument: ${flag}`);
    }
  }
  return options;
}

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

/**
 * Resolve the credential without ever putting it in a file, an argument or a log.
 * `PX_RUBRIC_CREDENTIALS` points at an opencode config; the `agent-vision` MCP entry
 * there already carries the key, base URL and model for a Gemini endpoint.
 */
function resolveCredentials() {
  const path = process.env.PX_RUBRIC_CREDENTIALS;
  if (!path) {
    return {};
  }
  const file = path.startsWith('~') ? join(homedir(), path.slice(1)) : resolve(ROOT, path);
  let config;
  try {
    config = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    process.stderr.write(`rubric: cannot read credentials file ${file}: ${error.message}\n`);
    process.exit(2);
  }
  const servers = config.mcp ?? config.mcpServers ?? {};
  const vision = servers['agent-vision'] ?? servers.agentVision;
  const environment = vision?.environment ?? vision?.env ?? {};
  return {
    apiKey: environment.VISION_API_KEY,
    baseUrl: environment.VISION_BASE_URL,
    model: environment.VISION_MODEL_NAME,
  };
}

function endpointFor(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

/** Recompute the verdict from every pass, so a write cannot leave it stale. */
function recomputeVerdict(record) {
  const passes = record.assets.flatMap((asset) => asset.passes);
  const scores = passes.flatMap((pass) =>
    CRITERIA.map((criterion) => pass.scores?.[criterion]?.score),
  );
  const scored = scores.filter((score) => Number.isInteger(score));
  const mean = Number((scored.reduce((total, score) => total + score, 0) / scored.length).toFixed(2));
  const failures = [];
  for (const asset of record.assets) {
    for (const pass of asset.passes) {
      for (const criterion of CRITERIA) {
        const entry = pass.scores?.[criterion];
        if (entry && entry.score < record.verdict.min_allowed) {
          failures.push({ asset: asset.asset, pass: pass.pass, criterion, score: entry.score });
        }
      }
    }
  }
  const agent = passes.filter((pass) => pass.scorer === 'agent');
  const basis =
    agent.length === 0 ? 'independent' : agent.length === passes.length ? 'self-review' : 'mixed';
  record.verdict.result =
    mean >= record.verdict.threshold_mean && failures.length === 0 ? 'pass' : 'fail';
  record.verdict.mean = mean;
  record.verdict.failures = failures;
  record.verdict.basis = basis;
  if (basis === 'independent') {
    delete record.verdict.caveat;
  } else if (!record.verdict.caveat?.trim()) {
    const names = [...new Set(agent.map((pass) => pass.asset ?? 'unknown'))];
    record.verdict.caveat = `${names.join(', ')} include agent self-review passes; the rest are vision-model passes.`;
  }
  return record.verdict;
}

function readRecord(asset, pass, replace) {
  let record;
  try {
    record = JSON.parse(readFileSync(SCORES, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`cannot read ${SCORES}: ${error.message}`);
    }
    record = {
      schema: 3,
      rubric: 'docs/rubric.md',
      scored_by: 'scripts/rubric.mjs',
      scored_at: new Date().toISOString().slice(0, 10),
      criteria: CRITERIA,
      verdict: { result: 'fail', mean: 0, threshold_mean: 4, min_allowed: 3, basis: 'independent', failures: [] },
      assets: [],
    };
  }
  if (record.schema !== 3 || !Array.isArray(record.assets)) {
    throw new Error(
      `${SCORES} is not a schema-3 record; this script writes schema 3 only and will not ` +
        'rewrite an older shape. Migrate the record first.',
    );
  }
  let entry = record.assets.find((candidate) => candidate.asset === asset);
  if (!entry) {
    entry = { asset, artifact: '', passes: [] };
    record.assets.push(entry);
  }
  if (entry.passes.some((existing) => existing.pass === pass) && !replace) {
    throw new Error(`${asset} pass ${pass} is already recorded; pass --replace to overwrite it`);
  }
  return { record, entry };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.asset) {
    usage('--asset is required');
  }
  if (!ASSETS.includes(options.asset)) {
    usage(`unknown asset "${options.asset}"; expected one of ${ASSETS.join(', ')}`);
  }
  if (!PASSES.includes(options.pass)) {
    usage('--pass must be A or B (1 and 2 are accepted as aliases)');
  }

  const credentials = resolveCredentials();
  const apiKey = process.env.PX_RUBRIC_API_KEY ?? credentials.apiKey;
  if (!apiKey) {
    process.stderr.write(
      'rubric: no model credential configured.\n' +
        'Set PX_RUBRIC_API_KEY, or PX_RUBRIC_CREDENTIALS to an opencode config whose\n' +
        '`agent-vision` MCP entry carries VISION_API_KEY, plus optionally PX_RUBRIC_ENDPOINT\n' +
        'and PX_RUBRIC_MODEL. This script is the only networked component; the engine and\n' +
        'the test suite never score art, and no credential is ever written to the repository.\n',
    );
    process.exit(2);
  }

  const baseUrl = process.env.PX_RUBRIC_ENDPOINT ?? credentials.baseUrl;
  const endpoint = baseUrl
    ? endpointFor(baseUrl)
    : 'https://api.openai.com/v1/chat/completions';
  const model = options.model ?? process.env.PX_RUBRIC_MODEL ?? credentials.model ?? 'gpt-4o';
  const artifact = resolve(ROOT, options.artifact ?? join(EVIDENCE, `${options.asset}.png`));
  const png = readFileSync(artifact);
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;

  const { record, entry: assetEntry } = readRecord(
    options.asset,
    options.pass,
    options.replace || options.dryRun,
  );

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
    const scored = criteria?.[criterion];
    if (scored === undefined) {
      problems.push(`${criterion}: missing`);
      continue;
    }
    if (!Number.isInteger(scored.score) || scored.score < 1 || scored.score > 5) {
      problems.push(`${criterion}: score must be an integer 1-5, got ${JSON.stringify(scored.score)}`);
    }
    if (typeof scored.rationale !== 'string' || scored.rationale.trim().length < 10) {
      problems.push(`${criterion}: rationale must be a sentence`);
    }
  }
  if (problems.length > 0) {
    process.stderr.write(`rubric: model reply failed validation:\n- ${problems.join('\n- ')}\n`);
    process.exit(1);
  }

  const scores = {};
  for (const criterion of CRITERIA) {
    scores[criterion] = {
      score: criteria[criterion].score,
      why: criteria[criterion].rationale.trim(),
    };
  }

  const relative = artifact.startsWith(ROOT)
    ? artifact.slice(ROOT.length + 1).replaceAll('\\', '/')
    : artifact;
  const scored = {
    pass: options.pass,
    scorer: 'vision-model',
    artifact_path: relative,
    view: relative.includes('debug')
      ? 'debug sheet (8x panel, 1x panel, silhouette, part crops)'
      : 'plain 8x nearest-neighbour on #808080',
    subject: options.asset,
    scores,
  };
  if (options.note) {
    scored.note = options.note;
  }

  const values = CRITERIA.map((criterion) => scores[criterion].score);
  const line = `${options.asset} pass ${options.pass} (${model}): ${CRITERIA.map(
    (criterion, index) => `${criterion}=${values[index]}`,
  ).join(' ')}`;

  if (options.dryRun) {
    process.stdout.write(`${line}\n(dry run: nothing written to ${SCORES})\n`);
    return;
  }

  assetEntry.passes = assetEntry.passes
    .filter((previous) => previous.pass !== options.pass)
    .concat(scored)
    .sort((a, b) => a.pass.localeCompare(b.pass));
  const verdict = recomputeVerdict(record);
  writeFileSync(SCORES, `${JSON.stringify(record, null, 2)}\n`);

  process.stdout.write(
    `${line}\nrecorded in ${SCORES}\n` +
      `verdict: ${verdict.result} mean ${verdict.mean} (${verdict.basis})\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`rubric: ${error.message}\n`);
  process.exit(1);
});
