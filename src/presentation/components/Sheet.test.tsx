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
