import { useMemo } from 'react';

export function useInstall(input: { settingsDismissed: boolean; standalone: boolean }) {
  const { settingsDismissed, standalone } = input;
  return useMemo(() => {
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return { show: ios && !standalone && !settingsDismissed };
  }, [settingsDismissed, standalone]);
}
