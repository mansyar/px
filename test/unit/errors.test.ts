import { describe, expect, it } from 'vitest';
import {
  causeMessage,
  ERROR_HINTS,
  errorPayload,
  internalError,
  isInternalError,
  PxError,
} from '../../src/core/errors.js';

describe('error registry', () => {
  it('gives every code a corrective hint', () => {
    for (const [code, hint] of Object.entries(ERROR_HINTS)) {
      expect(hint.length, code).toBeGreaterThan(10);
    }
  });

  it('keeps the baseline hint when a throw site supplies none', () => {
    const error = new PxError('E_UNKNOWN_SLOT', 'Unknown slot "steel.brass" in op 4');
    expect(error.hint).toBe(ERROR_HINTS.E_UNKNOWN_SLOT);
  });

  it('lets a throw site override the hint with a specific fix', () => {
    const error = new PxError(
      'E_UNKNOWN_SLOT',
      'Unknown slot "steel.brass" in op 4',
      'Use steel.base.',
    );
    expect(error.hint).toBe('Use steel.base.');
  });

  it('serializes only location fields that are present', () => {
    const error = new PxError('E_UNKNOWN_OP', 'Unknown op "spray" in op 2', undefined, {
      layer: 'base',
      op_index: 2,
    });
    expect(errorPayload(error)).toEqual({
      code: 'E_UNKNOWN_OP',
      message: 'Unknown op "spray" in op 2',
      hint: ERROR_HINTS.E_UNKNOWN_OP,
      op_index: 2,
      layer: 'base',
    });
  });

  it('includes the coordinate when one is known', () => {
    const error = new PxError('E_BAD_PARAM', 'Op writes outside the canvas', undefined, {
      coord: [9, 4],
    });
    expect(errorPayload(error).coord).toEqual([9, 4]);
  });

  it('classifies only E_INTERNAL as an engine fault', () => {
    expect(isInternalError(new PxError('E_INTERNAL', 'boom'))).toBe(true);
    expect(isInternalError(new PxError('E_USAGE', 'bad flag'))).toBe(false);
    expect(isInternalError(new PxError('E_PARSE', 'bad json'))).toBe(false);
  });

  it('wraps unexpected causes as internal errors without leaking stacks', () => {
    const error = internalError(new Error('boom'));
    expect(error.code).toBe('E_INTERNAL');
    expect(error.message).toContain('boom');
  });

  it('describes a thrown value that is not an Error', () => {
    expect(causeMessage('router exploded')).toBe('router exploded');
    expect(internalError('router exploded').message).toContain('router exploded');
  });
});
