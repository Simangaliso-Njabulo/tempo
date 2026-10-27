import { configure } from '@testing-library/dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTempoDb } from '../infrastructure/db/tempo-db';
import { App } from './App';

/**
 * Integration level: the real App, container, Dexie schema, and IndexedDB.
 * Only the platform edges (service worker registration) are stubbed.
 */

let user: ReturnType<typeof userEvent.setup>;

/**
 * These flows run against real IndexedDB. Five seconds is plenty for one test
 * on its own, but when the whole suite runs in parallel a Dexie-backed render
 * can wait behind other files, so give the integration level a wider budget
 * instead of making the assertions weaker.
 */
const integrationTest = (name: string, run: () => Promise<void>) => it(name, run, 20_000);

// A real IndexedDB write plus a live-query repaint can take longer than the
// one-second default while other test files compete for the CPU.
configure({ asyncUtilTimeout: 3_000 });

async function clearDatabase() {
  const db = createTempoDb();
  await db.open();
  await Promise.all([
    db.tasks.clear(),
    db.blocks.clear(),
    db.routines.clear(),
    db.routineExceptions.clear(),
    db.settings.clear(),
    db.meta.clear(),
  ]);
  db.close();
}

async function addTask(title: string) {
  await user.type(screen.getByLabelText('Brain dump'), `${title}{Enter}`);
  await screen.findByRole('button', { name: title });
}

async function placeTask(title: string, start: string) {
  await user.click(screen.getByRole('button', { name: `Place ${title}` }));
  const dialog = await screen.findByRole('dialog', { name: 'Place task' });
  fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: start } });
  await user.click(within(dialog).getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

async function addBlock(kind: 'Focus' | 'Break', title: string, start: string) {
  await user.click(screen.getByRole('button', { name: 'Add block' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add block' });
  await user.click(within(dialog).getByRole('tab', { name: kind }));
  const titleInput = within(dialog).getByLabelText('Title');
  // Choosing the Break tab pre-fills the title, so replace rather than append.
  await user.clear(titleInput);
  await user.type(titleInput, title);
  fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: start } });
  await user.click(within(dialog).getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

function blockNamed(pattern: RegExp) {
  return screen.getByRole('button', { name: pattern });
}

beforeEach(async () => {
  // Only `Date` is frozen: Dexie, user-event, and Testing Library all need real
  // timers, so faking them would deadlock every `findBy*` wait.
  vi.useFakeTimers({ now: new Date('2026-10-25T08:00:00'), toFake: ['Date'] });
  await clearDatabase();
  user = userEvent.setup();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.useRealTimers();
});

integrationTest('adds a task, places it on the timeline, and undoes the placement', async () => {
  render(<App />);
  await addTask('Write the brief');
  await placeTask('Write the brief', '09:00');

  await waitFor(() => expect(blockNamed(/Task Write the brief/)).toBeInTheDocument());

  await user.click(screen.getByRole('button', { name: 'Undo' }));

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /Task Write the brief/ })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('button', { name: 'Write the brief' })).toBeInTheDocument();
});

integrationTest('completes a block, reopens it, resizes it, moves it, and deletes it', async () => {
  render(<App />);
  await addTask('Deep work');
  await placeTask('Deep work', '09:00');

  await user.click(await screen.findByRole('button', { name: /Task Deep work/ }));
  let dialog = await screen.findByRole('dialog', { name: 'Block' });
  await user.click(within(dialog).getByRole('button', { name: 'Complete' }));

  await waitFor(() =>
    expect(blockNamed(/Task Deep work.*done/)).toBeInTheDocument(),
  );

  await user.click(blockNamed(/Task Deep work/));
  dialog = await screen.findByRole('dialog', { name: 'Block' });
  await user.click(within(dialog).getByRole('button', { name: 'Reopen' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /Task Deep work.*done/ })).not.toBeInTheDocument(),
  );

  await user.click(blockNamed(/Task Deep work/));
  dialog = await screen.findByRole('dialog', { name: 'Block' });
  await user.click(within(dialog).getByRole('button', { name: '1h' }));
  await waitFor(() => expect(blockNamed(/Task Deep work.*1h/)).toBeInTheDocument());

  fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '10:30' } });
  await waitFor(() => expect(blockNamed(/Task Deep work.*10:30/)).toBeInTheDocument());

  // Moving closes the sheet, so reopen the block before deleting it.
  await user.click(blockNamed(/Task Deep work/));
  dialog = await screen.findByRole('dialog', { name: 'Block' });
  await user.click(within(dialog).getByRole('button', { name: 'Delete block' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /Task Deep work/ })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('button', { name: 'Deep work' })).toBeInTheDocument();
});

