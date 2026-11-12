/**
 * `SILHOUETTE_LOSS`: a part whose base tone melts into the backdrop.
 *
 * `LOW_CONTRAST` measures edge pixels against the default grey; this rule asks
 * the same question per part and against whatever backdrop the caller asked to
 * check. Where the shape is drawn and which tone is on its edge do not matter —
 * only the material's base tone and the panel behind it.
 */

import { FindingCollector } from './collector.js';
import { lintNumbers } from './context.js';
import { contrastRatio } from './contrast.js';
import { LOW_CONTRAST_BACKDROP } from './thresholds.js';
import type { LintContext, LintFinding, LintRule } from './types.js';
import { hexOf, partViews } from './view.js';

const SILHOUETTE = 'SILHOUETTE_LOSS';

export const silhouetteLossRule: LintRule = {
  code: SILHOUETTE,
  severity: 'warning',
  evaluate(context: LintContext): LintFinding[] {
    const collector = new FindingCollector(SILHOUETTE, 'warning');
    const views = partViews(context);
    if (views.length === 0) {
      return collector.finish();
    }
    const backdrop = context.backdrop ?? LOW_CONTRAST_BACKDROP;
    const minRatio = lintNumbers(context).lowContrastMinRatio;
    const backdropHex = hexOf(backdrop);
    for (const view of views) {
      if (view.baseSlot === undefined) {
        continue;
      }
      const base = context.slots.rgba[view.baseSlot];
      if (base === undefined) {
        continue;
      }
      const ratio = contrastRatio(base, backdrop);
      if (ratio >= minRatio) {
        continue;
      }
      collector.add({
        message:
          `Part "${view.name}" disappears against backdrop ${backdropHex}: its base tone ` +
          `${hexOf(base)} has contrast ${ratio.toFixed(2)}:1, under the ` +
          `${minRatio.toFixed(2)}:1 this profile needs`,
        part: view.name,
      });
    }
    return collector.finish();
  },
};
