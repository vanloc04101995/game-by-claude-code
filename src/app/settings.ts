import { applySettings } from './context.ts';
import { $, html } from './dom.ts';
import { icons } from './icons.ts';
import { store, type Settings, type ThemeSetting } from './store.ts';

const toggles: { key: 'sound' | 'haptics' | 'symbols'; label: string; hint: string }[] = [
  { key: 'sound', label: 'Âm thanh', hint: 'Tiếng nhạc khi vẽ và nối' },
  { key: 'haptics', label: 'Rung', hint: 'Phản hồi rung khi vẽ (Android)' },
  { key: 'symbols', label: 'Chế độ mù màu', hint: 'Thêm ký hiệu lên mỗi chấm' },
];

const themes: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'Theo máy' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

export function openSettings(onChange?: () => void) {
  const s = store.data.settings;
  const dialog = html<HTMLDialogElement>(`
    <dialog class="sheet" aria-labelledby="settings-title">
      <div class="sheet-head">
        <h2 id="settings-title">Cài đặt</h2>
        <button class="icon-btn" data-close aria-label="Đóng">${icons.close}</button>
      </div>
      <div class="settings-list">
        ${toggles
          .map(
            (t) => `
          <label class="setting-row">
            <span class="setting-text"><span class="setting-label">${t.label}</span><span class="setting-hint">${t.hint}</span></span>
            <input type="checkbox" role="switch" class="switch" data-key="${t.key}" ${s[t.key] ? 'checked' : ''}>
          </label>`,
          )
          .join('')}
        <fieldset class="setting-row theme-row">
          <legend class="setting-label">Giao diện</legend>
          <div class="segmented">
            ${themes
              .map(
                (t) => `<label><input type="radio" name="theme" value="${t.value}" ${s.theme === t.value ? 'checked' : ''}><span>${t.label}</span></label>`,
              )
              .join('')}
          </div>
        </fieldset>
      </div>
      <button class="btn btn-ghost danger" data-reset>Xóa tiến độ chơi</button>
    </dialog>`);

  const update = (patch: Partial<Settings>) => {
    Object.assign(store.data.settings, patch);
    store.save();
    applySettings();
    onChange?.();
  };

  dialog.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset.key) update({ [input.dataset.key]: input.checked });
    if (input.name === 'theme') update({ theme: input.value as ThemeSetting });
  });
  $(dialog, '[data-close]').addEventListener('click', () => dialog.close());
  $(dialog, '[data-reset]').addEventListener('click', () => {
    if (confirm('Xóa toàn bộ sao, màn đã giải và chuỗi ngày chơi?')) {
      store.reset();
      dialog.close();
      location.hash = '#/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
  // Tap on the dimmed backdrop closes the sheet.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  document.body.appendChild(dialog);
  dialog.showModal();
}
