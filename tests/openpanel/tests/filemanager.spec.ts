import { test, expect } from '@playwright/test';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

const suffix = randomSuffix();
const FILE_NAME = `radovanfajl_${suffix}`;
const FOLDER_NAME = `radovanfolder_${suffix}`;
const TXT_FILE = `petarfajl_${suffix}.txt`;
const TXT_FILE_BAK = `petarfajl_${suffix}.txt_bak`;
const ZIP_FILE = `radozip_${suffix}`;
const ZIP_FOLDER = `radofol_${suffix}`;
const ZIP_ARCHIVE = `/rasizip_${suffix}`;
const ZIP_ARCHIVE_NAME = `rasizip_${suffix}.zip`;

async function navigateToFiles(page: any) {
  await page.goto(`/files`);
}

async function createFile(page: any, fileName: string, openAfterCreate = false) {
  await navigateToFiles(page);
  await page.getByRole('button', { name: ' New File' }).click();
  await page.getByRole('textbox', { name: 'File Name*' }).fill(fileName);
  if (openAfterCreate) {
    await page.locator('#open').check();
  }
  await page.getByRole('button', { name: 'Create' }).click();
}

async function createFolder(page: any, folderName: string) {
  await navigateToFiles(page);
  await page.getByRole('button', { name: ' New Folder' }).click();
  await page.locator('#foldername').fill(folderName);
  await page.getByRole('button', { name: 'Create' }).click();
}

async function selectItem(page: any, name: string, multiSelect = false) {
  await page.locator('#filemanager_table div').filter({ hasText: name }).click(
    multiSelect ? { modifiers: ['ControlOrMeta'] } : undefined
  );
}

async function deleteSelected(page: any, skipTrash = false) {
  await page.getByRole('button', { name: ' Delete' }).click();
  if (skipTrash) {
    await page.getByRole('checkbox', { name: 'Skip the trash and' }).check();
  }
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
}

async function cleanupAll(page: any) {
  await page.getByRole('button', { name: ' Select all' }).click();
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByText('Skip the trash and').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('body')).toContainText(/No items found/i);
}

// TODO: test toggle column names makes them visible in the table

// TODO: test just from cleanupAll() to check if delete working
// TODO: test for folder search and file search
// TODO: copy path button test
// TODO: looooong breadcrumbs test
// TODO: test upload drag and drop
// TODO: test upload multiple files


test('create file', async ({ page }) => {
  await navigateToFiles(page);

  await createFile(page, FILE_NAME);
  await expect(page.locator('body')).toContainText(/File created successfully/i);
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));

  console.log('File created successfully');
});

test('create folder', async ({ page }) => {
  await navigateToFiles(page);

  await createFolder(page, FOLDER_NAME);
  await expect(page.locator('body')).toContainText(/Folder created successfully/i);
  await expect(page.locator('body')).toContainText(new RegExp(FOLDER_NAME, 'i'));

  console.log('Folder created successfully');
});

test('copy file to folder', async ({ page }) => {
  await navigateToFiles(page);

  await selectItem(page, FILE_NAME);
  await page.getByRole('button', { name: ' Copy' }).click();
  await page.locator('#copyfiletree').getByText(FOLDER_NAME).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();

  await expect(page.locator('body')).toContainText(/Copy complete/i);
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));

  console.log('File copied into folder successfully');
});


test('move file', async ({ page }) => {
  await page.goto(`/files`);

  await page.getByRole('link', { name: FOLDER_NAME }).click();
  await expect(page).toHaveURL(/files\/radovanfolder/);
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));
  await selectItem(page, FILE_NAME);
  await page.getByRole('button', { name: ' Move' }).click();
  await page.getByRole('textbox', { name: 'Where to:*' }).click();
  await page.getByRole('textbox', { name: 'Where to:*' }).fill('/');
  await page.getByRole('button', { name: 'Move', exact: true }).click();

  await expect(page.locator('body')).toContainText(/Move complete/i);
  await expect(page.locator('body')).not.toContainText(new RegExp(FILE_NAME, 'i'));
  await expect(page.locator('body')).toContainText(/No items found/i);

  await page.getByRole('link', { name: '/var/www/html/' }).click();
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));

  console.log('File moved out of folder successfully');
});


