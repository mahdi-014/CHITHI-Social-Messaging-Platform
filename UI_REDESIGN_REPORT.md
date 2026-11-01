# CHITHI — Messenger-Inspired UI/UX Redesign Documentation
## Profile, View Profile & Settings

**Project Root:** `D:\CHITHI`  
**GitHub Repository:** `https://github.com/mahdi-014/CHITHI-Social-Messaging-Platform.git`  
**Branch:** `main`  
**Commit Target:** `feat(ui): redesign profile and settings with Messenger-inspired interface`

---

## 1. Executive Summary & Design Philosophy

The visual and user interaction layer of **CHITHI** has been upgraded to a Facebook Messenger-inspired design language while strictly maintaining all existing backend architecture, database schemas, business logic, security permissions, and real-time WebRTC audio/video calling capabilities.

### Visual Design Tokens & Aesthetics
- **Color Palette:** Royal Messenger Blue (`#0064e0` / `hsl(217 91% 60%)`), dark surface elevation (`#18191a`, `#242526`, `#3a3b3c`), soft border contrast (`border-border/60`).
- **Typography:** Modern clean sans-serif typography with tight tracking, distinct hierarchy, and subtle uppercase section labels.
- **Micro-Interactions:** Rounded geometric containers (`rounded-2xl`, `rounded-3xl`), pill toggles with iOS/Messenger spring transitions, smooth hover elevation, active indicator dots with subtle pulse.
- **Scrollbars:** Sleek custom minimalist scrollbars that blend seamlessly in both Light and Dark modes.

---

## 2. Redesigned Modules & Components

### 2.1 Reusable UI Primitives
1. **`UserAvatar.tsx` (`apps/web/src/components/ui/UserAvatar.tsx`)**:
   - Displays real uploaded user avatar from media endpoints (`/media/:id/file`).
   - Dynamic initials fallback with deterministic name-hashed gradient backgrounds.
   - Live "Active Now" online presence green indicator dot with surface border ring.
   - Size presets: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`.
2. **`MessengerToggle.tsx` (`apps/web/src/components/ui/MessengerToggle.tsx`)**:
   - Native iOS/Messenger-style rounded pill toggle switch.
   - Full keyboard accessibility and ARIA roles (`role="switch"`, `aria-checked`).

### 2.2 My Profile (`/profile`)
- **Messenger Header:** Panoramic cover image with camera overlay button for direct upload; prominent 2XL avatar with camera upload button.
- **Identity Bar:** Large bold display name, unique `@username`, live "Active Now" pill badge, and bio with inline multi-line support.
- **Action Bar:** "Edit Profile" button with modal popup, quick shortcut to Settings.
- **Interactive Counters:** Friends count and Moments count with quick navigation.
- **Tabbed Views:**
  1. *Overview & About:* Account information, joined date, privacy security badge.
  2. *My Moments:* Grid of user's permanent posts and media.
  3. *Friends List:* Direct links to friend profiles with Messenger-style mini cards.
- **Edit Profile Modal:** Instant dialog with character counters, real-time PATCH to `/profiles/me`, and animated toast confirmation.

### 2.3 View Other User Profile (`/profile/[username]` & `UserProfileModal.tsx`)
- Works both as a standalone route (`/profile/[username]`) and as an instant modal popup (`UserProfileModal.tsx`) from Chat or Friends list.
- Dynamic relationship state machine handling:
  - **Self:** Direct link to Settings.
  - **Friends:** Shows "Message" (opens direct conversation), "Voice Call" (triggers WebRTC audio call), "Video Call" (triggers WebRTC video call), and "Friends" dropdown (Unfriend, Block).
  - **Pending Sent:** Displays "Request Sent" badge.
  - **Pending Received:** Displays "Accept Request" button.
  - **None:** Displays "Add Friend" button.
  - **Blocked:** Displays "Unblock User" button.
- Overview tab and Moments feed (privacy-protected: moments visible only to mutual friends).

### 2.4 Settings (`/settings`)
- **Desktop Two-Column Layout:**
  - *Left Sidebar:* User preview tile, 8 Messenger category tiles with icons, subtitles, and active highlight pills.
  - *Right Content Panel:* Selected category configuration card with instant auto-save feedback.
- **8 Comprehensive Categories:**
  1. **Appearance:** Light Mode, Dark Mode, and System Default visual selector cards.
  2. **Privacy & Visibility:** Messenger toggles for *Active Status*, *Last Seen*, and *Allow Friend Requests*.
  3. **Notifications & Sounds:** Toggles for *Push Notifications*, *Message Chimes*, and Web Audio API calling info.
  4. **Profile Information:** In-settings Display Name & Bio form, avatar upload shortcut, and cover banner upload shortcut.
  5. **Account & Security:** Verified email, unique handle, UUID, and cryptographic hashing (Argon2id/Bcrypt) details.
  6. **Chat & Calling:** Real-time double-check receipts guide, typing indicator debounce info, and WebRTC relay status.
  7. **Blocked Accounts:** Live list of blocked accounts from `/users/blocks/list` with one-click "Unblock" button.
  8. **Sessions & Sign Out:** Active browser session card and "Sign Out of CHITHI" button calling session revocation.
- **Mobile Drill-down Layout:** Full-width category menu with chevron icons; tapping any category slides into the detailed view with a top "← Settings" back navigation bar.

### 2.5 Global Navigation (`layout.tsx`)
- Messenger-styled desktop sidebar with brand icon, active indicator pills, theme switcher, sign out button, and user profile avatar shortcut.
- Mobile bottom navigation bar with active status dot and backdrop blur.
- Seamlessly wrapped with `CallProvider` context preserving WebRTC signaling and active call overlays.

---

## 3. Evidence-Backed Verification Results

### 3.1 Next.js Production Build
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    4.92 kB         124 kB
├ ○ /_not-found                            994 B         103 kB
├ ○ /chats                               6.71 kB         137 kB
├ ○ /friends                             5.21 kB         136 kB
├ ○ /login                               3.13 kB         122 kB
├ ○ /moments                             3.88 kB         123 kB
├ ○ /profile                             7.31 kB         130 kB
├ ƒ /profile/[username]                     2 kB         133 kB
├ ○ /register                            3.41 kB         122 kB
└ ○ /settings                            12.3 kB         131 kB
+ First Load JS shared by all             102 kB
```
- **Status:** **0 compilation errors, 0 type errors.**

### 3.2 Automated Browser E2E Suite (`browser-profile-settings.test.js`)
- **Total Checks:** **29/29 Passed (100%)**
- **Screenshots Generated:**
  1. `redesign-01-my-profile.png` — My Profile header, stats, bio, and tabs.
  2. `redesign-02-settings-dark.png` — Settings page in Dark Mode.
  3. `redesign-03-settings-privacy.png` — Settings page with Privacy & Visibility toggles.
  4. `redesign-04-settings-mobile.png` — Mobile drill-down category view.
  5. `redesign-05-other-user-profile.png` — View other user profile with "Add Friend" action.
  6. `redesign-06-profile-modal.png` — Instant UserProfileModal popup in Friends view.

### 3.3 Regression Suite
- **WebRTC Calling Backend Test Suite (`calling-test.ts`):** **48/48 Passed (100%)**
- **WebRTC Browser Calling Test (`browser-calling.test.js`):** **19/19 Passed (100%)**

