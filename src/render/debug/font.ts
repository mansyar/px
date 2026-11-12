/**
 * A 3×5 bitmap font, embedded.
 *
 * The debug sheet needs to print coordinates, panel letters and the profile
 * caption. A font file or a text dependency would break the no-dependency budget
 * and could render differently per platform, so the glyphs live here as pixel rows
 * and every surface draws them with the same rectangles.
 *
 * The letters are the ones a regime name and a zoom unit need (`SMALL 8X`,
 * `MEDIUM 4X`); at three pixels wide a few pairs (M/N, I/T) only tell themselves
 * apart inside a word, which is how they are used.
 */

export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;

/** One string per glyph row; `#` is ink and anything else is background. */
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '#.#', '#.#', '#.#'],
  N: ['#.#', '##.', '#.#', '#.#', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  '?': ['###', '..#', '.##', '...', '.##'],
};

/** Glyph rows for a character; anything unknown prints as `?`. */
export function glyphRows(character: string): readonly string[] {
  return GLYPHS[character] ?? GLYPHS['?'];
}
