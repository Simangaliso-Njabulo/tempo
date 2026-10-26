import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateToast } from './UpdateToast';

const state = vi.hoisted(() => ({
  needRefresh: true,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [state.needRefresh, state.setNeedRefresh],
    updateServiceWorker: state.updateServiceWorker,
  }),
}));

beforeEach(() => {
  state.needRefresh = true;
  state.setNeedRefresh.mockReset();
  state.updateServiceWorker.mockReset();
  document.body.replaceChildren();
});

it('waits for the user before reloading', async () => {
  const user = userEvent.setup();
  render(<UpdateToast />);

  expect(screen.getByText('New version ready.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reload' }));
  expect(state.updateServiceWorker).toHaveBeenCalledWith(true);
});

it('renders nothing when no update is waiting', () => {
  state.needRefresh = false;
  render(<UpdateToast />);
  expect(screen.queryByText('New version ready.')).not.toBeInTheDocument();
});

it('stays hidden while a field has focus', async () => {
  const user = userEvent.setup();
  render(
    <>
      <input aria-label="Task title" />
      <UpdateToast />
    </>,
  );

  await user.click(screen.getByLabelText('Task title'));
  expect(screen.queryByText('New version ready.')).not.toBeInTheDocument();

  act(() => {
    screen.getByLabelText('Task title').blur();
  });
  expect(screen.getByText('New version ready.')).toBeInTheDocument();
});

it('stays hidden behind an open sheet', async () => {
  render(<UpdateToast />);
  expect(screen.getByText('New version ready.')).toBeInTheDocument();

  act(() => {
    const dialog = document.createElement('section');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
  });
  await waitFor(() => expect(screen.queryByText('New version ready.')).not.toBeInTheDocument());
});
