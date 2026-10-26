/** Pentatonic steps so any sequence of drag blips sounds pleasant. */
const SCALE = [0, 2, 4, 7, 9];

/** Synthesised sound and vibration. No audio files, so nothing to download or license. */
export class Feedback {
  sound = true;
  haptics = true;
  private ctx: AudioContext | null = null;

  /** Must run inside a user gesture the first time (browser autoplay rules). */
  unlock() {
    if (!this.sound) return;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  step(length: number) {
    const i = Math.min(length, 14);
    const semis = SCALE[i % 5] + 12 * Math.floor(i / 5);
    this.tone(330 * 2 ** (semis / 12), 0.09, 0.05);
    this.vibrate(4);
  }

  retract() {
    this.tone(260, 0.05, 0.025);
  }

  connect() {
    this.tone(523.25, 0.22, 0.07);
    this.tone(659.25, 0.22, 0.05, 0.03);
    this.vibrate(14);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.35, 0.07, i * 0.09));
    this.vibrate([18, 40, 18, 40, 30]);
  }

  tap() {
    this.tone(440, 0.05, 0.03);
    this.vibrate(6);
  }

  private tone(freq: number, dur: number, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!this.sound || !ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private vibrate(pattern: number | number[]) {
    if (!this.haptics || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw when called outside a gesture; vibration is optional.
    }
  }
}
