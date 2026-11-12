/**
 * The profile table is the contract every other size-sensitive number is read
 * from, so these tests pin the table itself: its boundaries, its compatibility
 * row, and the rule that `tiny` is stricter than `small` while `large` is looser.
 * A table that cannot express that difference would be decoration.
 */

import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import {
  PROFILES,
  parseScaleProfile,
  profileFor,
  profileNumbers,
  profileNumbersFor,
  SCALE_PROFILES,
} from '../../src/core/profile.js';
import {
  JAGGY_MAX_RUN,
  JAGGY_MIN_RUNS,
  JAGGY_STEP_JUMP,
  LOW_CONTRAST_MIN_RATIO,
  ORPHAN_NEIGHBOUR_RADIUS,
} from '../../src/lint/thresholds.js';

const ROW_KEYS = [
  'debugZoom',
  'ditherAllowed',
  'ditherMinTones',
  'jaggyMaxRun',
  'jaggyMinRuns',
  'jaggyStepJump',
  'lowContrastMinRatio',
  'minCluster',
  'orphanRadius',
  'outlineWidth',
  'toneCount',
];

describe('profile derivation', () => {
  it('names the four regimes explicitly', () => {
    expect(SCALE_PROFILES).toEqual(['tiny', 'small', 'medium', 'large']);
  });

  it('puts every boundary on the documented side', () => {
    expect(profileFor(16, 16)).toBe('tiny');
    expect(profileFor(17, 17)).toBe('small');
    expect(profileFor(48, 48)).toBe('small');
    expect(profileFor(49, 49)).toBe('medium');
    expect(profileFor(128, 128)).toBe('medium');
    expect(profileFor(129, 129)).toBe('large');
    expect(profileFor(256, 256)).toBe('large');
  });

  it('decides by the longest side, not the shorter one', () => {
    expect(profileFor(8, 48)).toBe('small');
    expect(profileFor(48, 8)).toBe('small');
    expect(profileFor(33, 129)).toBe('large');
    expect(profileFor(256, 8)).toBe('large');
  });

  it('derives the numbers for a canvas', () => {
    expect(profileNumbersFor(32, 32)).toBe(PROFILES.small);
    expect(profileNumbersFor(200, 64)).toBe(PROFILES.large);
    expect(profileNumbers('medium')).toBe(PROFILES.medium);
  });
});

describe('the table', () => {
  it('gives every regime every number, and nothing else', () => {
    for (const profile of SCALE_PROFILES) {
      expect(Object.keys(PROFILES[profile]).sort()).toEqual(ROW_KEYS);
    }
  });

  it('is frozen, so a rule cannot tune it at runtime', () => {
    expect(Object.isFrozen(PROFILES)).toBe(true);
    for (const profile of SCALE_PROFILES) {
      expect(Object.isFrozen(PROFILES[profile])).toBe(true);
    }
  });

  it('holds the calibrated values', () => {
    expect(PROFILES.tiny).toEqual({
      jaggyMinRuns: 3,
      jaggyMaxRun: 3,
      jaggyStepJump: 2,
      orphanRadius: 2,
      lowContrastMinRatio: 2.0,
      minCluster: 1,
      ditherAllowed: false,
      ditherMinTones: 3,
      outlineWidth: 1,
      toneCount: 3,
      debugZoom: 8,
    });
    expect(PROFILES.small).toEqual({
      jaggyMinRuns: 3,
      jaggyMaxRun: 3,
      jaggyStepJump: 2,
      orphanRadius: 2,
      lowContrastMinRatio: 1.5,
      minCluster: 2,
      ditherAllowed: true,
      ditherMinTones: 3,
      outlineWidth: 1,
      toneCount: 3,
      debugZoom: 8,
    });
    expect(PROFILES.medium).toEqual({
      jaggyMinRuns: 3,
      jaggyMaxRun: 4,
      jaggyStepJump: 2,
      orphanRadius: 2,
      lowContrastMinRatio: 1.35,
      minCluster: 2,
      ditherAllowed: true,
      ditherMinTones: 3,
      outlineWidth: 1,
      toneCount: 4,
      debugZoom: 4,
    });
    expect(PROFILES.large).toEqual({
      jaggyMinRuns: 3,
      jaggyMaxRun: 6,
      jaggyStepJump: 3,
      orphanRadius: 2,
      lowContrastMinRatio: 1.25,
      minCluster: 3,
      ditherAllowed: true,
      ditherMinTones: 3,
      outlineWidth: 2,
      toneCount: 5,
      debugZoom: 2,
    });
  });
});

describe('small is the compatibility row', () => {
  it('repeats the constants every 32 px asset was calibrated against', () => {
    expect(PROFILES.small.jaggyMinRuns).toBe(JAGGY_MIN_RUNS);
    expect(PROFILES.small.jaggyMaxRun).toBe(JAGGY_MAX_RUN);
    expect(PROFILES.small.jaggyStepJump).toBe(JAGGY_STEP_JUMP);
    expect(PROFILES.small.orphanRadius).toBe(ORPHAN_NEIGHBOUR_RADIUS);
    expect(PROFILES.small.lowContrastMinRatio).toBe(LOW_CONTRAST_MIN_RATIO);
  });
});

describe('the rows differ in the direction they claim', () => {
  it('makes tiny stricter than small where a small canvas cannot afford noise', () => {
    expect(PROFILES.tiny.lowContrastMinRatio).toBeGreaterThan(PROFILES.small.lowContrastMinRatio);
    expect(PROFILES.tiny.ditherAllowed).toBe(false);
  });

  it('makes large looser than small, or the table would be theatre', () => {
    expect(PROFILES.large.jaggyMaxRun).toBeGreaterThan(PROFILES.small.jaggyMaxRun);
    expect(PROFILES.large.jaggyStepJump).toBeGreaterThan(PROFILES.small.jaggyStepJump);
    expect(PROFILES.large.lowContrastMinRatio).toBeLessThan(PROFILES.small.lowContrastMinRatio);
    expect(PROFILES.large.toneCount).toBeGreaterThan(PROFILES.small.toneCount);
    expect(PROFILES.large.outlineWidth).toBeGreaterThan(PROFILES.small.outlineWidth);
    expect(PROFILES.large.debugZoom).toBeLessThan(PROFILES.small.debugZoom);
  });

  it('keeps the orphan radius fixed: it is set by the dither lattice, not the canvas', () => {
    for (const profile of SCALE_PROFILES) {
      expect(PROFILES[profile].orphanRadius).toBe(2);
    }
  });
});

describe('parseScaleProfile', () => {
  it('accepts the four names', () => {
    for (const profile of SCALE_PROFILES) {
      expect(parseScaleProfile(profile)).toBe(profile);
    }
  });

  it('rejects anything else with the list of names', () => {
    for (const bad of ['huge', 'SMALL', '', 3, null, {}]) {
      let caught: unknown;
      try {
        parseScaleProfile(bad);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PxError);
      const error = caught as PxError;
      expect(error.code).toBe('E_PROFILE_UNKNOWN');
      expect(error.message).toContain('is not a scale profile');
      expect(error.hint).toContain('tiny, small, medium, large');
    }
  });
});
