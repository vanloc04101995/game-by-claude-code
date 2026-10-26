import { flowColor } from '../../core/palette.ts';
import { currentStreak, dailyNumber, dailySize, dateKey, formatTime, shareText } from '../daily.ts';
import { $, html, shareOrCopy } from '../dom.ts';
import { icons } from '../icons.ts';
import { store } from '../store.ts';
import type { Screen } from './screen.ts';

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function dailyScreen(): Screen {
  const key = dateKey();
  const result = store.data.daily.results[key];
  const streak = currentStreak(key);
  const size = dailySize(key);
  const number = dailyNumber(key);
  const [, m, d] = key.split('-');

  const body = result
    ? `
      <section class="card share-card">
        <div class="progress-row"><strong class="share-title">Dotline Daily #${number}</strong><span class="muted">${d}/${m}</span></div>
        <div class="share-label muted">Thứ tự nối màu</div>
        <div class="order-row">${result.order.map((c) => `<span class="order-sq" style="background:${flowColor(c).hex}"></span>`).join('')}</div>
        <div class="share-stats">
          <div class="stat"><span class="stat-label">Thời gian</span><span class="stat-value">${formatTime(result.time)}</span></div>
          <div class="stat"><span class="stat-label">Kết quả</span><span class="stat-value">${result.perfect ? 'Hoàn hảo' : `${result.moves} nét`}</span></div>
          <div class="stat"><span class="stat-label">Chuỗi</span><span class="stat-value">${streak} ngày</span></div>
        </div>
      </section>`
    : `
      <section class="card share-card">
        <div class="progress-row"><strong class="share-title">Dotline Daily #${number}</strong><span class="muted">${d}/${m}</span></div>
        <p class="muted">Một câu đố ${size.w}×${size.h} cho tất cả mọi người hôm nay. Giải xong để giữ chuỗi ngày và chia sẻ kết quả.</p>
      </section>`;

  const actions = result
    ? `
      <button class="btn btn-primary btn-xl" data-share>${icons.share}<span>Chia sẻ kết quả</span></button>
      <button class="btn btn-secondary" data-challenge>${icons.link}<span>Thách bạn bè cùng màn này</span></button>`
    : `<a class="btn btn-primary btn-xl" href="#/daily/play">${icons.play}<span>Chơi Daily #${number}</span></a>`;

  const el = html(`
    <main class="screen daily">
      <header class="topbar">
        <a class="icon-btn" href="#/" aria-label="Về trang chủ">${icons.back}</a>
        <h1 class="topbar-title">Thử thách hằng ngày</h1>
        <span class="icon-btn-space"></span>
      </header>
      <section class="streak-hero">
        <span class="streak-icon">${icons.flame}</span>
        <strong class="streak-count">${streak} ngày liên tiếp</strong>
        <span class="muted">Kỷ lục của bạn: ${store.data.daily.best} ngày</span>
      </section>
      ${body}
      <p class="countdown muted">${icons.clock}<span>Câu đố tiếp theo sau <strong data-countdown>${untilMidnight()}</strong></span></p>
      <span class="spacer"></span>
      <section class="thumb-zone">${actions}</section>
    </main>`);

  const countdown = $(el, '[data-countdown]');
  const timer = window.setInterval(() => (countdown.textContent = untilMidnight()), 1000);

  if (result) {
    $(el, '[data-share]').addEventListener('click', () => void shareOrCopy(shareText(key, result)));
    $(el, '[data-challenge]').addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}#/daily`;
      void shareOrCopy(`${shareText(key, result)}\nBạn giải nhanh hơn không? ${url}`);
    });
  }

  return { el, destroy: () => clearInterval(timer) };
}
