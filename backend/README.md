# dCMMS Backend

Node.js (Fastify) API service for the Distributed Computerized Maintenance Management System.

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL with pgvector extension
- Redis

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Database Setup

Run migrations:
```bash
npm run db:migrate
```

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000` with interactive documentation at `http://localhost:3000/docs`.

---

## Database Seeding

For development/testing, the database can be automatically populated with default data.

### Automatic Seeding (Recommended)

Set in `.env`:
```bash
NODE_ENV=development
AUTO_SEED=true
```

Then start the backend - it will auto-seed if the database is empty:
```bash
npm run dev
```

### Manual Seeding

```bash
npm run db:seed
```

> [!WARNING]
> Manual seeding will **delete all existing data** before re-seeding.

### Default Credentials

## User Seeding (Production & Dev/Test)

- In production deployments, if no users exist, the system will automatically seed a single admin user with a known, strong default password. On first login, the admin will be shown a mandatory reminder to change their password immediately.
- In dev/test, standard users (admin, manager, technician) are seeded with known credentials for testing and sample data is provided.

After seeding, login with these credentials:

| Email                  | Username   | Role         | Password     |
| ---------------------- | ---------- | ------------ | ------------ |
| admin@example.com      | admin      | tenant_admin | Password123! |
| manager@example.com    | manager    | site_manager | Password123! |
| technician@example.com | technician | technician   | Password123! |

**See [SEEDING.md](./SEEDING.md) for complete details.**

---

## Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server with hot reload |
| `npm run build`      | Build for production                     |
| `npm start`          | Start production server                  |
| `npm test`           | Run all tests                            |
| `npm run test:unit`  | Run unit tests                           |
| `npm run test:e2e`   | Run E2E tests                            |
| `npm run db:migrate` | Run database migrations                  |
| `npm run db:seed`    | Seed database with default data          |
| `npm run db:studio`  | Open Drizzle Studio (database GUI)       |
| `npm run lint`       | Lint code                                |
| `npm run lint:fix`   | Fix linting issues                       |

---

## Project Structure

```
backend/
├── src/
│   ├── db/           # Database schema and migrations
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic
│   ├── plugins/      # Fastify plugins
│   ├── jobs/         # Background jobs and cron tasks
│   └── index.ts      # Application entry point
├── drizzle/          # Database migrations
└── tests/            # Test files
```

---

## API Documentation

Interactive API documentation is available at `/docs` when the server is running.

**Example:** `http://localhost:3000/docs`

---

## Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

With coverage:
```bash
npm run test:coverage
```

---

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables:
   ```bash
   NODE_ENV=production
   AUTO_SEED=false  # NEVER enable in production!
   ```

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the server:
   ```bash
   npm start
   ```

---

## Security Notes

> [!CAUTION]
> **Never use default credentials in production!**

- Change all default passwords immediately for non-dev environments
- Disable `AUTO_SEED` in production
- Use strong JWT secrets
- Enable proper CORS configuration
- Implement rate limiting
- Use HTTPS in production

---

## Additional Documentation

- [SEEDING.md](./SEEDING.md) - Database seeding guide
- [BOOTSTRAP.md](../BOOTSTRAP.md) - Project overview
- [API Documentation](http://localhost:3000/docs) - Interactive API docs

---

## License

UNLICENSED - Proprietary software for internal use only.
