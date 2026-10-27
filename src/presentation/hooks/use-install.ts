import { useMemo } from 'react';

export function useInstall(input: {
  settingsDismissed: boolean;
  standalone: boolean;
  placedBlocks: number;
}) {
  const { settingsDismissed, standalone, placedBlocks } = input;
  return useMemo(() => {
    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // D-021: never on first launch and never before the second real plan.
    return { show: ios && !standalone && !settingsDismissed && placedBlocks >= 2 };
  }, [settingsDismissed, standalone, placedBlocks]);
}
