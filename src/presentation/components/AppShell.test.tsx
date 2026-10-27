import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

it('offers a skip link to the timeline before the header', () => {
  render(
    <AppShell header={<div>Header content</div>}>
      <div>Main content</div>
    </AppShell>,
  );

  const skip = screen.getByRole('link', { name: 'Skip to timeline' });
  expect(skip).toHaveAttribute('href', '#timeline');
  expect(screen.getByRole('banner')).toContainElement(screen.getByText('Header content'));
});
