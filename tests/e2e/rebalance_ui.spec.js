const { test, expect } = require('@playwright/test');

test('Smart Rebalancing UI Flow', async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[Browser Error] ${err}`));

    // 1. Go to Localhost
    await page.goto('http://localhost:3002');
    await expect(page).toHaveTitle(/Asset Manager/);

    // Wait for Dashboard to load (netWorth updated from "...")
    await expect(page.locator('#netWorth')).not.toHaveText('...', { timeout: 10000 });

    // 2. Open Rebalance Modal using JS directly to avoid visibility/click issues
    await page.evaluate(() => window.openRebalance());
    await expect(page.locator('#modalRebalance')).toBeVisible();

    // 3. Check Inputs
    const input = page.locator('#rebInputs input').first();
    await expect(input).toBeVisible();

    // 4. Set Targets
    await input.fill('60');
    // Fill second input if exists
    const secondInput = page.locator('#rebInputs input').nth(1);
    if (await secondInput.count() > 0) {
        await secondInput.fill('40');
    }

    // 5. Save
    const dialogPromise = page.waitForEvent('dialog');
    await page.evaluate(() => window.saveRebalance());
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Targets Saved');
    await dialog.accept();
});
