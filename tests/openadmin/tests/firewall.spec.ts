import { test, expect } from '@playwright/test';

function randomIp() {
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 256)
  ).join('.');
}


test('test firewall gui', async ({ page }) => {
  const ip = randomIp();

  await page.goto(`/security/firewall`);
  await expect(page).toHaveURL(/security\/firewall/);

  const frame = page.frameLocator('iframe[name="myiframe"]');

  await expect(frame.getByText('enabled and running')).toBeVisible();

  console.log(`CSF perl GUI is working`);
});


test('whitelist an ip address', async ({ page }) => {
  const ip = randomIp();

  await page.goto(`/security/firewall`);
  await expect(page).toHaveURL(/security\/firewall/);

  const frame = page.frameLocator('iframe[name="myiframe"]');

  const allowIpInput = frame.locator('#allowip');
  await expect(allowIpInput).toBeVisible();

  await allowIpInput.fill(ip);

  await frame.getByRole('button', { name: 'Quick Allow' }).click();
  await expect(frame.getByText('done')).toBeVisible();

  console.log(`Whitelisted IP: ${ip}`);
});
