# CHITHI — Production Deployment & Operations Guide

This guide details how to build, deploy, operate, and maintain the CHITHI Social Messaging Platform in a production environment.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    Client["Clients (Web / Mobile Browsers)"]
    Nginx["Nginx Reverse Proxy (:80 / :443)"]
    Web["Next.js Web Frontend (:3000)"]
    API["NestJS REST & Socket.IO API (:4000)"]
    PG[("PostgreSQL 16/18 Database (:5432)")]
    Storage[("Storage Adapter (Local FS / AWS S3)")]

    Client -->|HTTPS & WSS| Nginx
    Nginx -->|/api/* & /socket.io/*| API
    Nginx -->|/*| Web
    API -->|Prisma ORM (Connection Pool: 20)| PG
    API -->|Media Read / Write| Storage
```

---

## 2. Environment Variables Reference

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `PORT` | API Server Port | `4000` | No |
| `NODE_ENV` | Environment mode | `production` | Yes |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@host:5432/chithi_db?connection_limit=20&pool_timeout=10` | Yes |
| `JWT_ACCESS_SECRET` | 256-bit secret for Access Tokens | Secure random string (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | 256-bit secret for Refresh Tokens | Secure random string (min 32 chars) | Yes |
| `JWT_ACCESS_EXPIRES_IN`| Access token lifetime | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifetime | `7d` | No |
| `STORAGE_PROVIDER` | Media storage provider (`local` or `s3`) | `local` | No |
| `STORAGE_LOCAL_PATH` | Directory for local file storage | `/app/uploads` | No |
| `S3_BUCKET` | AWS S3 / MinIO / R2 Bucket name | `chithi-media-prod` | When S3 |
| `S3_ENDPOINT` | S3 API Endpoint | `https://s3.amazonaws.com` | When S3 |
| `NEXT_PUBLIC_API_URL` | Frontend REST API base URL | `https://chithi.yourdomain.com/api/v1` | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend WebSocket base URL | `https://chithi.yourdomain.com` | Yes |

---

## 3. Production Deployment with Docker Compose (Recommended)

### Step 3.1: Prepare Configuration
Copy the production environment template:
```bash
cp .env.example .env.prod
```
Generate secure random secrets:
```bash
openssl rand -hex 32 # for JWT_ACCESS_SECRET
openssl rand -hex 32 # for JWT_REFRESH_SECRET
openssl rand -hex 24 # for POSTGRES_PASSWORD
```
Fill these into `.env.prod`.

### Step 3.2: Build and Start Containers
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Step 3.3: Run Database Schema Migrations
```bash
docker compose -f docker-compose.prod.yml exec api pnpm prisma:push
```

### Step 3.4: Verify Container Health
```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Verify API health
curl -f http://localhost/health

# Verify API database readiness
curl -f http://localhost/ready

# Check logs
docker compose -f docker-compose.prod.yml logs -f api
```

---

## 4. Manual Deployment (Bare Metal / Virtual Machine)

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16+
- PM2 (`npm install -g pm2`)
- Nginx

### Build Applications
```bash
pnpm install --frozen-lockfile
pnpm --filter @chithi/api prisma:push
pnpm --filter @chithi/api build
pnpm --filter @chithi/web build
```

### Start with PM2 Process Manager
```bash
# Start API
pm2 start apps/api/dist/main.js --name "chithi-api" -i max

# Start Web
pm2 start apps/web/server.js --name "chithi-web" -i max

# Persist PM2 across server restarts
pm2 save
pm2 startup
```

---

## 5. Database Reliability & Backup Procedures

### 5.1: Create On-Demand Backup
Run the automated backup script to create a cryptographically verified JSON backup:
```bash
node apps/api/scripts/backup-db.js
```
Backups are saved to `apps/api/backups/backup-{timestamp}.json` alongside a `.sha256` integrity checksum file.

### 5.2: Automated Nightly Backups (Cron Job)
Add to system crontab (`crontab -e`):
```cron
# Run daily at 02:00 AM UTC
0 2 * * * cd /opt/chithi && node apps/api/scripts/backup-db.js >> /var/log/chithi-backup.log 2>&1
```

### 5.3: Disaster Recovery Restoration
To restore a backup into a database:
```bash
node apps/api/scripts/restore-db.js /path/to/backup.json "postgresql://user:pass@host:5432/dbname"
```
The restoration process:
1. Validates the SHA-256 cryptographic checksum.
2. Begins a database transaction (`BEGIN`).
3. Temporarily sets `session_replication_role = 'replica'` to seamlessly handle circular foreign keys (`conversations` <-> `messages`).
4. Re-enables integrity constraints (`session_replication_role = 'origin'`).
5. Commits the transaction atomically (`COMMIT`).

### 5.4: Test Backup & Recovery Parity
Verify the complete backup and recovery cycle without touching live data:
```bash
node apps/api/scripts/verify-backup-recovery.js
```

---

## 6. Security Hardening Checklist

- [x] **Argon2id Password Hashing:** 64 MB memory cost, 3 iterations, 1 parallelism thread.
- [x] **Rotating Refresh Tokens:** Single-use refresh tokens hashed with SHA-256 before storage in `user_sessions`. Immediate revocation upon reuse.
- [x] **Rate Limiting:** Global rate limit of 120 req/min with strict 30 req/min limit on `/auth/register` and `/auth/login` via `@nestjs/throttler`.
- [x] **HTTP Security Headers:** Helmet middleware enforcing CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and HSTS.
- [x] **Magic Bytes File Inspection:** Header byte validation preventing spoofed executable or script uploads across JPEG, PNG, GIF, WebP, MP4, and PDF.
- [x] **Access Control on Media:** Strict friendship and conversation membership verification before streaming files from `/media/:id/file`.
- [x] **Parameterized Queries:** Prisma ORM utilized across all database interactions, eliminating SQL injection vulnerabilities.
- [x] **CORS Whitelist:** Strict explicit origin whitelist matching production domain with credential support.
- [x] **Non-Root Containers:** Dockerfiles run processes under unprivileged users (`chithiuser` / `nextjs`).

