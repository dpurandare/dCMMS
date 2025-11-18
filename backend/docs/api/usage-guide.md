# dCMMS API Usage Guide

## Overview

The dCMMS (Distributed Computerized Maintenance Management System) API is a RESTful API built with Fastify and TypeScript. This guide provides examples and best practices for integrating with the API.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.dcmms.com/api/v1
```

## Interactive API Documentation

Visit the Swagger UI for interactive API documentation:
- **Development:** http://localhost:3000/docs
- **OpenAPI Spec:** http://localhost:3000/docs/json

---

## Authentication

### Overview

The API uses **JWT (JSON Web Token)** bearer authentication. All endpoints except `/health` and `/auth/login` require authentication.

### Login

**POST /api/v1/auth/login**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dcmms.local",
    "password": "admin123"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@dcmms.local",
    "name": "Admin User",
    "role": "admin",
    "tenantId": "acme-corp"
  }
}
```

### Using the Token

Include the JWT token in the `Authorization` header for all subsequent requests:

```bash
curl -X GET http://localhost:3000/api/v1/work-orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Expiration

- **Access Token TTL:** 24 hours
- **Refresh:** Re-login when token expires (refresh tokens to be implemented in Sprint 5)

---

## Pagination

All list endpoints support pagination using query parameters.

### Parameters

- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `sortBy` (string, default: `createdAt`) - Field to sort by
- `sortOrder` (string, enum: `asc`|`desc`, default: `desc`) - Sort direction

### Example

```bash
curl -X GET "http://localhost:3000/api/v1/work-orders?page=2&limit=50&sortBy=priority&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Format

```json
{
  "data": [
    { "id": "123", "title": "Work Order 1", ...},
    { "id": "456", "title": "Work Order 2", ...}
  ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
```

---

## Filtering & Search

List endpoints support filtering by specific fields and full-text search.

### Work Orders Filters

**GET /api/v1/work-orders**

```bash
# Filter by status
curl -X GET "http://localhost:3000/api/v1/work-orders?status=in_progress" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Multiple filters
curl -X GET "http://localhost:3000/api/v1/work-orders?status=scheduled&priority=high&type=corrective" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Full-text search
curl -X GET "http://localhost:3000/api/v1/work-orders?search=inverter" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Combined filters + search + pagination
curl -X GET "http://localhost:3000/api/v1/work-orders?status=in_progress&search=cooling&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Assets Filters

**GET /api/v1/assets**

```bash
# Filter by status
curl -X GET "http://localhost:3000/api/v1/assets?status=operational" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by site
curl -X GET "http://localhost:3000/api/v1/assets?siteId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by asset type
curl -X GET "http://localhost:3000/api/v1/assets?assetType=inverter" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Operations

### 1. Create a Site

**POST /api/v1/sites**

```bash
curl -X POST http://localhost:3000/api/v1/sites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Solar Farm North",
    "code": "SF-NORTH-01",
    "description": "Primary solar installation in northern region",
    "address": "123 Solar Road, Sunnyville, CA 90210",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "timezone": "America/Los_Angeles",
    "metadata": {
      "capacity_mw": 50,
      "installation_date": "2023-01-15"
    }
  }'
```

### 2. Create an Asset

**POST /api/v1/assets**

```bash
curl -X POST http://localhost:3000/api/v1/assets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Inverter INV-001",
    "assetTag": "INV-001",
    "assetType": "inverter",
    "description": "Primary inverter unit",
    "siteId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "operational",
    "manufacturer": "SolarTech Inc",
    "model": "ST-5000X",
    "serialNumber": "ST5000-12345",
    "installationDate": "2023-06-01",
    "warrantyExpiration": "2028-06-01"
  }'
```

### 3. Create a Work Order

**POST /api/v1/work-orders**

```bash
curl -X POST http://localhost:3000/api/v1/work-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Replace inverter cooling fan",
    "description": "Cooling fan making unusual noise, needs replacement",
    "type": "corrective",
    "priority": "high",
    "status": "scheduled",
    "assetId": "550e8400-e29b-41d4-a716-446655440000",
    "siteId": "550e8400-e29b-41d4-a716-446655440001",
    "assignedToId": "550e8400-e29b-41d4-a716-446655440002",
    "scheduledStartDate": "2025-12-01T08:00:00Z",
    "scheduledEndDate": "2025-12-01T12:00:00Z",
    "estimatedHours": 4.0,
    "tasks": [
      {
        "title": "Shut down inverter",
        "description": "Follow safety procedures",
        "sequence": 1
      },
      {
        "title": "Remove old fan",
        "description": "Disconnect power and remove mounting bolts",
        "sequence": 2
      },
      {
        "title": "Install new fan",
        "description": "Mount and connect new fan",
        "sequence": 3
      }
    ],
    "parts": [
      {
        "partId": "550e8400-e29b-41d4-a716-446655440003",
        "quantity": 1
      }
    ]
  }'
```

### 4. Transition Work Order State

