import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Probe({ onAction }: { onAction: () => void }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show('Shifted 4 blocks.', { label: 'Undo', onAction })}>
      Show
    </button>
  );
}

it('shows one toast with an action and runs it', () => {
  const onAction = vi.fn();
  render(
    <ToastProvider>
      <Probe onAction={onAction} />
    </ToastProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Show' }));
  expect(screen.getByRole('status')).toHaveTextContent('Shifted 4 blocks.');
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('dismisses itself after five seconds', () => {
  vi.useFakeTimers();
  try {
    render(
      <ToastProvider>
        <Probe onAction={() => undefined} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
