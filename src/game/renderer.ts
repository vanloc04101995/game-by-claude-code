import { flowColor, type SymbolName } from '../core/palette.ts';
import type { Game } from './game.ts';

interface BoardTheme {
  board: string;
  cell: string;
  tintAlpha: number;
}

function readTheme(): BoardTheme {
  const css = getComputedStyle(document.documentElement);
  return {
    board: css.getPropertyValue('--board').trim() || '#E1E4EA',
    cell: css.getPropertyValue('--cell').trim() || '#FFFFFF',
    tintAlpha: Number(css.getPropertyValue('--tint-alpha').trim() || 0.16),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawSymbol(ctx: CanvasRenderingContext2D, name: SymbolName, cx: number, cy: number, s: number) {
  ctx.beginPath();
  switch (name) {
    case 'circle':
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - s * 1.1);
      ctx.lineTo(cx + s * 1.1, cy + s * 0.85);
      ctx.lineTo(cx - s * 1.1, cy + s * 0.85);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - s * 1.2);
      ctx.lineTo(cx + s * 1.2, cy);
      ctx.lineTo(cx, cy + s * 1.2);
      ctx.lineTo(cx - s * 1.2, cy);
      ctx.closePath();
      break;
    case 'plus':
      ctx.rect(cx - s * 0.38, cy - s * 1.1, s * 0.76, s * 2.2);
      ctx.rect(cx - s * 1.1, cy - s * 0.38, s * 2.2, s * 0.76);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.5 : s * 1.2;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(cx + s * 1.05 * Math.cos(a), cy + s * 1.05 * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'ring':
      ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2);
      ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2, true);
      break;
    case 'cross': {
      const d = s * 0.3;
      ctx.moveTo(cx - s, cy - s + d);
      ctx.lineTo(cx - s + d, cy - s);
      ctx.lineTo(cx, cy - d);
      ctx.lineTo(cx + s - d, cy - s);
      ctx.lineTo(cx + s, cy - s + d);
      ctx.lineTo(cx + d, cy);
      ctx.lineTo(cx + s, cy + s - d);
      ctx.lineTo(cx + s - d, cy + s);
      ctx.lineTo(cx, cy + d);
      ctx.lineTo(cx - s + d, cy + s);
      ctx.lineTo(cx - s, cy + s - d);
      ctx.lineTo(cx - d, cy);
      ctx.closePath();
      break;
    }
    case 'bar':
      ctx.rect(cx - s * 1.1, cy - s * 0.4, s * 2.2, s * 0.8);
      break;
  }
  ctx.fill('evenodd');
}

export interface BoardViewOptions {
  /** Largest cell size in CSS px, so small boards don't look bloated on tablets. */
  maxCell?: number;
}

/**
 * Canvas board renderer. Sizes itself to its container, redraws on demand, and runs an
 * animation loop only while the tutorial ghost or the win wave is playing.
 */
export class BoardView {
  readonly canvas: HTMLCanvasElement;
  symbols = false;

