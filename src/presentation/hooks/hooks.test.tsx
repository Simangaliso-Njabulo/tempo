import { act, renderHook } from '@testing-library/react';
import { useInstall } from './use-install';
import { useNow } from './use-now';
import { useUndo } from './use-undo';

it('ticks the clock while the page is visible', async () => {
  vi.useFakeTimers();
  try {
    const { result } = renderHook(() => useNow(1000));
    const first = result.current.getTime();
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(result.current.getTime()).toBe(first + 1000);
  } finally {
    vi.useRealTimers();
  }
});

it('stops the interval while the page is hidden and catches up once on return', async () => {
  vi.useFakeTimers();
  let visibility: 'visible' | 'hidden' = 'visible';
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  try {
    const { result } = renderHook(() => useNow(1000));
    const first = result.current.getTime();

    visibility = 'hidden';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(result.current.getTime()).toBe(first);

    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Returning to the tab ticks immediately, so the now line is correct
    // before the next interval fires.
    expect(result.current.getTime()).toBe(first + 60_000);
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(result.current.getTime()).toBe(first + 61_000);
  } finally {
    if (descriptor) Object.defineProperty(Document.prototype, 'visibilityState', descriptor);
    delete (document as { visibilityState?: string }).visibilityState;
    vi.useRealTimers();
  }
});

it('shows the install hint only after the second planned block on iOS', () => {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
  });

  const first = renderHook(() =>
    useInstall({ settingsDismissed: false, standalone: false, placedBlocks: 1 }),
  );
  expect(first.result.current.show).toBe(false);

  const second = renderHook(() =>
    useInstall({ settingsDismissed: false, standalone: false, placedBlocks: 2 }),
  );
  expect(second.result.current.show).toBe(true);

  const dismissed = renderHook(() =>
    useInstall({ settingsDismissed: true, standalone: false, placedBlocks: 2 }),
  );
  expect(dismissed.result.current.show).toBe(false);

  const installed = renderHook(() =>
    useInstall({ settingsDismissed: false, standalone: true, placedBlocks: 2 }),
  );
  expect(installed.result.current.show).toBe(false);

  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original });
});

it('stores the last action, undoes it once, and then does nothing', async () => {
  const { result } = renderHook(() => useUndo());
  const undone = vi.fn();
  expect(result.current.canUndo).toBe(false);

  act(() => {
    result.current.push({ label: 'Move block', undo: () => Promise.resolve(undone()) });
  });
  expect(result.current.canUndo).toBe(true);
  expect(result.current.label).toBe('Move block');

  await act(async () => {
    await result.current.undo();
  });
  expect(undone).toHaveBeenCalledOnce();
  expect(result.current.canUndo).toBe(false);
  expect(result.current.label).toBeUndefined();

  await act(async () => {
    await result.current.undo();
  });
  expect(undone).toHaveBeenCalledOnce();
});
