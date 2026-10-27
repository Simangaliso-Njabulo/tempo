import { render, screen } from '@testing-library/react';
import type { DragGhostState } from '../hooks/use-drag';
import { DragGhost } from './DragGhost';

function ghost(overrides: Partial<DragGhostState> = {}): DragGhostState {
  return { kind: 'free', startMin: 540, durationMin: 45, shiftedCount: 0, ...overrides };
}

it('previews the landing time and duration', () => {
  render(<DragGhost ghost={ghost()} timeFormat="24h" />);

  expect(screen.getByText('09:00 – 09:45')).toBeInTheDocument();
  expect(screen.getByText('45 min')).toBeInTheDocument();
  expect(screen.getByText('09:00 – 09:45').closest('[data-ghost-kind]')).toHaveAttribute(
    'data-ghost-kind',
    'free',
  );
});

it('names the required shift count', () => {
  render(<DragGhost ghost={ghost({ kind: 'shifting', shiftedCount: 2 })} timeFormat="24h" />);

  expect(screen.getByText('Shift 2 blocks · 09:00')).toBeInTheDocument();
});

it('names an anchored snap and a blocked drop', () => {
  const { rerender } = render(<DragGhost ghost={ghost({ kind: 'anchored' })} timeFormat="24h" />);
  expect(screen.getByText('Anchored block · 09:00')).toBeInTheDocument();

  rerender(<DragGhost ghost={ghost({ kind: 'blocked' })} timeFormat="24h" />);
  expect(screen.getByText('No room here')).toBeInTheDocument();
});

it('is decorative so the dragged block keeps its accessible name', () => {
  const { container } = render(<DragGhost ghost={ghost()} timeFormat="24h" />);

  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
});
