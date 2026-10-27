import { act, renderHook } from '@testing-library/react';
import { useVisualViewport } from './use-visual-viewport';

function fakeViewport(height: number) {
  const listeners = new Map<string, () => void>();
  return {
    height,
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
    fire: (type: string) => listeners.get(type)?.(),
    listeners,
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, 'visualViewport');
  document.documentElement.style.removeProperty('--tempo-visual-height');
});

it('publishes the visual viewport height and keeps it in sync', () => {
  const viewport = fakeViewport(540);
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });

  const { unmount } = renderHook(() => useVisualViewport());

  expect(document.documentElement.style.getPropertyValue('--tempo-visual-height')).toBe('540px');

  act(() => {
    viewport.height = 320;
    viewport.fire('resize');
  });
  expect(document.documentElement.style.getPropertyValue('--tempo-visual-height')).toBe('320px');

  act(() => {
    viewport.height = 300;
    viewport.fire('scroll');
  });
  expect(document.documentElement.style.getPropertyValue('--tempo-visual-height')).toBe('300px');

  unmount();
  expect(document.documentElement.style.getPropertyValue('--tempo-visual-height')).toBe('');
  expect(viewport.listeners.size).toBe(0);
});

it('does nothing when the platform has no visual viewport', () => {
  renderHook(() => useVisualViewport());
  expect(document.documentElement.style.getPropertyValue('--tempo-visual-height')).toBe('');
});