**POST /api/v1/work-orders/:id/transition**

```bash
# Start work order
curl -X POST http://localhost:3000/api/v1/work-orders/550e8400-e29b-41d4-a716-446655440000/transition \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "notes": "Beginning maintenance work"
  }'

# Complete work order
curl -X POST http://localhost:3000/api/v1/work-orders/550e8400-e29b-41d4-a716-446655440000/transition \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "complete",
    "notes": "Fan replaced successfully",
    "actualHours": 3.5
  }'
```

**Valid Actions:**
- `start` - Start work (from `scheduled` or `assigned`)
- `hold` - Put on hold (from `in_progress`)
- `resume` - Resume work (from `on_hold`)
- `complete` - Mark complete (from `in_progress`)
- `close` - Close work order (from `completed`)
- `cancel` - Cancel work order (from any status except `closed`)

### 5. Update Asset

**PATCH /api/v1/assets/:id**

```bash
curl -X PATCH http://localhost:3000/api/v1/assets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance",
    "notes": "Under maintenance for cooling fan replacement"
  }'
```

### 6. Delete Work Order

**DELETE /api/v1/work-orders/:id**

```bash
curl -X DELETE http://localhost:3000/api/v1/work-orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but not authorized for this resource |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (duplicate) |
| 422 | Unprocessable Entity | Business logic validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**1. Validation Error (400)**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "instancePath": "/title",
      "message": "must have required property 'title'"
    }
  ]
}
```

**2. Authentication Error (401)**

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**3. Not Found (404)**

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Work order not found"
}
```

**4. Conflict (409)**

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Asset with tag 'INV-001' already exists"
}
```

---

## Rate Limiting

### Limits

- **Default:** 100 requests per minute per IP
- **Headers:** Rate limit info included in response headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Exceeding Rate Limit

**Response (429):**

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Code Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Create API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
async function login(email: string, password: string) {
  const response = await apiClient.post('/auth/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data.user;
}

// List work orders
async function listWorkOrders(filters = {}) {
  const response = await apiClient.get('/work-orders', { params: filters });
  return response.data;
}

// Create work order
async function createWorkOrder(data: any) {
  const response = await apiClient.post('/work-orders', data);
  return response.data;
}

// Transition work order
async function transitionWorkOrder(id: string, action: string, notes?: string) {
  const response = await apiClient.post(`/work-orders/${id}/transition`, {
    action,
    notes,
  });
  return response.data;
}
```

### Python (Requests)

```python
import requests

API_BASE_URL = 'http://localhost:3000/api/v1'

class DCMMSClient:
    def __init__(self, base_url=API_BASE_URL):
        self.base_url = base_url
        self.token = None

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data['token']
        return data['user']

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def list_work_orders(self, **filters):
        response = requests.get(
            f'{self.base_url}/work-orders',
            headers=self._headers(),
            params=filters
        )
        response.raise_for_status()
        return response.json()

    def create_work_order(self, data):
        response = requests.post(
            f'{self.base_url}/work-orders',
            headers=self._headers(),
            json=data
        )
        response.raise_for_status()
        return response.json()

    def transition_work_order(self, wo_id, action, notes=None):
        response = requests.post(
            f'{self.base_url}/work-orders/{wo_id}/transition',
            headers=self._headers(),
            json={'action': action, 'notes': notes}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = DCMMSClient()
client.login('admin@dcmms.local', 'admin123')
work_orders = client.list_work_orders(status='in_progress', priority='high')
```

---

## Versioning

The API uses URL-based versioning. The current version is **v1**.

**Format:** `/api/v1/{resource}`

When breaking changes are introduced, a new version (v2) will be released while maintaining v1 for backward compatibility.

---

## Best Practices

### 1. Always Check Response Status

```typescript
try {
  const response = await apiClient.get('/work-orders');
  console.log('Success:', response.data);
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Error:', error.response.data.message);
  } else if (error.request) {
    // No response received
    console.error('Network error');
  } else {
    console.error('Request setup error');
  }
}
```

### 2. Implement Token Refresh Logic

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 3. Use Pagination for Large Datasets

Always use pagination when fetching lists to avoid performance issues:

```typescript
// Good
const workOrders = await apiClient.get('/work-orders?page=1&limit=50');

// Avoid (may return too much data)
const workOrders = await apiClient.get('/work-orders');
```

### 4. Leverage Filtering

Use filters to reduce data transfer and improve performance:

```typescript
// Instead of fetching all and filtering client-side
const allWO = await apiClient.get('/work-orders');
const filtered = allWO.data.filter(wo => wo.status === 'in_progress');

// Do this (server-side filtering)
const filtered = await apiClient.get('/work-orders?status=in_progress');
```

### 5. Handle Network Errors Gracefully

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      showNotification('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);
```

---

## Support

- **Documentation:** http://localhost:3000/docs
- **GitHub Issues:** https://github.com/your-org/dcmms/issues
- **Email:** support@dcmms.com
