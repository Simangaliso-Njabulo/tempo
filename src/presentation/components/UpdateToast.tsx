import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdateToast.module.css';

/**
 * The only global overlay that can appear without a user action.
 *
 * It never steals focus, never reloads on its own, hides while a field has
 * focus, and hides while a sheet's modal dialog is open. Reload only happens
 * when the user taps the button.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => undefined });
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      setEditing(
        active instanceof Element &&
          active.closest('input, textarea, select, [contenteditable="true"]') !== null,
      );
    };
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  useEffect(() => {
    const check = () => setDialogOpen(document.querySelector('[aria-modal="true"]') !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    });
    return () => observer.disconnect();
  }, []);

  if (!needRefresh || editing || dialogOpen) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.text}>New version ready.</span>
      <button
        type="button"
        className={styles.action}
        onClick={() => {
          void updateServiceWorker(true);
        }}
      >
        Reload
      </button>
      <button type="button" className={styles.dismiss} onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
