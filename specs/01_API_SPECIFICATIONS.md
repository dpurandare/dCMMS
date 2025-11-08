# dCMMS API Specifications

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Versioning Strategy](#2-versioning-strategy)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Standard Request/Response Formats](#4-standard-requestresponse-formats)
5. [Error Handling](#5-error-handling)
6. [Pagination](#6-pagination)
7. [Filtering & Sorting](#7-filtering--sorting)
8. [Rate Limiting](#8-rate-limiting)
9. [MVP API Endpoints](#9-mvp-api-endpoints)
10. [WebSocket Specifications](#10-websocket-specifications)
11. [API Testing Requirements](#11-api-testing-requirements)

---

## 1. API Design Principles

### 1.1 RESTful Conventions

**Resource Naming:**
- Use plural nouns for collections: `/api/v1/assets`, `/api/v1/work-orders`
- Use kebab-case for multi-word resources: `/api/v1/work-orders`
- Nested resources for clear relationships: `/api/v1/sites/{siteId}/assets`
- Avoid deep nesting (max 2 levels)

**HTTP Methods:**
- `GET` - Retrieve resource(s), idempotent, cacheable
- `POST` - Create new resource, non-idempotent
- `PUT` - Full update/replace resource, idempotent
- `PATCH` - Partial update resource, idempotent
- `DELETE` - Remove resource, idempotent

**Status Codes:**
```
2xx Success:
  200 OK - Successful GET, PUT, PATCH, DELETE
  201 Created - Successful POST with resource creation
  202 Accepted - Async operation accepted
  204 No Content - Successful DELETE with no response body

3xx Redirection:
  304 Not Modified - Cached resource still valid

4xx Client Errors:
  400 Bad Request - Invalid request format/validation error
  401 Unauthorized - Missing or invalid authentication
  403 Forbidden - Authenticated but lacks permission
  404 Not Found - Resource doesn't exist
  409 Conflict - Resource conflict (e.g., duplicate, version mismatch)
  422 Unprocessable Entity - Semantic validation error
  429 Too Many Requests - Rate limit exceeded

5xx Server Errors:
  500 Internal Server Error - Unexpected server error
  502 Bad Gateway - Upstream service error
  503 Service Unavailable - Service temporarily down
  504 Gateway Timeout - Upstream timeout
```

### 1.2 Design Goals

1. **Consistency** - Predictable patterns across all endpoints
2. **Discoverability** - HATEOAS links for navigation
3. **Efficiency** - Minimize round trips, support field selection
4. **Evolvability** - Backward-compatible changes, versioning
5. **Security** - Authentication, authorization, input validation, audit logging
6. **Performance** - Caching, pagination, compression, rate limiting

---

## 2. Versioning Strategy

### 2.1 URL-Based Versioning

**Pattern:** `/api/v{major}/resource`

**Example:** `/api/v1/work-orders`

**Rationale:**
- Simple and explicit
- Easy to route and proxy
- Clear in logs and documentation
- Browser-friendly for testing

### 2.2 Version Lifecycle

- **v1** - Initial MVP release
- **v2** - Introduced when breaking changes required
- **Support Policy** - Maintain previous version for 12 months after new version release
- **Deprecation Headers** - Include `Deprecation: true` and `Sunset: <date>` headers

### 2.3 Breaking vs Non-Breaking Changes

**Breaking Changes (require new version):**
- Removing endpoints or fields
- Changing field types
- Changing authentication mechanisms
- Changing response structure

**Non-Breaking Changes (same version):**
- Adding new endpoints
- Adding optional fields
- Adding new response fields
- Relaxing validation

---

## 3. Authentication & Authorization

### 3.1 Authentication Methods

**Primary: OAuth 2.0 + OpenID Connect (OIDC)**

**Token Types:**
1. **Access Token** - JWT, short-lived (15 minutes)
2. **Refresh Token** - Opaque, long-lived (7 days), rotated on use
3. **API Key** - For service-to-service, long-lived, revocable

### 3.2 Access Token Format (JWT)

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-2025-11"
}
```

**Payload:**
```json
{
  "iss": "https://auth.dcmms.io",
  "sub": "user-12345",
  "aud": "dcmms-api",
  "exp": 1730563200,
  "iat": 1730562300,
  "nbf": 1730562300,
  "jti": "token-uuid",
  "scope": "read:assets write:work-orders",
  "roles": ["field-technician"],
  "siteIds": ["SITE-ALPHA-001", "SITE-BETA-002"],
  "tenantId": "tenant-xyz"
}
```

**Key Claims:**
- `sub` - User ID
- `scope` - OAuth scopes (space-separated)
- `roles` - User roles for RBAC
- `siteIds` - Site access for ABAC
- `tenantId` - Multi-tenant isolation

### 3.3 Authentication Flow

**1. Web Application (Authorization Code Flow):**
```
User → Login → IdP → Authorization Code → Client
Client → Exchange Code for Tokens → Auth Server
Client → API Request (Bearer Token) → API Server
```

**2. Mobile Application (PKCE):**
```
Mobile → Login with PKCE → IdP → Code
Mobile → Exchange Code + Verifier → Tokens
Mobile → API Request (Bearer Token) → API Server
Mobile → Refresh Token → New Access Token
```

**3. Service-to-Service (Client Credentials):**
```
Service → Client ID + Secret → Access Token
Service → API Request (Bearer Token) → API Server
```

**4. Edge Devices (Device Code Flow or Certificate):**
```
Device → mTLS Certificate → API Server
OR
Device → Device Code → User Approves → Access Token
```

### 3.4 Authorization Header

```http
Authorization: Bearer <access-token>
```

**API Key (alternative for services):**
```http
X-API-Key: <api-key>
```

### 3.5 Token Refresh

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```json
{
  "refreshToken": "opaque-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### 3.6 Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Effect:**
- Invalidate refresh token
- Revoke sessions
- Access tokens remain valid until expiry (short TTL mitigates risk)

---

## 4. Standard Request/Response Formats

### 4.1 Request Headers

**Required:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Optional:**
```http
X-Request-ID: uuid-for-tracing
Accept-Language: en-US
X-Timezone: America/New_York
If-Match: "etag-value"  (for optimistic locking)
```

### 4.2 Success Response Format

**Single Resource:**
```json
{
  "data": {
    "assetId": "INV-3A",
    "siteId": "SITE-ALPHA-001",
    "type": "inverter",
    "status": "operational"
  },
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2025-11-08T10:30:00Z"
  },
  "links": {
    "self": "/api/v1/assets/INV-3A",
    "site": "/api/v1/sites/SITE-ALPHA-001",
    "workOrders": "/api/v1/assets/INV-3A/work-orders"
  }
}
```

**Collection:**
```json
{
  "data": [
    { "assetId": "INV-3A", ... },
    { "assetId": "INV-3B", ... }
  ],
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2025-11-08T10:30:00Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalPages": 5,
      "totalItems": 87,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "links": {
    "self": "/api/v1/assets?page=1",
    "first": "/api/v1/assets?page=1",
    "next": "/api/v1/assets?page=2",
    "last": "/api/v1/assets?page=5"
  }
}
```

### 4.3 Empty Response

**For successful DELETE or operations with no return data:**
```http
HTTP/1.1 204 No Content
```

**For empty collections:**
```json
{
  "data": [],
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2025-11-08T10:30:00Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalPages": 0,
      "totalItems": 0
    }
  }
}
```

---

## 5. Error Handling

### 5.1 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred",
    "details": [
      {
        "field": "scheduledStart",
        "message": "Scheduled start date must be in the future",
        "code": "INVALID_DATE"
      },
      {
        "field": "assignedTo",
        "message": "Assigned user does not have required skills",
        "code": "MISSING_SKILLS"
      }
    ],
    "requestId": "req-uuid",
    "timestamp": "2025-11-08T10:30:00Z",
    "documentation": "https://docs.dcmms.io/errors/VALIDATION_ERROR"
  }
}
```

### 5.2 Error Code Catalog

**Authentication Errors (401):**
```
AUTH_MISSING_TOKEN - No Authorization header provided
AUTH_INVALID_TOKEN - Token is malformed or invalid
AUTH_EXPIRED_TOKEN - Token has expired
AUTH_REVOKED_TOKEN - Token has been revoked
AUTH_INVALID_SIGNATURE - Token signature verification failed
```

**Authorization Errors (403):**
```
AUTHZ_INSUFFICIENT_PERMISSIONS - User lacks required permission
AUTHZ_SITE_ACCESS_DENIED - User doesn't have access to this site
AUTHZ_RESOURCE_FORBIDDEN - Resource access forbidden
```

**Validation Errors (400, 422):**
```
VALIDATION_ERROR - Generic validation failure (with details array)
INVALID_JSON - Request body is not valid JSON
MISSING_REQUIRED_FIELD - Required field not provided
INVALID_FIELD_TYPE - Field has wrong data type
INVALID_FIELD_VALUE - Field value doesn't meet constraints
INVALID_ENUM_VALUE - Value not in allowed enum
INVALID_DATE_FORMAT - Date doesn't match ISO 8601
INVALID_UUID_FORMAT - UUID malformed
```

**Resource Errors (404, 409):**
```
RESOURCE_NOT_FOUND - Resource doesn't exist
RESOURCE_ALREADY_EXISTS - Duplicate resource (e.g., ID collision)
RESOURCE_CONFLICT - Resource state conflict
VERSION_CONFLICT - Optimistic locking version mismatch
RELATED_RESOURCE_NOT_FOUND - Referenced resource (e.g., siteId) not found
```

**Business Logic Errors (422):**
```
INVALID_STATE_TRANSITION - State change not allowed
ASSET_NOT_OPERATIONAL - Can't perform operation on non-operational asset
INSUFFICIENT_INVENTORY - Not enough parts in stock
SCHEDULE_CONFLICT - Scheduling conflict with existing work order
SKILL_MISMATCH - Assigned user lacks required skills
```

**Rate Limiting (429):**
```
RATE_LIMIT_EXCEEDED - Too many requests
```

**Server Errors (500, 502, 503, 504):**
```
INTERNAL_SERVER_ERROR - Unexpected server error
UPSTREAM_SERVICE_ERROR - Dependency service failed
SERVICE_UNAVAILABLE - Service temporarily unavailable
UPSTREAM_TIMEOUT - Dependency service timeout
```

### 5.3 Error Response Examples

**Validation Error:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "priority",
        "message": "Priority must be one of: low, medium, high, urgent",
        "code": "INVALID_ENUM_VALUE"
      }
    ],
    "requestId": "req-123",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**Not Found:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Work order WO-12345 not found",
    "requestId": "req-456",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**Insufficient Permissions:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "AUTHZ_INSUFFICIENT_PERMISSIONS",
    "message": "User lacks permission: delete:work-orders",
    "requestId": "req-789",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

---

## 6. Pagination

### 6.1 Page-Based Pagination

**Default pagination for collections.**

**Request:**
```http
GET /api/v1/work-orders?page=2&pageSize=50
```

**Query Parameters:**
- `page` - Page number (1-indexed), default: 1
- `pageSize` - Items per page, default: 20, max: 100

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "pageSize": 50,
      "totalPages": 10,
      "totalItems": 487,
      "hasNext": true,
      "hasPrevious": true
    }
  },
  "links": {
    "first": "/api/v1/work-orders?page=1&pageSize=50",
    "previous": "/api/v1/work-orders?page=1&pageSize=50",
    "self": "/api/v1/work-orders?page=2&pageSize=50",
    "next": "/api/v1/work-orders?page=3&pageSize=50",
    "last": "/api/v1/work-orders?page=10&pageSize=50"
  }
}
```

### 6.2 Cursor-Based Pagination

**For high-volume real-time data (e.g., telemetry, events).**

**Request:**
```http
GET /api/v1/sensor-readings?cursor=eyJpZCI6MTIzNDU2fQ&limit=100
```

**Query Parameters:**
- `cursor` - Opaque cursor (base64-encoded), omit for first page
- `limit` - Items to return, default: 50, max: 500

**Response:**
```json
{
  "data": [...],
  "meta": {
    "hasMore": true
  },
  "links": {
    "self": "/api/v1/sensor-readings?cursor=eyJpZCI6MTIzNDU2fQ&limit=100",
    "next": "/api/v1/sensor-readings?cursor=eyJpZCI6MTIzNTU2fQ&limit=100"
  }
}
```

---

## 7. Filtering & Sorting

### 7.1 Filtering

**Query Parameter Format:**
```
?filter[field]=value
?filter[field][operator]=value
```

**Examples:**
```http
GET /api/v1/work-orders?filter[status]=scheduled
GET /api/v1/work-orders?filter[priority][in]=high,urgent
GET /api/v1/assets?filter[siteId]=SITE-ALPHA-001&filter[type]=inverter
GET /api/v1/work-orders?filter[scheduledStart][gte]=2025-11-01T00:00:00Z
```

**Supported Operators:**
- `eq` (equals, default if no operator)
- `ne` (not equals)
- `gt` (greater than)
- `gte` (greater than or equal)
- `lt` (less than)
- `lte` (less than or equal)
- `in` (in list, comma-separated)
- `nin` (not in list)
- `contains` (substring match, case-insensitive)
- `startsWith` (prefix match)

**Special Filters:**
```http
GET /api/v1/work-orders?filter[updatedAt][gte]=2025-11-01&filter[updatedAt][lt]=2025-11-08
```

### 7.2 Sorting

**Query Parameter Format:**
```
?sort=field
?sort=-field (descending)
?sort=field1,-field2 (multiple fields)
```

**Examples:**
```http
GET /api/v1/work-orders?sort=scheduledStart
GET /api/v1/work-orders?sort=-priority,scheduledStart
GET /api/v1/assets?sort=siteId,type
```

**Default Sorting:**
- Most collections: sorted by `createdAt` descending
- Time-series data: sorted by `timestamp` descending

### 7.3 Field Selection (Sparse Fieldsets)

**Request specific fields only:**
```http
GET /api/v1/work-orders?fields=workOrderId,title,status,priority
```

**Benefits:**
- Reduced bandwidth
- Faster response times
- Client controls payload size

### 7.4 Expansion (Including Related Resources)

**Request:**
```http
GET /api/v1/work-orders/WO-001?expand=asset,assignedUser
```

**Response includes expanded resources inline:**
```json
{
  "data": {
    "workOrderId": "WO-001",
    "assetId": "INV-3A",
    "assignedTo": "user-123",
    "asset": {
      "assetId": "INV-3A",
      "type": "inverter",
      "siteId": "SITE-ALPHA-001"
    },
    "assignedUser": {
      "userId": "user-123",
      "name": "John Smith",
      "role": "field-technician"
    }
  }
}
```

---

## 8. Rate Limiting

### 8.1 Rate Limit Policy

**Tiers:**
```
- Authenticated Users: 1000 requests/hour, burst 100 req/min
- Service Accounts: 5000 requests/hour, burst 500 req/min
- Admin Users: 10000 requests/hour, burst 1000 req/min
- Anonymous (if allowed): 100 requests/hour, burst 10 req/min
```

**Per Endpoint Overrides:**
```
- POST /api/v1/sensor-readings (bulk): 10000 req/hour (telemetry ingestion)
- POST /api/v1/auth/login: 10 req/hour per IP (prevent brute force)
```

### 8.2 Rate Limit Headers

**Every response includes:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1730567400
Retry-After: 3600 (if 429 response)
```

### 8.3 Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730567400

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 3600 seconds.",
    "requestId": "req-xyz",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

---

## 9. MVP API Endpoints

### 9.1 Asset Management

#### List Assets
```http
GET /api/v1/assets
```

**Query Parameters:**
- Standard pagination, filtering, sorting
- `filter[siteId]`, `filter[type]`, `filter[category]`, `filter[status]`

**Response:** 200 OK
```json
{
  "data": [
    {
      "assetId": "INV-3A",
      "siteId": "SITE-ALPHA-001",
      "parentAssetId": null,
      "type": "inverter",
      "category": "inverter",
      "manufacturer": "SMA",
      "model": "Sunny Central 2750",
      "serialNumber": "SN-INV-001",
      "status": "operational",
      "commissionDate": "2024-03-15T00:00:00Z",
      "location": {
        "lat": 34.0522,
        "lon": -118.2437,
        "elevation": 71
      }
    }
  ],
  "meta": { "pagination": {...} }
}
```

#### Get Asset by ID
```http
GET /api/v1/assets/{assetId}
```

**Path Parameters:**
- `assetId` - Asset identifier

**Query Parameters:**
- `expand` - Related resources (e.g., `expand=site,parentAsset,childAssets`)

**Response:** 200 OK (full asset object with all fields)

**Errors:**
- 404 if asset not found
- 403 if user lacks access to asset's site

#### Create Asset
```http
POST /api/v1/assets
```

**Request Body:**
```json
{
  "assetId": "INV-3A",
  "siteId": "SITE-ALPHA-001",
  "type": "inverter",
  "category": "inverter",
  "manufacturer": "SMA",
  "model": "Sunny Central 2750",
  "serialNumber": "SN-INV-001",
  "commissionDate": "2024-03-15T00:00:00Z",
  "specifications": {
    "ratedPowerKw": 2750,
    "operatingVoltage": 480,
    "safetyRating": "UL1741",
    "environmentalClass": "IP65"
  },
  "compliance": {
    "certifications": [
      {
        "type": "UL1741",
        "issuer": "UL",
        "number": "CERT-12345",
        "validUntil": "2027-03-15T00:00:00Z"
      }
    ],
    "standards": ["IEEE 1547", "IEC 62109"]
  },
  "maintenance": {
    "criticality": "high",
    "maintenanceStrategy": "predictive",
    "pmInterval": "P6M",
    "requiredPpe": ["arc-flash-suit", "insulated-gloves"],
    "lotoRequired": true
  },
  "location": {
    "lat": 34.0522,
    "lon": -118.2437,
    "elevation": 71,
    "indoor": false,
    "accessRequirements": ["high-voltage-permit"]
  }
}
```

**Response:** 201 Created
```json
{
  "data": { /* created asset */ },
  "links": {
    "self": "/api/v1/assets/INV-3A"
  }
}
```

**Errors:**
- 400 validation error
- 409 if assetId already exists
- 422 if siteId doesn't exist

#### Update Asset
```http
PUT /api/v1/assets/{assetId}
PATCH /api/v1/assets/{assetId}
```

**PUT:** Full replacement
**PATCH:** Partial update (only provided fields)

**Request Body:** Asset object (PUT: all fields, PATCH: subset)

**Headers:**
```http
If-Match: "etag-value"  (optimistic locking)
```

**Response:** 200 OK with updated asset

**Errors:**
- 404 if not found
- 409 if If-Match fails (version conflict)
- 422 if invalid state transition (e.g., can't decommission asset with active WOs)

#### Delete Asset
```http
DELETE /api/v1/assets/{assetId}
```

**Response:** 204 No Content

**Errors:**
- 404 if not found
- 422 if asset has dependencies (active WOs, child assets)

**Note:** Soft delete preferred (set status=decommissioned)

#### List Assets by Site
```http
GET /api/v1/sites/{siteId}/assets
```

**Convenience endpoint, equivalent to:**
```http
GET /api/v1/assets?filter[siteId]={siteId}
```

---

### 9.2 Work Order Management

#### List Work Orders
```http
GET /api/v1/work-orders
```

**Query Parameters:**
- Standard pagination, filtering, sorting
- `filter[status]`, `filter[type]`, `filter[priority]`, `filter[siteId]`
- `filter[assignedTo]`, `filter[createdBy]`
- `filter[scheduledStart][gte]`, `filter[scheduledStart][lte]`

**Response:** 200 OK with array of work orders

#### Get Work Order by ID
```http
GET /api/v1/work-orders/{workOrderId}
```

**Query Parameters:**
- `expand=asset,assignedUser,tasks,attachments`

**Response:** 200 OK
```json
{
  "data": {
    "workOrderId": "WO-20251101-0001",
    "type": "corrective",
    "title": "Replace inverter AC contactor - Inverter 3A",
    "description": "AC contactor showing signs of arcing",
    "priority": "high",
    "status": "scheduled",
    "siteId": "SITE-ALPHA-001",
    "assetId": "INV-3A",
    "createdBy": "ops-user-5",
    "createdAt": "2025-11-01T12:10:00Z",
    "updatedAt": "2025-11-02T08:00:00Z",
    "assignedTo": "user-123",
    "scheduledStart": "2025-11-03T08:00:00Z",
    "scheduledEnd": "2025-11-03T12:00:00Z",
    "estimatedDurationMinutes": 120,
    "actualStart": null,
    "actualEnd": null,
    "tasks": [
      {
        "taskId": "t1",
        "title": "Isolate AC supply",
        "description": "Lock out AC breaker and verify isolation",
        "sequence": 1,
        "requiresPermit": true,
        "permitType": "electrical-loto",
        "status": "pending",
        "assignedTo": "user-123"
      },
      {
        "taskId": "t2",
        "title": "Replace contactor",
        "sequence": 2,
        "requiresPermit": false,
        "status": "pending"
      }
    ],
    "partsRequired": [
      {
        "partId": "CTR-AC-120",
        "description": "AC Contactor 120A",
        "quantity": 1,
        "reserved": true,
        "reservationId": "RES-123"
      }
    ],
    "partsUsed": [],
    "laborRecords": [],
    "attachments": [],
    "measurements": [],
    "skills": ["electrical-hv", "inverter-repair"],
    "requiredPpe": ["arc-flash-suit", "insulated-gloves"],
    "sla": {
      "responseTimeHours": 4,
      "resolutionTimeHours": 24,
      "responseDeadline": "2025-11-01T16:10:00Z",
      "resolutionDeadline": "2025-11-02T12:10:00Z"
    },
    "automationMetadata": {
      "origin": "alarm",
      "alarmId": "ALARM-9876",
      "modelId": null,
      "confidence": null
    },
    "tags": ["urgent", "safety-critical"],
    "customFields": {},
    "syncState": {
      "synced": true,
      "lastSyncAt": "2025-11-02T08:00:00Z",
      "conflictDetected": false
    }
  }
}
```

#### Create Work Order
```http
POST /api/v1/work-orders
```

**Request Body:**
```json
{
  "type": "corrective",
  "title": "Replace inverter AC contactor - Inverter 3A",
  "description": "AC contactor showing signs of arcing",
  "priority": "high",
  "siteId": "SITE-ALPHA-001",
  "assetId": "INV-3A",
  "assignedTo": "user-123",
  "scheduledStart": "2025-11-03T08:00:00Z",
  "scheduledEnd": "2025-11-03T12:00:00Z",
  "tasks": [
    {
      "title": "Isolate AC supply",
      "description": "Lock out AC breaker",
      "sequence": 1,
      "requiresPermit": true,
      "permitType": "electrical-loto"
    }
  ],
  "partsRequired": [
    {
      "partId": "CTR-AC-120",
      "quantity": 1
    }
  ],
  "skills": ["electrical-hv"],
  "tags": ["urgent"]
}
```

**Response:** 201 Created with generated workOrderId

**Errors:**
- 400/422 validation errors
- 422 if asset doesn't exist or not operational
- 422 if assigned user lacks required skills
- 422 if parts not available

#### Update Work Order
```http
PATCH /api/v1/work-orders/{workOrderId}
```

**Request Body:** Partial work order fields

**Headers:**
```http
If-Match: "etag-value"  (optimistic locking for conflict detection)
```

**Response:** 200 OK with updated work order

**Special Considerations:**
- Status transitions validated by state machine
- Some fields immutable after certain states (e.g., can't change assetId after in-progress)

#### Change Work Order Status
```http
POST /api/v1/work-orders/{workOrderId}/transitions
```

**Request Body:**
```json
{
  "toStatus": "in-progress",
  "comment": "Starting work on contactor replacement",
  "timestamp": "2025-11-03T08:05:00Z"
}
```

**Response:** 200 OK with updated work order

**Errors:**
- 422 INVALID_STATE_TRANSITION if transition not allowed

**Valid Transitions:**
- draft → submitted
- submitted → approved, cancelled
- approved → scheduled, cancelled
- scheduled → assigned, cancelled
- assigned → in-progress, cancelled
- in-progress → on-hold, completed, cancelled
- on-hold → in-progress, cancelled
- completed → verified, in-progress (reopen)
- verified → closed
- closed → (immutable, but can create new WO if needed)

#### Add Attachment to Work Order
```http
POST /api/v1/work-orders/{workOrderId}/attachments
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <binary file>
description: "Photo of damaged contactor"
attachmentType: "photo"
capturedAt: "2025-11-03T08:30:00Z"
capturedBy: "user-123"
location: { "lat": 34.0522, "lon": -118.2437 }
```

**Response:** 201 Created
```json
{
  "data": {
    "attachmentId": "ATT-001",
    "workOrderId": "WO-001",
    "fileName": "contactor-damage.jpg",
    "fileSize": 2457600,
    "mimeType": "image/jpeg",
    "url": "/api/v1/attachments/ATT-001",
    "thumbnailUrl": "/api/v1/attachments/ATT-001/thumbnail",
    "description": "Photo of damaged contactor",
    "attachmentType": "photo",
    "capturedAt": "2025-11-03T08:30:00Z",
    "capturedBy": "user-123",
    "location": { "lat": 34.0522, "lon": -118.2437 },
    "uploadedAt": "2025-11-03T08:35:00Z"
  }
}
```

**Limits:**
- Max file size: 50 MB per file
- Max attachments per WO: 100
- Allowed types: image/*, application/pdf, video/* (limited duration)

#### Add Labor Record
```http
POST /api/v1/work-orders/{workOrderId}/labor
```

**Request Body:**
```json
{
  "userId": "user-123",
  "startTime": "2025-11-03T08:00:00Z",
  "endTime": "2025-11-03T10:30:00Z",
  "durationMinutes": 150,
  "laborType": "regular",
  "notes": "Completed contactor replacement"
}
```

**Response:** 201 Created with labor record

#### Record Parts Usage
```http
POST /api/v1/work-orders/{workOrderId}/parts-used
```

**Request Body:**
```json
{
  "partId": "CTR-AC-120",
  "quantity": 1,
  "consumedAt": "2025-11-03T09:15:00Z",
  "consumedBy": "user-123",
  "reservationId": "RES-123"
}
```

**Response:** 201 Created

**Side Effect:** Inventory decremented

#### Close Work Order
```http
POST /api/v1/work-orders/{workOrderId}/close
```

**Request Body:**
```json
{
  "completionNotes": "Contactor replaced successfully, system tested and operational",
  "rootCause": "Contactor degradation due to high inrush current",
  "preventiveActions": "Schedule regular thermal imaging inspection",
  "verifiedBy": "supervisor-456",
  "signature": "base64-encoded-signature-image"
}
```

**Response:** 200 OK

**Validations:**
- All required tasks completed
- Labor records present
- Parts usage recorded if parts were reserved

---

### 9.3 Site Management

#### List Sites
```http
GET /api/v1/sites
```

**Response:** 200 OK with site collection

#### Get Site by ID
```http
GET /api/v1/sites/{siteId}
```

**Response:** 200 OK
```json
{
  "data": {
    "siteId": "SITE-ALPHA-001",
    "name": "Alpha Solar Farm",
    "type": "solar",
    "location": {
      "address": "123 Solar Way, Desert City, CA",
      "lat": 34.0522,
      "lon": -118.2437,
      "timezone": "America/Los_Angeles"
    },
    "capacityMw": 50,
    "commissionDate": "2023-06-01T00:00:00Z",
    "status": "operational",
    "metadata": {
      "gridConnection": "transmission-138kv",
      "operator": "GreenPower Inc"
    }
  }
}
```

#### Create/Update/Delete Site
Similar patterns to Asset endpoints.

---

### 9.4 Inventory Management

#### List Inventory Items
```http
GET /api/v1/inventory
```

**Query Parameters:**
- `filter[siteId]`, `filter[category]`, `filter[lowStock]=true`

#### Get Inventory Item
```http
GET /api/v1/inventory/{partId}
```

#### Reserve Parts
```http
POST /api/v1/inventory/reservations
```

**Request Body:**
```json
{
  "partId": "CTR-AC-120",
  "quantity": 2,
  "workOrderId": "WO-001",
  "reservedBy": "user-123",
  "expiresAt": "2025-11-10T00:00:00Z"
}
```

**Response:** 201 Created with reservationId

**Errors:**
- 422 INSUFFICIENT_INVENTORY if not enough stock

#### Consume Reserved Parts
(Covered under Work Order parts-used endpoint)

#### Adjust Inventory
```http
POST /api/v1/inventory/{partId}/adjustments
```

**Request Body:**
```json
{
  "adjustmentType": "recount",
  "quantityChange": -5,
  "reason": "Physical inventory count found shortage",
  "adjustedBy": "inventory-manager-789"
}
```

**Response:** 201 Created

**Audit:** All adjustments logged

---

### 9.5 User Management

#### List Users
```http
GET /api/v1/users
```

**Query Parameters:**
- `filter[role]`, `filter[siteId]`, `filter[status]`

#### Get User by ID
```http
GET /api/v1/users/{userId}
```

**Response:** 200 OK
```json
{
  "data": {
    "userId": "user-123",
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "field-technician",
    "status": "active",
    "siteIds": ["SITE-ALPHA-001"],
    "skills": ["electrical-hv", "inverter-repair", "loto-certified"],
    "phone": "+1-555-0100",
    "createdAt": "2024-01-15T00:00:00Z"
  }
}
```

#### Create/Update/Deactivate User
Standard CRUD patterns.

**Note:** Actual authentication managed by IdP, this is for user profile/metadata.

---

### 9.6 Telemetry Ingestion (Release 1, included for completeness)

#### Ingest Sensor Readings (Bulk)
```http
POST /api/v1/sensor-readings/bulk
```

**Request Body:**
```json
{
  "readings": [
    {
      "readingId": "reading-uuid-1",
      "assetId": "INV-3A",
      "sensorId": "temp-sensor-1",
      "timestamp": "2025-11-08T10:00:00Z",
      "metrics": {
        "temperature_c": 45.2,
        "humidity_pct": 32.1
      },
      "quality": "good"
    },
    {
      "readingId": "reading-uuid-2",
      "assetId": "INV-3A",
      "sensorId": "power-sensor-1",
      "timestamp": "2025-11-08T10:00:00Z",
      "metrics": {
        "active_power_kw": 2650.5,
        "reactive_power_kvar": 150.2,
        "voltage_v": 482.1,
        "current_a": 3200.3
      },
      "quality": "good"
    }
  ]
}
```

**Response:** 202 Accepted (async processing)
```json
{
  "data": {
    "batchId": "batch-uuid",
    "accepted": 2,
    "status": "processing"
  }
}
```

**Rate Limit:** Higher limit (10000 req/hour) for telemetry ingestion

---

### 9.7 Reporting & Analytics

#### Get Dashboard KPIs
```http
GET /api/v1/analytics/kpis
```

**Query Parameters:**
- `filter[siteId]`
- `filter[dateFrom]`, `filter[dateTo]`

**Response:** 200 OK
```json
{
  "data": {
    "siteId": "SITE-ALPHA-001",
    "period": {
      "from": "2025-11-01T00:00:00Z",
      "to": "2025-11-08T00:00:00Z"
    },
    "workOrders": {
      "total": 87,
      "open": 23,
      "overdue": 5,
      "completed": 64,
      "avgCompletionTimeHours": 18.5
    },
    "assets": {
      "total": 450,
      "operational": 445,
      "maintenance": 3,
      "failed": 2,
      "availabilityPct": 98.9
    },
    "sla": {
      "compliance": 94.2,
      "breaches": 5
    },
    "inventory": {
      "itemsLowStock": 7,
      "stockoutItems": 2
    }
  }
}
```

---

## 10. WebSocket Specifications

### 10.1 Connection

**Endpoint:** `wss://api.dcmms.io/ws`

**Authentication:**
```
Connect with access token in query parameter or header:
wss://api.dcmms.io/ws?token=<access-token>
```

### 10.2 Message Format

**Client → Server (Subscribe):**
```json
{
  "action": "subscribe",
  "channel": "work-orders",
  "filter": {
    "siteId": "SITE-ALPHA-001",
    "status": ["scheduled", "in-progress"]
  }
}
```

**Server → Client (Event):**
```json
{
  "event": "work-order.updated",
  "channel": "work-orders",
  "data": {
    "workOrderId": "WO-001",
    "status": "in-progress",
    "updatedAt": "2025-11-08T10:30:00Z"
  },
  "timestamp": "2025-11-08T10:30:05Z"
}
```

**Client → Server (Unsubscribe):**
```json
{
  "action": "unsubscribe",
  "channel": "work-orders"
}
```

### 10.3 Channels

- `work-orders` - Work order create/update/delete events
- `assets` - Asset status changes
- `alerts` - Real-time alerts and alarms (Release 1)
- `notifications` - User notifications

### 10.4 Heartbeat

**Server sends ping every 30 seconds:**
```json
{"type": "ping"}
```

**Client responds with pong:**
```json
{"type": "pong"}
```

**Connection closed if no pong received within 60 seconds.**

---

## 11. API Testing Requirements

### 11.1 Contract Testing

**Tools:** Pact, Spring Cloud Contract

**Requirements:**
- Provider contracts for all endpoints
- Consumer-driven contract tests
- Contract validation in CI/CD

### 11.2 Integration Testing

**Requirements:**
- Test all CRUD operations
- Test state transitions
- Test error scenarios
- Test authentication/authorization
- Test rate limiting
- Test pagination edge cases

### 11.3 Performance Testing

**Load Test Scenarios:**
- 100 concurrent users creating/updating work orders
- 1000 requests/sec telemetry ingestion (Release 1)
- Dashboard query performance under load

**Performance Targets:**
- API latency p95 < 300ms (CRUD), < 1s (analytics)
- Throughput: 500 req/sec sustained

### 11.4 Security Testing

**Requirements:**
- Authentication bypass attempts
- Authorization boundary testing
- SQL injection, XSS in inputs
- Rate limit validation
- Token expiry and refresh testing

---

## Appendix: OpenAPI Specification

**Complete OpenAPI 3.0 spec available at:**
`/specs/openapi/dcmms-api-v1.yaml`

(To be generated from this specification document)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial draft for MVP |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | [TBD] | | |
| Security Lead | [TBD] | | |
| Product Owner | [TBD] | | |

