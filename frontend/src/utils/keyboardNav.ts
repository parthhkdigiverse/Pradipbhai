const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') {
    // Keep sr-only inputs if explicitly part of a toggle switch, skip hidden inputs/containers
    if (!el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true' || el.tabIndex < 0) {
      return false;
    }
  }
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => el.tabIndex >= 0 && isElementVisible(el));
}

/**
 * Finds the top-most visible modal overlay (.fixed.inset-0) containing focusable controls, if any.
 */
export function getTopModalElement(): HTMLElement | null {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0'));
  for (let i = overlays.length - 1; i >= 0; i--) {
    const overlay = overlays[i];
    if (getComputedStyle(overlay).display !== 'none' && getFocusableElements(overlay).length > 0) {
      return overlay;
    }
  }
  return null;
}

/**
 * Moves focus to the next (+1) or previous (-1) focusable element relative to `anchorEl`
 * within its enclosing modal, form, or document.
 */
export function moveFocusRelative(anchorEl: HTMLElement | null, direction: 1 | -1): boolean {
  if (!anchorEl) return false;
  const scope: HTMLElement =
    (anchorEl.closest('.fixed.inset-0') as HTMLElement) ||
    (anchorEl.closest('form') as HTMLElement) ||
    document.body;

  const focusables = getFocusableElements(scope);
  if (focusables.length === 0) return false;

  const idx = focusables.indexOf(anchorEl);
  if (idx === -1) {
    focusables[direction === 1 ? 0 : focusables.length - 1].focus();
    return true;
  }

  let nextIdx = idx + direction;
  if (nextIdx >= focusables.length) nextIdx = 0;
  if (nextIdx < 0) nextIdx = focusables.length - 1;
  focusables[nextIdx].focus();
  return true;
}
