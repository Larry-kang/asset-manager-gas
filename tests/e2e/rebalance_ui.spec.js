const { test, expect } = require('@playwright/test');

test('Smart Rebalancing UI Flow', async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[Browser Error] ${err}`));
    // 1. Go to Localhost
    await page.goto('http://localhost:3002');
    await expect(page).toHaveTitle(/Asset Manager/);

    // Wait for Dashboard to load (netWorth updated from "...")
    await expect(page.locator('#netWorth')).not.toHaveText('...', { timeout: 10000 });

    // 2. Open Rebalance Modal
    await page.click('button[onclick="openRebalance()"]');
    await expect(page.locator('#modalRebalance')).toBeVisible();

    // 3. Check Inputs
    // Verify presence of at least one input.
    const input = page.locator('#rebInputs input').first();
    await expect(input).toBeVisible();

    // 4. Set Targets
    // Fill "Stock" (first input usually)
    await input.fill('60');

    // Fill second input (Crypto)
    await page.locator('#rebInputs input').nth(1).fill('40');

    // 5. Save
    // Mock server returns success
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button[onclick="saveRebalance()"]');
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Targets Saved');
    await dialog.accept();
});
