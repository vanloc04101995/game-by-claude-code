import { neighbors } from './grid.ts';
import type { EncodedPuzzle, Puzzle } from './types.ts';

export function encodePuzzle(p: Puzzle, difficulty?: number): EncodedPuzzle {
  const enc: EncodedPuzzle = {
    w: p.w,
    h: p.h,
    f: p.flows.flatMap((f) => [f.a, f.b]),
    s: p.solution.map((c) => c.toString(36)).join(''),
  };
  if (difficulty !== undefined) enc.d = difficulty;
  return enc;
}

export function decodePuzzle(e: EncodedPuzzle): Puzzle {
  const flows = [];
  for (let i = 0; i < e.f.length; i += 2) flows.push({ a: e.f[i], b: e.f[i + 1] });
  return { w: e.w, h: e.h, flows, solution: Array.from(e.s, (ch) => parseInt(ch, 36)) };
}

/** Ordered cells of flow `c` in the reference solution, from `a` to `b`. */
export function solutionPath(p: Puzzle, c: number): number[] {
  const nb = neighbors(p.w, p.h);
  const { a, b } = p.flows[c];
  const path = [a];
  let prev = -1;
  let cur = a;
  while (cur !== b && path.length <= p.w * p.h) {
    const next = nb[cur].find((q) => q !== prev && p.solution[q] === c);
    if (next === undefined) break;
    prev = cur;
    cur = next;
    path.push(cur);
  }
  return path;
}