integrationTest('adds focus and break blocks without a task', async () => {
  render(<App />);

  await addBlock('Focus', 'Draft the deck', '09:00');
  await waitFor(() => expect(blockNamed(/Focus Draft the deck/)).toBeInTheDocument());

  await addBlock('Break', 'Coffee', '11:00');
  await waitFor(() => expect(blockNamed(/Break Coffee/)).toBeInTheDocument());

  expect(screen.getByText(/2 planned/)).toBeInTheDocument();
  expect(screen.getByText(/1h/)).toBeInTheDocument();
});

integrationTest('persists the theme and time format from settings', async () => {
  render(<App />);
  await addTask('Deep work');
  await placeTask('Deep work', '09:00');

  await user.click(screen.getByRole('button', { name: 'Settings' }));
  const dialog = await screen.findByRole('dialog', { name: 'Settings' });
  await user.click(within(dialog).getByRole('button', { name: 'Light' }));
  await user.click(within(dialog).getByRole('button', { name: '24h' }));
  await user.click(within(dialog).getByRole('button', { name: 'Done' }));

  await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  await waitFor(() => expect(blockNamed(/Task Deep work 09:00/)).toBeInTheDocument());
});

integrationTest('keeps the install hint off until two blocks are planned, then dismisses it', async () => {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
  });

  try {
    render(<App />);
    await addBlock('Focus', 'First block', '09:00');
    await waitFor(() => expect(blockNamed(/Focus First block/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Keep TEMPO one tap away/ })).not.toBeInTheDocument();

    await addBlock('Focus', 'Second block', '11:00');
    const hint = await screen.findByRole('button', { name: /Keep TEMPO one tap away/ });

    await user.click(within(screen.getByRole('region', { name: 'Task tray' })).getByRole('button', { name: 'Dismiss install tip' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: hint.textContent ?? '' })).not.toBeInTheDocument(),
    );
  } finally {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original });
  }
});

integrationTest('closes the day and keeps an unfinished task for tomorrow', async () => {
  vi.setSystemTime(new Date('2026-10-25T19:00:00'));
  render(<App />);

  await addTask('Unfinished draft');
  await placeTask('Unfinished draft', '20:00');

  await user.click(screen.getByRole('button', { name: 'Close day' }));
  const dialog = await screen.findByRole('dialog', { name: 'Close the day' });
  await user.click(within(dialog).getByRole('button', { name: 'Keep for tomorrow' }));

  expect(await screen.findByText('Kept for tomorrow.')).toBeInTheDocument();
  // The kept block leaves today, so the sheet reports the move and empties.
  expect(within(dialog).getByText(/1 moved/)).toBeInTheDocument();
  expect(within(dialog).getByText('Everything is settled. Close the day.')).toBeInTheDocument();
});

integrationTest('resets every task and block from the data sheet', async () => {
  render(<App />);
  await addTask('Throwaway');

  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Data and backup' }));
  await user.click(await screen.findByRole('button', { name: 'Reset all data' }));
  await user.click(await screen.findByRole('button', { name: 'Reset everything' }));

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Throwaway' })).not.toBeInTheDocument(),
  );
});
