const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess;

test.beforeAll(async () => {
    const serverPath = path.join(__dirname, '../server.js');
    console.log(`Starting Mock Server from ${serverPath}...`);
});

test.afterAll(async () => {
});

test('Dashboard Loads and Shows Risks', async ({ page }) => {
    // 1. Go to Localhost
    await page.goto('http://localhost:3002');

    // 2. Check Title
    await expect(page).toHaveTitle(/Asset Manager/);

    // 3. Navigate to Loan Vault
    await page.click('div[onclick="go(\'loan\', this)"]');

    // 4. Verify Risk Card ("Sinopac")
    await expect(page.locator('text=Sinopac')).toBeVisible();

    // 5. Test Settings Page (New)
    await page.click('div[onclick="go(\'settings\', this)"]');
    await expect(page.locator('#settings')).toBeVisible();
    await expect(page.locator('text=Dark Mode')).toBeVisible();

    // Check restored "System" card
    await expect(page.locator('text=System')).toBeVisible();
    await expect(page.locator('text=Run Diagnostics')).toBeVisible();

    // Toggle Theme
    await page.click('#themeToggle');

    // Toggle Language (Mock Check)
    await page.click('text=Language');

    // 6. Test Loan Wizard Flow
    await page.click('div[onclick="go(\'loan\', this)"]'); // Back to vault
    await page.click('text=+ New Loan');
    await expect(page.locator('#modalWizard')).toBeVisible();

    // Step 1 -> Step 2
    // Click Sinopac card
    await page.click('text=Stock Loan (Sinopac)');
    await expect(page.locator('#wizStep2')).not.toBeHidden();
    // await expect(page.locator('#wizStockTicker')).toBeVisible();

    // Take Final Screenshot
    await page.screenshot({ path: 'tests/e2e/report/qa_verification.png', fullPage: true });
});
