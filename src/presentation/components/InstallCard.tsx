import { useState } from 'react';
import { Sheet } from './Sheet';
import sheetStyles from './Sheet.module.css';
import styles from './InstallCard.module.css';

/**
 * A quiet install hint in the tray footer.
 *
 * D-021 and the feel contract ask for a dismissible line, not a card that
 * takes the day away: tapping it opens the exact iOS 26 steps in a sheet.
 */
export function InstallCard({ onDismiss }: { onDismiss: () => void }) {
  const [open, setOpen] = useState(false);

  const dismiss = () => {
    setOpen(false);
    onDismiss();
  };

  return (
    <>
      <div className={styles.card}>
        <button type="button" className={styles.open} onClick={() => setOpen(true)}>
          <span className={styles.title}>Keep TEMPO one tap away.</span>
          <span className={styles.copy}>Safari → Share → Add to Home Screen.</span>
        </button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss install tip"
        >
          ×
        </button>
      </div>

      <Sheet
        open={open}
        title="Keep TEMPO one tap away."
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className={sheetStyles.button} onClick={() => setOpen(false)}>
              Close
            </button>
            <button type="button" className={sheetStyles.quiet} onClick={dismiss}>
              Don't show again
            </button>
          </>
        }
      >
        <p className={sheetStyles.hint}>
          TEMPO works best from your Home Screen. It opens full screen and keeps your plan on this
          device.
        </p>
        <ol className={sheetStyles.steps}>
          <li>Open TEMPO in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Leave “Open as Web App” on.</li>
          <li>Tap Add.</li>
        </ol>
        <p className={sheetStyles.hint}>Open from the Home Screen for the full app.</p>
      </Sheet>
    </>
  );
}
