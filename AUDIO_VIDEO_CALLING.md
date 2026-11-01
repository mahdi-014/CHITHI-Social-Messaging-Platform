# CHITHI — Audio & Video Calling System (Phase 3.5)

## 1. Overview
CHITHI implements a carrier-grade, low-latency, end-to-end encrypted **One-to-One Audio and Video Calling System** built using **WebRTC** (`RTCPeerConnection`, `MediaStream`) and signaled over **Socket.IO**.

All media streams travel directly peer-to-peer (P2P) between clients encrypted via **DTLS-SRTP**. Audio and video data never pass through the application backend or Socket.IO gateway, ensuring minimal latency, maximum privacy, and infinite scalability.

---

## 2. Core Capabilities
- **Direct 1-on-1 Calling**: Start voice or video calls directly from any active direct conversation with an accepted friend.
- **Ringing & Outgoing State**: Calling screens with pulsing visual feedback and Web Audio API synthesized ringback and incoming ringtone frequencies.
- **Real-Time WebRTC Media Exchange**: Full-duplex audio with acoustic echo cancellation (`echoCancellation`), noise suppression (`noiseSuppression`), and automatic gain control (`autoGainControl`); adaptive high-definition video (`1280x720@30fps`).
- **In-Call Controls**:
  - Microphone mute/unmute
  - Camera enable/disable (with graceful fallback to audio-only if camera is unavailable or permission denied)
  - Layout toggle (Full screen & Picture-in-Picture floating view)
  - Active call duration timer (`mm:ss`)
  - End call button with instantaneous session cleanup
- **Call Session State Machine**: PostgreSQL backed call logs tracking `initiating`, `ringing`, `accepted`, `rejected`, `cancelled`, `missed`, `busy`, `ended`, and `failed`.
- **Missed Call Notifications**: Callee receives persistent notification when a call is missed or timed out.
- **Call History**: Cursor-paginated history of past incoming, outgoing, and missed calls with duration and peer profiles.

---

## 3. WebRTC Architecture Summary
```
+---------------+                              +---------------+
|   Caller A    |       Socket.IO Signaling    |    Callee B   |
|  (useWebRTC)  | <==========================> |  (useWebRTC)  |
+-------+-------+                              +-------+-------+
        |                                              |
        |          DTLS-SRTP Encrypted P2P Media       |
        +==============================================+
                  (WebRTC RTCPeerConnection)
                             |
                   STUN/TURN Relay Fallback
                  (Coturn / RFC 5766 HMAC-SHA1)
```

1. **Signaling Server**: Existing NestJS `RealtimeGateway` coordinates call session lifecycle and relays SDP Offers, SDP Answers, and Trickle ICE candidates.
2. **STUN Discovery**: STUN servers (e.g. `stun:stun.l.google.com:19302`) resolve public IP/port bindings through NAT.
3. **TURN Relay**: Coturn-compatible short-lived TURN credentials generated via HMAC-SHA1 guarantee connectivity across restrictive symmetric NATs and enterprise firewalls over UDP (port 3478) and TCP/TLS (port 5349).
4. **Encryption**: All peer media is encrypted at the transport layer via DTLS-SRTP using ephemeral keys generated on the browser.

---

## 4. Security & Permissions
- **Mutual Friendship Invariant**: Calls are strictly restricted to mutual friends (`FriendshipsService.areFriends`).
- **Block Protection**: Blocked users cannot place calls or receive call signals (`FriendshipsService.isBlocked`).
- **Single Active Call Enforcement**: Users cannot be called if already in an active session (`409 Conflict: USER_BUSY`).
- **Short-Lived TURN Tokens**: Client tokens expire after 24 hours (`TURN_TTL_SECONDS`), preventing credential replay.

---

## 5. Verification
- **Automated Backend Tests**: 48/48 tests passed (100% success rate).
- **Automated Real Browser E2E**: 19/19 checks passed across 2 Chromium contexts with fake media devices (100% success rate).
- **Visual Proof**: Screenshots captured in `apps/web/test/screenshots/` (`call-01` to `call-06`).

