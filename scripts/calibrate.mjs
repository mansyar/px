#!/usr/bin/env node
/**
 * Calibrate the art rubric: score every low/high variant pair and report whether
 * each criterion actually separates a deliberately bad artifact from a good one.
 *
 * The scorer (`scripts/rubric.mjs`) writes only to `test/art/scores.json`, so this
 * harness snapshots that file, scores each variant through the scorer, reads the
 * pass back out of the record, and restores the original bytes in a `finally`.
 * A crash mid-run leaves a backup; the next run restores from it before starting.
 *
 * Usage:
 *   PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json pnpm rubric:calibrate
 *   node scripts/calibrate.mjs --only lighting
 *   node scripts/calibrate.mjs --model gemini-3.5-flash-lite
 *
 * Exit codes: 0 report written, 1 the record could not be restored or a call
 * failed beyond its retry budget, 2 no credential (from the scorer).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SCORES = join(ROOT, 'test/art/scores.json');
const OUT = join(ROOT, '.conductor/evidence/calibration');
const BACKUP = join(OUT, 'scores-backup.json');
const VARIANTS = join(OUT, 'variants');
const PROBE_TRACK = join(ROOT, 'conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling');
const PROBE_REGISTRY = join(PROBE_TRACK, 'candidates.json');

const CRITERIA = [
  'silhouette',
  'value_separation',
  'lighting',
  'edge_language',
  'cluster_discipline',
  'palette_craft',
];

/** Thresholds for the report. Changing one changes what "separates" means. */
const THRESHOLDS = {
  separates_delta: 2,
  min_pass_delta: 1,
  saturated_max: 3,
  anchor4_min: 4,
};

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_ATTEMPTS = 4;
const CALL_TIMEOUT_MS = 180_000;

