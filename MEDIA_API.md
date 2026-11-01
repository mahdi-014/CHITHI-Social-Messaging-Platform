# CHITHI — Media Sharing & Profile Image Storage Architecture & API

## Overview

CHITHI provides a secure, high-performance media pipeline supporting:
1. **One-to-One Chat Media Sharing**: Instant sharing of photos and videos with attachment preview, delivery receipts, HTML5 video playback, and high-resolution Lightbox modal.
2. **Moments Media Sharing**: Sharing of photo and video moments in friends-only feeds with inline video controls and seeking.
3. **Profile & Cover Image Delivery**: Immediate local preview, persistent storage, and reliable cross-origin delivery across browser sessions and devices.
4. **Streaming & Range Requests**: RFC 7233 byte-range serving (`206 Partial Content`) for instant video seeking and low-latency audio/video buffering.

---

## 1. Storage Architecture & Persistence

- **Local Storage Provider**: In development and standard containerized deployments, files are stored on disk under `uploads/{storageKey}`.
- **Docker Compose Production Persistence**: Mounted via named volume `uploads_data:/app/uploads` ensuring zero data loss across container rebuilds.
- **S3 / Cloud Storage Provider**: Extensible S3 provider for scalable multi-region object storage (`STORAGE_PROVIDER=s3`).

---

## 2. Media Upload Pipeline (3-Step Lifecycle)

All media uploads follow an audited 3-step intent-based lifecycle:

```
Client                             API Backend
  │                                    │
  ├─── 1. POST /media/upload-intents ─►│  (Validates mimeType, category & size)
  │◄── Returns mediaAssetId ───────────┤
  │                                    │
  ├─── 2. POST /media/:id/upload ─────►│  (Validates magic bytes & saves binary)
  │◄── Returns { success: true } ──────┤
  │                                    │
  ├─── 3. POST /media/:id/complete ───►│  (Marks status ready & links relations)
  │◄── Returns ready MediaAsset ───────┤
```

### Media Categories & Limits

| Category | Allowed MIME Types | Maximum Size | Access Policy |
| :--- | :--- | :--- | :--- |
| `avatar` | `image/jpeg`, `image/png`, `image/webp` | 10 MB | Public (cross-origin) |
| `cover` | `image/jpeg`, `image/png`, `image/webp` | 15 MB | Public (cross-origin) |
| `chat_attachment` | `image/*`, `video/mp4`, `video/webm` | 100 MB | Conversation members only |
| `post_image` | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 25 MB | Author & accepted friends only |
| `post_video` | `video/mp4`, `video/webm` | 100 MB | Author & accepted friends only |

---

## 3. Security Hardening & Integrity

1. **Magic Byte Validation**:
   - Every uploaded binary is inspected at the header level to prevent extension spoofing and polyglot attacks:
     - JPEG: `FF D8 FF`
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - WebP: `52 49 46 46 ... 57 45 42 50`
     - MP4: `.... 66 74 79 70` (`ftyp` box)
     - WebM: `1A 45 DF A3` (EBML header)
2. **Access Control & Authorization**:
   - Deny-by-default on all endpoints.
   - Avatars and covers are accessible publicly to render user cards and banners without credential leak.
   - Chat media attachments require authenticated membership in the conversation.
   - Moments media assets require mutual accepted friendship with the author.
   - Non-friends attempting to stream private media are rejected with `403 Forbidden` (`MEDIA_ACCESS_FORBIDDEN`).
3. **Cross-Origin Resource Policy (CORP)**:
   - Configured with `Cross-Origin-Resource-Policy: cross-origin` in Helmet and media stream headers to permit cross-origin image and video loading between frontend (`:3000`) and API (`:4000`).
4. **Token Parameter Support for HTML5 Media Tags**:
   - Native `<img src>` and `<video src>` tags cannot send custom `Authorization: Bearer` headers.
   - The media controller decodes query tokens (`?token=<jwt>`), cookies, and Bearer headers to seamlessly authenticate browser media element requests.

---

## 4. HTTP Range Requests & Video Streaming

The media controller supports RFC 7233 partial content requests for video seeking:
- **Header Handled**: `Range: bytes=start-end`
- **Response Status**: `206 Partial Content`
- **Response Headers**:
  - `Content-Range: bytes <start>-<end>/<total>`
  - `Accept-Ranges: bytes`
  - `Content-Length: <chunk-size>`
  - `Content-Type: <mime-type>`
  - `Cross-Origin-Resource-Policy: cross-origin`

---

## 5. Endpoints Reference

### 1. Create Upload Intent
- **Endpoint**: `POST /api/v1/media/upload-intents`
- **Auth**: Bearer JWT
- **Body**:
  ```json
  {
    "mimeType": "image/jpeg",
    "fileSize": 1048576,
    "category": "avatar",
    "fileName": "avatar.jpg"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "mediaAssetId": "uuid-here",
    "uploadUrl": "/api/v1/media/uuid-here/upload",
    "storageKey": "avatar/2026/uuid.jpg",
    "expiresAt": "2026-11-01T14:00:00Z"
  }
  ```

### 2. Upload Binary Content
- **Endpoint**: `POST /api/v1/media/:id/upload`
- **Auth**: Bearer JWT
- **Headers**: `Content-Type: <mimeType>`
- **Body**: Raw binary octet stream
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "mediaAssetId": "uuid-here",
    "size": 1048576
  }
  ```

### 3. Complete Upload
- **Endpoint**: `POST /api/v1/media/:id/complete`
- **Auth**: Bearer JWT
- **Response**: `200 OK`

### 4. Stream Media File
- **Endpoint**: `GET /api/v1/media/:id/file?token=<optional-jwt>`
- **Auth**: Bearer JWT, Cookie, or `?token=` query param
- **Response**: `200 OK` or `206 Partial Content` with binary stream
