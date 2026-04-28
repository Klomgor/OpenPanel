import { test, expect } from '@playwright/test';

async function navigateToAutoInstaller(page: any) {
  await page.goto(`/auto-installer`);
  await expect(page).toHaveURL(/auto-installer/);
}
async function navigateToWordpress(page: any) {
  await page.goto(`/wordpress`);
  await expect(page).toHaveURL(/wordpress/);
}

// ACCESS
test('access auto installer', async ({ page }) => {
  await navigateToAutoInstaller(page);
  await expect(page.locator('body'))
    .toContainText(/Quickly install a variety/i, { timeout: 20000 });
  console.log('autoinstall page');
});


test('install wordpress', async ({ page }) => {
	
  await navigateToAutoInstaller(page);
  const installLink = page.getByRole('link', { name: /Install WordPress/i });
  await expect(installLink).toBeVisible();
  await installLink.click();
  await expect(page).toHaveURL(/wordpress\/install/);
  await page.getByRole('textbox', { name: 'Website name:' }).fill('rasa');

  // await page.getByLabel('Domain:').selectOption('12'); // TODO: dynamic ID
	await page.getByLabel('Domain:').evaluate((select: HTMLSelectElement) => {
	  const option = Array.from(select.options).find(o => !o.disabled);
	  if (option) select.value = option.value;
	});
	
  await page.getByRole('textbox', { name: 'Admin Username:' }).fill('rasa');
  await page.getByRole('textbox', { name: 'Admin Password:' }).fill('rasa123');
  await page.getByRole('button', { name: 'Start Installation' }).click();
await expect(page.getByText(/WordPress installation completed/i)).toBeVisible({ timeout: 20000 });

await navigateToWordpress(page);
await expect(page.getByText('wp2.jecmenica.rs', { exact: true })).toBeVisible();

  console.log('wordpress created');
});
