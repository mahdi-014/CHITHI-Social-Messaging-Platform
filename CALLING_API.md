# CHITHI Calling REST API & WebSocket Signaling Specification

Base URL: `http://localhost:4000/api/v1`  
WebSocket URL: `http://localhost:4000`  
Authentication: `Authorization: Bearer <accessToken>` or Socket handshake `{ auth: { token: "<accessToken>" } }`

---

## 1. REST Endpoints

### 1.1 `GET /calls/turn-credentials`
Returns short-lived RFC 5766 HMAC-SHA1 STUN & TURN credentials for configuring `RTCPeerConnection`.

**Headers**:
- `Authorization: Bearer <token>`

**Response (200 OK)**:
```json
{
  "iceServers": [
    {
      "urls": [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
      ]
    },
    {
      "urls": [
        "turn:localhost:3478?transport=udp",
        "turn:localhost:3478?transport=tcp"
      ],
      "username": "1762078652:a81699f7-66a7-47b2-a4e9-2ec8572e81fe",
      "credential": "XjD9...=="
    }
  ]
}
```

---

### 1.2 `POST /calls/invite`
Creates a new CallSession record and initiates a direct voice or video call.

**Body**:
```json
{
  "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "callType": "video"
}
```

**Response (201 Created)**:
```json
{
  "call": {
    "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
    "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "callerId": "a81699f7-66a7-47b2-a4e9-2ec8572e81fe",
    "receiverId": "b11899f7-66a7-47b2-a4e9-2ec8572e8222",
    "callType": "video",
    "status": "initiating",
    "initiatedAt": "2026-11-01T09:44:00.000Z",
    "caller": {
      "id": "a81699f7-66a7-47b2-a4e9-2ec8572e81fe",
      "username": "alice",
      "profile": { "displayName": "Alice Calling" }
    },
    "receiver": {
      "id": "b11899f7-66a7-47b2-a4e9-2ec8572e8222",
      "username": "bob",
      "profile": { "displayName": "Bob Calling" }
    }
  },
  "callerIceServers": [...],
  "receiverIceServers": [...]
}
```

**Errors**:
- `400 Bad Request`: `GROUP_CALLS_NOT_SUPPORTED` / `USER_INACTIVE`
- `403 Forbidden`: `NOT_FRIENDS` / `BLOCKED` / `NOT_CONVERSATION_MEMBER`
- `409 Conflict`: `CALLER_BUSY` (caller is on another call) / `USER_BUSY` (receiver is on another call)

---

### 1.3 `POST /calls/:id/accept`
Callee answers the incoming call.

**Response (200 OK / 201 Created)**:
```json
{
  "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
  "status": "accepted",
  "acceptedAt": "2026-11-01T09:44:02.000Z"
}
```

---

### 1.4 `POST /calls/:id/reject`
Callee declines incoming call.

**Body**:
```json
{
  "reason": "busy"
}
```

**Response (200 OK / 201 Created)**:
```json
{
  "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
  "status": "rejected",
  "endReason": "busy",
  "endedAt": "2026-11-01T09:44:03.000Z"
}
```

---

### 1.5 `POST /calls/:id/cancel`
Caller aborts outgoing call before answered.

**Response (200 OK / 201 Created)**:
```json
{
  "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
  "status": "cancelled",
  "endReason": "cancelled",
  "endedAt": "2026-11-01T09:44:03.000Z"
}
```

---

### 1.6 `POST /calls/:id/end`
Either party terminates an active call. Computes total call duration in seconds.

**Body**:
```json
{
  "reason": "caller_hung_up"
}
```

**Response (200 OK / 201 Created)**:
```json
{
  "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
  "status": "ended",
  "endReason": "caller_hung_up",
  "endedAt": "2026-11-01T09:44:25.000Z",
  "durationSeconds": 23
}
```

---

### 1.7 `GET /calls/history`
Cursor-paginated list of past calls.

**Query Parameters**:
- `limit`: number (1-50, default: 20)
- `cursor`: string (UUID of previous page end)

**Response (200 OK)**:
```json
{
  "calls": [
    {
      "id": "e2292023-df5e-4c31-9f4a-7140e6912345",
      "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "callerId": "a81699f7-66a7-47b2-a4e9-2ec8572e81fe",
      "receiverId": "b11899f7-66a7-47b2-a4e9-2ec8572e8222",
      "callType": "video",
      "status": "ended",
      "durationSeconds": 23,
      "createdAt": "2026-11-01T09:44:00.000Z",
      "caller": { "id": "...", "username": "alice", "profile": { "displayName": "Alice" } },
      "receiver": { "id": "...", "username": "bob", "profile": { "displayName": "Bob" } }
    }
  ],
  "nextCursor": null
}
```

---

## 2. WebSocket Signaling Events

### 2.1 Outgoing `call:invite`
Client sends:
```typescript
socket.emit('call:invite', { conversationId: '...', callType: 'audio' }, (ack) => {
  // ack: { success: boolean, call?: CallSession, iceServers?: IceServerConfig[] }
});
```

### 2.2 Incoming `call:incoming`
Recipient receives:
```typescript
socket.on('call:incoming', (data: {
  callId: string;
  conversationId: string;
  callType: 'audio' | 'video';
  caller: PeerUser;
  iceServers: IceServerConfig[];
}) => { ... });
```

### 2.3 `call:ringing`
Callee alerts caller:
```typescript
socket.emit('call:ringing', { callId });
```

### 2.4 `call:accept` / `call:accepted`
Callee accepts, caller receives notification:
```typescript
socket.emit('call:accept', { callId }, (ack) => { ... });
socket.on('call:accepted', (data: { callId: string, callee: PeerUser }) => { ... });
```

### 2.5 WebRTC SDP Exchange (`call:offer` & `call:answer`)
Relays session description between peers:
```typescript
socket.emit('call:offer', { callId, receiverId, sdp: RTCSessionDescriptionInit });
socket.on('call:offer', (data: { callId, callerId, sdp }) => { ... });

socket.emit('call:answer', { callId, callerId, sdp: RTCSessionDescriptionInit });
socket.on('call:answer', (data: { callId, calleeId, sdp }) => { ... });
```

### 2.6 Trickle ICE Candidates (`call:ice-candidate`)
Relays network candidate:
```typescript
socket.emit('call:ice-candidate', { callId, targetUserId, candidate: RTCIceCandidateInit });
socket.on('call:ice-candidate', (data: { callId, fromUserId, candidate }) => { ... });
```

### 2.7 `call:end` / `call:ended`
Clean session termination:
```typescript
socket.emit('call:end', { callId, reason: 'caller_hung_up' });
socket.on('call:ended', (data: { callId, durationSeconds, reason }) => { ... });
```