  private readonly ctx: CanvasRenderingContext2D;
  private game: Game | null = null;
  private theme = readTheme();
  private cell = 0;
  private ox = 0;
  private oy = 0;
  private dpr = 1;
  private frame = 0;
  private tutorial: number[] | null = null;
  private winAt = 0;
  private winOrigin = 0;
  private readonly container: HTMLElement;
  private readonly maxCell: number;
  private readonly resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: BoardViewOptions = {}) {
    this.container = container;
    this.maxCell = opts.maxCell ?? 88;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'board-canvas';
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  destroy() {
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
    this.canvas.remove();
  }

  setGame(game: Game) {
    this.game = game;
    this.winAt = 0;
    this.resize();
  }

  refreshTheme() {
    this.theme = readTheme();
    this.requestDraw();
  }

  /** Animated finger demo along `path` until the player touches the board. */
  setTutorial(path: number[] | null) {
    this.tutorial = path;
    this.requestDraw();
  }

  playWin(originCell: number) {
    this.winAt = performance.now();
    this.winOrigin = originCell;
    this.requestDraw();
  }

  /** Cell under a pointer; with `clamp`, points outside the board snap to the nearest edge cell. */
  cellAt(clientX: number, clientY: number, clamp = false): number {
    const g = this.game;
    if (!g || this.cell === 0) return -1;
    const r = this.canvas.getBoundingClientRect();
    let x = Math.floor((clientX - r.left - this.ox) / this.cell);
    let y = Math.floor((clientY - r.top - this.oy) / this.cell);
    const { w, h } = g.puzzle;
    if (clamp) {
      x = Math.max(0, Math.min(w - 1, x));
      y = Math.max(0, Math.min(h - 1, y));
    } else if (x < 0 || y < 0 || x >= w || y >= h) {
      return -1;
    }
    return y * w + x;
  }

  requestDraw() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  private resize() {
    const g = this.game;
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    if (!g || cw === 0 || ch === 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    const { w, h } = g.puzzle;
    this.cell = Math.floor(Math.min(cw / w, ch / h, this.maxCell));
    this.ox = Math.round((cw - this.cell * w) / 2);
    this.oy = Math.round((ch - this.cell * h) / 2);
    this.requestDraw();
  }

  private center(i: number): [number, number] {
    const w = this.game!.puzzle.w;
    return [this.ox + ((i % w) + 0.5) * this.cell, this.oy + (Math.floor(i / w) + 0.5) * this.cell];
  }

  private draw() {
    const g = this.game;
    if (!g || this.cell === 0) return;
    const ctx = this.ctx;
    const { w, h } = g.puzzle;
    const s = this.cell;
    const now = performance.now();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    roundRect(ctx, this.ox, this.oy, s * w, s * h, Math.max(10, s * 0.22));
    ctx.fillStyle = this.theme.board;
    ctx.fill();

    const gap = Math.max(2, s * 0.05);
    const radius = Math.max(4, s * 0.14);
    const winT = this.winAt ? (now - this.winAt) / 900 : -1;
    const ox0 = this.winOrigin % w;
    const oy0 = Math.floor(this.winOrigin / w);
    const maxDist = Math.hypot(w, h);

    for (let i = 0; i < w * h; i++) {
      const x = this.ox + (i % w) * s + gap / 2;
      const y = this.oy + Math.floor(i / w) * s + gap / 2;
      roundRect(ctx, x, y, s - gap, s - gap, radius);
      ctx.fillStyle = this.theme.cell;
      ctx.fill();
      const c = g.ownerOf(i);
      if (c >= 0 && g.paths[c].length > 1) {
        let alpha = this.theme.tintAlpha;
        if (winT >= 0 && winT <= 1.4) {
          const d = Math.hypot((i % w) - ox0, Math.floor(i / w) - oy0);
          alpha += 0.35 * Math.max(0, 1 - Math.abs(d - winT * maxDist) / 1.6);
        }
        ctx.fillStyle = withAlpha(flowColor(c).hex, alpha);
        ctx.fill();
      }
    }

    // Glow under the head of the path being drawn.
    if (g.active >= 0) {
      const [hx, hy] = this.center(g.head());
      ctx.beginPath();
      ctx.arc(hx, hy, s * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(flowColor(g.active).hex, 0.28);
      ctx.fill();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.34;
    g.paths.forEach((p, c) => {
      if (p.length < 2) return;
      ctx.beginPath();
      p.forEach((cell, j) => {
        const [x, y] = this.center(cell);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = flowColor(c).hex;
      ctx.stroke();
    });

    g.puzzle.flows.forEach((f, c) => {
      const col = flowColor(c);
      const done = g.isComplete(c);
      for (const cell of [f.a, f.b]) {
        const [x, y] = this.center(cell);
        if (done) {
          ctx.beginPath();
          ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = withAlpha(col.hex, 0.25);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = col.hex;
        ctx.fill();
        if (this.symbols) {
          ctx.fillStyle = col.ink;
          drawSymbol(ctx, col.symbol, x, y, s * 0.13);
        }
      }
    });

    let animating = winT >= 0 && winT <= 1.4;
    if (this.tutorial && this.tutorial.length > 1) {
      this.drawTutorial(now);
      animating = true;
    }
    if (animating) this.requestDraw();
  }

  private drawTutorial(now: number) {
    const ctx = this.ctx;
    const path = this.tutorial!;
    const s = this.cell;
    const pts = path.map((c) => this.center(c));
    const cycle = 2600;
    const t = (now % cycle) / cycle;
    const travel = Math.min(1, Math.max(0, (t - 0.12) / 0.6));
    const seg = travel * (pts.length - 1);
    const k = Math.min(pts.length - 2, Math.floor(seg));
    const f = seg - k;
    const fx = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f;
    const fy = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
    const fade = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;

    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.setLineDash([s * 0.14, s * 0.14]);
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = flowColor(0).hex;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= k; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.92 * fade;
    ctx.shadowColor = 'rgba(21, 23, 28, 0.3)';
    ctx.shadowBlur = s * 0.2;
    ctx.shadowOffsetY = s * 0.05;
    ctx.beginPath();
    ctx.arc(fx, fy, s * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = s * 0.04;
    ctx.strokeStyle = 'rgba(21, 23, 28, 0.25)';
    ctx.stroke();
    ctx.restore();
  }
}
