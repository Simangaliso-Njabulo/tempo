import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { addTask } from './helpers';

test('export, reset, and import restores the local day', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Backup me');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Data and backup' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Plain JSON' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Backup was not written');
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup.app).toBe('tempo');
  expect(backup.schemaVersion).toBe(1);

  await page.getByRole('button', { name: 'Reset all data' }).click();
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByRole('button', { name: 'Backup me', exact: true })).toBeHidden();

  await page.getByLabel('Import backup').setInputFiles(path);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByRole('button', { name: 'Replace data' }).click();
  await expect(page.getByText(/Imported/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByRole('button', { name: 'Backup me', exact: true })).toBeVisible();
});
