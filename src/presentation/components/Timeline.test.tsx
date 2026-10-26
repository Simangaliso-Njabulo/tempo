import { fireEvent, render, screen } from '@testing-library/react';
import { createBlock } from '../../domain/entities/block';
import { formatDuration, formatTime } from '../utils/format-time';
import { Timeline } from './Timeline';

const noop = () => undefined;

function blockInput(overrides: Partial<Parameters<typeof createBlock>[0]> = {}) {
  return createBlock({
    id: 'b1',
    date: '2026-10-25',
    startMin: 540,
    durationMin: 45,
    kind: 'task',
    title: 'Draft',
    now: 1,
    ...overrides,
  });
}

it('formats exact times and durations', () => {
  expect(formatTime(540, '24h')).toBe('09:00');
  expect(formatTime(0, '24h')).toBe('00:00');
  expect(formatDuration(45)).toBe('45 min');
  expect(formatDuration(60)).toBe('1h');
  expect(formatDuration(90)).toBe('1h 30m');
});

it('renders a block at its true position with a readable label', () => {
  const block = blockInput();
  render(
    <Timeline
      blocks={[block]}
      nowMin={600}
      timeFormat="24h"
      onOpen={noop}
      onPointerDown={noop}
      onPointerMove={noop}
      onPointerUp={noop}
    />,
  );

  const button = screen.getByRole('button', { name: 'Draft, 09:00, 45 min' });
  expect(button).toBeInTheDocument();
  expect(button.style.top).toBe('792px');
  expect(button.style.height).toBe('64px');
  expect(screen.getByRole('separator', { name: 'Current time' }).style.top).toBe('880px');
});

it('opens a block by click and keyboard', () => {
  const onOpen = vi.fn();
  render(
    <Timeline
      blocks={[blockInput()]}
      nowMin={600}
      timeFormat="24h"
      onOpen={onOpen}
      onPointerDown={noop}
      onPointerMove={noop}
      onPointerUp={noop}
    />,
  );

  const button = screen.getByRole('button', { name: /Draft/ });
  fireEvent.click(button);
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.keyDown(button, { key: ' ' });
  expect(onOpen).toHaveBeenCalledTimes(3);
});

it('keeps a 22 px body and a 44 pt hit area for a compact block', () => {
  render(
    <Timeline
      blocks={[blockInput({ id: 'b2', title: 'Quick', durationMin: 15 })]}
      nowMin={600}
      timeFormat="24h"
      onOpen={noop}
      onPointerDown={noop}
      onPointerMove={noop}
      onPointerUp={noop}
    />,
  );

  const button = screen.getByRole('button', { name: 'Quick, 09:00, 15 min' });
  expect(button.style.height).toBe('44px');
  expect(button.style.top).toBe('781px');

  const body = button.firstElementChild as HTMLElement;
  expect(body.style.height).toBe('22px');
  expect(body.style.top).toBe('11px');
});

it('moves a colliding compact block to a side lane with a leader line', () => {
  render(
    <Timeline
      blocks={[
        blockInput({ id: 'b3', title: 'First', startMin: 540, durationMin: 15 }),
        blockInput({ id: 'b4', title: 'Second', startMin: 555, durationMin: 15 }),
      ]}
      nowMin={600}
      timeFormat="24h"
      onOpen={noop}
      onPointerDown={noop}
      onPointerMove={noop}
      onPointerUp={noop}
    />,
  );

  const first = screen.getByRole('button', { name: 'First, 09:00, 15 min' });
  const second = screen.getByRole('button', { name: 'Second, 09:15, 15 min' });
  expect(first.style.left).toBe('64px');
  expect(second.style.left).toBe('116px');

  const leader = second.querySelector('span');
  expect(leader).toBeInTheDocument();
  expect((leader as HTMLElement).style.width).toBe('52px');
  expect((leader as HTMLElement).style.left).toBe('-52px');
  expect((leader as HTMLElement).style.top).toBe('11px');
});
