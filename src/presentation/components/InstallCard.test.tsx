import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallCard } from './InstallCard';

it('shows the Home Screen steps and dismisses', async () => {
  const onDismiss = vi.fn();
  render(<InstallCard onDismiss={onDismiss} />);

  expect(screen.getByRole('heading', { name: 'Keep TEMPO one tap away.' })).toBeInTheDocument();
  expect(screen.getByText('Open TEMPO in Safari.')).toBeInTheDocument();
  expect(screen.getByText('Tap Add to Home Screen.')).toBeInTheDocument();
  expect(screen.getByText('Tap Add.')).toBeInTheDocument();
  expect(screen.getByText('Open from the Home Screen for the full app.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