function parseArgs(argv) {
  const options = {
    only: null,
    model: process.env.PX_RUBRIC_MODEL ?? DEFAULT_MODEL,
    recompute: false,
    probes: false,
    candidate: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--only') {
      options.only = argv[index + 1];
      index += 1;
    } else if (flag === '--model') {
      options.model = argv[index + 1];
      index += 1;
    } else if (flag === '--recompute') {
      options.recompute = true;
    } else if (flag === '--merge') {
      options.merge = true;
    } else if (flag === '--probes') {
      options.probes = true;
    } else if (flag === '--candidate') {
      options.candidate = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown argument: ${flag}`);
    }
  }
  if (options.only && !CRITERIA.includes(options.only)) {
    throw new Error(`--only must be one of ${CRITERIA.join(', ')}`);
  }
  return options;
}

/** Run the scorer once for one variant pass and return the recorded pass. */
function score(assetPath, pass, note, model) {
  const result = spawnSync(
    process.execPath,
    [
      join(ROOT, 'scripts/rubric.mjs'),
      '--asset',
      'chest',
      '--pass',
      pass,
      '--artifact',
      assetPath,
      '--model',
      model,
      '--note',
      note,
      '--replace',
    ],
    { encoding: 'utf8', cwd: ROOT, timeout: CALL_TIMEOUT_MS },
  );
  if (result.status !== 0) {
    return { ok: false, status: result.status, stderr: (result.stderr ?? '').trim() };
  }
  const record = JSON.parse(readFileSync(SCORES, 'utf8'));
  const entry = record.assets.find((candidate) => candidate.asset === 'chest');
  const recorded = entry?.passes.find((candidate) => candidate.pass === pass);
  if (!recorded) {
    return { ok: false, status: 1, stderr: 'scorer exited 0 but wrote no pass' };
  }
  const scores = Object.fromEntries(
    CRITERIA.map((criterion) => [criterion, recorded.scores[criterion]?.score ?? null]),
  );
  return { ok: true, pass: recorded, scores };
}

/** Score with a bounded retry budget; a reply the scorer rejects is not a score. */
function scoreWithRetries(assetPath, pass, note, model) {
  const attempts = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const outcome = score(assetPath, pass, note, model);
    if (outcome.ok) return { ...outcome, attempts };
    attempts.push(outcome.stderr.split('\n')[0] || `exit ${outcome.status}`);
    if (outcome.status === 2) break;
  }
  return { ok: false, attempts };
}

/**
 * Read the pre-registered candidates, verify each recipe's hash immediately before
 * scoring it, and collect both passes. A mismatch aborts: a probe that scores an
 * unregistered recipe proves nothing.
 */
function runProbes(options) {
  const registry = JSON.parse(readFileSync(PROBE_REGISTRY, 'utf8'));
  const calls = { attempted: 0, rejected: 0 };
  const results = [];

  const selected = registry.candidates.filter(
    (entry) =>
      (!options.only || entry.criterion === options.only) &&
      (!options.candidate || entry.name === options.candidate),
  );
  for (const entry of selected) {
    if (!entry.artifacts?.eight || !entry.artifacts?.debug) {
      throw new Error(
        `candidate ${entry.criterion}/${entry.name} has no rendered artifacts registered; ` +
          're-run scripts/calibrate/ceiling.mjs without --no-render',
      );
    }
    const recipePath = resolve(ROOT, entry.recipe);
    const candidate = { ...entry, passes: {} };
    for (const pass of ['A', 'B']) {
      const actual = createHash('sha256').update(readFileSync(recipePath)).digest('hex');
      if (actual !== entry.sha256) {
        throw new Error(
          `recipe hash mismatch for ${entry.criterion}/${entry.name}: ${actual} does not match the registered ${entry.sha256}`,
        );
      }
      const artifact = pass === 'A' ? entry.artifacts.eight : entry.artifacts.debug;
      calls.attempted += 1;
      const outcome = scoreWithRetries(
        resolve(ROOT, artifact),
        pass,
        `ceiling probe ${entry.criterion}/${entry.name}`,
        options.model,
      );
      if (outcome.attempts.length > 0) calls.rejected += 1;
      candidate.passes[pass] = outcome.ok
        ? { scores: outcome.scores, why: outcome.pass.scores[entry.criterion].why }
        : null;
      if (!outcome.ok) {
        process.stderr.write(`unscored: ${entry.criterion}/${entry.name} pass ${pass}\n`);
      }
    }
    results.push(candidate);
    const a = candidate.passes.A?.scores[entry.criterion] ?? null;
    const b = candidate.passes.B?.scores[entry.criterion] ?? null;
    process.stdout.write(`${entry.criterion}/${entry.name}: ${a}/${b}\n`);
  }
  return { registry, calls, results };
}

function writeProbe({ registry, calls: freshCalls, results: fresh }, options) {
  // `--merge --candidate x` folds a re-score into the existing probe report, so a
  // lost reply costs one candidate rather than a full 18-call round.
  let results = fresh;
  let calls = freshCalls;
  let mergedCandidates = [];
  if (options.merge && existsSync(join(OUT, 'probe.json'))) {
    const previous = JSON.parse(readFileSync(join(OUT, 'probe.json'), 'utf8'));
    const byName = new Map(
      previous.criteria.flatMap((entry) => entry.candidates).map((entry) => [entry.name, entry]),
    );
    for (const entry of fresh) byName.set(entry.name, entry);
    results = [...byName.values()];
    calls = {
      attempted: previous.calls.attempted + calls.attempted,
      rejected: previous.calls.rejected + calls.rejected,
    };
    mergedCandidates = fresh.map((entry) => entry.name);
  }
  const criteria = [...new Set(results.map((entry) => entry.criterion))];
  const summary = criteria.map((criterion) => {
    const candidates = results.filter((entry) => entry.criterion === criterion);
    const reached = candidates.filter((entry) => {
      const a = entry.passes.A?.scores[criterion];
      const b = entry.passes.B?.scores[criterion];
      return Number.isInteger(a) && Number.isInteger(b) && a >= 4 && b >= 4;
    });
    return {
      criterion,
      verdict: reached.length > 0 ? 'ceiling reached' : 'not reached',
      reached_by: reached.map((entry) => entry.name),
      candidates,
    };
  });

  const report = {
    schema: 1,
    kind: 'ceiling-probe',
    base_asset: registry.base_asset,
    model: options.model,
    generated_at: new Date().toISOString(),
    threshold: { reached_min: 4, passes_required: 2 },
    calls,
    ...(mergedCandidates.length > 0 ? { merged_candidates: mergedCandidates } : {}),
    criteria: summary,
  };

  const lines = [
    '# Rubric ceiling probe',
    '',
    `- Model: \`${options.model}\``,
    `- Base asset: \`${registry.base_asset}\``,
    `- Generated: ${report.generated_at}`,
    `- Calls: ${calls.attempted} attempted, ${calls.rejected} rejected`,
    '',
    'Nine candidates fixed before the first call and addressed by recipe hash. A',
    'criterion counts as reached only when a candidate scores at least 4 on both',
    'passes for that criterion.',
    '',
    '| criterion | candidate | target A/B | reached |',
    '| --- | --- | --- | --- |',
  ];
  for (const entry of summary) {
    for (const candidate of entry.candidates) {
      const a = candidate.passes.A?.scores[entry.criterion] ?? '—';
      const b = candidate.passes.B?.scores[entry.criterion] ?? '—';
      const hit = entry.reached_by.includes(candidate.name) ? '**yes**' : 'no';
      lines.push(`| \`${entry.criterion}\` | \`${candidate.name}\` | ${a}/${b} | ${hit} |`);
    }
  }
  lines.push('', '## Verdicts', '');
  for (const entry of summary) {
    const names = entry.reached_by.length > 0 ? entry.reached_by.join(', ') : 'none of three';
    lines.push(`- **${entry.criterion}:** ${entry.verdict} (${names})`);
  }
  lines.push('', '## Rationales', '');
  for (const entry of summary) {
    for (const candidate of entry.candidates) {
      lines.push(`### ${entry.criterion} / ${candidate.name}`, '', `Intent: ${candidate.intent}`, '');
      if (candidate.passes.A) lines.push(`- **pass A:** ${candidate.passes.A.why}`);
      if (candidate.passes.B) lines.push(`- **pass B:** ${candidate.passes.B.why}`);
      lines.push('');
    }
  }

  writeFileSync(join(OUT, 'probe.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(OUT, 'probe.md'), `${lines.join('\n')}\n`, 'utf8');
  writeFileSync(join(PROBE_TRACK, 'probe.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(PROBE_TRACK, 'probe.md'), `${lines.join('\n')}\n`, 'utf8');
  process.stdout.write(`probe written to ${join(PROBE_TRACK, 'probe.md')}\n`);

  for (const entry of summary) {
    process.stdout.write(`${entry.criterion}: ${entry.verdict}${entry.reached_by.length ? ` (${entry.reached_by.join(', ')})` : ''}\n`);
  }
  const unscored = results.filter((entry) => !entry.passes.A || !entry.passes.B);
  if (unscored.length > 0) {
    process.stderr.write(
      `incomplete: ${unscored.map((entry) => `${entry.criterion}/${entry.name}`).join(', ')} could not be scored\n`,
    );
    process.exitCode = 1;
  }
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Separation and the scale ceiling are two axes, not one: `lighting` separates a
 * flat fill from a shaded one (1 vs 3) and still has no 4-anchor. The verdict
 * reports separation; `saturated` and `anchor4` report the ceiling.
 */
function finalizeEntry(entry) {
  const lowValues = [entry.low.A, entry.low.B].filter(Number.isInteger);
  const highValues = [entry.high.A, entry.high.B].filter(Number.isInteger);
  entry.low.mean = lowValues.length ? Number(mean(lowValues).toFixed(2)) : null;
  entry.high.mean = highValues.length ? Number(mean(highValues).toFixed(2)) : null;
  if (lowValues.length < 2 || highValues.length < 2) {
    entry.verdict = 'unscored';
    entry.delta = null;
    entry.saturated = false;
    entry.anchor4 = false;
    return entry;
  }
  const delta = Number((entry.high.mean - entry.low.mean).toFixed(2));
  const perPass = Math.min(entry.high.A - entry.low.A, entry.high.B - entry.low.B);
  entry.delta = delta;
  entry.verdict =
    delta >= THRESHOLDS.separates_delta && perPass >= THRESHOLDS.min_pass_delta
      ? 'separates'
      : 'ambiguous';
  entry.saturated = Math.max(entry.high.A, entry.high.B) <= THRESHOLDS.saturated_max;
  entry.anchor4 =
    entry.high.A >= THRESHOLDS.anchor4_min && entry.high.B >= THRESHOLDS.anchor4_min;
  return entry;
}

function writeMarkdown(report) {
  const lines = [
    '# Rubric calibration',
    '',
    `- Model: \`${report.model}\``,
    `- Generated: ${report.generated_at}`,
    `- Base asset: \`${report.base_asset}\``,
    `- Calls: ${report.calls.attempted} attempted, ${report.calls.rejected} rejected`,
    '',
    'Each variant pair is scored twice: pass A on the plain 8× upscale, pass B on',
    'the debug sheet. `separates` needs Δ ≥ 2 on the pass mean and Δ ≥ 1 on each',
    'pass. A criterion whose high variant never exceeds 3 is `saturated`: the judge',
    'cannot reach the top of the scale for it, whatever the art does.',
    '',
    '| criterion | low A/B | high A/B | Δ | verdict | 4-anchor |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const entry of report.criteria) {
    const low = entry.low.A === null ? '—' : `${entry.low.A}/${entry.low.B}`;
    const high = entry.high.A === null ? '—' : `${entry.high.A}/${entry.high.B}`;
    const delta = entry.delta === null ? '—' : entry.delta.toFixed(2);
    lines.push(
      `| \`${entry.criterion}\` | ${low} | ${high} | ${delta} | **${entry.verdict}** | ${
        entry.anchor4 ? 'yes' : 'no'
      } |`,
    );
  }
  lines.push('', '## Rationales', '');
  for (const entry of report.criteria) {
    lines.push(`### ${entry.criterion}`, '');
    for (const level of ['low', 'high']) {
      for (const pass of ['A', 'B']) {
        const text = entry.rationale[level]?.[pass];
        if (text) lines.push(`- **${level} pass ${pass}:** ${text}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(OUT, { recursive: true });

  // Recompute verdicts from recorded scores without spending another call.
  if (options.recompute) {
    const path = join(OUT, 'report.json');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    report.criteria = report.criteria.map(finalizeEntry);
    report.recomputed_at = new Date().toISOString();
    report.thresholds = THRESHOLDS;
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(join(OUT, 'report.md'), `${writeMarkdown(report)}\n`, 'utf8');
    process.stdout.write(`recomputed ${report.criteria.length} criteria from recorded scores\n`);
    return;
  }

  // A killed run leaves a backup; restore it before taking a new snapshot so the
  // record never carries variant scores into the repository.
  if (existsSync(BACKUP)) {
    writeFileSync(SCORES, readFileSync(BACKUP));
    rmSync(BACKUP);
    process.stdout.write('recovered an interrupted run from scores-backup.json\n');
  }

  const original = readFileSync(SCORES);
  writeFileSync(BACKUP, original);

  const selected = options.only ? CRITERIA.filter((criterion) => criterion === options.only) : CRITERIA;
  const calls = { attempted: 0, rejected: 0 };
  const results = [];

  try {
    if (options.probes) {
      writeProbe(runProbes(options), options);
      return;
    }
    for (const criterion of selected) {
      const entry = { criterion, low: {}, high: {}, rationale: { low: {}, high: {} }, attempts: [] };
      for (const level of ['low', 'high']) {
        const recipe = join(VARIANTS, criterion, `${level}.px.json`);
        const assets = {
          A: join(VARIANTS, criterion, `${level}.8x.png`),
          B: join(VARIANTS, criterion, `${level}.debug.png`),
        };
        if (!existsSync(assets.A) || !existsSync(assets.B)) {
          throw new Error(`missing artifacts for ${criterion}/${level}; run the generator first`);
        }
        for (const pass of ['A', 'B']) {
          calls.attempted += 1;
          const outcome = scoreWithRetries(
            assets[pass],
            pass,
            `calibration ${criterion}/${level} (${recipe})`,
            options.model,
          );
          if (outcome.attempts.length > 0) calls.rejected += 1;
          if (!outcome.ok) {
            process.stderr.write(
              `unscored: ${criterion}/${level} pass ${pass} after ${outcome.attempts.length} attempt(s)\n`,
            );
            entry[level][pass] = null;
            entry.rationale[level][pass] = null;
            entry.attempts.push({ level, pass, attempts: outcome.attempts });
            continue;
          }
          entry[level][pass] = outcome.scores[criterion];
          entry.rationale[level][pass] = outcome.pass.scores[criterion].why;
        }
      }
      finalizeEntry(entry);
      results.push(entry);
      process.stdout.write(
        `${criterion}: low ${entry.low.A}/${entry.low.B} high ${entry.high.A}/${entry.high.B} ` +
          `Δ ${entry.delta ?? '—'} -> ${entry.verdict}` +
          `${entry.anchor4 ? ' (4-anchor)' : ''}${entry.saturated ? ' (ceiling 3)' : ''}\n`,
      );
    }
  } finally {
    writeFileSync(SCORES, original);
    rmSync(BACKUP, { force: true });
    const restored = readFileSync(SCORES);
    if (!restored.equals(original)) {
      process.stderr.write(`fatal: ${SCORES} was not restored byte-for-byte\n`);
      process.exitCode = 1;
    }
  }

  // `--merge --only x` re-scores one criterion into an existing report, so a
  // criterion that lost its reply to a malformed model answer need not cost a
  // full re-run.
  let merged = results;
  let totalCalls = calls;
  if (options.merge && existsSync(join(OUT, 'report.json'))) {
    const previous = JSON.parse(readFileSync(join(OUT, 'report.json'), 'utf8'));
    const byCriterion = new Map(previous.criteria.map((entry) => [entry.criterion, entry]));
    for (const entry of results) byCriterion.set(entry.criterion, entry);
    merged = CRITERIA.map((criterion) => byCriterion.get(criterion)).filter(Boolean);
    totalCalls = {
      attempted: (previous.calls?.attempted ?? 0) + calls.attempted,
      rejected: (previous.calls?.rejected ?? 0) + calls.rejected,
    };
  }

  const report = {
    schema: 1,
    rubric: 'docs/rubric.md',
    base_asset: 'test/art/chest/chest.px.json',
    model: options.model,
    generated_at: new Date().toISOString(),
    thresholds: THRESHOLDS,
    calls: totalCalls,
    criteria: merged,
  };
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(OUT, 'report.md'), `${writeMarkdown(report)}\n`, 'utf8');
  process.stdout.write(`report written to ${join(OUT, 'report.md')}\n`);

  const unscored = merged.filter((entry) => entry.verdict === 'unscored');
  if (unscored.length > 0) {
    process.stderr.write(
      `incomplete: ${unscored.map((entry) => entry.criterion).join(', ')} could not be scored; ` +
        'the report records them as unscored rather than guessing\n',
    );
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`calibrate: ${error.message}\n`);
  process.exit(1);
}
