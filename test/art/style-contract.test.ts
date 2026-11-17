import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProjectStyle } from '../../src/core/design.js';

/**
 * The root project style is shared by every v2 recipe. This guard runs the
 * closed reader against the committed file so a malformed style cannot pass
 * unnoticed just because an asset happens to render.
 */
describe('root project style', () => {
  it('parses through the closed reader with a single light direction', () => {
    const path = join(process.cwd(), 'px.style.json');
    const style = parseProjectStyle(readFileSync(path, 'utf8'), path);
    expect(style.defaultLight).toBe('top-left');
    expect(style.edgeVocabulary).toEqual(['none', 'outline', 'shadow', 'highlight']);
    expect(style.allowedRamps.length).toBeGreaterThan(0);
    expect(style.valueRules).toBeTypeOf('object');
  });
});
