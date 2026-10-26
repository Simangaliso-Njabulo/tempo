import { renderHook } from '@testing-library/react';
import { useMidnight } from './use-midnight';

it('rolls over once and waits for a sheet to close before advancing', () => {
  const onRollover = vi.fn();
  const onAdvance = vi.fn();
  const { rerender } = renderHook((props) => useMidnight(props), {
    initialProps: {
      today: '2026-10-25',
      viewingDate: '2026-10-25',
      blocked: true,
      onRollover,
      onAdvance,
    },
  });

  rerender({
    today: '2026-10-26',
    viewingDate: '2026-10-25',
    blocked: true,
    onRollover,
    onAdvance,
  });
  expect(onRollover).toHaveBeenCalledWith('2026-10-26');
  expect(onAdvance).not.toHaveBeenCalled();

  rerender({
    today: '2026-10-26',
    viewingDate: '2026-10-25',
    blocked: false,
    onRollover,
    onAdvance,
  });
  expect(onAdvance).toHaveBeenCalledWith('2026-10-26');

  rerender({
    today: '2026-10-26',
    viewingDate: '2026-10-26',
    blocked: false,
    onRollover,
    onAdvance,
  });
  expect(onRollover).toHaveBeenCalledTimes(1);
  expect(onAdvance).toHaveBeenCalledTimes(1);
});

it('does not advance a day the user is no longer viewing', () => {
  const onRollover = vi.fn();
  const onAdvance = vi.fn();
  const { rerender } = renderHook((props) => useMidnight(props), {
    initialProps: {
      today: '2026-10-25',
      viewingDate: '2026-10-25',
      blocked: true,
      onRollover,
      onAdvance,
    },
  });

  rerender({
    today: '2026-10-26',
    viewingDate: '2026-10-24',
    blocked: false,
    onRollover,
    onAdvance,
  });

  expect(onRollover).toHaveBeenCalledWith('2026-10-26');
  expect(onAdvance).not.toHaveBeenCalled();
});
