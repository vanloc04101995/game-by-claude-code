/** One colour: two endpoint cells that must be joined. */
export interface Flow {
  a: number;
  b: number;
}

export interface Puzzle {
  w: number;
  h: number;
  /** Flow index doubles as the colour index. */
  flows: Flow[];
  /** Reference solution: cell → flow index. Used for hints. */
  solution: number[];
}

/** Compact JSON form shipped in level packs. */
export interface EncodedPuzzle {
  w: number;
  h: number;
  /** Endpoints flattened: [a0, b0, a1, b1, …]. */
  f: number[];
  /** Solution, one base-36 digit per cell. */
  s: string;
  /** Difficulty score (solver effort). */
  d?: number;
}
