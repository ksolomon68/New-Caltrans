/**
 * ModalTrap — WCAG 2.1 AA Compliant Modal Utility
 * 
 * Usage:
 *   ModalTrap.open('myModalId');   // opens, traps focus, announces to screen readers
 *   ModalTrap.close('myModalId');  // closes, restores focus to trigger element
 * 
 * The modal element MUST have:
 *   role="dialog"
 *   aria-modal="true"
 *   aria-labelledby="[id-of-heading]" OR aria-label="[description]"
 */
const ModalTrap = (() => {
    let _trigger = null;          // the element that opened the modal (to restore focus)
    let _currentModal = null;
    let _boundKeyDown = null;

    const FOCUSABLE = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    function getFocusable(el) {
        return [...el.querySelectorAll(FOCUSABLE)].filter(
            node => !node.hasAttribute('hidden') && node.offsetParent !== null
        );
    }

    function trapFocus(e) {
        if (!_currentModal) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;

        const focusable = getFocusable(_currentModal);
        if (!focusable.length) { e.preventDefault(); return; }

        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
    }

    function open(modalIdOrEl, triggerEl) {
        const modal = typeof modalIdOrEl === 'string'
            ? document.getElementById(modalIdOrEl)
            : modalIdOrEl;
        if (!modal) return;

        _trigger = triggerEl || document.activeElement;
        _currentModal = modal;

        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        document.body.setAttribute('aria-hidden', 'false'); // body should not be hidden itself

        // Focus first focusable element inside modal
        requestAnimationFrame(() => {
            const focusable = getFocusable(modal);
            if (focusable.length) focusable[0].focus();
        });

        _boundKeyDown = trapFocus.bind(null);
        document.addEventListener('keydown', _boundKeyDown);

        // Click outside to close
        modal.addEventListener('click', _outsideClick);
    }

    function _outsideClick(e) {
        if (e.target === _currentModal) close();
    }

    function close(modalIdOrEl) {
        const modal = (modalIdOrEl && typeof modalIdOrEl === 'string')
            ? document.getElementById(modalIdOrEl)
            : (_currentModal || (typeof modalIdOrEl === 'object' ? modalIdOrEl : null));
        if (!modal) return;

        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        if (_boundKeyDown) {
            document.removeEventListener('keydown', _boundKeyDown);
            _boundKeyDown = null;
        }
        modal.removeEventListener('click', _outsideClick);

        // Restore focus to the element that triggered the modal
        if (_trigger && typeof _trigger.focus === 'function') {
            _trigger.focus();
        }
        _trigger = null;
        _currentModal = null;
    }

    return { open, close };
})();

window.ModalTrap = ModalTrap;
