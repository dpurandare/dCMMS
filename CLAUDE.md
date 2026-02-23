# Claude Code Project Instructions

## Environment Setup

- **Local development (recommended for testing/dev)**: Use `./scripts/dev.sh`. Runs infrastructure in Docker, backend and frontend locally. Enables fast iteration without Docker rebuilds.
- **Full stack Docker deployment**: Use `./scripts/deploy.sh` for full containerised deployments. Do NOT run `docker-compose` or `docker compose` commands directly.
- The dev script handles infrastructure (PostgreSQL, Redis, Kafka, etc.) in Docker and starts the apps locally with hot-reload.

## Development URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs

## Key Commands

```bash
# Local dev (recommended for testing) — infra in Docker, apps run locally
./scripts/dev.sh

# Full stack Docker deployment (all services in containers)
./scripts/deploy.sh

# Individual service (if infra already running)
cd backend && npm run dev
cd frontend && npm run dev
```

## Default Test Credentials

- Admin: admin@example.com / Password123!
- Manager: manager@example.com / Password123!
- Technician: technician@example.com / Password123!

## Notes

- Main branch: `main`
- Always run clean builds before testing: `npm run build`
