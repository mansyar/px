/**
 * The numbers a lint run judges with.
 *
 * One entry point, so no rule ever reaches for a module constant again: a rule
 * asks the context for its profile row and reads every threshold from it. The
 * context carries the profile a compiled recipe resolved (canvas size or
 * `meta.profile`); a hand-built context has none, so it derives one from its own
 * dimensions. An all-zero context derives `tiny`, which lints nothing.
 */

import { PROFILES, type ProfileNumbers, profileFor } from '../core/profile.js';
import type { LintContext } from './types.js';

export function lintNumbers(context: LintContext): ProfileNumbers {
  return context.profile === undefined
    ? PROFILES[profileFor(context.width, context.height)]
    : PROFILES[context.profile];
}
