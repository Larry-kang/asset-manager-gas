const { test, expect } = require('@playwright/test');

test.describe('Asset Manager Frontend', () => {
    const BASE_URL = 'http://localhost:3001';

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Dashboard should load with correct title', async ({ page }) => {
        await expect(page).toHaveTitle(/Asset Manager/);
        await expect(page.locator('.logo-text')).toHaveText('ASSET MANAGER');
    });

    test('New Loan UI should operate correctly', async ({ page }) => {
        await page.click('data-testid=btn-new-loan');
        const modal = page.locator('.modal-content').first();
        await expect(modal).toBeVisible();
        await page.locator('input[placeholder*="Source"]').fill('Aave');
        await page.locator('input[placeholder*="Amt"]').fill('5000');
        await page.locator('input[placeholder*="Rate"]').fill('5');
        // Wait for potential debounce logic if any, but regular fill is fine
        await modal.locator('button').filter({ hasText: /Create|建立/ }).click();
        await expect(modal).toBeHidden({ timeout: 10000 });
    });

    test('I18N Switching', async ({ page }) => {
        await page.click('[data-i18n="Sett"]'); 
        await page.click('data-testid=btn-lang');
        const title = page.locator('.section-title[data-i18n="Sett"]');
        await expect(title).not.toBeEmpty();
    });
});
