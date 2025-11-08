# dCMMS Authentication & Authorization Specifications

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Role Definitions](#1-role-definitions)
2. [Permission Matrix](#2-permission-matrix)
3. [Attribute-Based Access Control](#3-attribute-based-access-control)
4. [Token Management](#4-token-management)
5. [Multi-Factor Authentication](#5-multi-factor-authentication)
6. [Service Account Management](#6-service-account-management)
7. [Audit & Compliance](#7-audit--compliance)

---

## 1. Role Definitions

### 1.1 Core Roles

#### System Administrator
**Description:** Full system access, manages users, configurations, and integrations

**Responsibilities:**
- User provisioning and deactivation
- System configuration
- Integration management
- Security settings
- Audit log review

**Typical Users:** IT staff, system administrators

**Access Level:** Global, all sites

---

#### Site Manager
**Description:** Manages all operations for assigned site(s)

**Responsibilities:**
- Site-level dashboards and reporting
- Work order approval
- Resource allocation
- Budget oversight
- Vendor management

**Typical Users:** Site directors, operations managers

**Access Level:** Assigned sites only

---

#### Maintenance Supervisor
**Description:** Plans and oversees maintenance activities

**Responsibilities:**
- Work order creation and assignment
- Scheduling and dispatch
- Team management
- SLA monitoring
- Resource planning

**Typical Users:** Maintenance managers, supervisors

**Access Level:** Assigned sites, can view related sites for resource coordination

---

#### Field Technician
**Description:** Executes maintenance work in the field

**Responsibilities:**
- Work order execution
- Parts consumption
- Time tracking
- Photo/measurement capture
- Equipment inspection

**Typical Users:** Technicians, electricians, mechanics

**Access Level:** Assigned work orders only, read-only for assigned assets

**Special Attributes:**
- Mobile-first access
- Offline capabilities required
- Limited to work orders assigned to them

---

#### Reliability Engineer
**Description:** Analyzes asset performance and manages predictive maintenance

**Responsibilities:**
- Telemetry analysis
- Predictive model management
- Root cause analysis
- Performance trending
- Maintenance optimization

**Typical Users:** Reliability engineers, data analysts

**Access Level:** Read-only across all sites, write access to analytics and models

---

#### Compliance Officer
**Description:** Ensures regulatory compliance and manages audits

**Responsibilities:**
- Compliance reporting
- Audit trail review
- Certificate management
- Regulatory submissions
- Policy enforcement

**Typical Users:** Compliance managers, safety officers

**Access Level:** Read-only across all sites, write access to compliance records

---

#### Inventory Manager
**Description:** Manages spare parts and materials

**Responsibilities:**
- Inventory tracking
- Stock adjustments
- Reorder management
- Parts reservation review
- Supplier management

**Typical Users:** Inventory coordinators, warehouse managers

**Access Level:** Assigned warehouses/sites

---

#### Contractor (External)
**Description:** Limited access for external service providers

**Responsibilities:**
- Execute assigned work orders only
- Record work performed
- Upload required documentation

**Typical Users:** Third-party technicians, vendors

**Access Level:** Specific work orders only, time-limited

**Special Attributes:**
- No access to cost data
- No access to unrelated assets
- Session expiry enforced
- Cannot create work orders

---

#### Read-Only Auditor
**Description:** View-only access for audits and reviews

**Responsibilities:**
- Audit trail review
- Report viewing
- Compliance verification

**Typical Users:** External auditors, regulatory inspectors

**Access Level:** Read-only, all sites, time-limited

---

#### Emergency Responder
**Description:** Emergency access for critical situations

**Responsibilities:**
- Emergency work order creation
- Override safety holds (with justification)
- Immediate asset isolation

**Typical Users:** On-call engineers, safety coordinators

**Access Level:** Emergency functions only, requires justification

**Special Attributes:**
- Can override state transitions in emergencies
- All actions flagged for review
- MFA required

---

### 1.2 Role Hierarchy

```
System Administrator (global)
  ├── Site Manager (site-scoped)
  │     ├── Maintenance Supervisor (site-scoped)
  │     │     ├── Field Technician (work-order-scoped)
  │     │     └── Contractor (work-order-scoped, time-limited)
  │     ├── Inventory Manager (site-scoped)
  │     └── Compliance Officer (read-mostly, site-scoped)
  ├── Reliability Engineer (global, read-mostly)
  ├── Read-Only Auditor (global, read-only, time-limited)
  └── Emergency Responder (global, emergency-only)
```

**Inheritance:** Lower roles do not inherit permissions from higher roles (explicit permissions only)

---

## 2. Permission Matrix

### 2.1 Permission Naming Convention

**Format:** `<action>:<resource>[:<scope>]`

**Examples:**
- `read:work-orders`
- `create:work-orders:assigned-sites`
- `delete:users:global`

**Actions:** `create`, `read`, `update`, `delete`, `approve`, `assign`, `execute`, `close`, `export`

**Resources:** `work-orders`, `assets`, `sites`, `users`, `inventory`, `reports`, `settings`, `telemetry`, `models`

**Scopes:** `global`, `assigned-sites`, `assigned-assets`, `own`

---

### 2.2 Detailed Permission Matrix

| Permission | System Admin | Site Manager | Maint Supervisor | Field Tech | Reliability Eng | Compliance Officer | Inventory Mgr | Contractor | Auditor | Emergency |
|------------|--------------|--------------|------------------|------------|-----------------|-------------------|---------------|------------|---------|-----------|
| **Work Orders** |
| `create:work-orders` | ✓ Global | ✓ Sites | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ Emergency only |
| `read:work-orders` | ✓ All | ✓ Sites | ✓ Sites | ✓ Assigned | ✓ All | ✓ All | ✓ Sites | ✓ Assigned | ✓ All | ✓ All |
| `update:work-orders` | ✓ All | ✓ Sites | ✓ Sites | ✓ Assigned* | ✗ | ✗ | ✗ | ✓ Assigned* | ✗ | ✓ Override |
| `delete:work-orders` | ✓ All | ✓ Sites (draft) | ✓ Sites (draft) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `approve:work-orders` | ✓ | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `assign:work-orders` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `execute:work-orders` | ✓ | ✓ | ✓ | ✓ Assigned | ✗ | ✗ | ✗ | ✓ Assigned | ✗ | ✓ |
| `verify:work-orders` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `close:work-orders` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `cancel:work-orders` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Assets** |
| `create:assets` | ✓ | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `read:assets` | ✓ | ✓ Sites | ✓ Sites | ✓ Assigned WO | ✓ All | ✓ All | ✓ Sites | ✓ Assigned WO | ✓ All | ✓ All |
| `update:assets` | ✓ | ✓ Sites | ✓ Sites (status) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ Emergency |
| `delete:assets` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Inventory** |
| `create:inventory` | ✓ | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✓ Sites | ✗ | ✗ | ✗ |
| `read:inventory` | ✓ | ✓ Sites | ✓ Sites | ✓ Assigned WO | ✓ Sites | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ Sites |
| `update:inventory` | ✓ | ✓ Sites | ✗ | ✗ | ✗ | ✗ | ✓ Sites | ✗ | ✗ | ✗ |
| `reserve:inventory` | ✓ | ✓ Sites | ✓ Sites | ✗ (auto) | ✗ | ✗ | ✓ Sites | ✗ | ✗ | ✗ |
| `consume:inventory` | ✓ | ✓ | ✓ | ✓ Assigned WO | ✗ | ✗ | ✓ | ✓ Assigned WO | ✗ | ✓ |
| **Users** |
| `create:users` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `read:users` | ✓ | ✓ Sites | ✓ Sites | ✓ Same site | ✓ All | ✓ All | ✓ Sites | ✗ | ✓ All | ✓ Sites |
| `update:users` | ✓ | ✗ | ✗ | ✓ Own profile | ✗ | ✗ | ✓ Own profile | ✓ Own profile | ✗ | ✗ |
| `deactivate:users` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `assign:roles` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Reports** |
| `read:reports` | ✓ All | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ All | ✓ Sites | ✗ | ✓ All | ✗ |
| `create:reports` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ | ✓ Sites | ✗ | ✗ | ✗ |
| `export:reports` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ All | ✓ Sites | ✗ | ✓ All | ✗ |
| **Telemetry** |
| `read:telemetry` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ All | ✗ | ✗ | ✓ All | ✓ Sites |
| `write:telemetry` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Analytics & ML** |
| `read:models` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✓ All | ✓ All | ✗ | ✗ | ✓ All | ✗ |
| `create:models` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `deploy:models` | ✓ | ✗ | ✗ | ✗ | ✓ (approval) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Settings** |
| `read:settings` | ✓ | ✓ Sites | ✓ Sites | ✗ | ✗ | ✓ All | ✗ | ✗ | ✓ All | ✗ |
| `update:settings` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Audit Logs** |
| `read:audit-logs` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ All | ✗ | ✗ | ✓ All | ✗ |

**Legend:**
- ✓ = Permission granted
- ✗ = Permission denied
- * = Limited fields only (e.g., technician can update task status, attachments, but not priority)

---

## 3. Attribute-Based Access Control (ABAC)

### 3.1 ABAC Attributes

Beyond role-based permissions, access is further restricted by attributes:

#### User Attributes
- `siteIds` - Sites user has access to
- `skills` - User's certified skills
- `certifications` - Active certifications
- `employmentType` - Employee, contractor, auditor
- `department` - Department within organization
- `supervisor` - Supervisor user ID

#### Resource Attributes
- `siteId` - Site where resource exists
- `assetId` - Associated asset
- `status` - Current status
- `priority` - Priority level
- `assignedTo` - User/crew assigned
- `createdBy` - Creator
- `sensitivity` - Data classification

#### Environmental Attributes
- `time` - Current time (for time-based access)
- `location` - User's current location (for geofencing)
- `ipAddress` - Source IP (for IP whitelisting)
- `deviceType` - Mobile vs web

### 3.2 ABAC Policy Examples

#### Policy 1: Site Access Restriction
```json
{
  "policyId": "site-access-restriction",
  "effect": "deny",
  "condition": {
    "and": [
      {
        "attribute": "resource.siteId",
        "operator": "notIn",
        "value": "{{user.siteIds}}"
      },
      {
        "attribute": "user.role",
        "operator": "notEquals",
        "value": "system-admin"
      }
    ]
  },
  "description": "Users can only access resources in their assigned sites (except admins)"
}
```

#### Policy 2: Technician Self-Assignment Only
```json
{
  "policyId": "tech-assigned-only",
  "effect": "allow",
  "action": "execute:work-orders",
  "condition": {
    "or": [
      {
        "attribute": "resource.assignedTo",
        "operator": "equals",
        "value": "{{user.userId}}"
      },
      {
        "attribute": "user.role",
        "operator": "in",
        "value": ["maintenance-supervisor", "site-manager", "system-admin"]
      }
    ]
  }
}
```

#### Policy 3: Business Hours Restriction for Contractors
```json
{
  "policyId": "contractor-business-hours",
  "effect": "deny",
  "condition": {
    "and": [
      {
        "attribute": "user.employmentType",
        "operator": "equals",
        "value": "contractor"
      },
      {
        "attribute": "env.time.hour",
        "operator": "notBetween",
        "value": [8, 17]
      }
    ]
  },
  "description": "Contractors can only access system during business hours (8am-5pm)"
}
```

#### Policy 4: Skill-Based Work Order Assignment
```json
{
  "policyId": "skill-match-required",
  "effect": "deny",
  "action": "assign:work-orders",
  "condition": {
    "attribute": "resource.skills",
    "operator": "notSubsetOf",
    "value": "{{targetUser.skills}}",
    "description": "Can't assign WO if technician lacks required skills"
  }
}
```

#### Policy 5: Geofencing for Field Operations
```json
{
  "policyId": "geofence-field-access",
  "effect": "deny",
  "action": "execute:work-orders",
  "condition": {
    "and": [
      {
        "attribute": "user.deviceType",
        "operator": "equals",
        "value": "mobile"
      },
      {
        "function": "distance",
        "args": ["{{user.location}}", "{{resource.asset.location}}"],
        "operator": "greaterThan",
        "value": 5000,
        "description": "Must be within 5km of asset to execute work on mobile"
      }
    ]
  }
}
```

### 3.3 ABAC Policy Evaluation

**Algorithm:**
1. Collect all applicable policies for (user, action, resource)
2. Evaluate each policy's conditions
3. If any policy has `effect: deny` and condition is TRUE → DENY (explicit deny wins)
4. If any policy has `effect: allow` and condition is TRUE → ALLOW
5. Default → DENY (whitelist approach)

---

## 4. Token Management

### 4.1 Access Token (JWT)

**Lifetime:** 15 minutes
**Refresh Strategy:** Use refresh token to obtain new access token
**Storage:** Memory only (never localStorage for web, secure keychain for mobile)

**Claims:**
```json
{
  "sub": "user-123",
  "email": "john.smith@example.com",
  "name": "John Smith",
  "role": "field-technician",
  "siteIds": ["SITE-ALPHA-001"],
  "skills": ["electrical-hv", "inverter-repair"],
  "employmentType": "employee",
  "permissions": ["read:work-orders:assigned", "execute:work-orders:assigned"],
  "iat": 1730563000,
  "exp": 1730563900,
  "iss": "https://auth.dcmms.io",
  "aud": "dcmms-api"
}
```

### 4.2 Refresh Token

**Lifetime:** 7 days (rolling)
**Storage:** Secure, HttpOnly cookie (web), encrypted keychain (mobile)
**Rotation:** New refresh token issued with each refresh

**Security:**
- Opaque token (not JWT)
- Stored hashed in database
- Single use (invalidated on refresh)
- Revocable
- Family tracking (detect token theft)

**Refresh Flow:**
```
1. Client sends refresh token to /auth/refresh
2. Server validates refresh token
3. Server invalidates old refresh token
4. Server issues new access token + new refresh token
5. Client stores new refresh token, uses new access token
```

**Token Theft Detection:**
- If old (invalidated) refresh token is reused → Revoke entire token family (all tokens for that session)
- Notify user of suspicious activity

### 4.3 API Key (Service Accounts)

**Use Case:** Service-to-service authentication (e.g., SCADA collector → API)

**Lifetime:** No expiry, but must be rotated every 90 days (policy)

**Format:** `dcmms_<environment>_<random-32-chars>`

**Storage:** Encrypted in vault (Hashicorp Vault, AWS Secrets Manager)

**Permissions:** Specific permissions per API key (least privilege)

**Rotation Procedure:**
1. Generate new API key
2. Update service configuration with new key
3. Validate new key works
4. Revoke old key after grace period (e.g., 48 hours)

### 4.4 Token Revocation

**Reasons for Revocation:**
- User logout
- Password change
- User deactivation
- Security incident
- Token theft detection

**Revocation Methods:**
1. **Refresh Token Revocation** - Invalidate refresh token in database
2. **Access Token Revocation** - Add to revocation list (with expiry) checked on each request
3. **User Session Revocation** - Revoke all tokens for a user

**Revocation Endpoint:**
```http
POST /api/v1/auth/revoke
{
  "token": "refresh-token-or-access-token",
  "revokeAll": false  // true to revoke all user sessions
}
```

---

## 5. Multi-Factor Authentication (MFA)

### 5.1 MFA Requirements

**Required For:**
- System Administrator role
- Emergency Responder role
- Any user with `approve:work-orders` permission
- Contractor accounts
- Access from untrusted networks

**Optional For:**
- Field Technician (recommended)
- Inventory Manager

### 5.2 MFA Methods

**Primary: Time-Based One-Time Password (TOTP)**
- Authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
- 6-digit code, 30-second validity
- QR code enrollment

**Secondary: SMS (less secure, fallback only)**
- Send code to registered phone number
- 6-digit code, 10-minute validity
- Rate limited (max 3 per hour)

**Tertiary: Hardware Token (optional, for high-security)**
- FIDO2 / WebAuthn
- YubiKey, etc.

### 5.3 MFA Enrollment Flow

1. User enables MFA in profile settings
2. System generates TOTP secret
3. Display QR code to user
4. User scans with authenticator app
5. User enters verification code
6. System validates and saves secret (encrypted)
7. System generates backup codes (10 single-use codes)
8. User saves backup codes securely

### 5.4 MFA Verification Flow

**Login:**
1. User provides username + password → Verify
2. If MFA enabled → Prompt for MFA code
3. User provides TOTP code
4. System verifies code (allow ±1 time window for clock skew)
5. If valid → Issue access + refresh tokens

**High-Risk Actions:**
- Certain actions (e.g., user deletion, global settings change) require MFA re-verification even if already logged in
- "Step-up authentication" - prompt for MFA code before executing action

### 5.5 MFA Recovery

**Backup Codes:**
- 10 single-use codes generated at enrollment
- Each code can be used once instead of TOTP
- User should store securely (print, password manager)

**Account Recovery (if backup codes lost):**
- Contact administrator
- Admin verifies identity (out-of-band)
- Admin resets MFA for user
- User re-enrolls

---

## 6. Service Account Management

### 6.1 Service Account Types

**API Key Accounts:**
- SCADA collectors
- Edge devices
- Integration services (ERP, weather API consumers)

**OAuth Client Credentials:**
- Internal microservices
- Batch jobs
- Scheduled reports

### 6.2 Service Account Creation

**Process:**
1. Request via ticketing system (with justification)
2. Security team approval
3. Create service account with minimal permissions
4. Generate credentials (API key or client secret)
5. Securely transfer credentials (vault, secure email)
6. Document in service account registry

**Service Account Metadata:**
- Service name
- Owner/team
- Purpose
- Permissions granted
- Creation date
- Last rotation date
- Expiry date (if applicable)

### 6.3 Service Account Monitoring

**Audit Requirements:**
- Log all API calls with service account ID
- Monitor usage patterns (baseline expected usage)
- Alert on anomalies (unexpected endpoints, high volume, off-hours)
- Quarterly access review

---

## 7. Audit & Compliance

### 7.1 Authentication Audit Events

**Log Events:**
- Login success
- Login failure (with reason: invalid password, account locked, MFA failure)
- Logout
- Password change
- MFA enrollment
- MFA disabled
- Token refresh
- Token revocation
- Account lockout
- Password reset

**Event Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "login-success",
  "timestamp": "2025-11-08T10:00:00Z",
  "userId": "user-123",
  "username": "john.smith@example.com",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "mfaUsed": true,
  "sessionId": "session-uuid",
  "deviceId": "device-uuid"
}
```

### 7.2 Authorization Audit Events

**Log Events:**
- Permission check failure (user attempted action they lack permission for)
- Role assignment
- Role removal
- Permission grant
- Permission revocation

**Event Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "authz-denied",
  "timestamp": "2025-11-08T10:05:00Z",
  "userId": "user-123",
  "action": "delete:work-orders",
  "resource": "WO-001",
  "reason": "User lacks permission: delete:work-orders",
  "requestId": "req-uuid"
}
```

### 7.3 Compliance Requirements

**Password Policy:**
- Minimum 12 characters
- Must include uppercase, lowercase, number, special character
- Cannot reuse last 5 passwords
- Expires every 90 days (for non-SSO users)
- Max 5 failed login attempts → Account lockout for 30 minutes

**Session Policy:**
- Web: 8-hour idle timeout
- Mobile: 30-day idle timeout (with refresh token)
- Absolute session timeout: 7 days
- Concurrent session limit: 3 per user

**Access Review:**
- Quarterly review of user permissions
- Annual certification of critical roles
- Automatic deactivation after 90 days of inactivity

---

## Implementation Checklist

- [ ] Implement RBAC roles and permission checks in API middleware
- [ ] Integrate with IdP (Okta/Azure AD) for SSO
- [ ] Implement JWT access token generation and validation
- [ ] Implement refresh token rotation with family tracking
- [ ] Build ABAC policy engine
- [ ] Implement MFA enrollment and verification flows
- [ ] Create service account management API
- [ ] Implement token revocation mechanism
- [ ] Build audit logging for all auth events
- [ ] Create admin UI for user/role management
- [ ] Implement password policy enforcement
- [ ] Set up session timeout mechanisms
- [ ] Create access review workflows

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial authentication and authorization specifications |

