import { createContext, useContext, type ReactNode } from 'react';
import type { AppServices } from '../../application/services';

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const value = useContext(ServicesContext);
  if (!value) throw new Error('ServicesProvider is missing');
  return value;
}
