#!/usr/bin/env bash
# ==============================================================================
# CHITHI — Automated Production Host Provisioning & Hardening Script
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS (x86_64)
# ==============================================================================
set -euo pipefail

echo "=================================================================="
echo " CHITHI PRODUCTION HOST PROVISIONING & HARDENING"
echo "=================================================================="

if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This script must be run as root (or with sudo)."
   exit 1
fi

# 1. Update and install core security packages
echo "[1/8] Updating package repository and installing security utilities..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  ufw \
  fail2ban \
  unattended-upgrades \
  htop \
  jq \
  logrotate

# 2. Configure Firewall (UFW)
echo "[2/8] Configuring UFW firewall rules..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP / ACME Challenge'
ufw allow 443/tcp comment 'HTTPS / Secure WebSocket'
ufw allow 3478/tcp comment 'Coturn STUN/TURN TCP'
ufw allow 3478/udp comment 'Coturn STUN/TURN UDP'
ufw allow 5349/tcp comment 'Coturn TLS'
ufw allow 5349/udp comment 'Coturn DTLS'
ufw allow 49152:65535/udp comment 'Coturn WebRTC Relay UDP Range'
# Enable UFW non-interactively
echo "y" | ufw enable
ufw status verbose

# 3. Install Docker Engine & Compose Plugin
echo "[3/8] Installing official Docker Engine & Docker Compose v2..."
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# 4. Create Dedicated Non-Root Service User
echo "[4/8] Creating service user 'chithi'..."
if ! id -u chithi >/dev/null 2>&1; then
  useradd -m -s /bin/bash -U chithi
fi
usermod -aG docker chithi

# 5. Create Application Directory Structure
echo "[5/8] Creating production directory /opt/chithi and persistent volumes..."
mkdir -p /opt/chithi/uploads
mkdir -p /opt/chithi/backups
mkdir -p /opt/chithi/ssl
mkdir -p /opt/chithi/certbot
mkdir -p /var/log/chithi

chown -R chithi:chithi /opt/chithi
chown -R chithi:chithi /var/log/chithi
chmod 750 /opt/chithi

# 6. Configure Logrotate
echo "[6/8] Configuring log rotation for CHITHI logs..."
cat << 'EOF' > /etc/logrotate.d/chithi
/var/log/chithi/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 chithi chithi
}
EOF

# 7. Configure Fail2ban for SSH
echo "[7/8] Enabling Fail2ban for brute-force protection..."
systemctl enable fail2ban
systemctl restart fail2ban

# 8. Automated Daily Database Backup Cron Job
echo "[8/8] Setting up automated backup cron job..."
cat << 'EOF' > /etc/cron.d/chithi-backup
# Execute daily transactional backup at 02:00 UTC
0 2 * * * chithi cd /opt/chithi && docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T api node scripts/backup-db.js >> /var/log/chithi/backup.log 2>&1
EOF
chmod 0644 /etc/cron.d/chithi-backup

echo "=================================================================="
echo " HOST PROVISIONING COMPLETED SUCCESSFULLY!"
echo " Docker Version:  $(docker --version)"
echo " Compose Version: $(docker compose version)"
echo " Application Dir: /opt/chithi"
echo "=================================================================="
