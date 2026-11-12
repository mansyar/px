/**
 * The response envelope. Success is `{ "v": 1, "ok": true, ... }`; failure is
 * `{ "v": 1, "ok": false, "error": {...} }`. Everything goes to stdout as JSON
 * so an agent never has to parse prose.
 */

import { errorPayload, type PxError } from '../core/errors.js';
import { RESPONSE_VERSION } from '../probe.js';

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_USAGE = 2;
export const EXIT_LINT = 3;

export function formatEnvelope(envelope: Record<string, unknown>, pretty: boolean): string {
  return `${JSON.stringify(envelope, null, pretty ? 2 : undefined)}\n`;
}

export function successEnvelope(
  command: string,
  payload: Record<string, unknown>,
  pretty: boolean,
): string {
  return formatEnvelope({ v: RESPONSE_VERSION, ok: true, command, ...payload }, pretty);
}

export function failureEnvelope(command: string, error: PxError, pretty: boolean): string {
  const envelope: Record<string, unknown> = {
    v: RESPONSE_VERSION,
    ok: false,
    error: errorPayload(error),
  };
  if (command !== '') {
    envelope.command = command;
  }
  return formatEnvelope(envelope, pretty);
}
