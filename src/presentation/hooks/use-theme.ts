import { useEffect } from 'react';
import type { Settings } from '../../domain/entities/settings';

const THEME_COLOR = { dark: '#05070c', light: '#f8f7f4' } as const;

export function useTheme(settings: Settings | undefined) {
  const theme = settings?.theme;
  useEffect(() => {
    if (!theme) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
