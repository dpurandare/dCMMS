# Integration Specifications for External Systems

**Version:** 1.0
**Date:** November 10, 2025
**Status:** Draft - For Review
**Priority:** P0/P1 (ERP P0, IdP P0, MDM P1)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [ERP/Procurement Integration](#2-erpprocurement-integration)
3. [Identity Provider (IdP) Integration](#3-identity-provider-idp-integration)
4. [Mobile Device Management (MDM) Integration](#4-mobile-device-management-mdm-integration)
5. [Weather API Integration](#5-weather-api-integration)
6. [SCADA/HMI Integration](#6-scadahmi-integration)
7. [Integration Patterns & Best Practices](#7-integration-patterns--best-practices)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [Security & Compliance](#9-security--compliance)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

This document specifies integrations with external systems required for dCMMS operation. Each integration includes connection patterns, data synchronization strategies, error handling, and security requirements.

### Integration Priority Matrix

| Integration | Priority | Complexity | MVP Required | Release 1 |
|------------|----------|------------|--------------|-----------|
| **Identity Provider (IdP)** | P0 | Medium | ✅ Yes | Required |
| **ERP/Procurement** | P0 | High | ✅ Yes | Required |
| **Mobile Device Management** | P1 | Medium | ❌ No | Recommended |
| **Weather API** | P1 | Low | ❌ No | Required |
| **SCADA/HMI** | P0 | High | ✅ Yes | Required (covered in spec 10) |

---

## 2. ERP/Procurement Integration

### 2.1 Supported ERP Systems

**Primary Support (P0):**
- SAP S/4HANA
- Oracle ERP Cloud
- Microsoft Dynamics 365
- NetSuite

**Secondary Support (P1):**
- Infor CloudSuite
- Epicor ERP
- IFS Applications
- Generic REST API (custom ERP)

### 2.2 Integration Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         dCMMS                                 │
├──────────────────────────────────────────────────────────────┤
│  Work Order → Cost Posting                                   │
│  Inventory → Parts Requisition                               │
│  Assets → Master Data Sync                                   │
│  Vendors → Vendor Management                                 │
└──────────┬───────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│              Integration Middleware Layer                     │
│  ├─ Transformation Engine (field mapping)                    │
│  ├─ Queue Manager (async processing)                         │
│  ├─ Error Handler (retry, DLQ)                              │
│  └─ Audit Logger                                             │
└──────────┬───────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│                    ERP System (SAP/Oracle/D365)              │
│  ├─ Financial Accounting (FI)                                │
│  ├─ Materials Management (MM)                                │
│  ├─ Asset Accounting (AA)                                    │
│  └─ Procurement (purchasing, PO)                             │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Data Synchronization Patterns

**Master Data Sync (ERP → dCMMS):**
- **Asset Master Data:** Equipment, serial numbers, warranties, depreciation
- **Parts Catalog:** Material master, pricing, suppliers
- **Vendor Master:** Supplier information, contracts, payment terms
- **Cost Centers:** Organizational hierarchy, budget codes

**Transactional Data (dCMMS → ERP):**
- **Cost Postings:** Labor hours, parts consumption, contractor invoices
- **Purchase Requisitions:** Parts requests when inventory low
- **Work Order Closure:** Final costs, capitalization vs. expense
- **Inventory Adjustments:** Stock counts, write-offs

### 2.4 SAP S/4HANA Integration

**Connection Methods:**

**Option 1: OData API (Recommended)**
```yaml
connection:
  protocol: "odata_v4"
  base_url: "https://sap-system.company.com:443/sap/opu/odata4"
  authentication:
    type: "oauth2_client_credentials"
    token_url: "https://sap-system.company.com/oauth/token"
    client_id: "DCMMS_CLIENT"
    client_secret: "{{vault:sap/client_secret}}"

endpoints:
  assets: "/API_FIXEDASSET_SRV/FixedAsset"
  materials: "/API_MATERIAL_STOCK_SRV/MaterialStock"
  purchase_orders: "/API_PURCHASEORDER_PROCESS_SRV/PurchaseOrder"
  cost_centers: "/API_CONTROLLINGAREA_SRV/CostCenter"
```

**Option 2: RFC (Remote Function Call) via SAP NetWeaver**
```yaml
connection:
  protocol: "rfc"
  host: "sap-system.company.com"
  system_number: "00"
  client: "100"
  authentication:
    type: "basic"
    username: "DCMMS_USER"
    password: "{{vault:sap/password}}"

function_modules:
  - "BAPI_FIXEDASSET_GETDETAIL"
  - "BAPI_MATERIAL_STOCK_REQ_LIST"
  - "BAPI_PO_CREATE1"
```

**Data Mapping Example (Asset Sync):**

| SAP Field | SAP Table | dCMMS Field | Transformation |
|-----------|-----------|-------------|----------------|
| ANLN1 | ANLA | assetId | Direct mapping |
| TXT50 | ANLA | name | Direct mapping |
| KOSTL | ANLA | costCenter | Direct mapping |
| AKTIV | ANLA | commissionDate | Date format conversion |
| WAERS | ANLA | currency | Currency code |
| ANLKL | ANLA | assetClass | Lookup table |
| INVNR | ANLA | serialNumber | Direct mapping |

**Cost Posting Workflow:**

```mermaid
sequenceDiagram
    participant WO as Work Order
    participant dCMMS as dCMMS API
    participant Queue as Message Queue
    participant Mapper as Data Mapper
    participant SAP as SAP S/4HANA

    WO->>dCMMS: Close work order
    dCMMS->>dCMMS: Calculate total costs
    dCMMS->>Queue: Publish cost posting event
    Queue->>Mapper: Process event
    Mapper->>Mapper: Transform to SAP format
    Mapper->>SAP: POST /API_JOURNALENTRY_SRV/JournalEntry
    SAP-->>Mapper: 201 Created (Document #)
    Mapper->>dCMMS: Update WO with SAP doc #
    Mapper->>Queue: Acknowledge message
```

**Error Handling:**
```yaml
error_handling:
  retry_policy:
    max_attempts: 3
    backoff: "exponential"
    initial_delay_seconds: 60
    max_delay_seconds: 3600

  failure_actions:
    - log_to_audit_trail
    - send_notification:
        to: ["finance-team@company.com"]
        priority: "high"
    - move_to_dlq

  manual_reconciliation:
    enabled: true
    review_queue: "/admin/integrations/sap/failed-postings"
```

### 2.5 Oracle ERP Cloud Integration

**Connection:**
```yaml
connection:
  type: "rest_api"
  base_url: "https://company.oraclecloud.com/fscmRestApi/resources/11.13.18.05"
  authentication:
    type: "basic_auth"  # Oracle uses Basic Auth over HTTPS
    username: "dcmms_integration"
    password: "{{vault:oracle/password}}"

endpoints:
  fixed_assets: "/fa/fixed-assets"
  purchase_orders: "/procurement/purchase-orders"
  inventory: "/scm/inventory-items"
  suppliers: "/procurement/suppliers"
```

**Bulk Data Sync (Initial Load):**
```bash
# Export assets from Oracle ERP
curl -X GET "https://company.oraclecloud.com/fscmRestApi/resources/11.13.18.05/fa/fixed-assets?limit=1000" \
  -H "Authorization: Basic BASE64_ENCODED_CREDS" \
  -H "Accept: application/json"

# Import to dCMMS via bulk API
curl -X POST "https://dcmms-api.company.com/api/v1/assets/bulk-import" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @oracle_assets_export.json
```

### 2.6 Microsoft Dynamics 365 Integration

**Connection (Web API):**
```yaml
connection:
  type: "odata_v4"
  base_url: "https://company.crm.dynamics.com/api/data/v9.2"
  authentication:
    type: "oauth2_authorization_code"
    authority: "https://login.microsoftonline.com/TENANT_ID"
    client_id: "DCMMS_APP_ID"
    client_secret: "{{vault:d365/client_secret}}"
    resource: "https://company.crm.dynamics.com"
    scope: "https://company.crm.dynamics.com/.default"

entities:
  - name: "msdyn_customerasset"  # Assets
    sync_direction: "bidirectional"
    sync_frequency: "daily"

  - name: "msdyn_purchaseorder"  # Purchase Orders
    sync_direction: "dcmms_to_d365"
    sync_frequency: "real_time"

  - name: "product"  # Products/Parts
    sync_direction: "d365_to_dcmms"
    sync_frequency: "hourly"
```

**Field Mapping (Purchase Requisition → D365 Purchase Order):**
```json
{
  "mapping": {
    "msdyn_name": "{{requisition.title}}",
    "msdyn_purchaseorderdate": "{{requisition.createdAt}}",
    "msdyn_vendor": {
      "lookupLogicalName": "account",
      "lookupValue": "{{requisition.vendorId}}"
    },
    "msdyn_shiptoaddress": "{{site.address}}",
    "msdyn_purchaseorderproducts": [
      {
        "msdyn_product": "{{item.productId}}",
        "msdyn_quantity": "{{item.quantity}}",
        "msdyn_unitprice": "{{item.unitPrice}}"
      }
    ]
  }
}
```

### 2.7 Generic REST API Integration (Custom ERP)

For ERPs without standard connectors, provide generic REST integration:

**Configuration:**
```yaml
custom_erp:
  name: "Custom ERP System"
  base_url: "https://erp.company.com/api/v2"
  authentication:
    type: "api_key"
    key_location: "header"
    key_name: "X-API-Key"
    key_value: "{{vault:custom_erp/api_key}}"

  mappings:
    assets:
      endpoint: "/equipment"
      method: "GET"
      query_params:
        status: "active"
      field_mapping:
        equipment_id: "assetId"
        equipment_name: "name"
        purchase_date: "commissionDate"
        cost_center: "costCenter"

    cost_posting:
      endpoint: "/journal-entries"
      method: "POST"
      request_template: |
        {
          "entry_date": "{{workOrder.closedAt}}",
          "account_code": "{{costCenter.accountCode}}",
          "amount": "{{workOrder.totalCost}}",
          "description": "WO {{workOrder.workOrderId}}: {{workOrder.title}}",
          "reference": "{{workOrder.workOrderId}}"
        }
```

### 2.8 Integration Configuration UI

**Admin Interface Requirements:**

```yaml
ui_features:
  - connection_setup:
      - erp_type_selection
      - credential_management (vault-integrated)
      - connection_test_button
      - certificate_upload (for mTLS)

  - field_mapping_editor:
      - visual_mapper (drag-and-drop)
      - transformation_functions (date format, currency, lookup)
      - validation_rules
      - preview_with_sample_data

  - sync_configuration:
      - schedule_selector (real-time, hourly, daily, weekly)
      - sync_direction (unidirectional, bidirectional)
      - conflict_resolution_strategy
      - batch_size_configuration

  - monitoring_dashboard:
      - sync_status_indicators
      - error_log_viewer
      - retry_queue_management
      - manual_sync_trigger
```

---

## 3. Identity Provider (IdP) Integration

### 3.1 Supported Identity Providers

**Enterprise IdP (P0):**
- **Okta** (recommended)
- **Azure Active Directory / Microsoft Entra ID**
- **Google Workspace (Cloud Identity)**
- **Keycloak** (self-hosted)
- **Ping Identity**
- **Auth0**

**Consumer IdP (P2 - future):**
- Apple Sign-In
- Google Sign-In
- Microsoft Account

### 3.2 Protocol Selection Matrix

| Protocol | Use Case | Pros | Cons | Recommended |
|----------|----------|------|------|-------------|
| **OpenID Connect (OIDC)** | Modern SSO | Standard, JWT tokens, refresh tokens | Requires OIDC support | ✅ Yes |
| **SAML 2.0** | Legacy enterprise SSO | Wide enterprise support | Complex XML, no mobile | ✅ If OIDC unavailable |
| **LDAP** | Direct directory access | Simple, widely supported | No SSO, password sync issues | ❌ Avoid |

**Decision Tree:**
```
Does IdP support OIDC?
  ├─ YES → Use OIDC (preferred)
  └─ NO → Does IdP support SAML 2.0?
      ├─ YES → Use SAML 2.0
      └─ NO → Use LDAP with periodic sync (last resort)
```

### 3.3 OIDC Integration (Okta Example)

**Configuration:**
```yaml
oidc:
  provider: "okta"
  issuer: "https://company.okta.com/oauth2/default"
  client_id: "0oa1a2b3c4d5e6f7g8h9"
  client_secret: "{{vault:okta/client_secret}}"

  endpoints:
    authorization: "https://company.okta.com/oauth2/default/v1/authorize"
    token: "https://company.okta.com/oauth2/default/v1/token"
    userinfo: "https://company.okta.com/oauth2/default/v1/userinfo"
    jwks: "https://company.okta.com/oauth2/default/v1/keys"
    revocation: "https://company.okta.com/oauth2/default/v1/revoke"

  scopes:
    - "openid"
    - "profile"
    - "email"
    - "groups"  # For role mapping

  response_type: "code"  # Authorization code flow
  redirect_uri: "https://dcmms.company.com/auth/callback"

  pkce_enabled: true  # For mobile apps
```

**Authentication Flow (Web App):**

```mermaid
sequenceDiagram
    participant User
    participant dCMMS
    participant Okta

    User->>dCMMS: Click "Login with Okta"
    dCMMS->>Okta: Redirect to /authorize (code challenge)
    Okta->>User: Show Okta login page
    User->>Okta: Enter credentials + MFA
    Okta->>dCMMS: Redirect to /callback (authorization code)
    dCMMS->>Okta: POST /token (code + code verifier)
    Okta-->>dCMMS: Access token + Refresh token + ID token
    dCMMS->>Okta: GET /userinfo (access token)
    Okta-->>dCMMS: User profile + groups
    dCMMS->>dCMMS: Map groups to roles
    dCMMS->>dCMMS: Create/update user record
    dCMMS-->>User: Set session cookie, redirect to dashboard
```

**JWT Token Validation:**
```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://company.okta.com/oauth2/default/v1/keys',
  cache: true,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function validateToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: 'https://company.okta.com/oauth2/default',
      audience: '0oa1a2b3c4d5e6f7g8h9',
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}
```

### 3.4 Group/Role Mapping

**Okta Groups → dCMMS Roles:**

```yaml
role_mapping:
  okta_group_claim: "groups"  # Claim name in ID token

  mappings:
    - okta_group: "DCMMS_Admins"
      dcmms_role: "system_admin"
      permissions: ["*"]

    - okta_group: "DCMMS_SiteManagers"
      dcmms_role: "site_manager"
      site_assignment: "auto"  # Auto-assign to managed sites

    - okta_group: "DCMMS_FieldTechs"
      dcmms_role: "field_technician"
      default_site: "primary_site_from_profile"

    - okta_group: "DCMMS_Contractors"
      dcmms_role: "contractor"
      time_limited_access: true
      access_duration_days: 90

  default_role: "read_only"  # If no group matches
```

### 3.5 Just-in-Time (JIT) User Provisioning

**User Creation on First Login:**
```javascript
async function handleOAuthCallback(authorizationCode) {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(authorizationCode);

  // Get user info
  const userInfo = await getUserInfo(tokens.access_token);

  // Check if user exists
  let user = await User.findOne({ email: userInfo.email });

  if (!user) {
    // JIT provisioning: Create new user
    user = await User.create({
      email: userInfo.email,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      externalId: userInfo.sub,  // Okta user ID
      authProvider: 'okta',
      roles: mapGroupsToRoles(userInfo.groups),
      status: 'active',
      lastLogin: new Date()
    });

    await auditLog.log({
      action: 'user_jit_provisioned',
      userId: user.userId,
      details: { provider: 'okta', groups: userInfo.groups }
    });
  } else {
    // Update existing user
    await user.update({
      lastLogin: new Date(),
      roles: mapGroupsToRoles(userInfo.groups)  // Update roles on each login
    });
  }

  // Create session
  const session = await createSession(user, tokens);
  return session;
}
```

### 3.6 SAML 2.0 Integration (Azure AD Example)

**Configuration:**
```yaml
saml:
  provider: "azure_ad"
  entity_id: "https://dcmms.company.com/saml/metadata"
  assertion_consumer_service_url: "https://dcmms.company.com/saml/acs"
  single_logout_service_url: "https://dcmms.company.com/saml/sls"

  idp_metadata_url: "https://login.microsoftonline.com/TENANT_ID/federationmetadata/2007-06/federationmetadata.xml"

  idp_entity_id: "https://sts.windows.net/TENANT_ID/"
  idp_sso_url: "https://login.microsoftonline.com/TENANT_ID/saml2"
  idp_slo_url: "https://login.microsoftonline.com/TENANT_ID/saml2"
  idp_certificate: |
    -----BEGIN CERTIFICATE-----
    MIIDdTCCAl2gAwIBAgILBAAAAAABFUtaw5QwDQYJKoZIhvcNAQEFBQAwVzELMAkGA1UE...
    -----END CERTIFICATE-----

  name_id_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"

  attribute_mapping:
    email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    first_name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
    last_name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
    groups: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
```

### 3.7 Multi-IdP Scenarios

**Use Case:** Employees use Okta, Contractors use separate Auth0 tenant

**Configuration:**
```yaml
idp_providers:
  - id: "okta_employees"
    type: "oidc"
    provider: "okta"
    issuer: "https://company.okta.com/oauth2/default"
    client_id: "{{vault:okta/client_id}}"
    enabled: true
    priority: 1
    auto_provisioning: true
    user_type: "employee"
    domain_hint: "company.com"  # Auto-select for @company.com emails

  - id: "auth0_contractors"
    type: "oidc"
    provider: "auth0"
    issuer: "https://company-contractors.us.auth0.com/"
    client_id: "{{vault:auth0/client_id}}"
    enabled: true
    priority: 2
    auto_provisioning: true
    user_type: "contractor"
    domain_hint: "contractor.com"

    restrictions:
      time_limited: true
      max_session_hours: 8
      require_approval: true
```

**Login Page Selection:**
```html
<!-- User enters email, system auto-detects IdP -->
<form id="login-form">
  <input type="email" name="email" placeholder="Email" />
  <button type="submit">Continue</button>
</form>

<script>
async function handleLogin(email) {
  // Detect IdP based on email domain
  const response = await fetch('/auth/idp-discovery', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
  const { idpId, redirectUrl } = await response.json();

  // Redirect to appropriate IdP
  window.location.href = redirectUrl;
}
</script>
```

### 3.8 User Profile Synchronization

**Periodic Sync (Optional):**
```yaml
user_sync:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM

  sync_operations:
    - operation: "update_existing_users"
      fields: ["email", "firstName", "lastName", "status", "groups"]

    - operation: "deactivate_removed_users"
      action: "soft_delete"  # or "disable_login"

    - operation: "import_new_users"
      enabled: false  # Use JIT provisioning instead

  filters:
    - attribute: "status"
      value: "ACTIVE"
    - attribute: "appAssignments"
      contains: "DCMMS"
```

**SCIM 2.0 Support (Advanced):**
```yaml
scim:
  enabled: true
  endpoint: "https://dcmms.company.com/scim/v2"
  authentication:
    type: "bearer_token"
    token: "{{vault:scim/bearer_token}}"

  supported_operations:
    - create_user
    - update_user
    - delete_user
    - create_group
    - update_group
    - delete_group

  user_schema:
    userName: "email"
    name:
      givenName: "firstName"
      familyName: "lastName"
    emails: "email"
    active: "status"
```

---

## 4. Mobile Device Management (MDM) Integration

### 4.1 Supported MDM Platforms

**Enterprise MDM (P1):**
- **Microsoft Intune** (recommended for Microsoft 365 environments)
- **VMware Workspace ONE**
- **MobileIron / Ivanti**
- **Jamf Pro** (for iOS-only deployments)
- **Google Workspace Mobile Management** (for Android-focused)

### 4.2 Integration Purposes

1. **App Distribution:** Deploy dCMMS mobile app to managed devices
2. **Configuration Management:** Push app configuration (API endpoint, policies)
3. **Compliance Checking:** Verify device meets security requirements
4. **Remote Management:** Remote wipe of app data if device lost/stolen

### 4.3 Microsoft Intune Integration

**App Configuration:**
```xml
<!-- Managed App Configuration (MAM) -->
<dict>
  <key>com.dcmms.mobile.apiEndpoint</key>
  <string>https://dcmms-api.company.com</string>

  <key>com.dcmms.mobile.tenantId</key>
  <string>TENANT_001</string>

  <key>com.dcmms.mobile.authProvider</key>
  <string>azure_ad</string>

  <key>com.dcmms.mobile.offlineMode</key>
  <true/>

  <key>com.dcmms.mobile.cameraEnabled</key>
  <true/>

  <key>com.dcmms.mobile.maxOfflineStorageMB</key>
  <integer>500</integer>

  <key>com.dcmms.mobile.requiredAppVersion</key>
  <string>1.5.0</string>
</dict>
```

**Compliance Check API:**
```javascript
// Check device compliance before allowing app access
async function checkDeviceCompliance(deviceId) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`,
    {
      headers: {
        'Authorization': `Bearer ${await getGraphToken()}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const complianceStates = await response.json();

  // Check if device meets all compliance policies
  const isCompliant = complianceStates.value.every(policy =>
    policy.state === 'compliant'
  );

  if (!isCompliant) {
    throw new Error('Device does not meet compliance requirements');
  }

  return true;
}
```

**App Protection Policies:**
```yaml
app_protection_policy:
  name: "dCMMS Mobile - High Security"

  data_protection:
    backup_to_cloud: false  # Prevent iCloud/Google backup
    prevent_screenshot: true
    prevent_copy_paste: true
    encrypt_app_data: true

  access_requirements:
    pin_required: true
    pin_complexity: "numeric_complex"
    pin_length_min: 6
    biometric_authentication: true
    max_pin_retry_attempts: 5
    offline_grace_period_minutes: 30

  conditional_launch:
    - condition: "max_os_version"
      action: "block"
      value: "iOS 14.0, Android 10"

    - condition: "jailbroken_rooted_device"
      action: "block"

    - condition: "min_app_version"
      action: "warn"
      value: "1.5.0"
```

### 4.4 VMware Workspace ONE Integration

**SDK Integration:**
```javascript
// Initialize Workspace ONE SDK
import { WorkspaceONE } from '@vmware/ws1-sdk';

async function initializeWorkspaceONE() {
  await WorkspaceONE.initialize({
    anchorApplicationId: 'com.dcmms.mobile',
    allowCopyPaste: false,
    allowScreenCapture: false
  });

  // Get app configuration from console
  const config = await WorkspaceONE.getAppConfig();

  // Set API endpoint from MDM configuration
  global.API_ENDPOINT = config.apiEndpoint || 'https://dcmms-api.company.com';

  // Check device compliance
  const isCompliant = await WorkspaceONE.isDeviceCompliant();
  if (!isCompliant) {
    // Show non-compliance warning
    showNonComplianceDialog();
  }
}
```

**Remote Wipe:**
```javascript
// Handle remote wipe command from MDM
WorkspaceONE.onWipe(async () => {
  try {
    // Clear all local data
    await clearLocalDatabase();
    await clearSecureStorage();
    await clearFileSystem();

    // Log wipe event
    await auditLog.log({
      action: 'app_data_wiped',
      reason: 'mdm_command',
      timestamp: new Date()
    });

    // Reset app to initial state
    await WorkspaceONE.completeWipe();
  } catch (error) {
    console.error('Wipe failed:', error);
  }
});
```

---

## 5. Weather API Integration

### 5.1 Recommended Weather Providers

**Commercial APIs (P1):**
- **Tomorrow.io** (formerly ClimaCell) - Best for renewable energy
- **IBM Weather Company Data** - Enterprise-grade
- **Visual Crossing Weather** - Cost-effective
- **OpenWeatherMap** - Basic forecasting

**Government APIs (Free):**
- **NOAA NWS API** (US only)
- **Copernicus Climate Data Store** (Europe)
- **Bureau of Meteorology** (Australia)

### 5.2 Integration Architecture

```yaml
weather_api:
  primary_provider: "tomorrow_io"
  fallback_provider: "visual_crossing"

  tomorrow_io:
    api_key: "{{vault:tomorrow_io/api_key}}"
    base_url: "https://api.tomorrow.io/v4"
    rate_limit: "25_calls_per_hour"  # Free tier

    endpoints:
      realtime: "/weather/realtime"
      forecast: "/weather/forecast"
      historical: "/weather/history/recent"

    data_points:
      - "temperature"
      - "humidity"
      - "windSpeed"
      - "windDirection"
      - "cloudCover"
      - "solarGHI"  # Global Horizontal Irradiance
      - "solarDNI"  # Direct Normal Irradiance
      - "solarDHI"  # Diffuse Horizontal Irradiance
      - "precipitationIntensity"
      - "weatherCode"
```

**Weather-Informed Maintenance Scheduling:**

```javascript
async function suggestMaintenanceWindow(workOrderId, durationHours) {
  const workOrder = await WorkOrder.findById(workOrderId);
  const site = await Site.findById(workOrder.siteId);

  // Get 7-day forecast
  const forecast = await weatherAPI.getForecast({
    location: `${site.location.lat},${site.location.lon}`,
    timesteps: '1h',
    fields: ['temperature', 'precipitationIntensity', 'windSpeed', 'cloudCover'],
    endTime: 'nowPlus7d'
  });

  // Score each time window
  const scoredWindows = forecast.data.timelines[0].intervals.map((interval, index) => {
    const score = calculateMaintenanceScore(interval, workOrder.type);
    return {
      start: interval.startTime,
      end: addHours(interval.startTime, durationHours),
      score,
      weather: interval.values
    };
  });

  // Return top 3 windows
  return scoredWindows
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function calculateMaintenanceScore(weatherData, workOrderType) {
  let score = 100;

  // Penalize rain
  if (weatherData.precipitationIntensity > 0.5) {
    score -= 50;
  }

  // Penalize extreme temperatures
  if (weatherData.temperature < 5 || weatherData.temperature > 40) {
    score -= 30;
  }

  // Penalize high winds (especially for height work)
  if (workOrderType === 'working_at_height' && weatherData.windSpeed > 10) {
    score -= 40;
  }

  // Prefer sunny weather for solar panel work
  if (workOrderType === 'solar_panel_cleaning' && weatherData.cloudCover < 30) {
    score += 20;
  }

  return Math.max(0, score);
}
```

---

## 6. SCADA/HMI Integration

**Note:** Detailed SCADA integration is covered in `specs/10_DATA_INGESTION_ARCHITECTURE.md` Section 4 (Edge Data Collection). This section provides additional context for alarm-to-work-order workflow.

### 6.1 Alarm-to-Work-Order Automation

```yaml
alarm_rules:
  - alarm_type: "INVERTER_TEMPERATURE_HIGH"
    severity: "critical"
    action: "create_work_order"
    work_order_config:
      type: "corrective"
      priority: "urgent"
      title_template: "High Temperature Alarm - {{asset.name}}"
      description_template: |
        Critical temperature alarm detected on {{asset.name}}.
        Current temperature: {{alarm.value}}°C
        Threshold: {{alarm.threshold}}°C
        Duration: {{alarm.duration}} minutes

        Recommended Action: Inspect inverter cooling system, check for fan failures or blocked air vents.

      assign_to_role: "electrical_technician"
      required_skills: ["electrical-hv", "inverter-repair"]
      sla_response_hours: 2
      sla_resolution_hours: 8

      attach_alarm_history: true
      attach_asset_telemetry: true
```

---

## 7. Integration Patterns & Best Practices

### 7.1 Common Integration Patterns

**Pattern 1: Synchronous Request-Response**
- Use for: Real-time lookups, validation
- Example: Check part availability in ERP before creating work order
- Timeout: 10 seconds
- Error handling: Retry 3 times with exponential backoff

**Pattern 2: Asynchronous Message Queue**
- Use for: Cost postings, bulk data sync, non-critical operations
- Example: Post work order costs to ERP after closure
- Queue: RabbitMQ or AWS SQS
- Retry: Unlimited with dead-letter queue

**Pattern 3: Scheduled Batch Sync**
- Use for: Master data sync (assets, parts catalog)
- Example: Nightly sync of asset master data from ERP
- Schedule: Daily at 2 AM
- Conflict resolution: ERP wins (source of truth)

**Pattern 4: Webhook / Event-Driven**
- Use for: Real-time notifications from external system
- Example: ERP notifies dCMMS when purchase order is delivered
- Security: HMAC signature verification
- Retry: External system responsible

### 7.2 Data Ownership & Master Data Management

| Data Type | Master System | Sync Direction | Frequency |
|-----------|--------------|----------------|-----------|
| **Assets** | ERP | ERP → dCMMS | Daily |
| **Parts Catalog** | ERP | ERP → dCMMS | Hourly |
| **Vendors** | ERP | ERP → dCMMS | Daily |
| **Users** | IdP | IdP → dCMMS | Real-time (JIT) |
| **Work Orders** | dCMMS | dCMMS only | N/A |
| **Cost Data** | dCMMS → ERP | dCMMS → ERP | Real-time |
| **Inventory Levels** | dCMMS | Bidirectional | Hourly |

### 7.3 Error Handling Strategy

```yaml
error_handling:
  transient_errors:
    - http_timeout
    - connection_refused
    - rate_limit_exceeded
    - 5xx_server_errors

    retry_policy:
      max_attempts: 5
      backoff: "exponential"
      initial_delay_ms: 1000
      max_delay_ms: 60000
      jitter: true

  permanent_errors:
    - authentication_failed
    - authorization_denied
    - invalid_data
    - resource_not_found
    - 4xx_client_errors

    retry_policy:
      max_attempts: 0  # Don't retry
      action: "move_to_dlq"

  dead_letter_queue:
    retention_days: 14
    notification:
      enabled: true
      recipients: ["integration-team@company.com"]
      threshold: 10  # Alert if DLQ has more than 10 messages
```

---

## 8. Monitoring & Observability

### 8.1 Integration Health Metrics

```yaml
metrics:
  - name: "integration.erp.sync.success_rate"
    type: "gauge"
    target: "> 99%"

  - name: "integration.erp.sync.latency_ms"
    type: "histogram"
    target: "p95 < 5000"

  - name: "integration.idp.auth.success_rate"
    type: "gauge"
    target: "> 99.9%"

  - name: "integration.dlq.depth"
    type: "gauge"
    alert_threshold: "> 10"

  - name: "integration.api_calls.count"
    type: "counter"
    labels: ["integration_type", "status"]
```

### 8.2 Integration Dashboard

**Grafana Dashboard Panels:**
1. Integration Status (green/red indicators)
2. Sync Success Rate (time series)
3. API Call Volume (by integration)
4. Error Rate (by error type)
5. DLQ Depth (alert if > threshold)
6. Average Latency (p50, p95, p99)
7. Last Successful Sync (timestamp)

---

## 9. Security & Compliance

### 9.1 Credential Management

- Store all credentials in HashiCorp Vault or AWS Secrets Manager
- Rotate credentials every 90 days
- Use service accounts (not personal accounts) for integration
- Implement least-privilege access

### 9.2 Data Protection

- Encrypt data in transit (TLS 1.3)
- Encrypt sensitive fields in integration logs
- Mask PII in error messages
- Implement data retention policies for integration logs (30 days)

### 9.3 Audit Trail

Log all integration events:
- Authentication attempts (success/failure)
- Data sync operations (start, end, record count)
- API calls (endpoint, status, latency)
- Configuration changes

---

## 10. Testing Strategy

### 10.1 Integration Testing

**Mock External Systems:**
```javascript
// Mock ERP API for testing
const mockERP = nock('https://erp.company.com')
  .post('/api/cost-posting')
  .reply(201, {
    documentNumber: 'FI-2025-001',
    status: 'posted',
    timestamp: new Date()
  });

// Test cost posting flow
describe('ERP Integration', () => {
  it('should post work order costs to ERP on closure', async () => {
    const workOrder = await createTestWorkOrder();
    await closeWorkOrder(workOrder.workOrderId);

    // Verify ERP was called
    expect(mockERP.isDone()).toBe(true);

    // Verify work order has ERP document number
    const updated = await WorkOrder.findById(workOrder.workOrderId);
    expect(updated.erpDocumentNumber).toBe('FI-2025-001');
  });
});
```

### 10.2 Contract Testing

Use **Pact** for consumer-driven contract testing:
```javascript
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({
  consumer: 'dCMMS',
  provider: 'SAP_ERP',
  port: 9000
});

describe('SAP ERP Contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it('should fetch asset details', async () => {
    await provider.addInteraction({
      state: 'asset ANLN1-001 exists',
      uponReceiving: 'a request for asset details',
      withRequest: {
        method: 'GET',
        path: '/sap/opu/odata4/API_FIXEDASSET_SRV/FixedAsset',
        query: { assetId: 'ANLN1-001' }
      },
      willRespondWith: {
        status: 200,
        body: {
          assetId: 'ANLN1-001',
          description: 'Solar Inverter 3A',
          costCenter: 'CC-1000'
        }
      }
    });

    // Run test
    const asset = await sapClient.getAssetDetails('ANLN1-001');
    expect(asset.assetId).toBe('ANLN1-001');

    await provider.verify();
  });
});
```

---

## 11. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | Integration Team | Initial specification |

---

## 12. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Integration Architect | [TBD] | | |
| Tech Lead | [TBD] | | |
| Security Lead | [TBD] | | |
| Product Owner | [TBD] | | |
