import { neighbors } from './grid.ts';
import type { Flow } from './types.ts';

export interface SolveOptions {
  /** Stop once this many solutions are found (2 is enough to prove non-uniqueness). */
  limit?: number;
  /** Maximum search nodes before giving up. */
  budget?: number;
  /**
   * Only consider paths that never touch themselves. Faster, but players may still find
   * self-touching solutions, so uniqueness must be proven with this off (the default).
   */
  strict?: boolean;
}

export interface SolveResult {
  /** Solutions found, capped at `limit`. */
  count: number;
  /** First solution found: cell → flow index. */
  solution: number[] | null;
  /** Search nodes visited — the raw difficulty signal. */
  nodes: number;
  /** Nodes where more than one move was possible. */
  branches: number;
  /** True when the budget ran out, so `count` is not trustworthy. */
  aborted: boolean;
}

/**
 * Depth-first Numberlink solver. Extends one flow at a time from its `a` end, always
 * picking the most constrained flow, and prunes with checks a human also uses:
 * no dead-end cells and no regions that no flow can fill (plus no self-touching in strict mode).
 */
export function solve(w: number, h: number, flows: Flow[], opts: SolveOptions = {}): SolveResult {
  const limit = opts.limit ?? 2;
  const budget = opts.budget ?? 200_000;
  const strict = opts.strict ?? false;
  const n = w * h;
  const nb = neighbors(w, h);
  const k = flows.length;

  const grid = new Int8Array(n).fill(-1);
  const head = new Int32Array(k);
  const target = new Int32Array(k);
  const done = new Uint8Array(k);
  let filled = 0;
  let remaining = k;
  for (let c = 0; c < k; c++) {
    grid[flows[c].a] = c;
    grid[flows[c].b] = c;
    head[c] = flows[c].a;
    target[c] = flows[c].b;
    filled += 2;
  }

  const res: SolveResult = { count: 0, solution: null, nodes: 0, branches: 0, aborted: false };
  const region = new Int32Array(n);
  const stack = new Int32Array(n);
  const headMask: number[] = [];
  const targetMask: number[] = [];
  const scratch = [0, 0, 0, 0];
  const moveBufs: number[][] = [];

  function movesFor(c: number, out: number[]): number {
    const hd = head[c];
    const t = target[c];
    const list = nb[hd];
    let cnt = 0;
    if (!strict) {
      for (const m of list) if (m === t || grid[m] === -1) out[cnt++] = m;
      return cnt;
    }
    // Next to its partner: any detour would make the path touch itself, so connecting is forced.
    for (const m of list) {
      if (m === t) {
        out[0] = t;
        return 1;
      }
    }
    for (const m of list) {
      if (grid[m] !== -1) continue;
      let ok = true;
      for (const q of nb[m]) {
        if (q !== hd && q !== t && grid[q] === c) {
          ok = false;
          break;
        }
      }
      if (ok) out[cnt++] = m;
    }
    return cnt;
  }

  function isOpenEnd(q: number): boolean {
    const g = grid[q];
    return g >= 0 && done[g] === 0 && (q === head[g] || q === target[g]);
  }

  function feasible(): boolean {
    // Every empty cell needs two ways in/out.
    for (let i = 0; i < n; i++) {
      if (grid[i] !== -1) continue;
      let free = 0;
      for (const q of nb[i]) if (grid[q] === -1 || isOpenEnd(q)) free++;
      if (free < 2) return false;
    }

    // Every empty region must be reachable by both ends of some unfinished flow.
    region.fill(-1);
    headMask.length = 0;
    targetMask.length = 0;
    let rc = 0;
    for (let i = 0; i < n; i++) {
      if (grid[i] !== -1 || region[i] !== -1) continue;
      let sp = 0;
      stack[sp++] = i;
      region[i] = rc;
      let hm = 0;
      let tm = 0;
      while (sp > 0) {
        const cur = stack[--sp];
        for (const q of nb[cur]) {
          const g = grid[q];
          if (g === -1) {
            if (region[q] === -1) {
              region[q] = rc;
              stack[sp++] = q;
            }
          } else if (done[g] === 0) {
            if (q === head[g]) hm |= 1 << g;
            else if (q === target[g]) tm |= 1 << g;
          }
        }
      }
      if ((hm & tm) === 0) return false;
      headMask.push(hm);
      targetMask.push(tm);
      rc++;
    }

    // Every unfinished flow must still be able to reach its partner.
    for (let c = 0; c < k; c++) {
      if (done[c]) continue;
      let adjacent = false;
      for (const q of nb[head[c]]) {
        if (q === target[c]) {
          adjacent = true;
          break;
        }
      }
      if (adjacent) continue;
      const bit = 1 << c;
      let ok = false;
      for (let r = 0; r < rc; r++) {
        if (headMask[r] & bit && targetMask[r] & bit) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    return true;
  }

  function search(depth: number): void {
    if (++res.nodes > budget) {
      res.aborted = true;
      return;
    }
    if (remaining === 0) {
      if (filled === n) {
        res.count++;
        if (!res.solution) res.solution = Array.from(grid);
      }
      return;
    }

    let best = -1;
    let bestCnt = 5;
    for (let c = 0; c < k; c++) {
      if (done[c]) continue;
      const cnt = movesFor(c, scratch);
      if (cnt === 0) return;
      if (cnt < bestCnt) {
        best = c;
        bestCnt = cnt;
        if (cnt === 1) break;
      }
    }

    const moves = (moveBufs[depth] ??= [0, 0, 0, 0]);
    const cnt = movesFor(best, moves);
    if (cnt > 1) res.branches++;
    const prevHead = head[best];
    for (let i = 0; i < cnt; i++) {
      const m = moves[i];
      head[best] = m;
      if (m === target[best]) {
        done[best] = 1;
        remaining--;
        if (feasible()) search(depth + 1);
        done[best] = 0;
        remaining++;
      } else {
        grid[m] = best;
        filled++;
        if (feasible()) search(depth + 1);
        grid[m] = -1;
        filled--;
      }
      head[best] = prevHead;
      if (res.count >= limit || res.aborted) return;
    }
  }

  if (feasible()) search(0);
  return res;
}
