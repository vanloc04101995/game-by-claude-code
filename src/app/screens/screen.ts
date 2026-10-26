export interface Screen {
  el: HTMLElement;
  destroy?: () => void;
  /** Called after settings change so canvases can re-read theme colours. */
  onSettings?: () => void;
}
