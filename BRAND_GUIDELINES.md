# CHITHI — BRAND GUIDELINES

**Version:** 1.0  
**Status:** Official Production Release  
**Platform:** CHITHI Social Messaging Platform  

---

## 1. Logo Concept

The CHITHI logo is a unified geometric symbol that expresses the heart of personal communication. The name **CHITHI** (চিঠি) originates from the Bengali word for a handwritten letter or personal message — evoking intimacy, intentionality, trust, and care.

The visual mark synthesizes four core conceptual pillars:
1. **The Folded Letter / Envelope**: An architectural diagonal fold symbolizing the opening of an intimate correspondence.
2. **The Modern Chat Bubble**: A sleek squircle with an integrated speech pointer tail, anchoring the brand in modern real-time messaging technology.
3. **The Letter "C" Monogram**: A sweeping circular contour that forms the initial letter of **CHITHI** (and reflects the opening stroke of "চি").
4. **The Communication Spark**: A central focal node representing the human connection, connection between two people, and real-time transmission.

---

## 2. Logo Meaning & Creative Philosophy

In an era dominated by algorithmic feeds, public broadcasting, and noise, CHITHI stands for **deliberate, private, peer-to-peer connection**. 

- **Intimacy**: A letter is sent to someone specific, not broadcast to a crowd.
- **Trust**: Clean geometry and balanced proportions reflect security, encryption, and data ownership.
- **Vibrancy**: The Electric Teal spark against Midnight Navy signals modern, high-speed WebRTC and Socket.IO real-time capabilities.

---

## 3. Primary Logo

The **Primary Logo** is the horizontal master lockup combining the standalone CHITHI symbol and the customized geometric wordmark with the "MESSENGER" tracking label and subtle Bengali affinity mark (চিঠি).

- **Master Files**:
  - Vector: `apps/web/public/brand/logo/logo-primary.svg`
  - High-Res PNG: `apps/web/public/brand/logo/logo-primary.png` (1170 × 300 px)
- **Usage**:
  - Main website headers and marketing banners.
  - Official documentation and presentation covers.
  - Open Graph and shared link previews.

---

## 4. Secondary & Compact Logo

The **Secondary / Compact Logo** provides a space-optimized horizontal lockup for application app bars, compact navigation headers, and mobile viewport orientations where horizontal real estate is constrained.

- **Master Files**:
  - Vector: `apps/web/public/brand/logo/logo-compact.svg`
  - High-Res PNG: `apps/web/public/brand/logo/logo-compact.png` (690 × 180 px)
  - Light Mode Vector: `apps/web/public/brand/logo/logo-compact-light.svg`
  - Light Mode PNG: `apps/web/public/brand/logo/logo-compact-light.png` (690 × 180 px)
  - Dark Mode Vector: `apps/web/public/brand/logo/logo-compact-dark.svg`
  - Dark Mode PNG: `apps/web/public/brand/logo/logo-compact-dark.png` (690 × 180 px)
- **Usage**:
  - Application dashboard top navigation bar.
  - Mobile web app header.
  - Compact modal headers.
  - Available through the reusable `<BrandLogo variant="compact" />` React component.

---

## 5. Standalone Symbol Usage

The **CHITHI Symbol** is the standalone icon badge, featuring the letter 'C' envelope monogram on the deep Midnight Navy squircle with integrated speech tail and Electric Teal gradient fold.

- **Master Files**:
  - Vector: `apps/web/public/brand/logo/logo-symbol.svg`
  - High-Res PNG: `apps/web/public/brand/logo/logo-symbol.png` (512 × 512 px)
  - High-Res Square: `apps/web/public/brand/logo/logo-square.png` (512 × 512 px)
- **Usage**:
  - Browser tab favicons and mobile home-screen bookmarks.
  - Native desktop and mobile application icons.
  - Application sidebar icon and loading splash animations.
  - Social media profile avatars (Twitter/X, GitHub, LinkedIn).

