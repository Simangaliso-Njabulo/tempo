import { useMemo } from 'react';
import { AppShell } from '../presentation/components/AppShell';
import { useServices } from '../presentation/providers/services';
import { createContainer } from './container';
import { Providers } from './providers';
import styles from './App.module.css';

function Screen() {
  const { appName } = useServices();
  return (
    <AppShell header={<strong>{appName}</strong>}>
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
