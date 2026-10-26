import { html } from '../dom.ts';
import { icons } from '../icons.ts';
import { PACKS, currentLevel, isUnlocked, packStats } from '../levels.ts';
import { store } from '../store.ts';
import type { Screen } from './screen.ts';

export function levelsScreen(packIndex: number): Screen {
  const pack = PACKS[Math.max(0, Math.min(PACKS.length - 1, packIndex))];
  const stats = packStats(pack);
  const current = currentLevel();

  const tiles = Array.from({ length: pack.count }, (_, i) => {
    const n = pack.first + i;
    const stars = store.starsFor(n);
    if (stars > 0) {
      const dots = [1, 2, 3].map((s) => `<span class="star-dot ${s <= stars ? 'on' : ''}"></span>`).join('');
      return `<a class="level-tile done" href="#/play/${n}" aria-label="Cấp ${n}, ${stars} sao"><span>${n}</span><span class="star-dots">${dots}</span></a>`;
    }
    if (isUnlocked(n)) return `<a class="level-tile current" href="#/play/${n}" aria-label="Cấp ${n}, chơi ngay">${n}</a>`;
    return `<span class="level-tile locked" aria-label="Cấp ${n}, đang khóa">${n}</span>`;
  }).join('');

  const chips = PACKS.map((p) => {
    if (p.index === pack.index) return `<a class="pack-chip active" href="#/levels/${p.index}" aria-current="page">${p.name} ${p.size}</a>`;
    if (isUnlocked(p.first)) return `<a class="pack-chip" href="#/levels/${p.index}">${p.name} ${p.size}</a>`;
    return `<span class="pack-chip locked">${icons.lock}${p.name}</span>`;
  }).join('');

  const el = html(`
    <main class="screen levels">
      <header class="topbar">
        <a class="icon-btn" href="#/" aria-label="Về trang chủ">${icons.back}</a>
        <h1 class="topbar-title">Màn chơi</h1>
        <span class="icon-btn-space"></span>
      </header>
      <nav class="pack-chips" aria-label="Pack màn chơi">${chips}</nav>
      <section class="card pack-card">
        <div class="progress-row"><strong class="pack-name">${pack.name}</strong><span class="muted">${pack.size} · ${pack.count} màn</span></div>
        <div class="bar"><div class="bar-fill" style="width:${(stats.solved / pack.count) * 100}%"></div></div>
        <div class="progress-row muted"><span>${stats.solved} màn đã giải</span><span>${stats.stars} / ${stats.maxStars} sao</span></div>
      </section>
      <section class="level-grid">${tiles}</section>
      <a class="btn btn-primary btn-xl sticky-cta" href="#/play/${current}">${icons.play}<span>Tiếp tục · Cấp ${current}</span></a>
    </main>`);

  return { el };
}
