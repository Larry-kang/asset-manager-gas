const { test, expect } = require('@playwright/test');

test.describe('Asset Manager Frontend', () => {
    const BASE_URL = 'http://localhost:3001';

    test.beforeEach(async ({ page }) => {
        // Ensure the server is running (npm run dev)
        await page.goto(BASE_URL);
    });

    test('Dashboard should load with correct title', async ({ page }) => {
        await expect(page).toHaveTitle('Asset Manager');
        await expect(page.locator('.logo-text')).toHaveText('ASSET MANAGER');
    });

    test('New Loan UI should operate correctly', async ({ page }) => {
        // 1. Navigate to Vault
        await page.click('data-testid=nav-vault');

        // 2. Open New Loan Modal
        await page.click('data-testid=btn-new-loan');
        const modal = page.locator('.modal-content:visible');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('New Loan Contract');

        // 3. Fill Data
        await modal.locator('select').first().selectOption('Aave');
        await page.fill('data-testid=input-amt', '5000'); // Amount
        await page.fill('data-testid=input-rate', '5');   // Rate

        // 4. Submit (Mock)
        await modal.locator('button:has-text("Create")').click();

        // 5. Verify success message or modal close
        await expect(modal).toBeHidden({ timeout: 5000 });
    });

    test('I18N Switching', async ({ page }) => {
        // 1. Navigate to Settings
        await page.click('data-testid=nav-settings');

        // 2. Toggle Language
        // Current: English (default) -> Check text "Dashboard"
        const navDash = page.locator('.nav-item').first();
        await expect(navDash).toContainText('Dashboard');

        // Click Language Toggle
        await page.click('data-testid=btn-lang');

        // 3. Verify Change
        await expect(navDash).toContainText('???');

        // Toggle back
        await page.click('data-testid=btn-lang');
        await expect(navDash).toContainText('Dashboard');
    });
});
