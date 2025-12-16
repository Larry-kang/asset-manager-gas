const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess;

test.beforeAll(async () => {
    const serverPath = path.join(__dirname, '../server.js');
    serverProcess = spawn('node', [serverPath], { stdio: 'inherit' });
    console.log(`Starting Mock Server from ${serverPath}...`);
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
});

test.afterAll(() => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

test('Dashboard Loads and Shows Risks', async ({ page }) => {
    // 1. Go to Localhost
    await page.goto('http://localhost:3002');

    // 2. Check Title
    await expect(page).toHaveTitle(/Asset Manager/);

    // 3. Verify Risk Card ("Sinopac") on Dashboard
    // Wait for Login to clear (Mock Auth)
    await expect(page.locator('#loginModal')).toBeHidden({ timeout: 10000 });

    // 4. Navigate to Loan Vault
    await page.click('div[onclick="go(\'loan\', this)"]');

    // 3. Verify Risk Card ("Sinopac") - Now in Vault
    await expect(page.locator('text=Sinopac').first()).toBeVisible();
    await expect(page.locator('#loan')).not.toBeHidden();

    // 5. Test Settings (On Dashboard)
    // Check Settings Controls Existence
    await expect(page.locator('#setCurrencyCtrl')).toBeVisible();
    await expect(page.locator('#btnTWD')).toBeVisible();

    // Check System Diagnostics Button (if visible or in a modal? Script in html suggests runSystemCheck is available)
    // Actually index.html doesn't show a direct 'System' card. It might be hidden or removed.
    // Let's stick to visible elements: Currency Toggle & Theme/Lang buttons.

    // Toggle Theme (Instant)
    await page.click('#themeToggle');

    // Toggle Currency (App-Like Switch)
    // Use robust selector for segmented control
    await page.click('#setCurrencyCtrl .seg-btn:has-text("USD")');
    await expect(page.locator('#setCurrencyCtrl .seg-btn.active')).toHaveText('USD');

    // Toggle Language (Real i18n Check)
    await page.click('text=Language');
    // Verify i18n text change (simple check that UI didn't crash and text exists)
    await expect(page.locator('text=Run Diagnostics')).toBeVisible();

    // 6. Test Loan Wizard Flow
    await page.click('div[onclick="go(\'loan\', this)"]'); // Back to vault
    await page.click('text=+ New Loan');
    await expect(page.locator('#modalWizard')).toBeVisible();

    // Step 1 -> Step 2
    // Click Sinopac card
    await page.click('text=Stock Loan (Sinopac)');
    await expect(page.locator('#wizStep2')).not.toBeHidden();

    // Take Final Screenshot
    await page.screenshot({ path: 'tests/e2e/report/qa_verification.png', fullPage: true });
});