test('delete file to trash', async ({ page }) => {
  await navigateToFiles(page);

  await selectItem(page, FILE_NAME);
  await page.getByRole('button', { name: ' Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('body')).not.toContainText(new RegExp(FILE_NAME, 'i'));

  console.log('File moved to trash successfully');
});

test('restore file from trash', async ({ page }) => {
  await navigateToFiles(page);

  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));

  await selectItem(page, FILE_NAME);
  await page.click('#restoreButton');
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  // TODO: open again trash and check does NOT have it anymore

  await page.getByRole('link', { name: 'File Manager' }).click();
  await expect(page.locator('body')).toContainText(new RegExp(FILE_NAME, 'i'));

  console.log('File restored from trash successfully');
});

test('delete multiple items permanently', async ({ page }) => {
  await navigateToFiles(page);

  await selectItem(page, FOLDER_NAME);
  await selectItem(page, FILE_NAME, true);
  await deleteSelected(page, true);

  await expect(page.locator('body')).not.toContainText(new RegExp(FILE_NAME, 'i'));
  await expect(page.locator('body')).not.toContainText(new RegExp(FOLDER_NAME, 'i'));

  console.log('Multiple items permanently deleted successfully');
});


test('create file with editor, view and edit content', async ({ page }) => {
  // TODO: separate to 3 functions: create, edit, view
  // TODO: on edit test all 4 code editor modes!
  await navigateToFiles(page);

  await createFile(page, TXT_FILE, true);
  await page.locator('.view-lines').click();
  await page.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('nekitext');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('#fullscreenButton').click();
  await expect(page.locator('body')).toContainText(/File saved successfully/i);

  await navigateToFiles(page);
  await expect(page.locator('body')).toContainText(new RegExp(TXT_FILE, 'i'));

  await selectItem(page, TXT_FILE);
  const page2Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  const page2 = await page2Promise;
  await expect(page2.locator('body')).toContainText(/nekitext/i);

  const page3Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' Edit' }).click();
  const page3 = await page3Promise;
  await expect(page3.locator('body')).toContainText(/nekitext/i);
  await page3.locator('div').filter({ hasText: /^nekitext$/ }).nth(2).click();
  await page3.getByRole('textbox', { name: 'Editor content;Press Alt+F1' }).fill('nekitext2');
  await page3.getByRole('button', { name: 'Save' }).click();

  const page4Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' View' }).click();
  const page4 = await page4Promise;
  await expect(page4.locator('body')).toContainText(/nekitext2/i);

  console.log('File created, viewed, and edited successfully');
});


test('rename file', async ({ page }) => {
  await navigateToFiles(page);

  await selectItem(page, TXT_FILE);
  await page.getByRole('button', { name: ' Rename' }).click();
  await page.locator('#renameInput').click();
  await page.locator('#renameInput').fill(TXT_FILE_BAK);
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  // TODO: add check to NOT contain old filename
  await expect(page.locator('body')).toContainText(new RegExp(TXT_FILE_BAK, 'i'));
  await expect(page.locator('body')).toContainText(/File renamed successfully/i);

  console.log('File renamed successfully');
});


test('change file permissions', async ({ page }) => {
  await navigateToFiles(page);

  await selectItem(page, TXT_FILE_BAK);
  await page.getByRole('button', { name: ' Permissions' }).click();
  await page.getByPlaceholder('775').click();
  await page.getByPlaceholder('775').press('ControlOrMeta+a');
  await page.getByPlaceholder('775').fill('755');
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.locator('body')).toContainText(/Permissions changed/i);
  await expect(page.locator('body')).toContainText(/-rwxr-xr-x/i);

  console.log('File permissions changed successfully');
});


test('upload file from URL', async ({ page }) => {
  test.setTimeout(180_000);

  await navigateToFiles(page);
  await cleanupAll(page);

  const page5Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: ' Upload' }).click();
  const page5 = await page5Promise;

  await page5.getByRole('button', { name: 'Download from URL instead' }).click();
  await page5.getByRole('textbox', { name: 'https://' }).fill('http://ipv4.download.thinkbroadband.com/20MB.zip');
  await page5.getByRole('button', { name: 'Download' }).click();
  await expect(page5.locator('body')).toContainText(/downloaded from URL successfully/i);

  await page5.getByRole('link', { name: 'File Manager' }).click();
  await page5.getByRole('heading', { name: '20MB.zip', exact: true }).click();

  await navigateToFiles(page);
  await expect(page.locator('body')).toContainText(/20MB.zip/i);

  console.log('File uploaded from URL successfully');
});


