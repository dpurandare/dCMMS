# Runbook: rotate secrets and redeploy (staging / demo, Docker Compose)

- **Task:** REV-001a (rotate secrets in non-dev environments)
- **Applies to:** environments deployed with `./scripts/deploy.sh` (Docker Compose on a host) that hold **only seed data**
- **Time:** about 15–20 minutes, plus build time
- **Who runs it:** someone with shell access to the host and the right to wipe its Docker volumes
- **Last rehearsed:** 2026-11-17 (see [What was tested](#what-was-tested))

## Why this is needed

This repository is **public**, so the following are public knowledge:

| What | Where it appears | Effect if still in use |
| :--- | :--------------- | :--------------------- |
| `changeme-secret-key` | the JWT-signing fallback in the first auth commit (git history) | anyone can forge a login as any user, tenant or role |
| `admin@example.com` / `Password123!` (and `manager@`, `technician@`) | the seed script, `CLAUDE.md`, `deploy.sh` output | anyone can log in as an administrator |
| `dcmms_password_dev`, `redis_password_dev`, `timescale_password_dev`, `clickhouse_password_dev`, `quest`, `minioadmin`, Grafana `admin`/`admin`, pgAdmin `admin`/`admin`, EMQX `public`, Vault root token `root` | `docker-compose.yml` | anyone who can reach the ports can use the databases, cache and dashboards |

Three further facts found while writing this runbook:

1. **Every infrastructure port is published on all interfaces** by default (Postgres 5434, Redis 6379, Kafka, MinIO, Grafana, pgAdmin, Kafka UI, a dev-mode Vault, …). On a host with a public address, strong passwords are not enough on their own: bind them to localhost too (step 2).
2. **Before 2026-11-17 `docker-compose.yml` could not start a working backend.** The image has no `.env` (`.dockerignore` excludes it) and compose never passed `JWT_SECRET`, `CLICKHOUSE_PASSWORD` or `QUESTDB_PASSWORD`, which the backend has refused to boot without since 2026-09-19. If your staging/demo was deployed with `deploy.sh` since then, the backend was crash-looping or you are running an older image. `deploy.sh` now checks this before it starts anything.
3. **Changing a password in the environment does not change it on an existing data volume.** Postgres, Timescale, ClickHouse, Grafana, pgAdmin and EMQX apply their passwords only when a volume is first initialised. Demonstrated 2026-11-17: after restarting Postgres on the same volume with a new `DCMMS_POSTGRES_PASSWORD`, the **old** password still worked and the new one was rejected. That is why this runbook rebuilds from empty volumes.

## Read this before you start

> **This procedure wipes every Docker volume of the project** (`docker compose down -v`): all databases, Redis, MinIO files, Grafana and pgAdmin settings. It is acceptable **only because these environments hold seed data**. If an environment holds anything you need to keep, **stop**. Rotating in place (without wiping) needs a different, per-service procedure (`ALTER USER …`, `grafana cli admin reset-admin-password`, …) that is **not covered or tested here**; ask before improvising it.

Also: any environment still running an image built **before 2026-09-19** remains forgeable with `changeme-secret-key` until it is redeployed from current `main` with a new `DCMMS_JWT_SECRET`.

## Prerequisites

- Shell access on the host; Docker with the `docker compose` plugin (v2).
- The repository checked out at the host's deploy path, with `git pull` access to `main` (the current `main` contains the changes this runbook depends on).
- A password manager (or secret store) to keep the new `.env` values in. **Do not** paste them into chat, tickets or commit messages.
- A short maintenance notice: **every user is logged out, and all data is reset to seed data.**

## Procedure

Run everything from the repository root on the host.

### 1. Update the checkout

```bash
git pull origin main
```

### 2. Generate secrets and write `.env`

`.env` is gitignored. This creates it with strong random values. (Passwords are **hex** on purpose: they are embedded in `DATABASE_URL` / `REDIS_URL`, so characters such as `/ @ : ? # %` would break the connection strings. The JWT secret may be base64.)

```bash
umask 077        # the file is readable only by you
cat > .env <<EOF
# --- required -----------------------------------------------------------------
DCMMS_JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
# --- password of the seeded demo users (admin@example.com, manager@, technician@) ---
DCMMS_SEED_USER_PASSWORD=$(openssl rand -hex 12)
# --- infrastructure passwords --------------------------------------------------
DCMMS_POSTGRES_PASSWORD=$(openssl rand -hex 24)
DCMMS_TIMESCALE_PASSWORD=$(openssl rand -hex 24)
DCMMS_REDIS_PASSWORD=$(openssl rand -hex 24)
DCMMS_CLICKHOUSE_PASSWORD=$(openssl rand -hex 24)
DCMMS_QUESTDB_PASSWORD=$(openssl rand -hex 24)
DCMMS_MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
DCMMS_GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 16)
DCMMS_PGADMIN_PASSWORD=$(openssl rand -hex 16)
DCMMS_EMQX_DASHBOARD_PASSWORD=$(openssl rand -hex 16)
DCMMS_VAULT_ROOT_TOKEN=$(openssl rand -hex 16)
# --- network -------------------------------------------------------------------
# Publish database / cache / broker / admin ports on localhost only.
DCMMS_INFRA_BIND=127.0.0.1
# The address browsers use to reach the API. Baked into the frontend at BUILD time:
# "localhost" only works for someone sitting at the host itself. EDIT THIS LINE.
DCMMS_PUBLIC_API_URL=http://CHANGE-ME:3001/api/v1
EOF
```

Then:

- Edit `DCMMS_PUBLIC_API_URL` (the line above ends in `CHANGE-ME`).
- **Copy the whole file into your password manager now.** There is no other copy of these values.
- Keep `DCMMS_INFRA_BIND=127.0.0.1` unless something outside the host genuinely needs a database port. The backend and frontend ports (3001, 3000) are *not* affected by it: they remain reachable by design.

### 3. Stop and wipe the old stack

```bash
docker compose down -v        # DESTROYS all project volumes (see the warning above)
```

### 4. Deploy

```bash
./scripts/deploy.sh
```

`deploy.sh` first runs a **preflight**: it refuses to continue (exit code 1) if `DCMMS_JWT_SECRET` is missing or shorter than 64 characters, if `DCMMS_PUBLIC_API_URL` still contains `CHANGE-ME`, or if `docker compose config` cannot be rendered, and it warns if `DCMMS_INFRA_BIND` is unset. Then it starts the infrastructure, builds the backend and frontend, applies the database migrations (in the backend container's entrypoint) and seeds the demo users using `DCMMS_SEED_USER_PASSWORD`.

### 5. Verify (all of these should be run; none of them takes long)

Load the values into your shell **without printing them**:

```bash
set -a; . ./.env; set +a
API=http://localhost:3001/api/v1
```

**a. The backend is healthy.**

```bash
curl -s http://localhost:3001/health        # expect {"status":"ok", ...}
```

**b. The public default password no longer works; the new one does.**

```bash
curl -s -o /dev/null -w "default password: HTTP %{http_code} (expect 401)\n" -X POST $API/auth/login \
  -H 'content-type: application/json' -d '{"email":"admin@example.com","password":"Password123!"}'
curl -s -o /dev/null -w "new password:     HTTP %{http_code} (expect 200)\n" -X POST $API/auth/login \
  -H 'content-type: application/json' -d "{\"email\":\"admin@example.com\",\"password\":\"$DCMMS_SEED_USER_PASSWORD\"}"
```

**c. A token forged with the old public JWT secret is rejected.** (This is the check that proves the original exposure is closed.)

```bash
FORGED=$(python3 - <<'PY'
import hmac, hashlib, base64, json, time
b = lambda x: base64.urlsafe_b64encode(x).rstrip(b'=').decode()
h = b(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
p = b(json.dumps({"id": "00000000-0000-4000-8000-000000000001", "tenantId": "00000000-0000-4000-8000-000000000002",
                  "email": "admin@example.com", "username": "x", "role": "super_admin",
                  "iat": int(time.time()), "exp": int(time.time()) + 900}).encode())
print(f"{h}.{p}.{b(hmac.new(b'changeme-secret-key', f'{h}.{p}'.encode(), hashlib.sha256).digest())}")
PY
)
curl -s -o /dev/null -w "forged super_admin token: HTTP %{http_code} (expect 401)\n" -H "Authorization: Bearer $FORGED" $API/users/me
```

**d. The database rejects the old default password.** Run this from a *different container* so it goes over the network. A `psql` run *inside* the Postgres container always succeeds, because the official image trusts connections from `127.0.0.1` inside the container, so it would falsely "verify" a rotation.

```bash
docker exec -e PGPASSWORD=dcmms_password_dev dcmms-timescaledb psql -h postgres -U dcmms_user -d dcmms -c 'select 1'
# expect: FATAL:  password authentication failed for user "dcmms_user"
docker exec -e PGPASSWORD="$DCMMS_POSTGRES_PASSWORD" dcmms-timescaledb psql -h postgres -U dcmms_user -d dcmms -tAc 'select 1'
# expect: 1
```

**e. Redis requires the new password.**

```bash
docker exec dcmms-redis redis-cli --no-auth-warning ping                              # expect NOAUTH Authentication required
docker exec dcmms-redis redis-cli --no-auth-warning -a redis_password_dev ping        # expect WRONGPASS
docker exec dcmms-redis redis-cli --no-auth-warning -a "$DCMMS_REDIS_PASSWORD" ping   # expect PONG
```

**f. Infrastructure ports are bound to localhost, and unreachable from outside.**

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E 'postgres|redis|timescale|kafka|grafana'
# expect 127.0.0.1:5434->5432 etc., NOT 0.0.0.0:...
```

From **another machine**, `nc -vz <host> 5434` (and 6379, 5433, 3002, 5050, 8080, 8200) must fail or time out.

**g. The migrations are applied** (this includes `0003_asset_description`, without which assets fail).

```bash
docker exec dcmms-postgres psql -U dcmms_user -d dcmms -tAc "select count(*) from drizzle.__drizzle_migrations"   # expect 4
docker exec dcmms-postgres psql -U dcmms_user -d dcmms -tAc "select count(*) from information_schema.columns where table_name='assets' and column_name='description'"   # expect 1
```

**h. Grafana** accepts the new admin password and rejects `admin`/`admin` (`http://<host>:3002`; if you bound ports to localhost, use an SSH tunnel).

### 6. Record it

- Note the date and who ran it in `TasksTracking/15_Review_Remediation.md` under REV-001a, and tick the "execute" and "verify" items.
- Make sure the only copy of the new values is in your password manager (clear the shell history lines that contain them).

## If something fails

There is nothing to roll back to: the data was seed data and the old secrets are the thing being removed. Fix the cause and re-run from step 3 (or just step 4 if only `.env` was wrong **and** the volumes were already wiped).

| Symptom | Likely cause |
| :------ | :----------- |
| `deploy.sh` exits with "DCMMS_JWT_SECRET is missing or shorter than 64 characters" | `.env` is not in the directory you ran it from, or the value is short. Run from the repository root; re-check the file. |
| Backend container restarts, log says `Refusing to start: … missing or invalid` | A required secret is empty. The log names which one. |
| `password authentication failed` from the backend after deploy | The volumes were **not** wiped (step 3 skipped), so Postgres kept the old password. Run `docker compose down -v` and redeploy. |
| Grafana datasource shows a connection error | The Grafana container did not receive `DCMMS_*_PASSWORD`; check `docker compose config | grep -A3 grafana` and that `.env` is next to `docker-compose.yml`. |
| Frontend calls `localhost:3001` from a user's browser | `DCMMS_PUBLIC_API_URL` was not set before the build. It is baked at build time: fix `.env` and rerun `./scripts/deploy.sh` (it rebuilds). |
| A value in `.env` seems to be ignored | Docker Compose gives **variables exported in your shell precedence over `.env`**. A stale `DCMMS_*` left exported (for example by `set -a; . ./.env` in step 5 and then editing `.env`) silently wins. Open a fresh shell, or `unset` the variable. |
| `connection string` / URL errors with a new password | A password contains `/ @ : ? # %`. Regenerate it with `openssl rand -hex 24`. |

## What was tested

Rehearsed on 2026-11-17 against an isolated copy of the stack (separate project name, container names, ports and network, so the developer stack was never touched), using freshly generated values, and then removed:

| Check | Result |
| :---- | :----- |
| `docker compose config` with default values vs. before the change | identical except 8 new variables (5 on the backend, 3 on Grafana): **dev behaviour unchanged** |
| Postgres and Timescale on fresh volumes with rotated passwords | old default **rejected**, new accepted (tested over the network from another container) |
| Redis with a rotated password | no password → `NOAUTH`; old → `WRONGPASS`; new → `PONG` |
| Grafana with a rotated admin password | `admin`/`admin` → 401; new → 200; both provisioned database datasources reported "Database Connection OK", proving `${DCMMS_*}` expands in the provisioning file |
| The **real backend container image**, built by `docker compose build backend` exactly as `deploy.sh` does, started with the rotated environment | waits for Postgres, runs the compiled migrations, auto-seeds, listens; the log does not print the custom password |
| Backend **process** started with only the environment compose provides (no `.env`) | boots, migrates, auto-seeds |
| Login against the container | `Password123!` → 401; rotated seed password → 200; authenticated call → 200 |
| Token forged with `changeme-secret-key`, against the container | **401** |
| The **original failure**: the same container with `DCMMS_JWT_SECRET` absent | crash-loops: `Refusing to start: … JWT_SECRET is not set` (what `deploy.sh` had been hitting since 2026-09-19; the preflight now stops it earlier, with a clear message) |
| Changing a password in the environment on an **existing** volume | **ignored** (old password still worked) — the reason for the wipe |
| `deploy.sh` preflight | blocks on no secret, a 12-character secret, and an unrenderable compose file; passes on a good secret. (The first version silently passed on an invalid regex; found and fixed by this test.) |

**Not individually tested** (they use the identical substitution mechanism but their containers were not started): ClickHouse, QuestDB, MinIO, pgAdmin, EMQX and Vault passwords. The **frontend** container build and a complete end-to-end `./scripts/deploy.sh` run (all twelve infrastructure services plus the frontend) were not run; the pieces above were tested separately.

## What this does not cover

- **Environments with data to keep** (above) and **production**.
- **Authentication in front of Kafka UI (port 8080)**: none is configured. The only protection is `DCMMS_INFRA_BIND=127.0.0.1`. The same applies to anonymous MQTT on EMQX unless you configure it.
- **Vault** runs in *dev mode* (in-memory, root token) and **the backend does not use it**; consider removing `vault` from the service list in `deploy.sh`.
- **The application ports** (3000, 3001, 8000) stay reachable by design, and no TLS / reverse proxy is provided by this repository.
- `ml/` tooling (MLflow, Feast) contains its own literal development credentials; it is not part of the compose deployment.
- **Mobile app login** is broken independently of this runbook (REV-055).

## Variable reference

| Variable (in `.env`) | Used for | Default if unset |
| :------------------- | :------- | :--------------- |
| `DCMMS_JWT_SECRET` | signing access/refresh tokens (backend) | **none: the backend refuses to start; `deploy.sh` blocks** |
| `DCMMS_SEED_USER_PASSWORD` | the seeded demo users | public `Password123!` |
| `DCMMS_ADMIN_DEFAULT_PASSWORD` | the single admin created when `DCMMS_NODE_ENV=production` | none |
| `DCMMS_POSTGRES_PASSWORD` | Postgres, the backend's `DATABASE_URL`, Grafana | `dcmms_password_dev` |
| `DCMMS_TIMESCALE_PASSWORD` | TimescaleDB, Grafana | `timescale_password_dev` |
| `DCMMS_REDIS_PASSWORD` | Redis, the backend's `REDIS_URL` | `redis_password_dev` |
| `DCMMS_CLICKHOUSE_PASSWORD` | ClickHouse, the backend (required to boot) | `clickhouse_password_dev` |
| `DCMMS_QUESTDB_PASSWORD` | QuestDB, the backend (required to boot), Grafana | `quest` |
| `DCMMS_MINIO_ROOT_PASSWORD` | MinIO | `minioadmin` |
| `DCMMS_GRAFANA_ADMIN_PASSWORD` | Grafana admin | `admin` |
| `DCMMS_PGADMIN_PASSWORD` | pgAdmin | `admin` |
| `DCMMS_EMQX_DASHBOARD_PASSWORD` | EMQX dashboard | `public` |
| `DCMMS_VAULT_ROOT_TOKEN` | dev-mode Vault | `root` |
| `DCMMS_INFRA_BIND` | host interface for database/cache/broker/admin ports | `0.0.0.0` (all interfaces) |
| `DCMMS_PUBLIC_API_URL` | API address baked into the frontend | `http://localhost:3001/api/v1` |
| `DCMMS_NODE_ENV` | backend `NODE_ENV` (`production` also disables the demo mocks and seeds only one admin) | `development` |
| `DCMMS_AUTO_SEED` | seed the database on first start | `true` |

The `DCMMS_` prefix is deliberate: a plain `POSTGRES_PASSWORD` already set in a developer's shell for another project would otherwise silently override this project's password.
