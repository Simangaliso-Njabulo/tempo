import { useEffect } from 'react';

/**
 * Publishes the visual viewport height as a CSS variable so the shell shrinks
 * with the iOS software keyboard. Written through the CSSOM, never a style
 * attribute, to keep `style-src 'self'` intact.
 */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const apply = () => {
      document.documentElement.style.setProperty('--tempo-visual-height', `${viewport.height}px`);
    };
    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
      document.documentElement.style.removeProperty('--tempo-visual-height');
    };
  }, []);
}
