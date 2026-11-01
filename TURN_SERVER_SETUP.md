# Coturn TURN Server Deployment & Configuration Guide

This guide describes how to configure and deploy a production Coturn TURN server to relay WebRTC audio and video traffic for CHITHI users behind strict symmetric NATs and enterprise corporate firewalls.

---

## 1. Architecture & RFC 5766 HMAC-SHA1 Authentication
CHITHI uses standard **RFC 5766 REST API** authentication:
- **Shared Secret**: A secure key configured on both the Coturn server and CHITHI API (`TURN_SECRET`).
- **Temporary Username**: `<expiry_epoch_timestamp>:<user_uuid>`
- **Temporary Password**: Base64-encoded `HMAC-SHA1(username, TURN_SECRET)`
- **Security**: The client never receives the permanent secret; credentials automatically expire after `TURN_TTL_SECONDS` (default: 86400 seconds = 24 hours).

---

## 2. Docker Compose Coturn Service Setup

Add the Coturn container to your production `docker-compose.prod.yml`:

```yaml
  coturn:
    image: coturn/coturn:4.6.3
    container_name: chithi-coturn
    restart: unless-stopped
    network_mode: "host"
    environment:
      - TURN_SECRET=chithi_production_turn_secret_change_me
    volumes:
      - ./docker/coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro
      - ./docker/certs:/etc/coturn/certs:ro
```

---

## 3. Recommended `turnserver.conf` Configuration

```ini
# Listening ports
listening-port=3478
tls-listening-port=5349

# Use long-term credential mechanism with shared secret (RFC 5766)
use-auth-secret
static-auth-secret=chithi_production_turn_secret_change_me
realm=turn.chithi.chat

# Network settings
fingerprint
lt-cred-mech
stale-nonce=600

# Relay IP and ports
# Set your public server IPv4
external-ip=YOUR_PUBLIC_SERVER_IP

# Min and max UDP relay ports (make sure firewall opens this UDP range)
min-port=49152
max-port=65535

# TLS certificates for TURNS (TURN over TLS on port 5349)
cert=/etc/coturn/certs/fullchain.pem
pkey=/etc/coturn/certs/privkey.pem

# Security and DoS mitigation
no-multicast-peers
no-cli
no-loopback-peers
mobility
```

---

## 4. Required Firewall Ports

Ensure your cloud provider firewall (e.g. AWS Security Group, GCP Firewall, or DigitalOcean) allows the following ingress traffic:

| Protocol | Port Range | Purpose |
|---|---|---|
| UDP & TCP | `3478` | Standard STUN/TURN listening port |
| UDP & TCP | `5349` | Secure TLS TURN listening port (TURNS) |
| UDP | `49152 - 65535` | Dynamic WebRTC media relay port range |

---

## 5. CHITHI Environment Configuration

In your production `.env` file for `apps/api`:

```env
# WebRTC / Coturn Settings
TURN_SECRET=chithi_production_turn_secret_change_me
TURN_URLS=turn:turn.chithi.chat:3478?transport=udp,turn:turn.chithi.chat:3478?transport=tcp,turns:turn.chithi.chat:5349?transport=tcp
STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:turn.chithi.chat:3478
TURN_TTL_SECONDS=86400
```

---

## 6. Verification with `turnutils_uclient`
You can verify your Coturn server health using the built-in Coturn CLI:

```bash
docker exec -it chithi-coturn turnutils_uclient -u <generated_user> -w <generated_password> -p 3478 turn.chithi.chat
```
A successful test will output packet statistics showing 0% packet loss for both audio and video streams.
