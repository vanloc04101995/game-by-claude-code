import { Game } from '../../game/game.ts';
import { BoardView } from '../../game/renderer.ts';
import { currentStreak, dailyNumber, dailySize, dateKey, shiftKey } from '../daily.ts';
import { $, html } from '../dom.ts';
import { icons } from '../icons.ts';
import { currentLevel, getLevel, packOf, packStats } from '../levels.ts';
import { openSettings } from '../settings.ts';
import { store } from '../store.ts';
import type { Screen } from './screen.ts';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function homeScreen(): Screen {
  const level = currentLevel();
  const pack = packOf(level);
  const stats = packStats(pack);
  const today = dateKey();
  const streak = currentStreak(today);
  const playedToday = !!store.data.daily.results[today];
  const size = dailySize(today);

  const week = Array.from({ length: 7 }, (_, i) => {
    const key = shiftKey(today, i - 6);
    const day = new Date(`${key}T12:00:00`).getDay();
    return { label: WEEKDAYS[day], done: !!store.data.daily.results[key], isToday: i === 6 };
  });

  const el = html(`
    <main class="screen home">
      <header class="topbar">
        <div class="chip" aria-label="Chuỗi ${streak} ngày"><span class="chip-icon flame">${icons.flame}</span>${streak}</div>
        <div class="chip" aria-label="${store.data.hints} gợi ý"><span class="chip-icon bulb">${icons.hint}</span>${store.data.hints}</div>
        <span class="spacer"></span>
        <button class="icon-btn" data-settings aria-label="Cài đặt">${icons.settings}</button>
      </header>

      <section class="hero">
        <div class="hero-board" aria-hidden="true"></div>
        <h1 class="wordmark">Dotline</h1>
        <p class="tagline">Nối chấm · Lấp đầy · Không cắt nhau</p>
      </section>

      <a class="card daily-card" href="#/daily">
        <div class="daily-row">
          <span class="tile-icon">${icons.calendar}</span>
          <span class="daily-text">
            <strong>Thử thách hôm nay</strong>
            <span class="muted">#${dailyNumber(today)} · ${size.w}×${size.h}</span>
          </span>
          <span class="pill ${playedToday ? 'pill-done' : 'pill-accent'}">${playedToday ? 'Đã xong' : 'Chơi'}</span>
        </div>
        <div class="week">
          ${week
            .map(
              (d) => `
            <div class="week-day">
              <span class="week-label">${d.label}</span>
              <span class="week-dot ${d.done ? 'done' : d.isToday ? 'today' : ''}">${d.done ? icons.check : ''}</span>
            </div>`,
            )
            .join('')}
        </div>
      </a>

      <span class="spacer"></span>

      <section class="thumb-zone">
        <div class="progress-block">
          <div class="progress-row"><strong>Pack ${pack.name} · ${pack.size}</strong><span class="muted">${stats.solved} / ${pack.count}</span></div>
          <div class="bar"><div class="bar-fill" style="width:${(stats.solved / pack.count) * 100}%"></div></div>
        </div>
        <a class="btn btn-primary btn-xl" href="#/play/${level}">
          ${icons.play}<span>${store.solvedCount() === 0 ? 'Bắt đầu' : 'Chơi tiếp'}</span><span class="btn-badge">Cấp ${level}</span>
        </a>
        <div class="btn-row">
          <a class="btn btn-secondary" href="#/levels/${pack.index}">${icons.grid}<span>Màn chơi</span></a>
          <button class="btn btn-secondary" data-settings>${icons.settings}<span>Cài đặt</span></button>
        </div>
      </section>
    </main>`);

  el.querySelectorAll('[data-settings]').forEach((b) => b.addEventListener('click', () => openSettings()));

  const preview = new Game(getLevel(5));
  preview.showSolution();
  const view = new BoardView($(el, '.hero-board'), { maxCell: 44 });
  view.setGame(preview);

  return { el, destroy: () => view.destroy(), onSettings: () => view.refreshTheme() };
}
