import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'Admin123!@#');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('should toggle between light and dark themes', async ({ page }) => {
        // Find theme toggle button
        const themeToggle = page.locator('button[aria-label="Toggle theme"]');
        await expect(themeToggle).toBeVisible();

        // Click to open theme menu
        await themeToggle.click();

        // Click Dark mode
        await page.click('text=Dark');

        // Verify dark mode is applied (html element should have dark class)
        const htmlElement = page.locator('html');
        await expect(htmlElement).toHaveClass(/dark/);

        // Switch back to Light
        await themeToggle.click();
        await page.click('text=Light');

        // Dark class should be removed
        await expect(htmlElement).not.toHaveClass(/dark/);
    });

    test('should persist theme selection', async ({ page }) => {
        // Set to dark mode
        await page.click('button[aria-label="Toggle theme"]');
        await page.click('text=Dark');

        // Reload page
        await page.reload();

        // Should still be in dark mode
        const htmlElement = page.locator('html');
        await expect(htmlElement).toHaveClass(/dark/);
    });

    test('should have system theme option', async ({ page }) => {
        await page.click('button[aria-label="Toggle theme"]');

        // System option should be visible
        await expect(page.locator('text=System')).toBeVisible();
    });
});
