const { test, expect } = require('@playwright/test');

test.describe('Asset Manager Frontend', () => {
    const BASE_URL = 'http://localhost:3003';

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

        // Force English for consistent selectors
        await page.addInitScript(() => {
            localStorage.setItem('app_lang', 'en');
        });

        await page.goto(BASE_URL);
    });

    test('Dashboard should load with correct title', async ({ page }) => {
        await expect(page).toHaveTitle(/Asset Manager/);
        // Target the sidebar logo specifically, or handle visibility
        const logos = page.locator('.logo-text');
        await expect(logos.first()).toHaveText('ASSET MANAGER');
    });

    test.skip('New Loan UI should operate correctly', async ({ page }) => {
        // ...
    });

    test.skip('I18N Switching', async ({ page }) => {
        // ...
    });
});
