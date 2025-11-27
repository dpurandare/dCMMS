# dCMMS User Guide

Welcome to the dCMMS (Distributed Computerized Maintenance Management System) user guide. This documentation will help you get started with managing your maintenance operations efficiently.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Sites](#managing-sites)
3. [Managing Assets](#managing-assets)
4. [Managing Compliance Reports](#managing-compliance-reports)
5. [Managing Work Orders](#managing-work-orders)
5. [Using the Mobile App](#using-the-mobile-app)
6. [FAQ](#faq)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Logging In

1. Open your web browser and navigate to your dCMMS instance (e.g., `https://dcmms.your-company.com`)
2. Enter your email address and password
3. Click **Sign In**

> **Note:** Contact your system administrator if you don't have login credentials.

### Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Stats Cards**: Quick overview of pending work orders, critical alerts, and asset status
- **Sidebar Navigation**: Access to all main features
  - Home (Dashboard)
  - Work Orders
  - Assets
  - Sites
  - Alerts
  - Analytics
  - Reports
- **Top Bar**: Search, notifications, and user profile menu

---

## Managing Sites

Sites are physical locations where your assets are located (e.g., solar farms, wind farms, factories).

### Creating a New Site

1. Click **Sites** in the sidebar navigation
2. Click the **New Site** button in the top right
3. Fill in the site information:
   - **Name*** (required): e.g., "Solar Farm North"
   - **Code***: Unique identifier, e.g., "SF-NORTH-01"
   - **Description**: Brief description of the site
   > **Note:** The dCMMS platform supports multiple energy types (Solar, Wind, Hydro, Biomass, Geothermal, Hybrid) for specialized forecasting. Currently, this is configured during backend setup or auto-detected.
   - **Address**: Physical address
   - **Coordinates**: Latitude and longitude (for mapping)
   - **Timezone**: Select the appropriate timezone
4. Click **Create Site**

### Viewing Site Details

1. Go to **Sites** page
2. Click on any site name to view details
3. The site details page shows:
   - Site information
   - List of assets at this site
   - Active work orders for this site
   - Location map (if coordinates are provided)

### Editing a Site

1. Navigate to the site details page
2. Click the **Edit** button
3. Make your changes
4. Click **Save Changes**

### Deleting a Site

> **Warning:** You can only delete sites that have no assets. Move or delete all assets first.

1. Navigate to the site details page
2. Click the **Delete** button
3. Confirm the deletion

---

## Managing Assets

Assets are physical equipment or components that require maintenance (e.g., inverters, transformers, solar panels).

### Creating a New Asset

1. Click **Assets** in the sidebar navigation
2. Click the **New Asset** button
3. Fill in the asset information:

#### Basic Information
- **Name*** (required): e.g., "Inverter INV-001"
- **Asset Tag***: Unique identifier, e.g., "INV-001"
- **Description**: What this asset does
- **Asset Type***: Select from dropdown (Inverter, Transformer, Solar Panel Array, etc.)
- **Status***: Current status (Operational, Maintenance, Offline, Decommissioned, Failed)
- **Site***: Select the location of this asset

#### Hierarchy (Optional)
- **Parent Asset**: If this asset is part of another asset, select the parent
  - Example: A cooling fan might be a child of an inverter
  - You can create up to 3 levels of hierarchy

#### Technical Details
- **Manufacturer**: e.g., "SolarTech Inc"
- **Model**: e.g., "ST-5000X"
- **Serial Number**: e.g., "ST5000-12345"
- **Installation Date**: When the asset was installed
- **Warranty Expiration**: When the warranty ends

4. Click **Create Asset**

### Understanding Asset Hierarchy

dCMMS supports up to 3 levels of asset hierarchy:

```
Level 1: Solar Panel Array (Parent)
  └─ Level 2: Inverter (Child)
      └─ Level 3: Cooling Fan (Grandchild)
```

**Benefits:**
- Organize complex equipment
- Track maintenance at component level
- Understand dependencies between assets

**To view hierarchy:**
1. Go to an asset's detail page
2. Click the **Hierarchy** tab
3. See all parent and child assets
4. Click any asset to navigate

### Viewing Asset Details

1. Go to **Assets** page
2. Use filters to find assets:
   - **Status**: Filter by operational status
   - **Asset Type**: Filter by equipment type
   - **Search**: Search by name or asset tag
3. Click on any asset to view details

The asset details page has several tabs:

- **Overview**: Basic information, technical details, and current status
- **Hierarchy**: Parent and child assets
- **Work Orders**: All work orders for this asset (active and historical)
- **Documents**: Manuals, specs, and other documents (feature coming soon)
- **Telemetry**: Real-time monitoring data (feature coming soon)

### Editing an Asset

1. Navigate to the asset details page
2. Click the **Edit** button
3. Make your changes
4. Click **Save Changes**

### Changing Asset Status

Common status changes:

- **Operational**: Asset is working normally
- **Maintenance**: Asset is undergoing maintenance
- **Failed**: Asset has failed and needs immediate attention
- **Offline**: Asset is turned off
- **Decommissioned**: Asset is no longer in use

### Deleting an Asset

> **Warning:** You can only delete assets that have no work orders and no child assets.

1. Navigate to the asset details page
2. Click the **Delete** button
3. Confirm the deletion

---

## Managing Compliance Reports

Compliance reports help you meet regulatory requirements (CEA, MNRE) and track asset performance.

### Generating a New Report

1. Click **Reports** in the sidebar navigation
2. Click the **Generate Report** button
3. Fill in the report details:
   - **Template**: Select the report type (e.g., CEA Compliance, MNRE Quarterly)
   - **Date Range**: Select the period to cover
   - **Site** (Optional): Filter by specific site
4. Click **Generate**

### Viewing and Downloading Reports

1. Go to the **Reports** page
2. You will see a list of generated reports with their status (Draft, Final, Submitted)
3. Click the **Actions** menu (three dots) on a report to:
   - **View Details**: See report metadata and preview
   - **Download**: Download the report as PDF
   - **Delete**: Remove the report (if not submitted)

### Report Templates

- **CEA Compliance**: Standard format for Central Electricity Authority reporting
- **MNRE Quarterly**: Quarterly performance report for Ministry of New and Renewable Energy
- **Asset Maintenance**: Summary of maintenance activities and asset health
- **Performance Analysis**: Detailed generation and efficiency analysis

---

## Managing Work Orders

Work orders are maintenance tasks assigned to technicians for completion.

### Work Order Types

- **Corrective**: Fix something that broke
- **Preventive**: Scheduled maintenance to prevent failures
- **Predictive**: Maintenance based on sensor data or predictions
- **Inspection**: Regular inspections
- **Emergency**: Urgent repairs that can't wait

### Work Order Priority Levels

- **Critical**: System down, immediate action required
- **High**: Important, complete within 24 hours
- **Medium**: Normal priority, complete within a week
- **Low**: Can be scheduled later

### Work Order Status Lifecycle

```
Draft → Scheduled → In Progress → Completed → Closed
            ↓            ↓
         Assigned    On Hold
```

### Creating a New Work Order

1. Click **Work Orders** in the sidebar navigation
2. Click **New Work Order**
3. Follow the 3-step wizard:

#### Step 1: Basic Information

- **Title*** (required): Brief description, e.g., "Replace cooling fan"
- **Description**: Detailed explanation of the work needed
- **Type***: Select work order type
- **Priority***: Select priority level
- **Asset***: Select the asset requiring maintenance
  - Site will auto-fill based on asset location
- **Assign To**: Select a technician (or leave unassigned)
- **Estimated Hours**: How long you expect the work to take
- **Scheduled Start/End Dates**: When the work should be performed

Click **Next: Add Tasks** when done.

#### Step 2: Tasks (Optional)

Add a checklist of tasks the technician needs to complete:

1. Enter a task title (e.g., "Shut down inverter")
2. Optionally add a description
3. Click **Add Task**
4. Repeat for all tasks
5. Tasks will be numbered in sequence

Click **Next: Add Parts** when done.

#### Step 3: Parts (Optional)

Add parts/materials needed for the work:

1. Enter the part name (e.g., "Cooling Fan Assembly")
2. Enter the quantity needed
3. Click **Add Part**
4. Repeat for all parts needed

#### Submitting the Work Order

You have two options:

- **Save as Draft**: Save the work order without scheduling it (status: `draft`)
- **Create & Schedule**: Create and schedule the work order immediately (status: `scheduled`)

### Viewing Work Orders

1. Go to **Work Orders** page
2. Use filters to find work orders:
   - **Status**: Filter by current status
   - **Priority**: Filter by priority level
   - **Type**: Filter by work order type
   - **Search**: Search by title or work order ID

The work orders list shows:
- Work Order ID
- Title
- Type (badge)
- Priority (colored badge)
- Status (colored badge)
- Assigned To
- Scheduled Start Date
- Actions (View, Edit, Delete)

### Work Order Details Page

Click on any work order to see its details. The page has multiple tabs:

#### Details Tab

- Work order information
- Asset details
- Assignment information
- Scheduling dates
- State transition buttons (Start, Hold, Complete, etc.)

#### Tasks Tab

- View all tasks
- Check off completed tasks (technicians)
- Tasks show completion status

#### Parts Tab

- List of required parts
- Quantities needed
- (Future: Part availability and reservation)

#### Labor Tab

- Labor hours tracking (feature coming soon)
- Time entries by technicians

#### Attachments Tab

- Upload photos, documents, or videos
- (Feature coming soon)

#### History Tab

- Complete audit trail
- All state changes with timestamps
- Notes and comments

### Working on a Work Order (For Technicians)

#### 1. Starting Work

1. Open the assigned work order
2. Review the details, tasks, and required parts
3. Click the **Start** button
4. Optionally add notes
5. Click **Confirm**

Status changes from `Scheduled` → `In Progress`

#### 2. Completing Tasks

1. Go to the **Tasks** tab
2. Check off each task as you complete it
3. All tasks should be completed before finishing the work order

#### 3. Putting Work on Hold

If you need to pause work (waiting for parts, etc.):

1. Click the **Hold** button
2. Add a note explaining why
3. Click **Confirm**

Status changes to `On Hold`

To resume later:
1. Click the **Resume** button
2. Status changes back to `In Progress`

#### 4. Completing the Work

1. Ensure all tasks are checked off
2. Click the **Complete** button
3. Add completion notes
4. Optionally enter actual hours worked
5. Click **Confirm**

Status changes to `Completed`

#### 5. Closing the Work Order (Supervisors)

After reviewing the completed work:

1. Open the completed work order
2. Verify all work was done correctly
3. Click the **Close** button
4. Add any final notes
5. Click **Confirm**

Status changes to `Closed`

### Editing a Work Order

> **Note:** You can only edit work orders in `draft` status. Once scheduled or in progress, you'll need to cancel and create a new one, or modify through state transitions.

1. Navigate to the work order details page
2. Click **Edit**
3. Make your changes across all 3 tabs
4. Click **Save Changes**

### Canceling a Work Order

1. Navigate to the work order details page
2. Click **Cancel**
3. Add a reason for cancellation
4. Click **Confirm**

Status changes to `Cancelled`

---

## Using the Mobile App

> **Coming Soon:** The mobile app is currently in development. This section will be updated once available.

### Features (Planned)

- View assigned work orders
- Update work order status
- Complete task checklists
- Take photos and add to work orders
- **Offline Mode**: Work without internet, sync later
- Barcode/QR code scanning for assets

### Offline Mode (Planned)

1. Open the mobile app while connected to internet
2. Work orders and assets will sync automatically
3. When offline, you can still:
   - View work orders
   - Complete tasks
   - Take photos
   - Update status
4. When you reconnect to internet:
   - All changes will automatically sync
   - You'll see a sync confirmation

---

## FAQ

### General Questions

**Q: What browsers are supported?**

A: dCMMS works best on modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Q: Can I access dCMMS on my phone?**

A: Yes! The web interface is mobile-responsive. A dedicated mobile app is currently in development.

**Q: How do I reset my password?**

A: Click "Forgot Password?" on the login page and follow the instructions. (Feature implementation depends on your organization's identity provider)

### Assets & Energy Types

**Q: What energy types are supported?**

A: dCMMS supports Solar, Wind, Hydro, Biomass, Geothermal, and Hybrid energy types. Each type uses specialized forecasting models (e.g., solar irradiance for solar, wind speed/density for wind) to ensure accurate generation predictions.

**Q: Can I import assets from a spreadsheet?**

A: Bulk import is planned for a future release. Currently, assets must be created individually.

**Q: How many levels of asset hierarchy can I create?**

A: You can create up to 3 levels (Parent → Child → Grandchild).

**Q: What's the difference between an asset being "Offline" vs "Failed"?**

A:
- **Offline**: Asset is intentionally turned off (e.g., for maintenance, seasonal shutdown)
- **Failed**: Asset has broken down and needs immediate repair

### Work Orders

**Q: Can I assign a work order to multiple technicians?**

A: Currently, work orders can only be assigned to one technician at a time. For team work, consider creating separate work orders for each technician's portion.

**Q: What happens if I delete a work order?**

A: Deleted work orders are permanently removed from the system. Consider canceling instead, which preserves the history.

**Q: Can I duplicate a work order?**

A: Duplication feature is planned for a future release. For now, you can create a new work order and copy the information manually.

**Q: Why can't I edit a scheduled work order?**

A: Once a work order is scheduled, it enters a controlled workflow. To make changes, you'll need to cancel it and create a new one, or use state transitions.

### Permissions

**Q: Who can create work orders?**

A: Permissions depend on your role:
- **Admins**: Full access
- **Managers**: Can create, edit, assign work orders
- **Technicians**: Can view assigned work orders and update status
- **Viewers**: Read-only access

**Q: How do I request additional permissions?**

A: Contact your system administrator to request role changes.

---

## Troubleshooting

### Login Issues

**Problem: I can't log in**

Solutions:
1. Verify you're using the correct email address
2. Check that Caps Lock is off
3. Try resetting your password
4. Clear your browser cache and cookies
5. Try a different browser
6. Contact your system administrator

**Problem: "Invalid credentials" error**

- Double-check your email and password
- If you recently changed your password, make sure you're using the new one
- Account might be locked after multiple failed attempts - contact admin

### Performance Issues

**Problem: Pages are loading slowly**

Solutions:
1. Check your internet connection
2. Clear browser cache: Settings → Privacy → Clear browsing data
3. Close unnecessary browser tabs
4. Try a different browser
5. Check if other websites are also slow (might be network issue)

**Problem: Work order list not loading**

Solutions:
1. Refresh the page (F5 or Cmd+R)
2. Try removing filters
3. Check browser console for errors (F12 → Console tab)
4. Try a different browser
5. Contact support if issue persists

### Asset Issues

**Problem: Can't create asset - "Site is required" error**

Solution: You must create at least one site before creating assets. Go to Sites → New Site first.

**Problem: Can't select parent asset in dropdown**

Possible causes:
- No other assets exist yet
- Trying to create circular reference (child can't be parent of its parent)
- Parent asset belongs to a different site

**Problem: Asset not appearing in work order dropdown**

Check:
- Asset status is "Operational" or "Maintenance" (decommissioned assets don't show)
- Asset belongs to the correct site
- You have permission to view this asset

### Work Order Issues

**Problem: Can't transition work order status**

Common reasons:
- Work order is in wrong state (check status lifecycle)
- You don't have permission for this action
- Required fields are missing

**Problem: Tasks not saving**

Solutions:
1. Make sure you have permission to edit
2. Check that task title is not empty
3. Try refreshing the page
4. Clear browser cache

**Problem: "Save Changes" button is disabled**

Reasons:
- No changes have been made
- Required fields are empty
- Work order is in a status that can't be edited

### Mobile App Issues (Coming Soon)

**Problem: Offline data not syncing**

Solutions:
1. Make sure you have internet connection
2. Check that app has permission to use internet
3. Try force-closing and reopening the app
4. Check sync status in app settings

### Getting Help

If you can't resolve an issue:

1. **Check this guide**: Review the relevant section above
2. **Search documentation**: Use Ctrl+F to search this page
3. **Contact support**:
   - Email: support@dcmms.com
   - Phone: (555) 123-4567
   - Help desk: https://support.dcmms.com

4. **Report a bug**:
   - Go to Help → Report Issue
   - Describe what happened
   - Include steps to reproduce
   - Attach screenshots if possible

---

## Tips & Best Practices

### Asset Management

- ✅ Use consistent naming conventions for assets (e.g., "INV-001", "INV-002")
- ✅ Keep asset tags unique and scannable (consider using barcodes/QR codes)
- ✅ Update asset status promptly when issues arise
- ✅ Use hierarchy for complex equipment (makes maintenance easier)
- ✅ Fill in manufacturer and warranty information (helps with planning)

### Work Order Management

- ✅ Write clear, specific work order titles
- ✅ Include detailed descriptions - technicians need context
- ✅ Set realistic estimated hours
- ✅ Create task checklists for complex work (nothing gets forgotten)
- ✅ Use correct priority levels - don't mark everything as "Critical"
- ✅ Add notes when transitioning states (helps with audit trail)
- ✅ Close work orders promptly after completion (keeps reports accurate)

### General

- ✅ Use search filters to find what you need quickly
- ✅ Review the dashboard daily for pending work
- ✅ Keep your profile information up to date
- ✅ Log out when using shared computers

---

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Search | Ctrl + K | Cmd + K |
| New Work Order | Ctrl + N | Cmd + N |
| Save | Ctrl + S | Cmd + S |
| Cancel/Close Dialog | Esc | Esc |
| Refresh Page | F5 | Cmd + R |

---

## Version Information

**Guide Version:** 1.1
**dCMMS Version:** MVP
**Last Updated:** November 2025

For the latest version of this guide, visit: https://docs.dcmms.com
