import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

export function AppShell({ header, children, tray }: { header: ReactNode; children: ReactNode; tray?: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>{header}</header>
      <main className={styles.main}>{children}</main>
      {tray ? <div className={styles.tray}>{tray}</div> : null}
    </div>
  );
}
