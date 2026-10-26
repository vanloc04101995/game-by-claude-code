import './styles.css';
import { applySettings } from './app/context.ts';
import { startRouter } from './app/router.ts';
import { store } from './app/store.ts';

applySettings();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (store.data.settings.theme === 'system') applySettings();
});

startRouter(document.getElementById('app')!);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline support is a bonus; the game works without it.
    });
  });
}
