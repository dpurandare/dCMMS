# Database Seeding Guide

## Overview

The dCMMS backend includes a seeding system to populate the database with default data for development and testing environments, and to ensure a secure admin user is available in production.

## Production Admin Seeding

- In production deployments, if no users exist, the system will automatically seed a single admin user with a known, strong default password. On first login, the admin will be shown a mandatory reminder to change their password immediately. This reminder is not shown in dev/test environments.

## Default Data

### Tenant
- **Name**: Demo Corporation
- **Tenant ID**: demo-tenant
- **Domain**: demo.dcmms.local

### Users

| Email                  | Username   | Role         | Password     |
| ---------------------- | ---------- | ------------ | ------------ |
| admin@example.com      | admin      | tenant_admin | Password123! |
| manager@example.com    | manager    | site_manager | Password123! |
| technician@example.com | technician | technician   | Password123! |

> [!WARNING]
> **These are default development credentials**. Never use these in production. Change passwords immediately for any non-dev environment.

### Sites
- **New York Distribution Center** (NYC-01)
- **Los Angeles Warehouse** (LA-01)
- **Chicago Manufacturing Plant** (CHI-01)

### Assets
The seed creates 5 sample assets across all sites:
- HVAC System (NYC)
- Forklift (NYC)
- Conveyor Belt (LA)
- CNC Machine (Chicago)
- Air Compressor (Chicago)

### Work Orders
4 sample work orders demonstrating different statuses and priorities:
- Quarterly HVAC Maintenance (Preventive, In Progress)
- Repair Conveyor Belt Motor (Corrective, Open)
- Emergency CNC Machine Coolant Leak (Emergency, Critical)
- Monthly Forklift Inspection (Inspection, Completed)

---

## Usage

### Automatic Seeding (Recommended for Dev/Test)

The database will be automatically seeded on server startup if:
1. `AUTO_SEED` environment variable is set to `"true"`
2. `NODE_ENV` is set to `development`, `test`, or `local`
3. The database is empty (no tenants exist)

**.env configuration:**
```bash
NODE_ENV=development
AUTO_SEED=true
```

**Start the backend:**
```bash
cd backend
npm run dev
```

**Docker Compose:**
```bash
docker compose up -d
```

The backend service is configured with `AUTO_SEED=true` in development mode.

---

### Manual Seeding

To manually seed the database at any time:

```bash
cd backend
npm run db:seed
```

> [!CAUTION]
> **Destructive Operation**: This will **delete all existing data** before seeding. Use with caution!

---

## Safety Features

### Environment Protection

Seeding is **only allowed** in these environments:
- `development`
- `test`
- `local`

Attempting to seed in **production** will fail with an error:
```
❌ ERROR: Database seeding is only allowed in development/test environments.
   Current environment: production
```

### Auto-Seed Checks

Auto-seeding will:
- ✅ Check if database already has data
- ✅ Skip seeding if data exists
- ✅ Only run if `AUTO_SEED=true`
- ✅ Only run in allowed environments
- ⚠️ Gracefully fail if database is unreachable

---

## Verification

After seeding, you should see output similar to:

```
🌱 Starting database seed...
   Environment: development ✓
Clearing existing data...
Creating tenant...
  ✓ Created tenant: Demo Corporation
Creating users...
  ✓ Created 3 users
Creating sites...
  ✓ Created 3 sites
Creating assets...
  ✓ Created 6 assets
Creating work orders...
  ✓ Created 4 work orders
Creating work order tasks...
  ✓ Created 4 work order tasks

✅ Database seeded successfully!

📊 Summary:
   • 1 tenant
   • 3 users (admin, manager, technician)
   • 3 sites
   • 5 assets
   • 4 work orders
   • 4 work order tasks

🔐 Login credentials:
   • admin@example.com / Password123!
   • manager@example.com / Password123!
   • technician@example.com / Password123!
```

---

## Testing Login

After seeding, test the default credentials:

**Using cURL:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!"
  }'
```

**Using the Frontend:**
1. Navigate to `http://localhost:3000`
2. Login with `admin@example.com` / `Password123!`
3. Explore the pre-populated data

---

## Troubleshooting

### Database Connection Error

**Problem:** `Could not check/seed database: Connection refused`  
**Solution:** Ensure PostgreSQL is running:
```bash
docker compose up -d postgres
```

### Seeding Blocked in Production

**Problem:** `ERROR: Database seeding is only allowed in development/test environments`  
**Solution:** This is intentional! Never seed production. For dev/test, set:
```bash
export NODE_ENV=development
```

### Database Already Has Data

**Behavior:** `Database already contains data. Skipping auto-seed.`  
**Explanation:** This is normal. Auto-seed only runs on empty databases.  
**To Re-Seed:** Use manual seeding: `npm run db:seed`

---

## Production Considerations

> [!CAUTION]
> **Never enable AUTO_SEED in production!**

For production deployments:
1. Set `AUTO_SEED=false` or omit the variable entirely
2. Set `NODE_ENV=production`
3. Create production users manually through admin interface
4. Use proper password policies and MFA

---

## Customizing Seed Data

To modify the default seed data, edit:
```
backend/src/db/seed.ts
```

Remember to:
- Keep default data realistic but minimal
- Use consistent naming conventions
- Include examples for different scenarios
- Document any changes in this file
