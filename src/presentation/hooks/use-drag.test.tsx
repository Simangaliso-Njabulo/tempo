import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createBlock, type Block } from '../../domain/entities/block';
import { useDrag } from './use-drag';

function makeBlock(overrides: Partial<Parameters<typeof createBlock>[0]> = {}): Block {
  return createBlock({
    id: 'moving',
    date: '2026-10-25',
    startMin: 660,
    durationMin: 30,
    kind: 'task',
    title: 'Moving',
    now: 1,
    ...overrides,
  });
}

function pointer(clientY: number) {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: { setPointerCapture: vi.fn() },
    pointerId: 1,
    clientY,
  } as unknown as ReactPointerEvent;
}

function setup(blocks: Block[]) {
  const onCommit = vi.fn();
  const { result } = renderHook(() =>
    useDrag({ blocks, hourHeight: 88, minStartMin: 0, onCommit }),
  );
  return { onCommit, result };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('renders at most once per frame, from the latest finger position', () => {
  const block = makeBlock();
  const { result } = setup([block]);

  act(() => result.current.start(pointer(200), block));
  act(() => {
    result.current.move(pointer(240));
    result.current.move(pointer(288));
    result.current.move(pointer(376));
  });
  expect(result.current.drag?.targetStartMin).toBe(660);

  act(() => {
    vi.advanceTimersByTime(16);
  });
  // 176 px down at 88 px per hour is two hours; the last move wins.
  expect(result.current.drag?.targetStartMin).toBe(780);
});

it('commits the pending position once at pointer up and clears the drag', () => {
  const block = makeBlock();
  const { onCommit, result } = setup([block]);

  act(() => result.current.start(pointer(200), block));
  act(() => result.current.move(pointer(288)));
  act(() => result.current.end());

  expect(onCommit).toHaveBeenCalledOnce();
  const [blockId, placement] = onCommit.mock.calls[0] as [string, { ok: boolean; movingStartMin: number }];
  expect(blockId).toBe('moving');
  expect(placement.ok).toBe(true);
  expect(placement.movingStartMin).toBe(720);
  expect(result.current.drag).toBeNull();
  expect(result.current.ghost).toBeNull();
});

it('does not create an action when the drop lands where it started', () => {
  const block = makeBlock();
  const { onCommit, result } = setup([block]);

  act(() => result.current.start(pointer(200), block));
  act(() => result.current.move(pointer(203)));
  act(() => result.current.end());

  expect(onCommit).not.toHaveBeenCalled();
});

it('previews a free landing, a shift, and a blocked drop', () => {
  const moving = makeBlock();
  const later = makeBlock({ id: 'later', startMin: 720, title: 'Later' });
  const { result } = setup([moving, later]);

  act(() => result.current.start(pointer(200), moving));
  act(() => result.current.move(pointer(200)));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect(result.current.ghost).toMatchObject({ kind: 'free', startMin: 660 });

  act(() => result.current.move(pointer(288)));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect(result.current.ghost).toMatchObject({ kind: 'shifting', shiftedCount: 1 });

  const anchored = makeBlock({
    id: 'anchor',
    startMin: 0,
    durationMin: 1440,
    anchor: true,
    title: 'Anchored',
  });
  const { result: blockedResult } = setup([moving, anchored]);
  act(() => blockedResult.current.start(pointer(200), moving));
  act(() => blockedResult.current.move(pointer(288)));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect(blockedResult.current.ghost).toMatchObject({ kind: 'blocked' });
});

it('cancels a drag without committing', () => {
  const block = makeBlock();
  const { onCommit, result } = setup([block]);

  act(() => result.current.start(pointer(200), block));
  act(() => result.current.move(pointer(288)));
  act(() => result.current.cancel());

  expect(onCommit).not.toHaveBeenCalled();
  expect(result.current.drag).toBeNull();

  act(() => {
    vi.advanceTimersByTime(32);
  });
  expect(result.current.drag).toBeNull();
});
