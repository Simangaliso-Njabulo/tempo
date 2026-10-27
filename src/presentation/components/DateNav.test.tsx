import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateNav } from './DateNav';

it('steps one day back and forward and jumps to today', async () => {
  const onChange = vi.fn();
  render(<DateNav date="2026-10-24" today="2026-10-26" onChange={onChange} />);

  await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-10-23');

  await userEvent.click(screen.getByRole('button', { name: 'Next day' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-10-25');

  await userEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-10-26');
});

it('cannot move past today and ignores unparseable dates', () => {
  const onChange = vi.fn();
  render(<DateNav date="2026-10-26" today="2026-10-26" onChange={onChange} />);

  expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();

  const input = screen.getByLabelText('Date', { selector: 'input' });
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.change(input, { target: { value: 'not-a-date' } });
  expect(onChange).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: '2026-10-20' } });
  expect(onChange).toHaveBeenCalledWith('2026-10-20');
});
