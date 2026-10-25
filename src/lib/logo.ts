// The path mark's drawing (src/components/Logo.astro), shared with the design system's logo page.

/** The h, as one line on a 100-unit square. */
export const MARK_PATH = 'M30 10 V90 M30 58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72';

/** [smallest size, stroke, dot radius]: the line thickens as the mark gets smaller (docs/brand.md). */
export const MARK_WEIGHTS: Array<[number, number, number]> = [
  [40, 11, 7.5],
  [26, 12, 8.5],
  [24, 15, 9.5],
  [0, 17, 10.5],
];

/** The stroke and dot radius for a mark drawn at `size` px. */
export function markWeight(size: number): { stroke: number; dot: number } {
  const [, stroke, dot] = MARK_WEIGHTS.find(([min]) => size >= min) ?? [0, 17, 10.5];
  return { stroke, dot };
}
