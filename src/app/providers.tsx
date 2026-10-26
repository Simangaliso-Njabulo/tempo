import type { ReactNode } from 'react';
import type { AppServices } from '../application/services';
import { ServicesProvider } from '../presentation/providers/services';

export function Providers({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesProvider services={services}>{children}</ServicesProvider>;
}
