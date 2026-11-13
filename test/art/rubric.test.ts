/**
 * The suite does not score art and cannot score art: scoring needs a vision model
 * with network access, which this project never takes at runtime. What this test
 * checks is the **record** in `scores.json` — that it is complete, that every
 * score is a legal integer with a rationale, and that its recorded verdict is the
 * one its own numbers imply.
 *
 * That last assertion is the point. A record that says "pass" while carrying a
 * score of 2 somewhere is a lie the gate would otherwise accept, and a record that
 * says "fail" while every score clears the bar would hide work that actually
 * passed. The verdict is recomputed here, not trusted.
 *
 * AC-20 is currently **not met** and `scores.json` records that plainly. This test
 * therefore does not assert `mean >= 4.0`; it asserts that whatever `scores.json`
 * claims matches what it measured. See `docs/rubric.md` and
 * `verification/phase-7.md`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ScoredCriterion {
  score: number;
  why: string;
}

interface Pass {
  pass: string;
  artifact_path: string;
  view: string;
  subject: string;
  scores: Record<string, ScoredCriterion>;
}

interface AssetRecord {
  asset: string;
  artifact: string;
  passes: Pass[];
}

interface Failure {
  asset: string;
  pass: string;
  criterion: string;
  score: number;
}

interface ScoreRecord {
  schema: number;
  criteria: string[];
  verdict: {
    result: 'pass' | 'fail';
    mean: number;
    threshold_mean: number;
    min_allowed: number;
    failures: Failure[];
  };
  assets: AssetRecord[];
}

const RECORD: ScoreRecord = JSON.parse(
  readFileSync(join(process.cwd(), 'test/art/scores.json'), 'utf8'),
) as ScoreRecord;

const ASSETS = ['potion', 'sword', 'humanoid', 'chest', 'character', 'prop', 'scene'];
const CRITERIA = [
  'silhouette',
  'value_separation',
  'lighting',
  'edge_language',
  'cluster_discipline',
  'palette_craft',
];

/** Every recorded score, flattened, in a stable order. */
function allScores(): { asset: string; pass: string; criterion: string; score: number }[] {
  return RECORD.assets.flatMap((asset) =>
    asset.passes.flatMap((pass) =>
      CRITERIA.map((criterion) => ({
        asset: asset.asset,
        pass: pass.pass,
        criterion,
        score: pass.scores[criterion]?.score ?? Number.NaN,
      })),
    ),
  );
}

describe('rubric record', () => {
  it('covers all seven assets, each with two passes', () => {
    expect(RECORD.assets.map((asset) => asset.asset).sort()).toEqual([...ASSETS].sort());
    for (const asset of RECORD.assets) {
      expect(asset.passes).toHaveLength(2);
      expect(asset.passes.map((pass) => pass.pass).sort()).toEqual(['A', 'B']);
    }
  });

  it('names the six criteria in the fixed order', () => {
    expect(RECORD.criteria).toEqual(CRITERIA);
  });

  it('records an integer score and a rationale for every criterion', () => {
    for (const asset of RECORD.assets) {
      for (const pass of asset.passes) {
        expect(Object.keys(pass.scores).sort()).toEqual([...CRITERIA].sort());
        for (const criterion of CRITERIA) {
          const entry = pass.scores[criterion] as ScoredCriterion;
          expect(Number.isInteger(entry.score), `${asset.asset} ${pass.pass} ${criterion}`).toBe(
            true,
          );
          expect(entry.score).toBeGreaterThanOrEqual(1);
          expect(entry.score).toBeLessThanOrEqual(5);
          expect(
            entry.why.trim().length,
            `${asset.asset} ${pass.pass} ${criterion}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('records that both passes scored a faithful view, never a raw 1x PNG', () => {
    for (const asset of RECORD.assets) {
      for (const pass of asset.passes) {
        expect(pass.artifact_path.length).toBeGreaterThan(0);
        expect(pass.view.length).toBeGreaterThan(0);
        // A 1x artifact below 32 px is resampled by any viewer before a model sees
        // it, which is how pass 1 of the first run measured the resampler instead
        // of the art. The method forbids it, so the record must not contain it.
        if (pass.artifact_path.endsWith('.png') && !pass.artifact_path.includes('debug')) {
          expect(pass.artifact_path, `${asset.asset} ${pass.pass}`).toContain('8x');
        }
      }
    }
  });

  it('records the mean its own scores produce', () => {
    const scores = allScores().map((entry) => entry.score);
    const mean = scores.reduce((total, score) => total + score, 0) / scores.length;
    expect(Number(mean.toFixed(2))).toBe(RECORD.verdict.mean);
  });

  it('records a verdict consistent with the mean and the floor', () => {
    const belowFloor = allScores().filter((entry) => entry.score < RECORD.verdict.min_allowed);
    const meanClears = RECORD.verdict.mean >= RECORD.verdict.threshold_mean;
    const expected = meanClears && belowFloor.length === 0 ? 'pass' : 'fail';
    expect(
      RECORD.verdict.result,
      `mean ${RECORD.verdict.mean}, ${belowFloor.length} below floor`,
    ).toBe(expected);
  });

  it('lists exactly the scores below the floor, so the failure cannot be softened', () => {
    const belowFloor = allScores()
      .filter((entry) => entry.score < RECORD.verdict.min_allowed)
      .map((entry) => `${entry.asset}/${entry.pass}/${entry.criterion}=${entry.score}`)
      .sort();
    const recorded = RECORD.verdict.failures
      .map((failure) => `${failure.asset}/${failure.pass}/${failure.criterion}=${failure.score}`)
      .sort();
    expect(recorded).toEqual(belowFloor);
  });
});
