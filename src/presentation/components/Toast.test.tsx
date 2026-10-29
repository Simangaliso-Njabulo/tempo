import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Probe({ onAction }: { onAction: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.show('Shifted 4 blocks.', { label: 'Undo', onAction })}
    >
      Show
    </button>
  );
}

function QueueProbe() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast.show('First.');
        toast.show('Second.');
      }}
    >
      Show two
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

it('dismisses itself after six seconds', () => {
  vi.useFakeTimers();
  try {
    render(
      <ToastProvider>
        <Probe onAction={() => undefined} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    act(() => {
      vi.advanceTimersByTime(5_999);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Shifted 4 blocks.');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('queues a second toast instead of replacing the first', () => {
  vi.useFakeTimers();
  try {
    render(
      <ToastProvider>
        <QueueProbe />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show two' }));
    expect(screen.getByRole('status')).toHaveTextContent('First.');
    expect(screen.queryByText('Second.')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Second.');

    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
