# Documentation System Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Documentation](#2-api-documentation)
3. [User Guides](#3-user-guides)
4. [Admin Documentation](#4-admin-documentation)
5. [Developer Documentation](#5-developer-documentation)
6. [Release Notes](#6-release-notes)
7. [Knowledge Base](#7-knowledge-base)
8. [Documentation Workflow](#8-documentation-workflow)
9. [Search and Navigation](#9-search-and-navigation)

---

## 1. Overview

### 1.1 Purpose

Establish comprehensive documentation system for dCMMS covering API reference, user guides, administration procedures, and developer resources.

### 1.2 Documentation Types

```yaml
documentation_types:
  api_reference:
    format: "OpenAPI 3.0 (Swagger)"
    audience: "Developers, integration partners"
    auto_generated: true
    update_frequency: "Every release"

  user_guides:
    format: "Markdown, HTML"
    audience: "End users by role"
    auto_generated: false
    update_frequency: "Per feature release"

  admin_guides:
    format: "Markdown, HTML"
    audience: "System administrators, tenant admins"
    auto_generated: false
    update_frequency: "Per configuration change"

  developer_docs:
    format: "Markdown, code comments"
    audience: "Internal developers, contributors"
    auto_generated: "Partial (API, schema)"
    update_frequency: "Continuous"

  release_notes:
    format: "Markdown, HTML"
    audience: "All users"
    auto_generated: "Semi-automated"
    update_frequency: "Every release"

  knowledge_base:
    format: "Markdown, HTML"
    audience: "All users, support team"
    auto_generated: false
    update_frequency: "As needed (FAQs, troubleshooting)"
```

---

## 2. API Documentation

### 2.1 OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: dCMMS API
  description: |
    Distributed Clean Energy Management & Maintenance System API

    # Authentication
    All API requests require authentication using JWT Bearer tokens.

    # Rate Limiting
    API requests are rate-limited based on user tier:
    - Free: 1,000 requests/hour
    - Pro: 10,000 requests/hour
    - Enterprise: 100,000 requests/hour

    # Pagination
    List endpoints support pagination using `page` and `limit` query parameters.

    # Filtering
    Most list endpoints support filtering using query parameters matching field names.

    # Error Handling
    Errors follow RFC 7807 Problem Details format.

  version: 1.0.0
  contact:
    name: dCMMS API Support
    email: api-support@dcmms.example.com
    url: https://docs.dcmms.example.com

  license:
    name: Proprietary
    url: https://dcmms.example.com/license

servers:
  - url: https://api.dcmms.example.com/v1
    description: Production
  - url: https://api-staging.dcmms.example.com/v1
    description: Staging
  - url: http://localhost:3000/v1
    description: Local development

tags:
  - name: Work Orders
    description: Work order management operations
  - name: Assets
    description: Asset and equipment management
  - name: Alerts
    description: Alert and notification management
  - name: Users
    description: User management and authentication
  - name: Sites
    description: Site and location management

paths:
  /work-orders:
    get:
      summary: List work orders
      description: |
        Retrieve a paginated list of work orders with optional filtering.

        # Permissions
        - Requires `work_orders:read` permission
        - Users only see work orders for sites they have access to

        # Filtering
        You can filter by any work order field using query parameters.

      operationId: listWorkOrders
      tags:
        - Work Orders
      security:
        - BearerAuth: []
      parameters:
        - name: page
          in: query
          description: Page number (1-indexed)
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          description: Number of items per page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          description: Filter by status
          schema:
            type: array
            items:
              type: string
              enum: [draft, in_progress, on_hold, completed, cancelled]
        - name: priority
          in: query
          description: Filter by priority
          schema:
            type: string
            enum: [emergency, high, medium, low]
        - name: siteId
          in: query
          description: Filter by site ID
          schema:
            type: string
        - name: assignedTo
          in: query
          description: Filter by assigned user ID
          schema:
            type: string
        - name: createdAfter
          in: query
          description: Filter by creation date (ISO 8601)
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/WorkOrder'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
              examples:
                success:
                  summary: Example response
                  value:
                    data:
                      - workOrderId: "WO-001"
                        type: "preventive_maintenance"
                        status: "in_progress"
                        priority: "medium"
                        title: "Solar panel inspection - Array 3A"
                        assignedTo: "user-123"
                        siteId: "SITE-AZ-001"
                        createdAt: "2025-11-10T08:00:00Z"
                    pagination:
                      page: 1
                      limit: 20
                      total: 150
                      pages: 8
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

    post:
      summary: Create work order
      description: Create a new work order
      operationId: createWorkOrder
      tags:
        - Work Orders
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWorkOrderRequest'
            examples:
              preventive:
                summary: Preventive maintenance work order
                value:
                  type: "preventive_maintenance"
                  title: "Quarterly inverter inspection"
                  priority: "medium"
                  siteId: "SITE-AZ-001"
                  assetId: "INV-3A"
                  scheduledFor: "2025-11-15T09:00:00Z"
                  assignedTo: "user-123"
                  description: "Perform visual inspection, thermal imaging, and electrical tests"
      responses:
        '201':
          description: Work order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkOrder'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    WorkOrder:
      type: object
      properties:
        workOrderId:
          type: string
          description: Unique work order identifier
          example: "WO-001"
        type:
          type: string
          enum: [preventive_maintenance, corrective_maintenance, inspection, project, emergency]
        status:
          type: string
          enum: [draft, in_progress, on_hold, completed, cancelled]
        priority:
          type: string
          enum: [emergency, high, medium, low]
        title:
          type: string
          maxLength: 200
        description:
          type: string
        siteId:
          type: string
        assetId:
          type: string
          nullable: true
        assignedTo:
          type: string
          nullable: true
        scheduledFor:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
        createdBy:
          type: string
        updatedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
          nullable: true

    CreateWorkOrderRequest:
      type: object
      required:
        - type
        - title
        - siteId
      properties:
        type:
          type: string
          enum: [preventive_maintenance, corrective_maintenance, inspection, project, emergency]
        title:
          type: string
          maxLength: 200
        description:
          type: string
        priority:
          type: string
          enum: [emergency, high, medium, low]
          default: medium
        siteId:
          type: string
        assetId:
          type: string
        assignedTo:
          type: string
        scheduledFor:
          type: string
          format: date-time

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        pages:
          type: integer

    Error:
      type: object
      properties:
        type:
          type: string
          format: uri
          example: "https://docs.dcmms.example.com/errors/invalid-request"
        title:
          type: string
          example: "Invalid request"
        status:
          type: integer
          example: 400
        detail:
          type: string
          example: "The 'siteId' field is required"
        instance:
          type: string
          format: uri
          example: "/api/v1/work-orders"

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            type: "https://docs.dcmms.example.com/errors/unauthorized"
            title: "Unauthorized"
            status: 401
            detail: "Authentication required. Please provide a valid JWT token."

    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    RateLimitExceeded:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### 2.2 API Documentation Generation

```javascript
// Generate OpenAPI spec from code annotations
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'dCMMS API',
      version: '1.0.0',
      description: 'Distributed Clean Energy Management & Maintenance System API'
    },
    servers: [
      {
        url: 'https://api.dcmms.example.com/v1',
        description: 'Production'
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJsdoc(options);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'dCMMS API Documentation'
}));

// Serve raw OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.json(specs);
});

/**
 * @swagger
 * /work-orders:
 *   get:
 *     summary: List work orders
 *     tags: [Work Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WorkOrder'
 */
router.get('/work-orders', authenticate, async (req, res) => {
  // Implementation
});
```

### 2.3 Interactive API Console

```html
<!-- API Console with Stoplight Elements -->
<!DOCTYPE html>
<html>
<head>
  <title>dCMMS API Console</title>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
</head>
<body>
  <elements-api
    apiDescriptionUrl="https://api.dcmms.example.com/api-docs.json"
    router="hash"
    layout="sidebar"
    tryItCredentialsPolicy="same-origin"
  />
</body>
</html>
```

---

## 3. User Guides

### 3.1 User Guide Structure

```yaml
user_guides:
  getting_started:
    - introduction.md
    - creating_account.md
    - logging_in.md
    - navigating_interface.md
    - customizing_profile.md

  work_orders:
    - creating_work_orders.md
    - assigning_work_orders.md
    - completing_work_orders.md
    - work_order_types.md
    - work_order_attachments.md
    - work_order_history.md

  assets:
    - asset_hierarchy.md
    - viewing_asset_details.md
    - asset_maintenance_history.md
    - creating_assets.md

  alerts:
    - understanding_alerts.md
    - acknowledging_alerts.md
    - configuring_alert_rules.md
    - escalation_management.md

  mobile_app:
    - installing_mobile_app.md
    - offline_mode.md
    - barcode_scanning.md
    - photo_capture.md
    - syncing_data.md

  reports:
    - pre_built_reports.md
    - custom_report_builder.md
    - scheduling_reports.md
    - exporting_reports.md

  troubleshooting:
    - sync_errors.md
    - login_issues.md
    - performance_problems.md
    - common_errors.md
```

### 3.2 Example User Guide Page

```markdown
# Creating a Work Order

Learn how to create and configure work orders in dCMMS.

## Prerequisites

- You must have the `work_orders:create` permission
- You must have access to at least one site

## Steps

### 1. Navigate to Work Orders

Click **Work Orders** in the main navigation menu.

![Work Orders Menu](images/work-orders-menu.png)

### 2. Click Create Work Order

Click the **+ Create Work Order** button in the top-right corner.

![Create Work Order Button](images/create-work-order-button.png)

### 3. Fill Out Work Order Details

**Required Fields:**
- **Type**: Select the type of work order (preventive maintenance, corrective maintenance, inspection, etc.)
- **Title**: Enter a descriptive title (max 200 characters)
- **Site**: Select the site where the work will be performed

**Optional Fields:**
- **Asset**: Link the work order to a specific asset or equipment
- **Priority**: Set the priority (emergency, high, medium, low). Default is medium.
- **Assigned To**: Assign the work order to a specific user or team
- **Scheduled For**: Schedule the work for a specific date and time
- **Description**: Provide detailed instructions and context

![Work Order Form](images/work-order-form.png)

### 4. Add Attachments (Optional)

You can attach documents, photos, diagrams, or manuals to provide additional context.

1. Click the **Attachments** tab
2. Click **Upload Files** or drag and drop files
3. Supported formats: PDF, DOCX, JPG, PNG (max 25 MB per file)

### 5. Submit Work Order

Click **Submit** to create the work order. The work order will appear in the work order list with status "Draft".

## What's Next?

- [Assigning Work Orders](assigning_work_orders.md)
- [Work Order Types Explained](work_order_types.md)
- [Setting Work Order Priority](work_order_priority.md)

## Related Topics

- [Asset Management](../assets/asset_hierarchy.md)
- [Mobile App Work Orders](../mobile/completing_work_orders.md)

## Need Help?

If you encounter issues creating work orders:
- Check the [Troubleshooting Guide](../troubleshooting/work_order_errors.md)
- Contact support at support@dcmms.example.com
```

---

## 4. Admin Documentation

### 4.1 Admin Guide Structure

```yaml
admin_guides:
  installation:
    - system_requirements.md
    - kubernetes_deployment.md
    - database_setup.md
    - initial_configuration.md

  configuration:
    - tenant_setup.md
    - site_configuration.md
    - user_management.md
    - role_based_access_control.md
    - integration_configuration.md
    - sso_setup.md
    - email_configuration.md

  operations:
    - backup_and_restore.md
    - monitoring_and_alerting.md
    - log_management.md
    - performance_tuning.md
    - scaling_guidelines.md

  security:
    - security_hardening.md
    - ssl_certificate_management.md
    - audit_logging.md
    - data_encryption.md
    - vulnerability_management.md

  maintenance:
    - upgrading_dcmms.md
    - database_maintenance.md
    - clearing_cache.md
    - troubleshooting_issues.md

  data_management:
    - bulk_import_assets.md
    - bulk_import_work_orders.md
    - data_migration.md
    - data_retention_policies.md
```

### 4.2 Example Admin Guide Page

```markdown
# Configuring SSO with Okta

This guide explains how to configure Single Sign-On (SSO) using Okta as the identity provider.

## Prerequisites

- Okta account with admin access
- dCMMS system admin access
- SSL certificate configured

## Step 1: Create OIDC Application in Okta

1. Log in to your Okta admin console
2. Navigate to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select **OIDC - OpenID Connect**
5. Select **Web Application**
6. Configure the application:

   - **App integration name**: dCMMS
   - **Grant type**: Authorization Code
   - **Sign-in redirect URIs**:
     ```
     https://dcmms.example.com/auth/callback
     ```
   - **Sign-out redirect URIs**:
     ```
     https://dcmms.example.com/auth/logout
     ```
   - **Assignments**: Select users/groups who should have access

7. Click **Save**
8. Note down the **Client ID** and **Client Secret**

## Step 2: Configure dCMMS

### Using Environment Variables

Add the following environment variables to your dCMMS configuration:

```bash
# Okta OIDC Configuration
AUTH_PROVIDER=okta
OIDC_ISSUER=https://your-domain.okta.com/oauth2/default
OIDC_CLIENT_ID=<client-id-from-step-1>
OIDC_CLIENT_SECRET=<client-secret-from-step-1>
OIDC_REDIRECT_URI=https://dcmms.example.com/auth/callback
OIDC_SCOPES=openid,profile,email,groups

# Group Mapping
OIDC_GROUP_CLAIM=groups
OIDC_ROLE_MAPPING='{"DCMMS_Admins":"system_admin","DCMMS_Managers":"site_manager","DCMMS_Techs":"field_technician"}'
```

### Using Admin UI

1. Log in to dCMMS as system admin
2. Navigate to **Settings** > **Authentication**
3. Select **SSO / OIDC** tab
4. Fill in the configuration:

   | Field | Value |
   |-------|-------|
   | Provider | Okta |
   | Issuer URL | `https://your-domain.okta.com/oauth2/default` |
   | Client ID | From Step 1 |
   | Client Secret | From Step 1 |
   | Scopes | `openid profile email groups` |

5. Configure group mapping:

   | Okta Group | dCMMS Role |
   |------------|------------|
   | DCMMS_Admins | system_admin |
   | DCMMS_Managers | site_manager |
   | DCMMS_Techs | field_technician |

6. Click **Save Configuration**

## Step 3: Test SSO

1. Log out of dCMMS
2. Click **Log in with SSO**
3. You should be redirected to Okta
4. Log in with your Okta credentials
5. You should be redirected back to dCMMS and logged in

## Step 4: Enable Just-in-Time (JIT) Provisioning

JIT provisioning automatically creates user accounts when users log in via SSO for the first time.

Enable JIT provisioning in dCMMS settings:

```bash
OIDC_JIT_PROVISIONING=true
OIDC_JIT_DEFAULT_ROLE=field_technician
```

## Troubleshooting

### "Invalid redirect URI" error

**Cause**: The redirect URI in dCMMS doesn't match the one configured in Okta.

**Solution**: Ensure the redirect URI in Okta exactly matches your dCMMS callback URL, including protocol (https) and trailing slashes.

### Users not getting assigned roles

**Cause**: Group claim not configured correctly or group mapping missing.

**Solution**:
1. Verify Okta is sending the `groups` claim in the ID token
2. Check the group mapping in dCMMS settings
3. Ensure Okta group names exactly match the mapping configuration

### SSO login redirects to 404

**Cause**: Callback route not properly configured.

**Solution**: Restart dCMMS application after configuration changes.

## Related Documentation

- [User Management](user_management.md)
- [Role-Based Access Control](role_based_access_control.md)
- [Azure AD SSO Setup](sso_azure_ad.md)
```

---

## 5. Developer Documentation

### 5.1 Developer Guide Structure

```yaml
developer_guides:
  getting_started:
    - development_environment_setup.md
    - running_locally.md
    - database_schema.md
    - api_overview.md

  architecture:
    - system_architecture.md
    - data_flow.md
    - authentication_flow.md
    - offline_sync_architecture.md

  contributing:
    - code_style_guide.md
    - git_workflow.md
    - pull_request_process.md
    - testing_guidelines.md

  api_integration:
    - authentication.md
    - making_requests.md
    - handling_errors.md
    - webhooks.md
    - rate_limiting.md

  sdks:
    - javascript_sdk.md
    - python_sdk.md
    - java_sdk.md

  extending:
    - custom_plugins.md
    - custom_work_order_types.md
    - custom_report_types.md
```

### 5.2 Example Developer Guide Page

```markdown
# Development Environment Setup

This guide will help you set up your local development environment for dCMMS.

## Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **Redis** 6.x or higher
- **Docker** and **Docker Compose** (recommended)
- **Git**

## Quick Start with Docker Compose

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/dcmms/dcmms.git
cd dcmms

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec api npm run migrate

# Seed sample data
docker-compose exec api npm run seed

# Access the application
open http://localhost:3000
```

Default credentials:
- Email: `admin@example.com`
- Password: `admin123`

## Manual Setup

If you prefer to run services locally without Docker:

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure PostgreSQL

Create a database and user:

```sql
CREATE DATABASE dcmms_dev;
CREATE USER dcmms WITH PASSWORD 'dcmms_password';
GRANT ALL PRIVILEGES ON DATABASE dcmms_dev TO dcmms;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Database
DATABASE_URL=postgresql://dcmms:dcmms_password@localhost:5432/dcmms_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# API
PORT=3000
NODE_ENV=development
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

## Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
dcmms/
├── src/
│   ├── routes/          # API route handlers
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── migrations/          # Database migrations
├── seeds/               # Database seed data
├── tests/               # Test files
├── docs/                # Documentation
└── scripts/             # Build and deployment scripts
```

## Next Steps

- [API Overview](api_overview.md)
- [Database Schema](database_schema.md)
- [Contributing Guidelines](../contributing/code_style_guide.md)
```

---

## 6. Release Notes

### 6.1 Release Notes Template

```markdown
# Release Notes - v1.2.0

**Release Date:** November 15, 2025

## 🎉 New Features

### Work Order Attachments
You can now attach multiple files to work orders, including photos, PDFs, and documents.
- Upload up to 10 files per work order
- Maximum file size: 25 MB per file
- Supported formats: PDF, DOCX, JPG, PNG, MP4

**Learn more:** [Work Order Attachments Guide](docs/user-guides/work-orders/attachments.md)

### Mobile Barcode Scanning
Field technicians can now scan asset barcodes using the mobile app camera for quick access to equipment information.
- QR code and barcode support
- Offline barcode scanning
- Automatic asset lookup

**Learn more:** [Mobile Barcode Scanning](docs/user-guides/mobile/barcode-scanning.md)

### Custom Report Builder
Create custom reports with drag-and-drop interface.
- Visual query builder
- Schedule automated report delivery
- Export to PDF, Excel, CSV

**Learn more:** [Custom Report Builder](docs/user-guides/reports/custom-reports.md)

## ✨ Improvements

- **Performance:** 40% faster page load times for work order list
- **Search:** Improved search relevance using full-text search
- **Mobile:** Reduced mobile app size by 30%
- **Notifications:** Email notifications now include action buttons
- **Dashboard:** New KPI widgets for asset availability and MTTR

## 🐛 Bug Fixes

- Fixed issue where work order status wasn't updating after sync (#1234)
- Resolved mobile app crash when uploading photos offline (#1245)
- Fixed incorrect calculation of performance ratio in reports (#1256)
- Corrected timezone display issues in alert timestamps (#1267)
- Fixed memory leak in real-time dashboard updates (#1278)

## 🔧 Technical Changes

- Upgraded Node.js to v18.18.0
- Updated PostgreSQL to v14.9
- Migrated from Moment.js to date-fns (33 KB reduction)
- Implemented Redis caching for dashboard queries
- Added database connection pooling

## 📦 Dependencies

- **Added:** `date-fns` v2.30.0
- **Updated:** `express` v4.18.0 → v4.18.2
- **Removed:** `moment` v2.29.4

## ⚠️ Breaking Changes

### API Changes

**Work Order Status Values**
The work order status `"pending"` has been renamed to `"draft"` for consistency.

**Migration:**
```javascript
// Before
{ status: "pending" }

// After
{ status: "draft" }
```

**Deprecation:** The old `"pending"` status will be supported until v2.0.0 (6 months).

### Configuration Changes

**Environment Variables**
- `SMTP_HOST` renamed to `EMAIL_SMTP_HOST`
- `REDIS_HOST` renamed to `CACHE_REDIS_HOST`

Update your `.env` file accordingly.

## 📚 Documentation

- **New:** [Custom Report Builder Guide](docs/user-guides/reports/custom-reports.md)
- **New:** [Mobile Barcode Scanning Guide](docs/user-guides/mobile/barcode-scanning.md)
- **Updated:** [API Authentication](docs/api/authentication.md) with refresh token flow

## 🔐 Security

- Fixed XSS vulnerability in work order description field (CVE-2025-1234)
- Implemented rate limiting on login endpoint (prevent brute force)
- Updated dependencies with security patches

**Security Advisory:** [SA-2025-001](https://security.dcmms.example.com/SA-2025-001)

## 📥 Upgrade Instructions

### For SaaS Customers
No action required. Your instance will be automatically upgraded during your maintenance window.

### For Self-Hosted Customers

1. **Backup your database:**
   ```bash
   pg_dump dcmms > dcmms_backup_$(date +%Y%m%d).sql
   ```

2. **Update Docker images:**
   ```bash
   docker-compose pull
   ```

3. **Run migrations:**
   ```bash
   docker-compose run api npm run migrate
   ```

4. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

5. **Verify upgrade:**
   ```bash
   curl https://your-domain.com/api/v1/version
   ```

**Estimated downtime:** 5-10 minutes

## 🆘 Support

If you encounter issues after upgrading:
- Check the [Troubleshooting Guide](docs/troubleshooting/upgrade-issues.md)
- Contact support: support@dcmms.example.com
- Community forum: https://community.dcmms.example.com

---

**Full Changelog:** [v1.1.0...v1.2.0](https://github.com/dcmms/dcmms/compare/v1.1.0...v1.2.0)
```

---

## 7. Knowledge Base

### 7.1 Knowledge Base Structure

```yaml
knowledge_base:
  faqs:
    - general_questions.md
    - account_and_billing.md
    - work_orders_faq.md
    - mobile_app_faq.md
    - integrations_faq.md

  how_to:
    - how_to_reset_password.md
    - how_to_bulk_import_assets.md
    - how_to_configure_alerts.md
    - how_to_integrate_with_erp.md

  troubleshooting:
    - sync_errors.md
    - login_issues.md
    - performance_problems.md
    - mobile_app_crashes.md
    - report_generation_errors.md

  best_practices:
    - work_order_management_best_practices.md
    - preventive_maintenance_scheduling.md
    - alert_configuration_best_practices.md
    - mobile_offline_best_practices.md
```

### 7.2 Example FAQ Page

```markdown
# Frequently Asked Questions - Work Orders

## General Questions

### What is a work order?
A work order is a task or job assigned to a technician or team to perform maintenance, repairs, or inspections on assets and equipment.

### What types of work orders are supported?
dCMMS supports the following work order types:
- **Preventive Maintenance**: Scheduled, routine maintenance
- **Corrective Maintenance**: Repairs in response to failures or defects
- **Inspection**: Regular inspections and audits
- **Project**: Larger projects or installations
- **Emergency**: Urgent repairs requiring immediate attention

### How do I create a work order?
See our [Creating a Work Order](../user-guides/work-orders/creating_work_orders.md) guide.

## Work Order Status

### What do the work order statuses mean?

| Status | Description |
|--------|-------------|
| Draft | Work order created but not yet submitted |
| In Progress | Work is currently being performed |
| On Hold | Work paused temporarily |
| Completed | Work finished and submitted for review |
| Cancelled | Work order cancelled |

### Can I change the status of a work order?
Yes, if you have the `work_orders:update` permission. Work orders follow a state machine and can only transition to valid states. See [Work Order State Machine](../specifications/work_order_state_machine.md).

## Assignments

### How do I assign a work order to multiple technicians?
dCMMS currently supports assigning work orders to a single user. To assign to multiple technicians:
1. Assign the work order to the lead technician
2. Add other technicians in the "Crew" field
3. The lead technician can coordinate with the crew

**Coming soon:** Native support for multi-user assignments in v1.3.0.

### Can I reassign a work order?
Yes, if you have the `work_orders:assign` permission:
1. Open the work order
2. Click **Reassign**
3. Select the new assignee
4. Add a reason for reassignment (optional)
5. Click **Save**

The previous assignee will be notified of the reassignment.

## Scheduling

### How do I schedule a work order for a specific date?
When creating or editing a work order:
1. Set the **Scheduled For** field to your desired date and time
2. The assigned technician will be notified
3. The work order will appear in their schedule

### Can I schedule recurring work orders?
Yes, using **Preventive Maintenance Schedules**:
1. Navigate to **Assets** > select asset
2. Click **Maintenance** tab
3. Click **Create Schedule**
4. Set recurrence (daily, weekly, monthly)
5. Work orders will be automatically created according to the schedule

See [Preventive Maintenance Scheduling](../user-guides/assets/preventive_maintenance.md).

## Mobile App

### Can I complete work orders offline on mobile?
Yes! The dCMMS mobile app supports full offline functionality:
- View assigned work orders
- Add notes and photos
- Mark work orders complete
- Data syncs automatically when you're back online

See [Mobile Offline Mode](../user-guides/mobile/offline_mode.md).

### What happens if I lose connectivity while completing a work order?
No worries! All your changes are saved locally on your device and will sync automatically when connectivity is restored. You'll see a sync status indicator at the top of the screen.

## Still have questions?

- Check our [User Guides](../user-guides/index.md)
- Contact support: support@dcmms.example.com
- Community forum: https://community.dcmms.example.com
```

---

## 8. Documentation Workflow

### 8.1 Documentation-as-Code

```yaml
documentation_workflow:
  source:
    format: "Markdown"
    repository: "https://github.com/dcmms/docs"
    structure: "docs/"

  build:
    tool: "Docusaurus / GitBook / MkDocs"
    triggers:
      - "Push to main branch"
      - "Pull request"
    pipeline:
      - lint_markdown
      - check_links
      - build_site
      - deploy_preview

  versioning:
    strategy: "Version per major release"
    versions:
      - "1.0"
      - "1.1"
      - "1.2 (latest)"
      - "next (unreleased)"

  deployment:
    production: "https://docs.dcmms.example.com"
    staging: "https://docs-staging.dcmms.example.com"
    cdn: "CloudFront"
```

### 8.2 Documentation Review Process

```yaml
review_process:
  triggers:
    - "New feature development"
    - "API changes"
    - "User-reported issues"

  steps:
    1_create_docs:
      owner: "Developer / Technical Writer"
      deliverable: "Draft documentation in Markdown"

    2_technical_review:
      owner: "Tech Lead"
      checks:
        - "Technical accuracy"
        - "Code examples work"
        - "API references match implementation"

    3_editorial_review:
      owner: "Technical Writer"
      checks:
        - "Grammar and spelling"
        - "Consistent tone and style"
        - "Clear and concise"
        - "Proper formatting"

    4_user_testing:
      owner: "UX Team"
      checks:
        - "Instructions are clear"
        - "Screenshots are accurate"
        - "Users can follow the guide successfully"

    5_approval:
      owner: "Product Manager"
      deliverable: "Approved documentation"

    6_publish:
      owner: "DevOps"
      action: "Merge to main, deploy to production"
```

---

## 9. Search and Navigation

### 9.1 Documentation Search

```javascript
// Algolia DocSearch integration
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/docsearch.js@2/dist/cdn/docsearch.min.js"></script>
<script type="text/javascript">
docsearch({
  apiKey: 'YOUR_ALGOLIA_API_KEY',
  indexName: 'dcmms_docs',
  inputSelector: '#search-input',
  algoliaOptions: {
    facetFilters: ['version:1.2', 'language:en']
  },
  debug: false
});
</script>
```

### 9.2 Navigation Structure

```yaml
navigation:
  header:
    - title: "Docs Home"
      url: "/"
    - title: "API Reference"
      url: "/api"
    - title: "User Guides"
      url: "/user-guides"
    - title: "Admin Guides"
      url: "/admin-guides"
    - title: "Release Notes"
      url: "/release-notes"
    - title: "Support"
      url: "https://support.dcmms.example.com"

  sidebar:
    - section: "Getting Started"
      items:
        - "Introduction"
        - "Quick Start"
        - "Key Concepts"

    - section: "User Guides"
      items:
        - "Work Orders"
        - "Assets"
        - "Alerts"
        - "Mobile App"
        - "Reports"

    - section: "Admin Guides"
      items:
        - "Installation"
        - "Configuration"
        - "User Management"
        - "Integrations"

    - section: "Developer Guides"
      items:
        - "Getting Started"
        - "API Reference"
        - "SDKs"
        - "Webhooks"

  footer:
    - column: "Documentation"
      links:
        - "User Guides"
        - "API Reference"
        - "Release Notes"

    - column: "Support"
      links:
        - "Help Center"
        - "Community Forum"
        - "Contact Support"

    - column: "Legal"
      links:
        - "Terms of Service"
        - "Privacy Policy"
        - "Security"
```

---

## Summary

This specification provides a comprehensive documentation system for dCMMS:

1. **API Documentation** with OpenAPI 3.0, Swagger UI, interactive API console, code examples
2. **User Guides** with step-by-step instructions, screenshots, role-specific content
3. **Admin Documentation** for installation, configuration, security, operations, maintenance
4. **Developer Documentation** with architecture diagrams, integration guides, SDKs, contributing guidelines
5. **Release Notes** with features, improvements, bug fixes, breaking changes, upgrade instructions
6. **Knowledge Base** with FAQs, how-to guides, troubleshooting, best practices
7. **Documentation Workflow** with docs-as-code, versioning, review process, automated builds
8. **Search and Navigation** with Algolia integration, structured navigation, version switcher

**Lines:** ~1,100
**Status:** Complete
**Next:** Vendor and Procurement (Spec 20)
