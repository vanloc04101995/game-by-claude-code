/**
 * Offline level pipeline: generates candidates per pack, keeps only unique-solution
 * puzzles, then picks an evenly spaced difficulty ramp. Output: src/levels/packs.json.
 *
 *   npm run levels            (seed 1)
 *   npm run levels -- 42      (custom seed)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePuzzle } from '../src/core/codec.ts';
import { generatePuzzle, type Generated } from '../src/core/generator.ts';
import { mulberry32 } from '../src/core/rng.ts';
import type { EncodedPuzzle } from '../src/core/types.ts';

interface Stage {
  w: number;
  h: number;
  minFlows: number;
  maxFlows: number;
  count: number;
}

interface PackSpec {
  id: string;
  name: string;
  stages: Stage[];
}

const PACKS: PackSpec[] = [
  {
    id: 'start',
    name: 'Khởi đầu',
    stages: [
      { w: 4, h: 4, minFlows: 3, maxFlows: 3, count: 2 },
      { w: 5, h: 5, minFlows: 4, maxFlows: 5, count: 27 },
    ],
  },
  { id: 'relax', name: 'Thư giãn', stages: [{ w: 6, h: 6, minFlows: 5, maxFlows: 6, count: 30 }] },
  { id: 'challenge', name: 'Thử thách', stages: [{ w: 7, h: 7, minFlows: 6, maxFlows: 7, count: 30 }] },
  { id: 'expert', name: 'Chuyên gia', stages: [{ w: 7, h: 9, minFlows: 7, maxFlows: 8, count: 30 }] },
  { id: 'master', name: 'Bậc thầy', stages: [{ w: 8, h: 10, minFlows: 8, maxFlows: 9, count: 30 }] },
];

/** Level 1 is hand-made: three straight columns, solvable in seconds. */
const TUTORIAL: EncodedPuzzle = { w: 3, h: 3, f: [0, 6, 1, 7, 2, 8], s: '012012012' };

const POOL_FACTOR = 3;

function pickRamp(pool: Generated[], count: number): Generated[] {
  const sorted = [...pool].sort((x, y) => x.difficulty - y.difficulty);
  if (sorted.length <= count) return sorted;
  const out: Generated[] = [];
  for (let i = 0; i < count; i++) out.push(sorted[Math.round((i * (sorted.length - 1)) / (count - 1))]);
  return out;
}

const seed = Number(process.argv[2] ?? 1);
const rng = mulberry32(seed);
const seen = new Set<string>();
const t0 = performance.now();

const packs = PACKS.map((spec, pi) => {
  const levels: EncodedPuzzle[] = pi === 0 ? [TUTORIAL] : [];
  for (const st of spec.stages) {
    const pool: Generated[] = [];
    let guard = 0;
    while (pool.length < st.count * POOL_FACTOR && guard++ < st.count * POOL_FACTOR * 5) {
      const g = generatePuzzle({ ...st, budget: 150_000, maxAttempts: 3000 }, rng);
      if (!g) continue;
      const key = g.puzzle.flows.map((f) => `${f.a}-${f.b}`).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(g);
    }
    for (const g of pickRamp(pool, st.count)) levels.push(encodePuzzle(g.puzzle, g.difficulty));
  }
  console.log(`${spec.name}: ${levels.length} levels`);
  return { id: spec.id, name: spec.name, levels };
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/levels/packs.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ version: 1, seed, packs }));
console.log(`Wrote ${out} in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
