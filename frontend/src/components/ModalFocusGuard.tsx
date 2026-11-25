import { useEffect, useRef } from 'react';
import { getFocusableElements, getTopModalElement } from '../utils/keyboardNav';

/**
 * Global keyboard navigation guard for modal dialogs in Electron & web:
 * - Auto-focuses the first form field when a modal opens so Tab starts inside the modal.
 * - Keeps Tab / Shift+Tab cycling inside the active modal instead of escaping to background UI.
 * - Restores focus to the triggering element when the modal closes.
 */
export function ModalFocusGuard() {
  const activeModalRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const syncTopModal = () => {
      const topModal = getTopModalElement();
      if (topModal === activeModalRef.current) return;

      if (topModal) {
        if (!activeModalRef.current) {
          previousFocusRef.current = document.activeElement as HTMLElement | null;
        }
        activeModalRef.current = topModal;

        // Focus the first form input/select/textarea inside the modal (skipping header close buttons)
        requestAnimationFrame(() => {
          if (!document.body.contains(topModal)) return;
          const active = document.activeElement as HTMLElement | null;
          if (active && topModal.contains(active) && active !== topModal) return;

          const formField = topModal.querySelector<HTMLElement>(
            'form input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), ' +
            'form select:not([disabled]):not([tabindex="-1"]), ' +
            'form textarea:not([disabled]):not([tabindex="-1"]), ' +
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), ' +
            'select:not([disabled]):not([tabindex="-1"]), ' +
            'textarea:not([disabled]):not([tabindex="-1"])'
          );
          if (formField) {
            formField.focus();
            return;
          }

          const focusables = getFocusableElements(topModal);
          const firstNonClose = focusables.find((el) => {
            const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').toLowerCase();
            return !title.includes('close') && el.textContent?.trim() !== '';
          }) || focusables[0];
          firstNonClose?.focus();
        });
      } else {
        activeModalRef.current = null;
        const prev = previousFocusRef.current;
        previousFocusRef.current = null;
        if (prev && document.body.contains(prev)) {
          requestAnimationFrame(() => prev.focus());
        }
      }
    };

    const observer = new MutationObserver(syncTopModal);
    observer.observe(document.body, { childList: true, subtree: true });
    syncTopModal();

    const findModalCloseTrigger = (modal: HTMLElement): HTMLElement | null => {
      const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));

      // 1. Prefer explicit Cancel / Close action buttons (excluding submit buttons)
      const cancelOrCloseBtn = buttons.find((btn) => {
        if (btn.type === 'submit') return false;
        const txt = (btn.textContent || '').trim().toLowerCase();
        return txt === 'cancel' || txt === 'close' || txt === 'got it';
      });
      if (cancelOrCloseBtn) return cancelOrCloseBtn;

      // 2. Look for a header/corner close X button (empty text with SVG, or close/cancel aria/title)
      const headerOrCornerCloseBtn = buttons.find((btn) => {
        if (btn.type === 'submit') return false;
        const txt = (btn.textContent || '').trim();
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`.toLowerCase();
        if (/close|cancel|dismiss/.test(label)) return true;
        if (txt !== '' || !btn.querySelector('svg')) return false;
        // Ensure it's in a modal header or top-level corner, not an inline field clear button
        const inHeader = Boolean(btn.closest('.border-b, .modal-header'));
        const isCornerBtn = btn.className.includes('absolute') && (btn.className.includes('top-') || btn.className.includes('right-'));
        return inHeader || isCornerBtn;
      });
      if (headerOrCornerCloseBtn) return headerOrCornerCloseBtn;

      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let SearchableSelect close its open dropdown before closing any modal behind it
        if (document.querySelector('[data-searchable-select-dropdown="true"]')) {
          return;
        }
        const topModal = getTopModalElement();
        if (!topModal) return;
        if (topModal.hasAttribute('data-no-esc-close') || topModal.hasAttribute('data-custom-esc')) {
          return;
        }
        const closeTrigger = findModalCloseTrigger(topModal);
        if (closeTrigger) {
          e.preventDefault();
          e.stopPropagation();
          closeTrigger.click();
        }
        return;
      }

      if (e.key !== 'Tab') return;
      const topModal = getTopModalElement();
      if (!topModal) return;

      const active = document.activeElement as HTMLElement | null;
      // SearchableSelect portal handles its own Tab navigation back into the form/modal
      if (active?.closest('[data-searchable-select-dropdown="true"]')) {
        return;
      }

      const focusables = getFocusableElements(topModal);
      if (focusables.length === 0) return;

      if (!active || !topModal.contains(active)) {
        e.preventDefault();
        focusables[e.shiftKey ? focusables.length - 1 : 0].focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return null;
}
