const { test, expect } = require('@playwright/test');

test('Dashboard and Lifecycle Flow', async ({ page }) => {
    // 1. Go to Localhost
    await page.goto('http://localhost:3002');
    await expect(page).toHaveTitle(/Asset Manager/);

    // 2. Add a Transaction
    await page.click('button[onclick="openTxModal()"]');
    await expect(page.locator('#modalOverlay')).toBeVisible();

    // 3. Close it (Click overlay background)
    // We force click 10,10 relative to the element to ensure we hit the background, not the content
    await page.locator('#modalOverlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#modalOverlay')).toBeHidden();
});