---

## 6. Brand Color System

CHITHI utilizes a purposeful, high-contrast palette calibrated for accessibility (WCAG AA/AAA compliance) across light and dark user environments.

| Role | Color Name | HEX Code | RGB | HSL | Usage |
|---|---|---|---|---|---|
| **Primary Base** | Midnight Navy | `#101828` | 16, 24, 40 | 220°, 43%, 11% | Brand ground, deep surfaces, dark typography |
| **Secondary Brand** | Deep Indigo | `#253B80` | 37, 59, 128 | 225°, 55%, 32% | Gradient transition, tech trust, card surfaces |
| **UI Primary Accent** | Digital Indigo | `#4F46E5` | 79, 70, 229 | 243°, 75%, 59% | Action buttons, active navigation, interactive links |
| **Brand Spark / Accent**| Electric Teal | `#19C6C5` | 25, 198, 197 | 180°, 78%, 44% | Envelope fold, online badges, spark nodes, indicators |
| **Accent Glow** | Bright Cyan | `#22E4E3` | 34, 228, 227 | 180°, 77%, 51% | Gradient highlights, ambient social glow |
| **Light Background** | Slate 50 | `#F8FAFC` | 248, 250, 252 | 210°, 40%, 98% | Main light theme canvas |
| **Dark Background** | Deep Obsidian | `#0B1220` | 11, 18, 32 | 220°, 49%, 8% | Main dark theme canvas |
| **Neutral Border** | Slate 200 | `#E2E8F0` | 226, 232, 240 | 214°, 32%, 91% | Light mode borders & dividers |
| **Dark Border** | Slate 800 | `#1F2937` | 31, 41, 55 | 215°, 28%, 17% | Dark mode borders & dividers |
| **Muted Text** | Slate 500 | `#64748B` | 100, 116, 139 | 215°, 16%, 47% | Subtitles, timestamps, placeholders |

---

## 7. Typography

CHITHI prioritizes native system typography to eliminate network font-loading latency while delivering pristine multilingual clarity across Latin and Bengali alphabets.

### UI Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Kalpurush", Helvetica, Arial, sans-serif;
```

- **English / Latin Characters**: San Francisco (`-apple-system`), Segoe UI, Roboto. Clean, legible, modern grotesk geometry.
- **Bengali Characters**: Noto Sans Bengali, Kalpurush, SolaimanLipi. High-fidelity rendering of complex Bengali conjuncts (যুক্তাক্ষর).
- **Wordmark Lettering**: Geometric custom display proportions with extended kerning (`letter-spacing: 3px`) for "CHITHI" and (`letter-spacing: 7px`) for "MESSENGER".

---

## 8. Light Theme Usage

In light mode environments (e.g., `#F8FAFC` or `#FFFFFF` backgrounds):
- Use `logo-light.svg` or `logo-light.png`.
- The symbol retains its iconic deep gradient with Electric Teal fold for immediate recognition and contrast.
- The wordmark renders in Midnight Navy (`#101828`) for strong typographic hierarchy.
- Subtitle renders in Deep Indigo (`#253B80`).

---

## 9. Dark Theme Usage

In dark mode environments (e.g., `#0B1220` or `#111827` backgrounds):
- Use `logo-dark.svg` or `logo-dark.png`.
- The symbol shines with its subtle drop shadow and vibrant Electric Teal accent.
- The wordmark renders in Crisp White (`#FFFFFF`).
- Subtitle renders in Electric Teal (`#19C6C5`).

---

## 10. Minimum Logo Size

To preserve legibility and icon fidelity:
- **Primary Horizontal Logo**: Minimum width **140 px** (height 36 px).
- **Compact Horizontal Logo**: Minimum width **100 px** (height 26 px).
- **Standalone Symbol**: Minimum size **16 × 16 px** (browser tab favicon). At 16px, the outer squircle and bold 'C' envelope loop remain crisp.

---

## 11. Clear Space

