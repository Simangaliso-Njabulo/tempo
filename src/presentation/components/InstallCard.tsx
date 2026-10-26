import styles from './InstallCard.module.css';

export function InstallCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className={styles.card} aria-labelledby="install-title">
      <h2 id="install-title" className={styles.title}>
        Keep TEMPO one tap away.
      </h2>
      <p className={styles.copy}>
        TEMPO works best from your Home Screen. It opens full screen and keeps your plan on this iPhone.
      </p>
      <ol className={styles.steps}>
        <li>Open TEMPO in Safari.</li>
        <li>Tap the Share button.</li>
        <li>Tap Add to Home Screen.</li>
        <li>Tap Add.</li>
      </ol>
      <p className={styles.copy}>Open from the Home Screen for the full app.</p>
      <button type="button" className={styles.dismiss} onClick={onDismiss}>
        Not now
      </button>
    </section>
  );
}
