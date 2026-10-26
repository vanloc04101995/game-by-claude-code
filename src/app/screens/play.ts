import { solutionPath } from '../../core/codec.ts';
import type { Puzzle } from '../../core/types.ts';
import { Game } from '../../game/game.ts';
import { BoardView } from '../../game/renderer.ts';
import { feedback } from '../context.ts';
import { dailyNumber, dailyPuzzle, formatTime, recordDaily } from '../daily.ts';
import { $, html, toast } from '../dom.ts';
import { icons } from '../icons.ts';
import { LEVEL_COUNT, getLevel, isUnlocked, packOf } from '../levels.ts';
import { openSettings } from '../settings.ts';
import { store } from '../store.ts';
import type { Screen } from './screen.ts';

export type PlayMode = { kind: 'level'; level: number } | { kind: 'daily'; key: string };

/** 3★ perfect (one stroke per flow, no hints) · 2★ a few extra strokes · 1★ otherwise. */
function starsFor(game: Game): number {
  const flows = game.puzzle.flows.length;
  let stars = game.moves <= flows ? 3 : game.moves <= flows + Math.ceil(flows / 2) ? 2 : 1;
  if (game.hintsUsed > 0) stars = Math.min(stars, 2);
  return stars;
}

export function playScreen(mode: PlayMode): Screen {
  let puzzle: Puzzle;
  let title: string;
  let subtitle: string;
  let backHref: string;
  if (mode.kind === 'level') {
    const pack = packOf(mode.level);
    puzzle = getLevel(mode.level);
    title = `Cấp ${mode.level}`;
    subtitle = `${pack.name} · ${puzzle.w}×${puzzle.h}`;
    backHref = `#/levels/${pack.index}`;
  } else {
    puzzle = dailyPuzzle(mode.key);
    title = `Daily #${dailyNumber(mode.key)}`;
    subtitle = `Thử thách hằng ngày · ${puzzle.w}×${puzzle.h}`;
    backHref = '#/daily';
  }

  const el = html(`
    <main class="screen play">
      <header class="topbar">
        <a class="icon-btn" href="${backHref}" aria-label="Quay lại">${icons.back}</a>
        <div class="topbar-center">
          <h1 class="topbar-title">${title}</h1>
          <span class="topbar-sub">${subtitle}</span>
        </div>
        <button class="icon-btn" data-settings aria-label="Cài đặt">${icons.settings}</button>
      </header>
      <section class="stats" aria-live="polite">
        <div class="stat"><span class="stat-label">Đường</span><span class="stat-value" data-flows></span></div>
        <div class="stat"><span class="stat-label">Lấp đầy</span><span class="stat-value" data-fill></span></div>
        <div class="stat"><span class="stat-label">Nét vẽ</span><span class="stat-value" data-moves></span></div>
      </section>
      <section class="board-wrap" aria-label="Bàn chơi. Kéo từ một chấm để nối với chấm cùng màu."></section>
      <nav class="toolbar">
        <button class="tool" data-undo>${icons.undo}<span>Hoàn tác</span></button>
        <button class="tool tool-primary" data-hint>${icons.hint}<span>Gợi ý</span><span class="badge" data-hints></span></button>
        <button class="tool" data-restart>${icons.restart}<span>Chơi lại</span></button>
      </nav>
    </main>`);

  const game = new Game(puzzle);
  const view = new BoardView($(el, '.board-wrap'));
  view.symbols = store.data.settings.symbols;
  view.setGame(game);

  const showTutorial = mode.kind === 'level' && mode.level === 1 && !store.isSolved(1);
  if (showTutorial) view.setTutorial(solutionPath(puzzle, 0));

  let startedAt = 0;
  let finished = false;
  const connectOrder: number[] = [];

  const flowsEl = $(el, '[data-flows]');
  const fillEl = $(el, '[data-fill]');
  const movesEl = $(el, '[data-moves]');
  const hintsEl = $(el, '[data-hints]');
  const undoBtn = $(el, '[data-undo]') as HTMLButtonElement;

  function update() {
    flowsEl.textContent = `${game.completedCount()}/${puzzle.flows.length}`;
    fillEl.textContent = `${Math.round((game.filledCount() / game.cells) * 100)}%`;
    movesEl.textContent = String(game.moves);
    hintsEl.textContent = String(store.data.hints);
    undoBtn.disabled = !game.canUndo();
    view.requestDraw();
  }

  function noteConnections() {
    puzzle.flows.forEach((_, c) => {
      if (game.isComplete(c) && !connectOrder.includes(c)) connectOrder.push(c);
    });
  }

  function checkWin(origin: number) {
    if (finished || !game.isSolved()) return;
    finished = true;
    const time = performance.now() - startedAt;
    const stars = starsFor(game);
    feedback.win();
    view.playWin(origin);
    noteConnections();

    if (mode.kind === 'level') {
      store.recordLevel(mode.level, stars);
    } else {
      recordDaily(mode.key, { time, moves: game.moves, perfect: stars === 3, order: connectOrder });
    }
    window.setTimeout(() => showWinSheet(stars, time), 650);
  }

  function showWinSheet(stars: number, time: number) {
    const perfect = stars === 3;
    const isLast = mode.kind === 'level' && mode.level >= LEVEL_COUNT;
    const nextHref = mode.kind === 'daily' ? '#/daily' : isLast ? '#/' : `#/play/${mode.level + 1}`;
    const nextLabel = mode.kind === 'daily' ? 'Xem kết quả' : isLast ? 'Về trang chủ' : 'Màn tiếp theo';
    const starEls = [1, 2, 3]
      .map((s) => `<span class="win-star ${s === 2 ? 'big' : ''} ${s <= stars ? 'on' : ''}" style="animation-delay:${s * 110}ms">${icons.star}</span>`)
      .join('');
    const sheet = html(`
      <div class="win-overlay">
        <section class="win-sheet" role="dialog" aria-modal="true" aria-labelledby="win-title">
          <div class="win-stars" aria-label="${stars} sao">${starEls}</div>
          <h2 id="win-title" class="win-title">${perfect ? 'Hoàn hảo!' : 'Hoàn thành!'}</h2>
          <p class="muted">${perfect ? 'Giải với số nét tối thiểu' : `${game.moves} nét · tối thiểu là ${puzzle.flows.length} nét`}</p>
          <div class="win-stats">
            <div class="stat"><span class="stat-label">Thời gian</span><span class="stat-value">${formatTime(time)}</span></div>
            <div class="stat"><span class="stat-label">Nét vẽ</span><span class="stat-value">${game.moves} / ${puzzle.flows.length}</span></div>
            <div class="stat"><span class="stat-label">Gợi ý</span><span class="stat-value">${game.hintsUsed}</span></div>
          </div>
          <div class="win-actions">
            <button class="btn btn-secondary btn-square" data-replay aria-label="Chơi lại">${icons.restart}</button>
            <a class="btn btn-primary btn-xl" href="${nextHref}" data-next><span>${nextLabel}</span>${icons.next}</a>
          </div>
        </section>
      </div>`);
    $(sheet, '[data-replay]').addEventListener('click', () => {
      sheet.remove();
      game.restart();
      finished = false;
      startedAt = 0;
      connectOrder.length = 0;
      update();
    });
    el.appendChild(sheet);
    ($(sheet, '[data-next]') as HTMLAnchorElement).focus();
  }

  const canvas = view.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (finished) return;
    feedback.unlock();
    const cell = view.cellAt(e.clientX, e.clientY);
    if (!game.begin(cell)) return;
    canvas.setPointerCapture(e.pointerId);
    if (!startedAt) startedAt = performance.now();
    if (showTutorial) view.setTutorial(null);
    feedback.tap();
    update();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (game.active < 0) return;
    const ev = game.drag(view.cellAt(e.clientX, e.clientY, true));
    if (ev === 'none') return;
    const len = game.paths[game.active].length;
    if (ev === 'extend') feedback.step(len);
    else if (ev === 'retract') feedback.retract();
    else {
      feedback.connect();
      noteConnections();
    }
    update();
  });
  const finishDrag = () => {
    if (game.active < 0) return;
    const head = game.head();
    game.end();
    update();
    checkWin(head);
  };
  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);

  undoBtn.addEventListener('click', () => {
    if (game.undo()) {
      feedback.retract();
      update();
    }
  });
  $(el, '[data-restart]').addEventListener('click', () => {
    game.restart();
    connectOrder.length = 0;
    feedback.retract();
    update();
  });
  $(el, '[data-hint]').addEventListener('click', () => {
    if (finished) return;
    if (!store.useHint()) {
      toast('Hết gợi ý — giải thêm 5 màn mới để nhận 1 gợi ý');
      return;
    }
    feedback.unlock();
    if (!startedAt) startedAt = performance.now();
    const c = game.hint();
    if (c < 0) return;
    feedback.connect();
    noteConnections();
    update();
    const p = game.paths[c];
    checkWin(p[p.length - 1]);
  });
  $(el, '[data-settings]').addEventListener('click', () => openSettings());

  update();

  return {
    el,
    destroy: () => view.destroy(),
    onSettings: () => {
      view.symbols = store.data.settings.symbols;
      view.refreshTheme();
    },
  };
}

/** Locked levels redirect to the furthest playable one. */
export function resolvePlayableLevel(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  let level = Math.min(n, LEVEL_COUNT);
  while (level > 1 && !isUnlocked(level)) level--;
  return level;
}
