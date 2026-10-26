import type { ReactNode } from 'react';
import { ServicesProvider, type Services } from '../presentation/providers/services';

export function Providers({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesProvider services={services}>{children}</ServicesProvider>;
}
