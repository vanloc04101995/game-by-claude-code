import { describe, expect, it } from 'vitest';
import packs from '../levels/packs.json';
import { decodePuzzle, encodePuzzle, solutionPath } from './codec.ts';
import { generatePuzzle, partition } from './generator.ts';
import { isSelfTouchFree } from './grid.ts';
import { mulberry32 } from './rng.ts';
import { solve } from './solver.ts';
import type { EncodedPuzzle } from './types.ts';

describe('partition', () => {
  it('covers every cell exactly once with self-touch-free paths of length ≥ 3', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      const parts = partition(6, 6, 6, rng);
      if (!parts) continue;
      const cells = parts.flat().sort((a, b) => a - b);
      expect(cells).toEqual(Array.from({ length: 36 }, (_, j) => j));
      for (const p of parts) {
        expect(p.length).toBeGreaterThanOrEqual(3);
        expect(isSelfTouchFree(p, 6, 6)).toBe(true);
      }
    }
  });
});

describe('solver', () => {
  it('solves the tutorial level uniquely', () => {
    const res = solve(3, 3, [{ a: 0, b: 6 }, { a: 1, b: 7 }, { a: 2, b: 8 }]);
    expect(res.count).toBe(1);
    expect(res.solution).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
  });

  it('counts self-touching fills unless strict', () => {
    // A single flow snaking over a 3x3 must touch itself.
    expect(solve(3, 3, [{ a: 0, b: 8 }], { strict: true }).count).toBe(0);
    expect(solve(3, 3, [{ a: 0, b: 8 }]).count).toBe(2);
  });

  it('detects puzzles with more than one solution', () => {
    // Endpoints of random partitions are often ambiguous; the solver must notice.
    const rng = mulberry32(3);
    let ambiguous = 0;
    for (let i = 0; i < 50; i++) {
      const parts = partition(6, 6, 5, rng);
      if (!parts) continue;
      const res = solve(6, 6, parts.map((p) => ({ a: p[0], b: p[p.length - 1] })));
      expect(res.count).toBeGreaterThanOrEqual(1);
      if (res.count > 1) ambiguous++;
    }
    expect(ambiguous).toBeGreaterThan(0);
  });
});

describe('generator', () => {
  it('is deterministic for a seed and yields unique puzzles', () => {
    const opts = { w: 6, h: 6, minFlows: 5, maxFlows: 6 };
    const g1 = generatePuzzle(opts, mulberry32(99));
    const g2 = generatePuzzle(opts, mulberry32(99));
    expect(g1).not.toBeNull();
    expect(g1!.puzzle).toEqual(g2!.puzzle);
    expect(solve(6, 6, g1!.puzzle.flows).count).toBe(1);
  });
});

describe('shipped packs', () => {
  const all = (packs.packs as { levels: EncodedPuzzle[] }[]).flatMap((p) => p.levels);

  it('ships 150 levels', () => {
    expect(all.length).toBe(150);
  });

  it('every level round-trips and its solution path connects both dots', () => {
    for (const enc of all) {
      const p = decodePuzzle(enc);
      expect(encodePuzzle(p, enc.d)).toEqual(enc);
      p.flows.forEach((f, c) => {
        const path = solutionPath(p, c);
        expect(path[0]).toBe(f.a);
        expect(path[path.length - 1]).toBe(f.b);
      });
    }
  });
});
