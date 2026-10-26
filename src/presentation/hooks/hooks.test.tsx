import { act, renderHook } from '@testing-library/react';
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
