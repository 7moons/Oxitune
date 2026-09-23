/**
 * Drag-to-reorder for a list of rows, shared by the shared-queue panel on
 * the YTM page and the sync window. Pointer events rather than HTML5 drag
 * and drop: Tauri's own file-drop handling swallows HTML5 drag events in
 * the webview on Windows. Each row has a handle button; dragging it shows
 * where the row will land, and on the focused handle ArrowUp/ArrowDown move
 * the row one step.
 *
 * The list is re-rendered from room state after a move, so the handle a
 * keyboard move came from gets its focus back through `restoreReorderFocus`.
 */

/** Where a row dragged from `from` lands with the pointer at `pointerY`,
 * given every row's vertical midpoint: after each other row whose middle
 * the pointer is past. */
export function dropIndex(pointerY: number, rowMidpoints: readonly number[], from: number): number {
  let index = 0;
  rowMidpoints.forEach((mid, i) => {
    if (i !== from && pointerY > mid) index++;
  });
  return index;
}

export interface ReorderOptions {
  list: HTMLElement;
  /** Rows, in order, among the list's descendants. */
  rowSelector: string;
  /** The drag handle inside a row; carries `data-item-id`. */
  handleSelector: string;
  onMove: (from: number, to: number, itemId: string) => void;
}

let focusAfterRender: string | null = null;

/** Call after re-rendering a reorderable list: puts focus back on the handle
 * a keyboard move was made with. */
export function restoreReorderFocus(list: HTMLElement, handleSelector: string): void {
  if (!focusAfterRender) return;
  const handle = [...list.querySelectorAll<HTMLElement>(handleSelector)].find(
    (h) => h.dataset.itemId === focusAfterRender
  );
  if (handle) {
    handle.focus();
    focusAfterRender = null;
  }
}

/** Installs drag and keyboard reordering on `list` (once; rows can be
 * re-rendered freely). Returns a function that removes it. */
export function enableReorder({ list, rowSelector, handleSelector, onMove }: ReorderOptions): () => void {
  const rows = () => [...list.querySelectorAll<HTMLElement>(rowSelector)];
  const clearMarks = () =>
    rows().forEach((r) => r.classList.remove('is-dragging', 'drop-before', 'drop-after'));

  let drag: { from: number; itemId: string; to: number; pointerId: number; handle: HTMLElement } | null = null;

  const markTarget = (to: number, from: number) => {
    const others = rows().filter((_, i) => i !== from);
    others.forEach((r) => r.classList.remove('drop-before', 'drop-after'));
    if (to < others.length) others[to].classList.add('drop-before');
    else others[others.length - 1]?.classList.add('drop-after');
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const handle = e.target.closest<HTMLElement>(handleSelector);
    const row = handle?.closest<HTMLElement>(rowSelector);
    if (!handle || !row || !handle.dataset.itemId) return;
    const from = rows().indexOf(row);
    if (from < 0) return;
    e.preventDefault();
    try {
      // Keeps the moves coming when the pointer leaves the handle.
      handle.setPointerCapture(e.pointerId);
    } catch {
      // No active pointer with that id (a synthetic event): the list's own
      // listeners still see the moves while over it.
    }
    drag = { from, itemId: handle.dataset.itemId, to: from, pointerId: e.pointerId, handle };
    row.classList.add('is-dragging');
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const mids = rows().map((r) => {
      const rect = r.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    drag.to = dropIndex(e.clientY, mids, drag.from);
    markTarget(drag.to, drag.from);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { from, to, itemId, handle } = drag;
    drag = null;
    if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    clearMarks();
    if (to !== from) onMove(from, to, itemId);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !(e.target instanceof Element)) return;
    const handle = e.target.closest<HTMLElement>(handleSelector);
    const row = handle?.closest<HTMLElement>(rowSelector);
    if (!handle || !row || !handle.dataset.itemId) return;
    e.preventDefault();
    const all = rows();
    const from = all.indexOf(row);
    const to = e.key === 'ArrowUp' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= all.length) return;
    focusAfterRender = handle.dataset.itemId;
    onMove(from, to, handle.dataset.itemId);
  };

  const onCancel = () => {
    drag = null;
    clearMarks();
  };

  list.addEventListener('pointerdown', onPointerDown);
  list.addEventListener('pointermove', onPointerMove);
  list.addEventListener('pointerup', onPointerUp);
  list.addEventListener('pointercancel', onCancel);
  list.addEventListener('keydown', onKeyDown);
  return () => {
    list.removeEventListener('pointerdown', onPointerDown);
    list.removeEventListener('pointermove', onPointerMove);
    list.removeEventListener('pointerup', onPointerUp);
    list.removeEventListener('pointercancel', onCancel);
    list.removeEventListener('keydown', onKeyDown);
  };
}

/** Material "drag indicator" icon path. */
export const DRAG_ICON =
  'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z';
