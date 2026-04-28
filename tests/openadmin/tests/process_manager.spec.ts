import { test, expect } from '@playwright/test';

test('search', async ({ page }) => {
  await page.goto('/server/processes');
  await expect(page).toHaveURL(/server\/processes/);

  const table = page.locator('#processes_table');
  const rows = table.locator('tbody tr:visible');
  const searchInput = page.getByPlaceholder('Search processes...');

  const getRowCount = async () => {
    const count = await rows.count();
    return count;
  };

  const initialCount = await getRowCount();

  await searchInput.fill('testinguser');
  await page.waitForTimeout(300); // for alpinejs
  await expect(rows.first()).toContainText('testinguser');
  const testingUserCount = await getRowCount();
  console.log(`\nsearch for "testinguser" -> total was: ${initialCount}, results: ${testingUserCount}`);
  expect(testingUserCount).toBeGreaterThanOrEqual(0);
  expect(testingUserCount).not.toBe(initialCount);

  await searchInput.fill('dockerd');
  await page.waitForTimeout(300);
  await expect(rows.first()).toContainText('dockerd');
  const dockerdCount = await getRowCount();
  console.log(`\nsearch for "dockerd" -> total was: ${initialCount}, results: ${dockerdCount}`);
  expect(dockerdCount).toBeGreaterThanOrEqual(0);
  expect(dockerdCount).not.toBe(initialCount);

  await expect(table).toBeVisible();
});



test('asc/desc sorting', async ({ page }) => {
  await page.goto('/server/processes');
  await expect(page).toHaveURL(/server\/processes/);

  const table = page.locator('#processes_table');

  const columns = [
    { name: 'Pid', asc: 'pid', desc: '-pid' },
    { name: 'Owner', asc: 'owner', desc: '-owner' },
    { name: 'Priority', asc: 'priority', desc: '-priority' },
    { name: 'CPU %', asc: 'cpu', desc: '-cpu' },
    { name: 'Memory %', asc: 'memory', desc: '-memory' },
    { name: 'Command', asc: 'command', desc: '-command' },
  ];

  const getValues = async (colIndex: number) =>
    table
      .locator(`tbody tr td:nth-child(${colIndex + 1})`)
      .allInnerTexts();

  const normalize = (vals: string[]) =>
    vals.map(v => v.replace(/\u00a0/g, '').trim()).filter(Boolean);

  for (const col of columns) {
    const colIndex = columns.indexOf(col);
    const header = table.locator('th', { hasText: col.name });

    await header.locator(`a[href*="sort=${col.asc}"]`).click();
    await page.waitForURL(`**sort=${col.asc}**`);

    const asc = normalize(await getValues(colIndex));
    const ascFirst = asc[0];
    const ascLast = asc[asc.length - 1];

    await header.locator(`a[href*="sort=${col.desc}"]`).click();
    await page.waitForURL(`**sort=${col.desc}**`);

    const desc = normalize(await getValues(colIndex));
    const descFirst = desc[0];
    const descLast = desc[desc.length - 1];

    console.log(`\n[${col.name}] | ASC  -> first: ${ascFirst}, last: ${ascLast} | DESC -> first: ${descFirst}, last: ${descLast}`);

    expect(asc.length).toBeGreaterThan(0);
    expect(desc.length).toBeGreaterThan(0);

    expect(ascFirst).not.toBe(descFirst);
    expect(ascLast).not.toBe(descLast);
  }
});



test('strace', async ({ page }) => {
  await page.goto('/server/processes');

  const rows = page.locator('#processes_table tbody tr:visible');
  const userRow = rows.filter({ hasText: 'testinguser' }).first();
  await userRow.getByRole('link', { name: 'Trace' }).click();
  await expect(page).toHaveURL(/\/server\/processes\/\d+\/strace/);
  await expect(page.locator('body')).toContainText(
    /strace:\s*Process\s+\d+\s+attached/
  );
});



test('kill', async ({ page }) => {
  await page.goto('/server/processes');

  const userRow = page.locator('#processes_table tr', { hasText: 'testinguser' }).first();
  
  const pidCell = userRow.locator('td').first();
  const pid = (await pidCell.innerText()).trim();

  await userRow.getByRole('link', { name: 'Kill' }).click();

  await expect(page.locator('body')).toContainText(
    new RegExp(`Process with PID ${pid} killed successfully`)
  );

  await expect(page.locator('#processes_table')).not.toContainText(pid);
});
