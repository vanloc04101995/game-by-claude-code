import { Feedback } from '../game/feedback.ts';
import { store } from './store.ts';

export const feedback = new Feedback();

export const SETTINGS_EVENT = 'dotline:settings';

/** Pushes saved settings into the page theme and the feedback engine. */
export function applySettings() {
  const s = store.data.settings;
  const root = document.documentElement;
  if (s.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', s.theme);
  const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0F1115' : '#F4F5F7');
  feedback.sound = s.sound;
  feedback.haptics = s.haptics;
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}