Always maintain a minimum clear space zone around the CHITHI logo free of typography, competing graphics, or page edges:
- Clear space equal to **`0.5 × X`**, where `X` is the height of the CHITHI symbol.
- Never crowd the logo against container boundaries or action buttons.

---

## 12. Incorrect Logo Usage

To maintain brand integrity, never:
- ❌ Stretch, skew, compress, or alter the aspect ratio of the logo or symbol.
- ❌ Change the color of the Electric Teal fold or substitute random colors.
- ❌ Place the light logo variant on a dark background or vice versa.
- ❌ Add heavy cartoon drop shadows, bevels, or 3D extrusions.
- ❌ Crop or truncate the chat bubble speech pointer tail.
- ❌ Attempt to recreate the wordmark using mismatched serif or script fonts.

---

## 13. Favicon Usage

The favicon package provides crystal-clear rendering across browser tabs, bookmarks, and mobile home screens:
- `favicon.ico`: 3-in-1 multi-resolution binary containing **16×16**, **32×32**, and **48×48** pixel frames.
- `favicon.svg`: Modern high-DPI vector favicon for Chromium, Firefox, and Safari.
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`: Discrete PNG frames.

---

## 14. Application Icon Package

The application icon package supports PWA (Progressive Web App), Android, iOS, Windows, and macOS desktop shortcuts:
- Standard Icons: `icon-72.png`, `icon-96.png`, `icon-128.png`, `icon-144.png`, `icon-152.png`, `icon-180.png`, `icon-192.png`, `icon-256.png`, `icon-384.png`, `icon-512.png`, `icon-1024.png`.
- Apple Touch Icon: `apple-touch-icon.png` (180 × 180 px).
- Maskable Icons: `icon-maskable-192.png` and `icon-maskable-512.png` with 15% inner safe margin ensuring the symbol is never clipped by circular or squircle OEM launchers.

---

## 15. Social Media & Sharing Specifications

- **Open Graph Image (`og-image.png`)**: 1200 × 630 px. Configured via Next.js metadata for Facebook, LinkedIn, Discord, and Slack rich preview cards.
- **Twitter Card (`social-share.png`)**: 1200 × 630 px (`summary_large_image`).
- **Brand Cover (`brand-cover.png`)**: 1500 × 500 px. Ultra-wide banner for platform headers, social profiles, and repository covers.
- **Social Profile Avatar (`social-profile.png`)**: 1024 × 1024 px. High-resolution square avatar.

---

## 16. Asset Directory Reference

All production assets are located in `apps/web/public/`:
```
apps/web/public/
├── favicon.ico
├── apple-touch-icon.png
├── manifest.json
└── brand/
    ├── logo/
    │   ├── logo-primary.svg / .png
    │   ├── logo-compact.svg / .png
    │   ├── logo-compact-light.svg / .png
    │   ├── logo-compact-dark.svg / .png
    │   ├── logo-symbol.svg / .png
    │   ├── logo-wordmark.svg / .png
    │   ├── logo-light.svg / .png
    │   ├── logo-dark.svg / .png
    │   ├── logo-white.svg / logo-black.svg
    │   ├── logo-transparent.png
    │   ├── logo-horizontal.png
    │   └── logo-square.png
    ├── favicon/
    │   ├── favicon.ico
    │   ├── favicon.svg
    │   ├── favicon-16x16.png
    │   ├── favicon-32x32.png
    │   └── favicon-48x48.png
    ├── app-icons/
    │   ├── icon-72.png to icon-1024.png
    │   ├── icon-maskable-192.png / 512.png
    │   └── apple-touch-icon.png
    ├── social/
    │   ├── og-image.png (1200x630)
    │   ├── social-share.png (1200x630)
    │   ├── brand-cover.png (1500x500)
    │   └── social-profile.png (1024x1024)
    └── backgrounds/
        ├── brand-pattern.svg
        ├── brand-background-light.svg
        └── brand-background-dark.svg
```

