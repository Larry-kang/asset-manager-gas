const { test, expect } = require('@playwright/test');

test.describe('Asset Manager E2E Redux', () => {
    const BASE_URL = 'http://localhost:3003';

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(BASE_URL);
        await expect(page.locator('#loading')).not.toBeVisible({ timeout: 15000 });
    });

    test('01. Core Dashboard Elements', async ({ page }) => {
        await expect(page).toHaveTitle(/Asset Manager/);
        await expect(page.locator('.dash-balance')).toBeVisible();
    });

    test('02. Navigation Flow', async ({ page }) => {
        // Sidebar Portfolio Icon
        await page.locator('.sidebar .fa-layer-group').click();
        await expect(page.locator('.top-header')).toContainText(/Part|Port|投資組合/);

        // Sidebar Vault Icon
        await page.locator('.sidebar .fa-landmark').click();
        await expect(page.locator('.top-header')).toContainText(/Vault|借貸/);

        // Sidebar Settings Icon
        await page.locator('.sidebar .fa-gear').click();
        await expect(page.locator('.top-header')).toContainText(/Set|設定/);
    });

    test('03. Feature: Language Switch', async ({ page }) => {
        await page.locator('.sidebar .fa-gear').click();
        const toggleBtn = page.locator('.card .asset-row').filter({ hasText: 'EN / 中' });
        await expect(toggleBtn).toBeVisible();
        const header = page.locator('.top-header .section-title');
        const initialText = await header.innerText();
        await toggleBtn.click();
        await expect(header).not.toHaveText(initialText, { timeout: 10000 });
        await toggleBtn.click();
        await expect(header).toHaveText(initialText, { timeout: 10000 });
    });

    test('04. Feature: New Loan Modal', async ({ page }) => {
        await page.locator('.sidebar .fa-landmark').click();

        // Use precise test ID to distinguish from other view buttons
        await page.click('[data-testid="btn-new-loan"]');

        const modal = page.locator('.modal-content').filter({ hasText: /Loan|借貸/ }).first();
        await expect(modal).toBeVisible();

        await page.locator('.modal-overlay').first().click({ position: { x: 5, y: 5 } });
    });

    test('05. Feature: Transaction Modal', async ({ page }) => {
        await page.locator('.sidebar .fa-chart-pie').click();
        // Dash header is unique
        await page.locator('.dash-header .btn-gold-pill').first().click();
        const modal = page.locator('.modal-content').filter({ hasText: /Tx|Transaction|交易/ }).first();
        await expect(modal).toBeVisible();
    });
});
