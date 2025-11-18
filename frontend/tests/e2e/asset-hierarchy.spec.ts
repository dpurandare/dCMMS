/**
 * E2E Test: Asset Hierarchy (3 Levels)
 * Tests creation and navigation of parent-child asset relationships
 */

import { test, expect } from '@playwright/test';

test.describe('Asset Hierarchy Management', () => {
  let siteId: string;
  let parentAssetId: string;
  let childAssetId: string;
  let grandchildAssetId: string;

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@dcmms.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Step 1: Create Level 1 (Parent) Asset - Solar Array', async ({ page }) => {
    // Navigate to assets page
    await page.click('a[href="/assets"]');
    await expect(page).toHaveURL(/.*assets/);

    // Click "New Asset" button
    await page.click('button:has-text("New Asset")');

    // Fill in parent asset form
    await page.fill('input[name="name"]', 'Solar Array Building A');
    await page.fill('input[name="assetTag"]', 'SOLAR-ARRAY-A');
    await page.fill('textarea[name="description"]', 'Main solar panel array - Level 1 parent asset');

    // Select asset type
    await page.click('button[role="combobox"]:near(:text("Asset Type"))');
    await page.click('text=Solar Panel Array');

    // Select site
    await page.click('button[role="combobox"]:near(:text("Site"))');
    await page.click('div[role="option"]').first(); // Select first available site

    // Select status
    await page.click('button[role="combobox"]:near(:text("Status"))');
    await page.click('text=Operational');

    // No parent asset for Level 1

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Should redirect to assets list
    await expect(page).toHaveURL(/.*assets$/);

    // Verify asset appears
    await expect(page.locator('text=Solar Array Building A')).toBeVisible();

    // Click on asset to get details
    await page.click('text=Solar Array Building A');

    // Extract asset ID from URL
    const url = page.url();
    parentAssetId = url.split('/assets/')[1].split('?')[0];
  });

  test('Step 2: Create Level 2 (Child) Asset - Inverter', async ({ page }) => {
    // Navigate to assets page
    await page.click('a[href="/assets"]');
    await expect(page).toHaveURL(/.*assets/);

    // Click "New Asset" button
    await page.click('button:has-text("New Asset")');

    // Fill in child asset form
    await page.fill('input[name="name"]', 'Inverter INV-001');
    await page.fill('input[name="assetTag"]', 'INV-001');
    await page.fill('textarea[name="description"]', 'Primary inverter - Level 2 child asset');

    // Select asset type
    await page.click('button[role="combobox"]:near(:text("Asset Type"))');
    await page.click('text=Inverter');

    // Select site
    await page.click('button[role="combobox"]:near(:text("Site"))');
    await page.click('div[role="option"]').first();

    // Select status
    await page.click('button[role="combobox"]:near(:text("Status"))');
    await page.click('text=Operational');

    // Select parent asset (Level 1)
    await page.click('button[role="combobox"]:near(:text("Parent Asset"))');
    await page.click('text=Solar Array Building A');

    // Fill manufacturer info
    await page.fill('input[name="manufacturer"]', 'SolarTech Inc');
    await page.fill('input[name="model"]', 'ST-5000');
    await page.fill('input[name="serialNumber"]', 'ST5000-001');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Should redirect to assets list
    await expect(page).toHaveURL(/.*assets$/);

    // Verify asset appears
    await expect(page.locator('text=Inverter INV-001')).toBeVisible();

    // Click on asset to get details
    await page.click('text=Inverter INV-001');

    // Extract asset ID from URL
    const url = page.url();
    childAssetId = url.split('/assets/')[1].split('?')[0];
  });

  test('Step 3: Create Level 3 (Grandchild) Asset - Cooling Fan', async ({ page }) => {
    // Navigate to assets page
    await page.click('a[href="/assets"]');
    await expect(page).toHaveURL(/.*assets/);

    // Click "New Asset" button
    await page.click('button:has-text("New Asset")');

    // Fill in grandchild asset form
    await page.fill('input[name="name"]', 'Cooling Fan CF-001');
    await page.fill('input[name="assetTag"]', 'CF-001');
    await page.fill('textarea[name="description"]', 'Inverter cooling fan - Level 3 grandchild asset');

    // Select asset type
    await page.click('button[role="combobox"]:near(:text("Asset Type"))');
    await page.click('text=Cooling System');

    // Select site
    await page.click('button[role="combobox"]:near(:text("Site"))');
    await page.click('div[role="option"]').first();

    // Select status
    await page.click('button[role="combobox"]:near(:text("Status"))');
    await page.click('text=Operational');

    // Select parent asset (Level 2 - Inverter)
    await page.click('button[role="combobox"]:near(:text("Parent Asset"))');
    await page.click('text=Inverter INV-001');

    // Fill manufacturer info
    await page.fill('input[name="manufacturer"]', 'CoolTech Corp');
    await page.fill('input[name="model"]', 'CT-FAN-200');
    await page.fill('input[name="serialNumber"]', 'CTFAN-200-001');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Should redirect to assets list
    await expect(page).toHaveURL(/.*assets$/);

    // Verify asset appears
    await expect(page.locator('text=Cooling Fan CF-001')).toBeVisible();

    // Click on asset to get details
    await page.click('text=Cooling Fan CF-001');

    // Extract asset ID from URL
    const url = page.url();
    grandchildAssetId = url.split('/assets/')[1].split('?')[0];
  });

  test('Step 4: Verify Level 1 Asset shows child hierarchy', async ({ page }) => {
    // Navigate to Level 1 asset (Solar Array)
    await page.goto(`/assets/${parentAssetId || 'test-parent-001'}`);

    // Go to Hierarchy tab
    await page.click('button[role="tab"]:has-text("Hierarchy")');

    // Verify child asset appears
    await expect(page.locator('text=Inverter INV-001')).toBeVisible();

    // Verify grandchild is also visible (nested or in hierarchy tree)
    // The grandchild might be shown as a nested item under the child
    const hierarchySection = page.locator('[data-testid="hierarchy-tree"]');
    await expect(hierarchySection.locator('text=Cooling Fan CF-001')).toBeVisible();
  });

  test('Step 5: Verify Level 2 Asset shows parent and child', async ({ page }) => {
    // Navigate to Level 2 asset (Inverter)
    await page.goto(`/assets/${childAssetId || 'test-child-001'}`);

    // Go to Hierarchy tab
    await page.click('button[role="tab"]:has-text("Hierarchy")');

    // Verify parent asset appears
    await expect(page.locator('text=Parent Asset')).toBeVisible();
    await expect(page.locator('text=Solar Array Building A')).toBeVisible();

    // Verify child assets section
    await expect(page.locator('text=Child Assets')).toBeVisible();
    await expect(page.locator('text=Cooling Fan CF-001')).toBeVisible();
  });

  test('Step 6: Verify Level 3 Asset shows parent chain', async ({ page }) => {
    // Navigate to Level 3 asset (Cooling Fan)
    await page.goto(`/assets/${grandchildAssetId || 'test-grandchild-001'}`);

    // Go to Hierarchy tab
    await page.click('button[role="tab"]:has-text("Hierarchy")');

    // Verify parent asset appears (Inverter)
    await expect(page.locator('text=Parent Asset')).toBeVisible();
    await expect(page.locator('text=Inverter INV-001')).toBeVisible();

    // Verify grandparent asset in breadcrumb or hierarchy path
    const hierarchyPath = page.locator('[data-testid="hierarchy-path"]');
    await expect(hierarchyPath.locator('text=Solar Array Building A')).toBeVisible();

    // Verify no child assets
    await expect(page.locator('text=No child assets')).toBeVisible();
  });

  test('Step 7: Navigate through hierarchy using links', async ({ page }) => {
    // Start at Level 3
    await page.goto(`/assets/${grandchildAssetId || 'test-grandchild-001'}`);

    // Click on parent asset link (Level 2)
    await page.click('a:has-text("Inverter INV-001")');

    // Should navigate to Level 2
    await expect(page).toHaveURL(new RegExp(`/assets/${childAssetId || 'test-child-001'}`));
    await expect(page.locator('h1:has-text("Inverter INV-001")')).toBeVisible();

    // Go to hierarchy tab
    await page.click('button[role="tab"]:has-text("Hierarchy")');

    // Click on parent asset link (Level 1)
    await page.click('a:has-text("Solar Array Building A")');

    // Should navigate to Level 1
    await expect(page).toHaveURL(new RegExp(`/assets/${parentAssetId || 'test-parent-001'}`));
    await expect(page.locator('h1:has-text("Solar Array Building A")')).toBeVisible();
  });

  test('Step 8: Verify hierarchy prevents circular references', async ({ page }) => {
    // Navigate to Level 1 asset
    await page.goto(`/assets/${parentAssetId || 'test-parent-001'}`);

    // Click Edit button
    await page.click('button:has-text("Edit")');

    // Try to set parent asset to one of its children (should not be allowed)
    await page.click('button[role="combobox"]:near(:text("Parent Asset"))');

    // Verify that child and grandchild are not in the dropdown
    // (they should be filtered out to prevent circular references)
    const parentDropdown = page.locator('div[role="listbox"]');
    await expect(parentDropdown.locator('text=Inverter INV-001')).not.toBeVisible();
    await expect(parentDropdown.locator('text=Cooling Fan CF-001')).not.toBeVisible();
  });
});
