import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
        // Navigate to login page
        await page.goto('/auth/login');

        // Fill in login form
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'Admin123!@#');

        // Click login button
        await page.click('button[type="submit"]');

        // Wait for navigation and verify redirect to dashboard
        await expect(page).toHaveURL('/dashboard');

        // Verify user is logged in (check for sidebar or user menu)
        await expect(page.locator('text=dCMMS')).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/auth/login');

        await page.fill('input[name="email"]', 'invalid@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should stay on login page or show error
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should logout successfully', async ({ page }) => {
        // Login first
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'Admin123!@#');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');

        // Logout - click user menu then Sign Out
        await page.click('[aria-label="User menu"]', { timeout: 5000 });
        await page.click('text=Sign Out');

        // Should redirect to login
        await expect(page).toHaveURL('/auth/login');
    });
});
