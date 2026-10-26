import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the timeline, tray, and day navigation', async () => {
  render(<App />);

  expect(screen.getByText('TEMPO')).toBeInTheDocument();
  expect(screen.getByLabelText('Brain dump')).toBeInTheDocument();
  expect(screen.getByLabelText('Task tray')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Date' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();

  // Let the live query open the database before the test unmounts.
  expect(await screen.findByText(/Nothing waiting/)).toBeInTheDocument();
});
