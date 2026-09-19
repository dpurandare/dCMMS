import { test, expect } from '@playwright/test';

test.describe('RBAC - Role-Based Access Control', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'Admin123!@#');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('admin should see Users menu in sidebar', async ({ page }) => {
        // Check sidebar for Users link
        const usersLink = page.locator('text=Users');
        await expect(usersLink).toBeVisible();
    });

    test('admin should be able to create users', async ({ page }) => {
        // Navigate to users page
        await page.click('text=Users');
        await expect(page).toHaveURL('/users');

        // Should see "Add User" button
        const addUserButton = page.locator('text=Add User');
        await expect(addUserButton).toBeVisible();

        // Click to go to create page
        await addUserButton.click();
        await expect(page).toHaveURL('/users/new');
    });

    test('admin should see all CRUD buttons on Users page', async ({ page }) => {
        await page.goto('/users');

        // Should see Add User button
        await expect(page.locator('text=Add User')).toBeVisible();

        // Should see delete buttons (trash icons)
        const deleteButtons = page.locator('button[aria-label="Delete user"]');
        const count = await deleteButtons.count();
        expect(count).toBeGreaterThan(0);
    });

    test('viewer should NOT see Users in sidebar', async ({ page }) => {
        // Logout and login as viewer
        await page.click('[aria-label="User menu"]');
        await page.click('text=Sign Out');

        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'viewer@example.com');
        await page.fill('input[name="password"]', 'Viewer123!@#');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');

        // Users should NOT be visible in sidebar
        const usersLink = page.locator('text=Users');
        await expect(usersLink).not.toBeVisible();
    });

    test('direct access to /users should show Access Denied for viewer', async ({ page }) => {
        // Logout and login as viewer
        await page.click('[aria-label="User menu"]');
        await page.click('text=Sign Out');

        await page.fill('input[name="email"]', 'viewer@example.com');
        await page.fill('input[name="password"]', 'Viewer123!@#');
        await page.click('button[type="submit"]');

        // Try to access /users directly
        await page.goto('/users');

        // Should show access denied message
        await expect(page.locator('text=Access Denied')).toBeVisible();
    });
});
