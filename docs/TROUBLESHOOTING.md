# Local Setup Troubleshooting Guide

## Mobile App Development

### "Failed to load dynamic library 'libsqlite3.so'" during Tests
**Symptom**: `flutter test` fails with `Invalid argument(s): Failed to load dynamic library 'libsqlite3.so'`.
**Cause**: The unit test runner on Linux Host requires `sqlite3` library to be available in the system path, and sometimes expects a specific symlink (e.g., `libsqlite3.so` -> `libsqlite3.so.0`).
**Solution**:
1. Ensure `sqlite3` is installed: `sudo apt-get install sqlite3 libsqlite3-dev`
2. If error persists, check `LD_LIBRARY_PATH`.

### Offline Database Not Syncing
**Check**:
- Verify connectivity status in `SyncRepository`.
- Check `SyncQueue` table in Drift inspector or logs.
- Ensure Backend API is reachable (localhost vs 10.0.2.2 on Android).

## Backend Development

### "Relation does not exist"
**Cause**: Database migrations haven't been applied.
**Solution**: Run `npm run db:migrate`.

### "Docker container not starting"
**Cause**: Port conflict (usually 5432 for Postgres).
**Solution**: Stop local services or change ports in `.env`.
