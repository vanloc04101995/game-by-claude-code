const cache = new Map<string, number[][]>();

/** Orthogonal neighbours of every cell on a w×h grid (cells indexed row-major). */
export function neighbors(w: number, h: number): number[][] {
  const key = `${w}x${h}`;
  let nb = cache.get(key);
  if (!nb) {
    nb = [];
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = (i - x) / w;
      const list: number[] = [];
      if (y > 0) list.push(i - w);
      if (x < w - 1) list.push(i + 1);
      if (y < h - 1) list.push(i + w);
      if (x > 0) list.push(i - 1);
      nb.push(list);
    }
    cache.set(key, nb);
  }
  return nb;
}

export function isAdjacent(w: number, a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return d === w || (d === 1 && Math.floor(a / w) === Math.floor(b / w));
}

/**
 * True when no cell of the path touches another non-consecutive cell of the same path.
 * Such "self-touching" paths could be shortcut, so good puzzles never contain them.
 */
export function isSelfTouchFree(path: number[], w: number, h: number): boolean {
  const nb = neighbors(w, h);
  const pos = new Map<number, number>();
  path.forEach((c, j) => pos.set(c, j));
  for (let j = 0; j < path.length; j++) {
    for (const q of nb[path[j]]) {
      const pq = pos.get(q);
      if (pq !== undefined && Math.abs(pq - j) > 1) return false;
    }
  }
  return true;
}
