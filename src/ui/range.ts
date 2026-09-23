/**
 * YTM-style sliders paint their filled part via a `--fill` custom property
 * (WebKit has no ::-webkit-slider-progress). Call `syncRange` after setting
 * `.value` from code; user input is handled by `initRanges`.
 */

export function rangeFillPercent(value: number, min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function syncRange(el: HTMLInputElement): void {
  const pct = rangeFillPercent(parseFloat(el.value), parseFloat(el.min || '0'), parseFloat(el.max || '100'));
  el.style.setProperty('--fill', `${pct}%`);
}

export function initRanges(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((el) => {
    syncRange(el);
    el.addEventListener('input', () => syncRange(el));
  });
}
