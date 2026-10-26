import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../core/types.ts';
import { Game } from './game.ts';

// 3x3, three vertical flows: columns 0, 1, 2.
const tutorial: Puzzle = {
  w: 3,
  h: 3,
  flows: [{ a: 0, b: 6 }, { a: 1, b: 7 }, { a: 2, b: 8 }],
  solution: [0, 1, 2, 0, 1, 2, 0, 1, 2],
};

function drawPath(g: Game, cells: number[]) {
  g.begin(cells[0]);
  for (const c of cells.slice(1)) g.drag(c);
  g.end();
}

describe('Game', () => {
  it('connects flows and detects a solved board', () => {
    const g = new Game(tutorial);
    drawPath(g, [0, 3, 6]);
    drawPath(g, [1, 4, 7]);
    drawPath(g, [2, 5, 8]);
    expect(g.isSolved()).toBe(true);
    expect(g.moves).toBe(3);
  });

  it('fills cells skipped by a fast swipe', () => {
    const g = new Game(tutorial);
    g.begin(0);
    expect(g.drag(6)).toBe('connect');
    expect(g.paths[0]).toEqual([0, 3, 6]);
  });

  it('refuses to draw over another colour’s dot', () => {
    const g = new Game(tutorial);
    g.begin(0);
    expect(g.drag(1)).toBe('none');
  });

  it('cuts a crossed path and restores it when the drag retreats', () => {
    const g = new Game({ ...tutorial, flows: tutorial.flows, solution: tutorial.solution });
    drawPath(g, [1, 4]);
    g.begin(0);
    g.drag(3);
    g.drag(4);
    expect(g.paths[1]).toEqual([1]);
    g.drag(3);
    expect(g.paths[1]).toEqual([1, 4]);
    g.end();
  });

  it('undoes the last change', () => {
    const g = new Game(tutorial);
    drawPath(g, [0, 3, 6]);
    g.undo();
    expect(g.paths[0]).toEqual([]);
  });

  it('hint draws a correct flow', () => {
    const g = new Game(tutorial);
    expect(g.hint()).toBe(0);
    expect(g.isComplete(0)).toBe(true);
  });
});
