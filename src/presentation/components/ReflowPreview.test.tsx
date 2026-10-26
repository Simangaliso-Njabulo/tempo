import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReflowPreview } from './ReflowPreview';

it('applies or dismisses a reflow preview', async () => {
  const onApply = vi.fn();
  const onDismiss = vi.fn();
  render(<ReflowPreview count={2} onApply={onApply} onDismiss={onDismiss} />);
  expect(screen.getByText('2 blocks need to move.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await userEvent.click(screen.getByRole('button', { name: 'Keep plan' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onDismiss).toHaveBeenCalledOnce();
});

it('uses the singular and stays out of the way when nothing moves', () => {
  const { rerender } = render(<ReflowPreview count={1} onApply={vi.fn()} onDismiss={vi.fn()} />);
  expect(screen.getByText('1 block needs to move.')).toBeInTheDocument();
  rerender(<ReflowPreview count={0} onApply={vi.fn()} onDismiss={vi.fn()} />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
