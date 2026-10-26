import { flowColor } from '../core/palette.ts';
import { generatePuzzle } from '../core/generator.ts';
import { hashString, mulberry32 } from '../core/rng.ts';
import type { Puzzle } from '../core/types.ts';
import { getLevel } from './levels.ts';
import { store, type DailyResult } from './store.ts';

const EPOCH = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;

/** Board size by weekday (0 = Sunday): easy start of the week, harder weekend. */
const SIZES: [number, number, number, number][] = [
  [8, 8, 7, 8],
  [6, 6, 5, 6],
  [6, 7, 5, 6],
  [7, 7, 6, 7],
  [7, 8, 6, 7],
  [7, 8, 7, 8],
  [8, 8, 7, 8],
];

export function dateKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function dailyNumber(key: string): number {
  return Math.round((keyToUtc(key) - EPOCH) / DAY) + 1;
}

export function shiftKey(key: string, days: number): string {
  const d = new Date(keyToUtc(key) + days * DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function dailySize(key: string) {
  const [w, h] = SIZES[new Date(keyToUtc(key)).getUTCDay()];
  return { w, h };
}

const cache = new Map<string, Puzzle>();

/** Same date → same puzzle for every player, generated on the device from the date seed. */
export function dailyPuzzle(key: string): Puzzle {
  let p = cache.get(key);
  if (!p) {
    const [w, h, minFlows, maxFlows] = SIZES[new Date(keyToUtc(key)).getUTCDay()];
    const g = generatePuzzle({ w, h, minFlows, maxFlows, budget: 80_000, maxAttempts: 3000 }, mulberry32(hashString(`daily:${key}`)));
    p = g ? g.puzzle : getLevel(60);
    cache.set(key, p);
  }
  return p;
}

/** Streak still alive only if the last daily was today or yesterday. */
export function currentStreak(today = dateKey()): number {
  const { last, streak } = store.data.daily;
  if (last === today || last === shiftKey(today, -1)) return streak;
  return 0;
}

export function recordDaily(key: string, result: DailyResult) {
  const d = store.data.daily;
  if (d.results[key]) return;
  d.results[key] = result;
  d.streak = d.last === shiftKey(key, -1) ? d.streak + 1 : 1;
  d.best = Math.max(d.best, d.streak);
  d.last = key;
  store.save();
}

export function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Wordle-style text: colour order and time, never the solution. */
export function shareText(key: string, r: DailyResult): string {
  const squares = r.order.map((c) => flowColor(c).emoji).join('');
  const streak = currentStreak(key);
  return [
    `Dotline Daily #${dailyNumber(key)}${streak > 1 ? ` 🔥${streak}` : ''}`,
    `⏱ ${formatTime(r.time)}${r.perfect ? ' · ✨ Hoàn hảo' : ` · ${r.moves} nét`}`,
    squares,
  ].join('\n');
}
