export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Shapes on dots for colour-blind players. */
  symbols: boolean;
  theme: ThemeSetting;
}

export interface DailyResult {
  time: number;
  moves: number;
  perfect: boolean;
  /** Colour indices in the order the player connected them. */
  order: number[];
}

export interface SaveData {
  v: 1;
  /** Best stars per level number. */
  stars: Record<string, number>;
  hints: number;
  settings: Settings;
  daily: {
    streak: number;
    best: number;
    last: string | null;
    results: Record<string, DailyResult>;
  };
}

const KEY = 'dotline.save.v1';
const STARTING_HINTS = 3;

function fresh(): SaveData {
  return {
    v: 1,
    stars: {},
    hints: STARTING_HINTS,
    settings: { sound: true, haptics: true, symbols: false, theme: 'system' },
    daily: { streak: 0, best: 0, last: null, results: {} },
  };
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as Partial<SaveData>;
    const base = fresh();
    return {
      ...base,
      ...data,
      settings: { ...base.settings, ...data.settings },
      daily: { ...base.daily, ...data.daily },
    } as SaveData;
  } catch {
    return fresh();
  }
}

/** Local progress. Lives in this browser only; cloud sync is a later milestone. */
export const store = {
  data: load(),

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private mode or full storage: keep playing with in-memory progress.
    }
  },

  starsFor(level: number): number {
    return this.data.stars[level] ?? 0;
  },

  isSolved(level: number): boolean {
    return this.starsFor(level) > 0;
  },

  solvedCount(): number {
    return Object.keys(this.data.stars).length;
  },

  /** Records a result; returns true when this was the first time the level was solved. */
  recordLevel(level: number, stars: number): boolean {
    const first = !this.isSolved(level);
    this.data.stars[level] = Math.max(this.starsFor(level), stars);
    // A free hint every 5 new levels keeps the hint economy alive before ads exist.
    if (first && this.solvedCount() % 5 === 0) this.data.hints++;
    this.save();
    return first;
  },

  useHint(): boolean {
    if (this.data.hints <= 0) return false;
    this.data.hints--;
    this.save();
    return true;
  },

  reset() {
    const settings = this.data.settings;
    this.data = { ...fresh(), settings };
    this.save();
  },
};
