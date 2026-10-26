import { isSelfTouchFree, neighbors } from './grid.ts';
import { randInt, shuffle, type Rng } from './rng.ts';
import { solve } from './solver.ts';
import type { Flow, Puzzle } from './types.ts';

export interface GenerateOptions {
  w: number;
  h: number;
  minFlows: number;
  maxFlows: number;
  /** Solver node budget per candidate. */
  budget?: number;
  maxAttempts?: number;
}

export interface Generated {
  puzzle: Puzzle;
  /** Solver nodes needed to prove uniqueness — higher is harder. */
  difficulty: number;
  attempts: number;
}

/**
 * Splits the grid into `target` non-self-touching paths that cover every cell.
 * Starts with every cell as its own path and repeatedly joins two paths whose ends
 * touch, favouring short paths so no tiny leftovers remain. Returns null on a dead end.
 */
export function partition(w: number, h: number, target: number, rng: Rng): number[][] | null {
  const n = w * h;
  const nb = neighbors(w, h);
  const owner = new Int32Array(n);
  const paths: (number[] | null)[] = [];
  for (let i = 0; i < n; i++) {
    owner[i] = i;
    paths.push([i]);
  }
  let count = n;
  const isEnd = (p: number[], c: number) => p[0] === c || p[p.length - 1] === c;

  while (count > target) {
    const cand: { e: number; m: number; wgt: number }[] = [];
    let total = 0;
    for (let e = 0; e < n; e++) {
      const p = paths[owner[e]]!;
      if (!isEnd(p, e)) continue;
      for (const m of nb[e]) {
        if (m < e || owner[m] === owner[e]) continue;
        const q = paths[owner[m]]!;
        if (!isEnd(q, m)) continue;
        const wgt = 1 / (p.length * q.length);
        cand.push({ e, m, wgt });
        total += wgt;
      }
    }

    let merged = false;
    while (cand.length > 0) {
      let r = rng() * total;
      let idx = 0;
      for (; idx < cand.length - 1; idx++) {
        r -= cand[idx].wgt;
        if (r <= 0) break;
      }
      const { e, m, wgt } = cand[idx];
      cand[idx] = cand[cand.length - 1];
      cand.pop();
      total -= wgt;

      const pe = owner[e];
      const pm = owner[m];
      const a = paths[pe]!.slice();
      const b = paths[pm]!.slice();
      if (a[a.length - 1] !== e) a.reverse();
      if (b[0] !== m) b.reverse();
      const joined = a.concat(b);
      if (!isSelfTouchFree(joined, w, h)) continue;

      paths[pe] = joined;
      paths[pm] = null;
      for (const c of b) owner[c] = pe;
      count--;
      merged = true;
      break;
    }
    if (!merged) break;
  }

  const result = paths.filter((p): p is number[] => p !== null);
  if (result.some((p) => p.length < 3)) return null;
  return result;
}

export function generatePuzzle(opts: GenerateOptions, rng: Rng): Generated | null {
  const { w, h, minFlows, maxFlows } = opts;
  const budget = opts.budget ?? 100_000;
  const maxAttempts = opts.maxAttempts ?? 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const parts = partition(w, h, randInt(rng, minFlows, maxFlows), rng);
    if (!parts || parts.length < minFlows || parts.length > maxFlows) continue;

    shuffle(rng, parts);
    const flows: Flow[] = parts.map((p) => ({ a: p[0], b: p[p.length - 1] }));
    const res = solve(w, h, flows, { limit: 2, budget });
    if (res.aborted || res.count !== 1 || !res.solution) continue;

    return { puzzle: { w, h, flows, solution: res.solution }, difficulty: res.nodes, attempts: attempt };
  }
  return null;
}