test('compress and extract files', async ({ page }) => {
  await navigateToFiles(page);
  // TODO: separate to 2 functions: compress, extract 
  // TODO: cover all 3 supported archive extensions

  await createFile(page, ZIP_FILE);
  await createFolder(page, ZIP_FOLDER);

  await selectItem(page, ZIP_FOLDER);
  await selectItem(page, ZIP_FILE, true);
  await page.getByRole('button', { name: ' Compress' }).click();
  await page.getByRole('textbox', { name: 'Archive path*' }).fill(ZIP_ARCHIVE);
  await page.getByRole('button', { name: 'Compress', exact: true }).click();
  await expect(page.locator('body')).toContainText(new RegExp(ZIP_ARCHIVE_NAME, 'i'));

  await selectItem(page, ZIP_FILE);
  await selectItem(page, ZIP_FOLDER, true);
  await deleteSelected(page);
  await expect(page.locator('body')).not.toContainText(new RegExp(ZIP_FILE, 'i'));
  await expect(page.locator('body')).not.toContainText(new RegExp(ZIP_FOLDER, 'i'));

  await selectItem(page, ZIP_ARCHIVE_NAME);
  await page.getByRole('button', { name: ' Extract' }).click();
  await page.getByRole('button', { name: 'Extract', exact: true }).click();
  await expect(page.locator('body')).toContainText(/File extracted successfully/i);
  await expect(page.locator('body')).toContainText(new RegExp(ZIP_FILE, 'i'));
  await expect(page.locator('body')).toContainText(new RegExp(ZIP_FOLDER, 'i'));

  await cleanupAll(page);

  console.log('Files compressed and extracted successfully');
});




// INODES AND DISK USAGE EXPLORERS
const explorerTests = [
  {
    route: '/disk-usage',
    columnHeader: 'Size',
    valueRegex: /^\d+(\.\d+)?\s?[KMGT]?B?$/ 
  },
  {
    route: '/inodes-explorer',
    columnHeader: 'INodes',
    valueRegex: /^\d+$/ 
  }
];

for (const { route, columnHeader, valueRegex } of explorerTests) {
  test(route, async ({ page }) => {
    // 1. Initial
    await page.goto(route);
    const table = page.locator('#folders_to_navigate');
    
    await expect(table).toBeVisible();
    await expect(table).toContainText('docker-data');
    await expect(table.locator('th', { hasText: columnHeader })).toBeVisible();
    
    const chart = page.locator('#folderChart');
    await expect(chart).toBeVisible();

    let box = await chart.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);

    const valueCells = table.locator('tbody tr td:nth-child(2)');
    const count = await valueCells.count();
    for (let i = 0; i < count; i++) {
      const text = (await valueCells.nth(i).textContent())?.trim();
      expect(text).toMatch(valueRegex);
    }

    // 2. enter "docker-data'
    const dockerLink = page.locator(`a[href*="${route}/docker-data"]`);
    await dockerLink.click();

    await expect(page).toHaveURL(new RegExp(`${route}/docker-data/?`));
    
    const table2 = page.locator('#folders_to_navigate');
    await expect(table2).toContainText('containerd');
    await expect(table2.locator('th', { hasText: columnHeader })).toBeVisible();
    
    const containerdRow = table2.locator('tr', { hasText: 'containerd' });
    const valueCell = containerdRow.locator('td').nth(1);
    
    await expect(valueCell).toBeVisible();
    const cellText = (await valueCell.textContent())?.trim();
    expect(cellText).toMatch(valueRegex);

    const isRendered = await page.evaluate(() => {
      const canvas = document.getElementById('folderChart') as HTMLCanvasElement;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return Array.from(data).some((v) => v !== 0);
    });
    expect(isRendered).toBeTruthy();

    // 3. "Up One Level"
    const upOneLevelLink = page.locator('a', { hasText: 'Up One Level' });
    await upOneLevelLink.click();
    
    await expect(page).toHaveURL(new RegExp(`${route}/?$`));
    const table3 = page.locator('#folders_to_navigate');
    await expect(table3).toContainText('docker-data');
    await expect(table3).not.toContainText('containerd');
    
    console.log(`${route} is functional`);
  });
}

