/**
 * E2E Test: Complete Work Order Workflow
 * Tests the full lifecycle: Create Site → Create Asset → Create WO →
 * Assign → Start → Complete → Close
 */

import { test, expect } from '@playwright/test';

test.describe('Work Order Complete Workflow', () => {
  let siteId: string;
  let assetId: string;
  let workOrderId: string;

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@dcmms.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Step 1: Create a new site', async ({ page }) => {
    // Navigate to sites page
    await page.click('a[href="/sites"]');
    await expect(page).toHaveURL(/.*sites/);

    // Click "New Site" button
    await page.click('button:has-text("New Site")');

    // Fill in site form
    await page.fill('input[name="name"]', 'E2E Test Solar Farm');
    await page.fill('input[name="code"]', 'E2E-SOLAR-01');
    await page.fill('textarea[name="description"]', 'Automated test site for E2E testing');
    await page.fill('input[name="address"]', '123 Test Street, Test City, TC 12345');
    await page.fill('input[name="latitude"]', '37.7749');
    await page.fill('input[name="longitude"]', '-122.4194');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Should redirect to sites list
    await expect(page).toHaveURL(/.*sites/);

    // Verify site appears in list
    await expect(page.locator('text=E2E Test Solar Farm')).toBeVisible();

    // Extract site ID from the row (for next test)
    const siteRow = page.locator('tr:has-text("E2E Test Solar Farm")');
    siteId = await siteRow.getAttribute('data-site-id') || 'test-site-001';
  });

  test('Step 2: Create an asset under the site', async ({ page }) => {
    // Navigate to assets page
    await page.click('a[href="/assets"]');
    await expect(page).toHaveURL(/.*assets/);

    // Click "New Asset" button
    await page.click('button:has-text("New Asset")');

    // Fill in asset form
    await page.fill('input[name="name"]', 'E2E Test Inverter');
    await page.fill('input[name="assetTag"]', 'E2E-INV-001');
    await page.fill('textarea[name="description"]', 'Test inverter for E2E workflow');

    // Select asset type
    await page.click('button[role="combobox"]:near(:text("Asset Type"))');
    await page.click('text=Inverter');

    // Select site (should show E2E Test Solar Farm)
    await page.click('button[role="combobox"]:near(:text("Site"))');
    await page.click('text=E2E Test Solar Farm');

    // Select status
    await page.click('button[role="combobox"]:near(:text("Status"))');
    await page.click('text=Operational');

    // Fill manufacturer info
    await page.fill('input[name="manufacturer"]', 'Test Manufacturer');
    await page.fill('input[name="model"]', 'INV-5000X');
    await page.fill('input[name="serialNumber"]', 'E2E-SN-12345');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Should redirect to assets list
    await expect(page).toHaveURL(/.*assets/);

    // Verify asset appears in list
    await expect(page.locator('text=E2E Test Inverter')).toBeVisible();

    // Extract asset ID from the row (for next test)
    const assetRow = page.locator('tr:has-text("E2E Test Inverter")');
    assetId = await assetRow.getAttribute('data-asset-id') || 'test-asset-001';
  });

  test('Step 3: Create a work order for the asset', async ({ page }) => {
    // Navigate to work orders page
    await page.click('a[href="/work-orders"]');
    await expect(page).toHaveURL(/.*work-orders/);

    // Click "New Work Order" button
    await page.click('button:has-text("New Work Order")');
    await expect(page).toHaveURL(/.*work-orders\/new/);

    // Fill in basic info
    await page.fill('input[name="title"]', 'E2E Test: Replace Cooling Fan');
    await page.fill('textarea[name="description"]', 'Automated E2E test work order - Replace faulty cooling fan');

    // Select work order type
    await page.click('button[role="combobox"]#type');
    await page.click('text=Corrective');

    // Select priority
    await page.click('button[role="combobox"]#priority');
    await page.click('text=High');

    // Select asset (should show E2E Test Inverter)
    await page.click('button[role="combobox"]#assetId');
    await page.click('text=E2E Test Inverter');

    // Site should auto-fill - verify it's populated
    const siteSelect = page.locator('button[role="combobox"]#siteId');
    await expect(siteSelect).toHaveAttribute('data-disabled', 'true');

    // Fill estimated hours
    await page.fill('input[name="estimatedHours"]', '4');

    // Set scheduled dates (today and tomorrow)
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.fill('input[name="scheduledStartDate"]', today);
    await page.fill('input[name="scheduledEndDate"]', tomorrow);

    // Go to tasks tab
    await page.click('button[role="tab"]:has-text("Tasks")');

    // Add a task
    await page.fill('input[placeholder="Task title"]', 'Shut down inverter');
    await page.fill('input[placeholder="Task description (optional)"]', 'Follow safety procedures');
    await page.click('button:has-text("Add Task")');

    // Add another task
    await page.fill('input[placeholder="Task title"]', 'Replace cooling fan');
    await page.click('button:has-text("Add Task")');

    // Verify tasks appear
    await expect(page.locator('text=Shut down inverter')).toBeVisible();
    await expect(page.locator('text=Replace cooling fan')).toBeVisible();

    // Go to parts tab
    await page.click('button[role="tab"]:has-text("Parts")');

    // Add a part
    await page.fill('input[placeholder="Part name"]', 'Cooling Fan Assembly');
    await page.fill('input[placeholder="Qty"]', '1');
    await page.click('button:has-text("Add Part")');

    // Verify part appears
    await expect(page.locator('text=Cooling Fan Assembly')).toBeVisible();

    // Submit work order
    await page.click('button:has-text("Create & Schedule")');

    // Should redirect to work orders list
    await expect(page).toHaveURL(/.*work-orders$/);

    // Verify work order appears in list
    await expect(page.locator('text=E2E Test: Replace Cooling Fan')).toBeVisible();

    // Verify status is "Scheduled"
    const woRow = page.locator('tr:has-text("E2E Test: Replace Cooling Fan")');
    await expect(woRow.locator('text=Scheduled')).toBeVisible();

    // Click on work order to get ID
    await page.click('text=E2E Test: Replace Cooling Fan');

    // Extract work order ID from URL
    const url = page.url();
    workOrderId = url.split('/work-orders/')[1].split('?')[0];
  });

  test('Step 4: Assign the work order', async ({ page }) => {
    // Navigate to the work order details
    await page.goto(`/work-orders/${workOrderId || 'test-wo-001'}`);

    // Verify work order details are visible
    await expect(page.locator('h1:has-text("E2E Test: Replace Cooling Fan")')).toBeVisible();

    // Check if work order is already assigned, if not click Edit to assign
    const assignedTo = page.locator('text=Assigned To');
    const isUnassigned = await page.locator('text=Unassigned').isVisible();

    if (isUnassigned) {
      // Click Edit button
      await page.click('button:has-text("Edit")');

      // Assign to a technician
      await page.click('button[role="combobox"]#assignedToId');
      await page.click('text=John Smith');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Should redirect back to details
      await expect(page).toHaveURL(/.*work-orders\/.*$/);

      // Verify assignment
      await expect(page.locator('text=John Smith')).toBeVisible();
    }
  });

  test('Step 5: Start the work order', async ({ page }) => {
    // Navigate to the work order details
    await page.goto(`/work-orders/${workOrderId || 'test-wo-001'}`);

    // Click "Start" button
    await page.click('button:has-text("Start")');

    // Confirm in dialog
    await page.click('button:has-text("Confirm")');

    // Wait for status to update
    await page.waitForTimeout(1000);

    // Verify status changed to "In Progress"
    await expect(page.locator('text=In Progress')).toBeVisible();
  });

  test('Step 6: Complete tasks and mark work order as complete', async ({ page }) => {
    // Navigate to the work order details
    await page.goto(`/work-orders/${workOrderId || 'test-wo-001'}`);

    // Go to Tasks tab
    await page.click('button[role="tab"]:has-text("Tasks")');

    // Complete first task
    const task1Checkbox = page.locator('input[type="checkbox"]').first();
    await task1Checkbox.check();

    // Complete second task
    const task2Checkbox = page.locator('input[type="checkbox"]').nth(1);
    await task2Checkbox.check();

    // Wait a moment for auto-save (if implemented)
    await page.waitForTimeout(500);

    // Go back to Details tab
    await page.click('button[role="tab"]:has-text("Details")');

    // Click "Complete" button
    await page.click('button:has-text("Complete")');

    // Confirm in dialog
    await page.click('button:has-text("Confirm")');

    // Wait for status to update
    await page.waitForTimeout(1000);

    // Verify status changed to "Completed"
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('Step 7: Close the work order', async ({ page }) => {
    // Navigate to the work order details
    await page.goto(`/work-orders/${workOrderId || 'test-wo-001'}`);

    // Click "Close" button
    await page.click('button:has-text("Close")');

    // Confirm in dialog
    await page.click('button:has-text("Confirm")');

    // Wait for status to update
    await page.waitForTimeout(1000);

    // Verify status changed to "Closed"
    await expect(page.locator('text=Closed')).toBeVisible();
  });

  test('Step 8: Verify complete workflow in history', async ({ page }) => {
    // Navigate to the work order details
    await page.goto(`/work-orders/${workOrderId || 'test-wo-001'}`);

    // Go to History tab
    await page.click('button[role="tab"]:has-text("History")');

    // Verify all state transitions are recorded
    await expect(page.locator('text=Created')).toBeVisible();
    await expect(page.locator('text=Scheduled')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Closed')).toBeVisible();
  });
});
