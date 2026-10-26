import { useCallback, useState } from 'react';

/**
 * Test-only stand-in for `virtual:pwa-register/react`. Vitest does not run the
 * PWA plugin, so the virtual module is aliased to this module in
 * `vitest.config.ts`. Registration never happens in unit tests.
 */
export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateServiceWorker = useCallback(() => Promise.resolve(), []);
  return { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker };
}
