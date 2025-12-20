const { test, expect } = require('@playwright/test');

// Server managed by playwright.config.js

test('Dashboard and Lifecycle Flow', async ({ page }) => {
    // 1. Go to Localhost
    await page.goto('http://localhost:3002');
    await expect(page).toHaveTitle(/Asset Manager/);

    // 2. Add a Transaction
    await page.click('button:has-text("Add Funds")'); // Open Modal
    await expect(page.locator('#modalOverlay')).toBeVisible();

    await page.fill('#tTicker', 'TSLA');
    await page.fill('#tQty', '10');
    await page.fill('#tPrice', '200');
    await page.selectOption('#tCurrency', 'USD');

    await page.click('#btnTx');
    await expect(page.locator('#modalOverlay')).not.toBeVisible();
    await expect(page.locator('#msgModal')).toBeVisible();
    await page.click('#msgModal button:has-text("Close")');
    await expect(page.locator('#msgModal')).not.toBeVisible();

    // Check if it appears in Recent Tx (Mock server is configured to echo success)
    // Note: Since it's a mock server, the list might be static or reset. 
    // But we check for UI feedback.

    // 3. Navigate to Vault and Test Wizard
    await page.click('div[onclick="go(\'loan\', this)"]');
    await expect(page.locator('text=Sinopac').first()).toBeVisible();

    await page.click('text=+ New Loan');
    await expect(page.locator('#modalWizard')).toBeVisible();

    // Select Sinopac
    await page.click('text=Stock Loan (Sinopac)');
    await expect(page.locator('#wizStep2')).toBeVisible();
    await expect(page.locator('#wizProtoLabel')).toHaveText('Sinopac (Stock)');

    // Select Stock and Fill amount
    await page.selectOption('#wizStockTicker', { index: 1 }); // TSLA or BTC
    await page.fill('#wizStockLoan', '50000');

    // Submit Wizard
    await page.click('text=Create Loan');
    await expect(page.locator('#msgModal')).toBeVisible();
    await expect(page.locator('#msgBody')).toContainText('Wizard: Created Sinopac Loan');
    await page.click('text=Close');

    // 4. Test Settings Persistence (Mock UI only)
    await page.click('#themeToggle');
    await page.click('#setCurrencyCtrl .seg-btn:has-text("USD")');
    await expect(page.locator('#setCurrencyCtrl .seg-btn.active')).toHaveText('USD');

    // Take Final Screenshot
    await page.screenshot({ path: 'tests/e2e/report/e2e_lifecycle_verified.png', fullPage: true });
});
