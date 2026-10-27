import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet';

it('renders a scoped dialog and closes from the button', async () => {
  const onClose = vi.fn();
  render(
    <Sheet open title="Example" onClose={onClose} footer={<button type="button">Save</button>}>
      <p>Inside</p>
    </Sheet>,
  );

  expect(screen.getByRole('dialog', { name: 'Example' })).toBeInTheDocument();
  expect(screen.getByText('Inside')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('closes on Escape and on a backdrop press but not on a panel press', () => {
  const onClose = vi.fn();
  render(
    <Sheet open title="Example" onClose={onClose}>
      <p>Inside</p>
    </Sheet>,
  );

  const dialog = screen.getByRole('dialog', { name: 'Example' });
  fireEvent.pointerDown(dialog);
  expect(onClose).not.toHaveBeenCalled();

  const backdrop = dialog.parentElement;
  expect(backdrop).not.toBeNull();
  if (backdrop) fireEvent.pointerDown(backdrop);
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('renders nothing while closed', () => {
  render(
    <Sheet open={false} title="Example" onClose={() => undefined}>
      <p>Inside</p>
    </Sheet>,
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('traps Tab and Shift+Tab inside the panel', () => {
  render(
    <Sheet open title="Example" onClose={() => undefined} footer={<button type="button">Save</button>}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </Sheet>,
  );

  const close = screen.getByRole('button', { name: 'Close' });
  const save = screen.getByRole('button', { name: 'Save' });

  save.focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(close).toHaveFocus();

  close.focus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
});

it('focuses the panel on open and returns focus on close', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open sheet';
  document.body.append(trigger);
  trigger.focus();

  const { rerender } = render(
    <Sheet open title="Example" onClose={() => undefined}>
      <p>Inside</p>
    </Sheet>,
  );
  expect(screen.getByRole('dialog', { name: 'Example' })).toHaveFocus();

  rerender(
    <Sheet open={false} title="Example" onClose={() => undefined}>
      <p>Inside</p>
    </Sheet>,
  );
  expect(trigger).toHaveFocus();
  trigger.remove();
});
