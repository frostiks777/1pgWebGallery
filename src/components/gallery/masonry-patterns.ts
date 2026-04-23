/** Grid span specs for Obsidian-style masonry at different column counts. */
export type SpanSpec = { col: number; row: number };

/** 5-column reference (Obsidian_Theme/obsidian-layouts.jsx) */
export const MASONRY_SPANS_5: SpanSpec[] = [
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 2 },
  { col: 1, row: 1 },
  { col: 1, row: 1 },
];

/** 4-column rhythm */
export const MASONRY_SPANS_4: SpanSpec[] = [
  { col: 2, row: 2 },
  { col: 2, row: 1 },
  { col: 1, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 2 },
  { col: 1, row: 1 },
];

/** 3-column rhythm */
export const MASONRY_SPANS_3: SpanSpec[] = [
  { col: 2, row: 2 },
  { col: 1, row: 1 },
  { col: 1, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
];

/** 2-column rhythm */
export const MASONRY_SPANS_2: SpanSpec[] = [
  { col: 1, row: 2 },
  { col: 1, row: 1 },
  { col: 1, row: 1 },
  { col: 1, row: 2 },
];

export function masonryPatternForCols(cols: number): SpanSpec[] {
  if (cols >= 5) return MASONRY_SPANS_5;
  if (cols === 4) return MASONRY_SPANS_4;
  if (cols === 3) return MASONRY_SPANS_3;
  return MASONRY_SPANS_2;
}

/** 9-column bento (Obsidian reference) */
export const BENTO_SPANS_9: SpanSpec[] = [
  { col: 3, row: 3 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 3 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 3 },
];

/** 6-column bento */
export const BENTO_SPANS_6: SpanSpec[] = [
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
  { col: 2, row: 2 },
];

export const BENTO_SPANS_3: SpanSpec[] = [
  { col: 2, row: 2 },
  { col: 1, row: 1 },
  { col: 1, row: 1 },
  { col: 1, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
];

export function bentoPatternForCols(cols: number): SpanSpec[] {
  if (cols >= 9) return BENTO_SPANS_9;
  if (cols >= 6) return BENTO_SPANS_6;
  return BENTO_SPANS_3;
}
