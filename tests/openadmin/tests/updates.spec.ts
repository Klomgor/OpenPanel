import { test, expect } from '@playwright/test';

test('check updates page', async ({ page, context }) => {
  await page.goto('/settings/updates');
  await expect(page).toHaveURL(/settings\/updates/);

  const versionEl = page.locator('#installed_version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  const version = versionText?.match(/(\d+\.\d+\.\d+)/)?.[1];
  expect(version).toBeTruthy();

  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();

  const options = await listbox.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(0);

  const toNum = (v: string) => v.split('.').map(Number);
  const [maj, min, pat] = toNum(version!);

  for (const opt of options) {
    const match = opt.match(/(\d+\.\d+\.\d+)/);
    if (!match) continue;
    const [oMaj, oMin, oPat] = toNum(match[1]);
    const isOlder =
      oMaj < maj ||
      (oMaj === maj && oMin < min) ||
      (oMaj === maj && oMin === min && oPat < pat);
    expect(isOlder, `${match[1]} should be older than ${version}`).toBe(true);
  }

  const firstOlderVersion = options[0].match(/(\d+\.\d+\.\d+)/)?.[1];
  if (firstOlderVersion) {
    await listbox.selectOption(firstOlderVersion);
  }
});
  

test('update notification preferences', async ({ page }) => {
  await page.goto('/settings/updates');
  await expect(page).toHaveURL(/settings\/updates/);

  const combobox = page.getByRole('combobox');
  const saveBtn = page.getByRole('button', { name: 'Save' });

  const options = ['major_only', 'minor_only', 'none', 'minor_and_major'];

  for (const option of options) {
    await combobox.selectOption(option);
    await saveBtn.click();
    await expect(page.getByText(/saved successfully/i)).toBeVisible();

    await expect(combobox).toHaveValue(option);
  }
});



test('check changelog link', async ({ page, context }) => {
  await page.goto('/settings/updates');
  await expect(page).toHaveURL(/settings\/updates/);

  const versionEl = page.locator('#latest_version');
  await expect(versionEl).toBeVisible();
  const versionText = await versionEl.textContent();
  const version = versionText?.match(/(\d+\.\d+\.\d+)/)?.[1];
  expect(version).toBeTruthy();

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'View Changelog' }).click(),
  ]);

  await newPage.waitForLoadState();

  // https://openpanel.com/docs/changelog/1.7.55/
  expect(newPage.url()).toMatch(
    new RegExp(`openpanel\\.com/docs/changelog/${version}`)
  );
});



//
