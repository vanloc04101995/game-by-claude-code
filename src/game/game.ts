import { solutionPath } from '../core/codec.ts';
import { isAdjacent } from '../core/grid.ts';
import type { Puzzle } from '../core/types.ts';

const clone = (paths: number[][]) => paths.map((p) => p.slice());
const samePaths = (x: number[][], y: number[][]) =>
  x.length === y.length && x.every((p, i) => p.length === y[i].length && p.every((c, j) => c === y[i][j]));

/** What a single drag step did — drives sound and haptics. */
export type StepEvent = 'none' | 'extend' | 'retract' | 'connect';

/**
 * Board state and the drawing rules: drag from a dot or a path end to draw, drag back to
 * erase, cross another colour to cut it. Cut paths grow back if you retreat during the
 * same drag, as players expect from Flow-style games.
 */
export class Game {
  readonly puzzle: Puzzle;
  readonly cells: number;
  /** Per flow: drawn cells starting at an endpoint (empty when untouched). */
  paths: number[][];
  /** Flow currently being dragged, or -1. */
  active = -1;
  /** Flow-changes count; a perfect game equals the number of flows. */
  moves = 0;
  hintsUsed = 0;

  private readonly endpoint: Int8Array;
  private owner: Int8Array;
  private history: number[][][] = [];
  private beforeDrag: number[][] | null = null;
  private dragBase: number[][] | null = null;
  private lastMoved = -1;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.cells = puzzle.w * puzzle.h;
    this.paths = puzzle.flows.map(() => []);
    this.endpoint = new Int8Array(this.cells).fill(-1);
    puzzle.flows.forEach((f, c) => {
      this.endpoint[f.a] = c;
      this.endpoint[f.b] = c;
    });
    this.owner = new Int8Array(this.cells).fill(-1);
  }

  endpointColor(cell: number): number {
    return this.endpoint[cell];
  }

  /** Colour drawn through a cell (paths only, not bare dots). */
  ownerOf(cell: number): number {
    return this.owner[cell];
  }

  isComplete(c: number): boolean {
    const p = this.paths[c];
    const { a, b } = this.puzzle.flows[c];
    return p.length > 1 && ((p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a));
  }

  completedCount(): number {
    return this.paths.reduce((n, _, c) => n + (this.isComplete(c) ? 1 : 0), 0);
  }

  /** Cells covered by a drawn path (bare dots don't count). */
  filledCount(): number {
    return this.paths.reduce((n, p) => n + (p.length > 1 ? p.length : 0), 0);
  }

  isSolved(): boolean {
    return this.completedCount() === this.puzzle.flows.length && this.filledCount() === this.cells;
  }

  head(): number {
    if (this.active < 0) return -1;
    const p = this.paths[this.active];
    return p[p.length - 1];
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  begin(cell: number): boolean {
    if (cell < 0) return false;
    const before = clone(this.paths);
    let c = this.endpoint[cell];
    if (c >= 0) {
      this.paths[c] = [cell];
    } else {
      c = this.owner[cell];
      if (c < 0) return false;
      const p = this.paths[c];
      this.paths[c] = p.slice(0, p.indexOf(cell) + 1);
    }
    this.active = c;
    this.beforeDrag = before;
    this.dragBase = clone(this.paths);
    this.reindex();
    return true;
  }

  /** Moves the active path toward `cell`, stepping through any cells skipped by a fast swipe. */
  drag(cell: number): StepEvent {
    if (this.active < 0 || cell < 0) return 'none';
    const c = this.active;
    const p = this.paths[c];
    if (cell === p[p.length - 1]) return 'none';

    const idx = p.indexOf(cell);
    if (idx >= 0) {
      this.paths[c] = p.slice(0, idx + 1);
      this.restoreOthers();
      return 'retract';
    }

    let changed = false;
    let cur = p[p.length - 1];
    for (let guard = 0; cur !== cell && guard < this.cells; guard++) {
      const next = this.stepToward(cur, cell);
      if (!this.tryStep(next)) break;
      cur = next;
      changed = true;
      if (this.isComplete(c)) break;
    }
    if (!changed) return 'none';
    this.restoreOthers();
    return this.isComplete(c) ? 'connect' : 'extend';
  }

  end(): void {
    if (this.active < 0) return;
    if (this.beforeDrag && !samePaths(this.beforeDrag, this.paths)) {
      this.history.push(this.beforeDrag);
      if (this.active !== this.lastMoved) {
        this.moves++;
        this.lastMoved = this.active;
      }
    }
    this.active = -1;
    this.beforeDrag = null;
    this.dragBase = null;
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.paths = prev;
    this.lastMoved = -1;
    this.reindex();
    return true;
  }

  restart(): void {
    this.paths = this.puzzle.flows.map(() => []);
    this.history = [];
    this.moves = 0;
    this.lastMoved = -1;
    this.reindex();
  }

  /** Draws one correct flow from the reference solution. Returns its colour, or -1. */
  hint(): number {
    const c = this.paths.findIndex((_, i) => {
      const want = solutionPath(this.puzzle, i);
      const have = this.paths[i];
      return !(this.isComplete(i) && have.every((cell) => want.includes(cell)));
    });
    if (c < 0) return -1;
    this.history.push(clone(this.paths));
    const path = solutionPath(this.puzzle, c);
    const taken = new Set(path);
    this.paths = this.paths.map((p, i) => {
      if (i === c) return path;
      const cut = p.findIndex((cell) => taken.has(cell));
      return cut < 0 ? p : p.slice(0, cut);
    });
    this.hintsUsed++;
    this.lastMoved = -1;
    this.reindex();
    return c;
  }

  /** Marks the board as solved with the reference solution (used for previews). */
  showSolution(): void {
    this.paths = this.puzzle.flows.map((_, c) => solutionPath(this.puzzle, c));
    this.reindex();
  }

  private tryStep(next: number): boolean {
    const c = this.active;
    if (next < 0 || this.isComplete(c)) return false;
    const ep = this.endpoint[next];
    if (ep >= 0 && ep !== c) return false;
    if (this.paths[c].includes(next)) return false;
    this.paths[c].push(next);
    return true;
  }

  private stepToward(from: number, to: number): number {
    const { w } = this.puzzle;
    const fx = from % w;
    const fy = Math.floor(from / w);
    const dx = (to % w) - fx;
    const dy = Math.floor(to / w) - fy;
    let next: number;
    if (Math.abs(dx) >= Math.abs(dy)) next = from + Math.sign(dx);
    else next = from + Math.sign(dy) * w;
    return isAdjacent(w, from, next) ? next : -1;
  }

  /** Re-derives every other path from its state at drag start, cut where the active path crosses it. */
  private restoreOthers(): void {
    const base = this.dragBase;
    if (!base) return;
    const taken = new Set(this.paths[this.active]);
    for (let o = 0; o < this.paths.length; o++) {
      if (o === this.active) continue;
      const bp = base[o];
      const cut = bp.findIndex((cell) => taken.has(cell));
      this.paths[o] = cut < 0 ? bp.slice() : bp.slice(0, cut);
    }
    this.reindex();
  }

  private reindex(): void {
    this.owner.fill(-1);
    this.paths.forEach((p, c) => {
      for (const cell of p) this.owner[cell] = c;
    });
  }
}
