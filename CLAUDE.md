# Claude Code Project Instructions

## Environment Setup

- **Use deploy script**: Always use `./scripts/deploy.sh` to start the full stack. Do NOT run `docker-compose` or `docker compose` commands directly.
- The deploy script handles all infrastructure (PostgreSQL, Redis, Kafka, etc.) and applications.

## Development URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs

## Key Commands

```bash
# Full stack deployment (recommended)
./scripts/deploy.sh

# Individual service development
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
