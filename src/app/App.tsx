import { useMemo } from 'react';
import { AppShell } from '../presentation/components/AppShell';
import { createContainer } from './container';
import { Providers } from './providers';
import styles from './App.module.css';

function Screen() {
  return (
    <AppShell header={<strong>TEMPO</strong>}>
      <p className={styles.lead}>Plan the day, then let it move.</p>
    </AppShell>
  );
}

export function App() {
  const services = useMemo(() => createContainer(), []);
  return (
    <Providers services={services}>
      <Screen />
    </Providers>
  );
}
