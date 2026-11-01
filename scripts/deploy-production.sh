#!/usr/bin/env bash
# ==============================================================================
# CHITHI — Automated Production Deployment Script (Two-Stage HTTPS Bootstrap)
# ==============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/chithi"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

cd "${DEPLOY_DIR}"

echo "=================================================================="
echo " CHITHI PRODUCTION DEPLOYMENT"
echo " Working Directory: ${DEPLOY_DIR}"
echo "=================================================================="

# 1. Verify environment configuration
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[FATAL ERROR] Production environment file ${ENV_FILE} not found!"
  echo "Copy docker/.env.prod.example to ${ENV_FILE} and configure secrets first."
  exit 1
fi

chmod 600 "${ENV_FILE}"

# 2. Extract DOMAIN from NEXT_PUBLIC_API_URL or environment
DOMAIN=$(grep -E '^NEXT_PUBLIC_SOCKET_URL=' "${ENV_FILE}" | cut -d'=' -f2 | sed -e 's|https://||' -e 's|http://||' -e 's|/.*||' | tr -d '[:space:]')
if [[ -z "${DOMAIN}" || "${DOMAIN}" == "yourdomain.com" || "${DOMAIN}" == "localhost" ]]; then
  echo "[WARNING] Using fallback or local domain: '${DOMAIN}'."
fi

# 3. Pull / Build Production Docker Images
echo "[STEP 1/5] Building production container images..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build --pull

# 4. Stage 1: HTTP-Only Bootstrap (if SSL certs do not yet exist)
SSL_CERT_PATH="/opt/chithi/ssl/live/${DOMAIN}/fullchain.pem"
if [[ ! -f "${SSL_CERT_PATH}" && "${DOMAIN}" != "localhost" && "${DOMAIN}" != "127.0.0.1" ]]; then
  echo "[STEP 2/5] Initializing Stage 1: HTTP-Only ACME Webroot Bootstrap..."
  export NGINX_CONF="./docker/nginx/nginx.conf"
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d postgres api web nginx

  echo "Waiting for services to be healthy..."
  sleep 10

  echo "Requesting Let's Encrypt certificate for ${DOMAIN}..."
  CERT_EMAIL=$(grep -E '^TLS_EMAIL=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2 || echo "admin@${DOMAIN}")
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "${DOMAIN}" \
    --email "${CERT_EMAIL}" \
    --agree-tos --no-eff-email
  
  echo "Certificate successfully issued! Switching to Stage 2: Hardened HTTPS..."
fi

# 5. Stage 2: Hardened Production HTTPS
echo "[STEP 3/5] Starting full production stack..."
export NGINX_CONF="./docker/nginx/nginx.prod.conf"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

# 6. Database Schema Synchronization
echo "[STEP 4/5] Synchronizing database schema via Prisma..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T api pnpm prisma:push

# 7. Post-Deployment Health Verification
echo "[STEP 5/5] Verifying production health checks..."
sleep 5
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

API_HEALTH=$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T api curl -s -f http://localhost:4000/health || echo "FAILED")
if [[ "${API_HEALTH}" == *"ok"* ]]; then
  echo "✓ API Health Probe: 200 OK"
else
  echo "[WARNING] API health probe returned: ${API_HEALTH}"
fi

echo "=================================================================="
echo " DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo " Public Access: https://${DOMAIN}"
echo "=================================================================="

