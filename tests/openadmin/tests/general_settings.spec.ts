import { test, expect } from '@playwright/test';

test('update proxy and test restart needed msg', async ({ page }) => {
  await page.goto(`/settings\/general/`);
  await expect(page).toHaveURL(/settings\/general/);
  await page.getByRole('textbox', { name: 'openpanel' }).fill('newlink');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await Promise.all([
    expect(page.getByText(/settings updated/i)).toBeVisible(),
    expect(page.getByText(/newlink/i)).toBeVisible(),
    expect(page.getByText(/2 services need restart/i)).toBeVisible(),
  ]);
  await page.getByRole('link', { name: 'services need restart!' }).click();
  await expect(page).toHaveURL(/services/);
  await page.getByRole('button', { name: 'Restart openpanel', exact: true }).click();
  await expect(page.getByText(/1 service needs restart/i)).toBeVisible();
  await page.getByRole('button', { name: 'Restart admin' }).click();
  await expect(page.getByText(/failed to restar/i)).toBeVisible(); //TODO better check, wait and reload!
  await page.goto(`/services/`);
  await expect(page).toHaveURL(/services/);
  await expect(page.getByText(/(need restart|needs restart|restart needed)/i)).not.toBeVisible();
});
