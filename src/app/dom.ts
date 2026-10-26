/** Parses trusted, app-authored markup into a single element. */
export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

export function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

let toastTimer = 0;

export function toast(message: string) {
  let el = document.querySelector<HTMLElement>('.toast');
  if (!el) {
    el = html('<div class="toast" role="status" aria-live="polite"></div>');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 2200);
}

export async function shareOrCopy(text: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã sao chép kết quả');
  } catch {
    toast('Không chia sẻ được trên trình duyệt này');
  }
}
