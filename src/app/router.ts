import { SETTINGS_EVENT } from './context.ts';
import { dateKey } from './daily.ts';
import { dailyScreen } from './screens/daily.ts';
import { homeScreen } from './screens/home.ts';
import { levelsScreen } from './screens/levels.ts';
import { playScreen, resolvePlayableLevel } from './screens/play.ts';
import type { Screen } from './screens/screen.ts';

function resolve(hash: string): Screen {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'levels':
      return levelsScreen(Number(parts[1] ?? 0));
    case 'play': {
      const wanted = Number(parts[1]);
      const level = resolvePlayableLevel(wanted);
      if (level !== wanted) history.replaceState(null, '', `#/play/${level}`);
      return playScreen({ kind: 'level', level });
    }
    case 'daily':
      return parts[1] === 'play' ? playScreen({ kind: 'daily', key: dateKey() }) : dailyScreen();
    default:
      return homeScreen();
  }
}

/** Hash router: one screen mounted at a time, torn down on navigation. */
export function startRouter(root: HTMLElement) {
  let current: Screen | null = null;

  const render = () => {
    current?.destroy?.();
    root.replaceChildren();
    current = resolve(location.hash);
    root.appendChild(current.el);
    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', render);
  window.addEventListener(SETTINGS_EVENT, () => current?.onSettings?.());
  render();
}
