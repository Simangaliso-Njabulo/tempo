import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallCard } from './InstallCard';

it('opens the Home Screen steps and can stop showing the tip', async () => {
  const onDismiss = vi.fn();
  render(<InstallCard onDismiss={onDismiss} />);

  const hint = screen.getByRole('button', { name: /Keep TEMPO one tap away/ });
  expect(hint).toBeInTheDocument();
  expect(screen.getByText('Safari → Share → Add to Home Screen.')).toBeInTheDocument();

  await userEvent.click(hint);
  expect(screen.getByRole('dialog', { name: 'Keep TEMPO one tap away.' })).toBeInTheDocument();
  expect(screen.getByText('Tap Add to Home Screen.')).toBeInTheDocument();
  expect(screen.getByText('Leave “Open as Web App” on.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: "Don't show again" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('dismisses from the footer without opening the sheet', async () => {
  const onDismiss = vi.fn();
  render(<InstallCard onDismiss={onDismiss} />);

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss install tip' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
