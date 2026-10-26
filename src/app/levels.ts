import { decodePuzzle } from '../core/codec.ts';
import type { EncodedPuzzle, Puzzle } from '../core/types.ts';
import data from '../levels/packs.json';
import { store } from './store.ts';

export interface PackInfo {
  index: number;
  id: string;
  name: string;
  /** Global number of the pack's first level (1-based). */
  first: number;
  count: number;
  /** Size label of the pack's main stage, e.g. "5×5". */
  size: string;
}

const encoded: EncodedPuzzle[] = [];
export const PACKS: PackInfo[] = (data.packs as { id: string; name: string; levels: EncodedPuzzle[] }[]).map((p, index) => {
  const first = encoded.length + 1;
  encoded.push(...p.levels);
  const last = p.levels[p.levels.length - 1];
  return { index, id: p.id, name: p.name, first, count: p.levels.length, size: `${last.w}×${last.h}` };
});

export const LEVEL_COUNT = encoded.length;

export function getLevel(n: number): Puzzle {
  return decodePuzzle(encoded[n - 1]);
}

export function packOf(n: number): PackInfo {
  return PACKS.find((p) => n >= p.first && n < p.first + p.count) ?? PACKS[0];
}

/** A level is playable once the one before it is solved. */
export function isUnlocked(n: number): boolean {
  return n === 1 || store.isSolved(n - 1) || store.isSolved(n);
}

/** First unsolved level, or the last level when everything is done. */
export function currentLevel(): number {
  for (let n = 1; n <= LEVEL_COUNT; n++) if (!store.isSolved(n)) return n;
  return LEVEL_COUNT;
}

export function packStats(p: PackInfo) {
  let solved = 0;
  let stars = 0;
  for (let n = p.first; n < p.first + p.count; n++) {
    const s = store.starsFor(n);
    if (s > 0) solved++;
    stars += s;
  }
  return { solved, stars, maxStars: p.count * 3 };
}
