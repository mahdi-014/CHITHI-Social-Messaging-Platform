# CHITHI — WebRTC Signaling & Media Architecture

## 1. Sequence Diagram: One-to-One Call Session

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Caller (Alice)
    participant WS as Socket.IO Gateway
    participant API as NestJS API / DB
    actor Bob as Callee (Bob)

    Note over Alice,Bob: 1. Initiation & Permission Validation
    Alice->>WS: call:invite { conversationId, callType: 'video' }
    WS->>API: CallsService.initiateCall(callerId, dto)
    API-->>WS: CallSession (status: initiating) + ICE Servers
    WS->>Alice: Ack { success: true, call, iceServers }
    WS->>Bob: call:incoming { callId, caller, callType, iceServers }

    Note over Alice,Bob: 2. Ringing State
    Bob->>WS: call:ringing { callId }
    WS->>Alice: call:ringing { callId }

    Note over Alice,Bob: 3. Call Acceptance & SDP Negotiation
    Bob->>WS: call:accept { callId }
    WS->>API: CallsService.acceptCall(callId, calleeId)
    API-->>WS: CallSession (status: accepted, acceptedAt: now)
    WS->>Alice: call:accepted { callId, callee }

    Note over Alice: Alice creates WebRTC PeerConnection
    Alice->>WS: call:offer { callId, receiverId, sdp }
    WS->>Bob: call:offer { callId, callerId, sdp }

    Note over Bob: Bob sets remote description & creates answer
    Bob->>WS: call:answer { callId, callerId, sdp }
    WS->>Alice: call:answer { callId, calleeId, sdp }

    Note over Alice,Bob: 4. Trickle ICE Candidates Exchange
    Alice->>WS: call:ice-candidate { callId, candidate }
    WS->>Bob: call:ice-candidate { callId, candidate }
    Bob->>WS: call:ice-candidate { callId, candidate }
    WS->>Alice: call:ice-candidate { callId, candidate }

    Note over Alice,Bob: 5. Peer-to-Peer Media Established (DTLS-SRTP)
    Alice<<-->>Bob: Direct P2P Audio / Video Stream

    Note over Alice,Bob: 6. Call Termination
    Alice->>WS: call:end { callId, reason }
    WS->>API: CallsService.endCall(callId, userId, reason)
    API-->>WS: CallSession (status: ended, durationSeconds)
    WS->>Bob: call:ended { callId, durationSeconds, reason }
```

---

## 2. Signaling Event Catalog

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `call:invite` | Client -> Server | `{ conversationId, callType }` | Caller requests call session creation |
| `call:incoming` | Server -> Client | `{ callId, conversationId, callType, caller, iceServers }` | Gateway delivers call invitation to callee's personal room |
| `call:ringing` | Client -> Server -> Client | `{ callId }` | Callee informs caller device is actively alerting |
| `call:accept` | Client -> Server | `{ callId }` | Callee accepts incoming call |
| `call:accepted` | Server -> Client | `{ callId, callee }` | Caller receives confirmation that callee answered |
| `call:reject` | Client -> Server -> Client | `{ callId, reason }` | Callee declines or signals busy |
| `call:cancel` | Client -> Server -> Client | `{ callId }` | Caller aborts call before recipient answers |
| `call:offer` | Client -> Server -> Client | `{ callId, receiverId, sdp }` | Relays WebRTC SDP Offer |
| `call:answer` | Client -> Server -> Client | `{ callId, callerId, sdp }` | Relays WebRTC SDP Answer |
| `call:ice-candidate` | Client -> Server -> Client | `{ callId, targetUserId, candidate }` | Relays ICE candidate for NAT traversal |
| `call:end` | Client -> Server -> Client | `{ callId, reason }` | Terminates active call, updates duration in database |
| `call:timeout` | Client / Server | `{ callId }` | Emitted when unacknowledged call reaches timeout limit |
| `call:missed` | Server -> Client | `{ callId, callType }` | Notifies recipient of a missed call |

---

## 3. Database Call State Machine
```
                       +-------------------+
                       |    INITIATING     |
                       +---------+---------+
                                 |
              +------------------+------------------+
              |                                     |
              v                                     v
       +--------------+                      +--------------+
       |   RINGING    |                      |  CANCELLED   |
       +-------+------+                      +--------------+
               |
      +--------+--------+-------------------+
      |                 |                   |
      v                 v                   v
+-----------+     +------------+      +------------+
| ACCEPTED  |     |  REJECTED  |      |   MISSED   |
+-----+-----+     +------------+      +------------+
      |
      +------------------+
      |                  |
      v                  v
+-----------+     +------------+
|   ENDED   |     |   FAILED   |
+-----------+     +------------+
```

---

## 4. NAT Traversal & ICE Connection Lifecycle
1. **Host Candidates**: Direct private LAN IP addresses tested first.
2. **Server Reflexive Candidates (STUN)**: Public IP addresses discovered via STUN queries to `stun.l.google.com:19302`.
3. **Relay Candidates (TURN)**: Relayed packets through Coturn TURN server over UDP or TCP fallback when symmetrical NAT is encountered.
4. **ICE Candidate Trickling**: Candidates are sent immediately as they are gathered, shortening connection establishment from 5-10 seconds to sub-500 milliseconds.
