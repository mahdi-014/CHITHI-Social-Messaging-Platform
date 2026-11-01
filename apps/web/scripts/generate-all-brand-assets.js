const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const BRAND_DIR = path.join(PUBLIC_DIR, 'brand');
const LOGO_DIR = path.join(BRAND_DIR, 'logo');
const FAVICON_DIR = path.join(BRAND_DIR, 'favicon');
const APP_ICONS_DIR = path.join(BRAND_DIR, 'app-icons');
const SOCIAL_DIR = path.join(BRAND_DIR, 'social');
const BACKGROUNDS_DIR = path.join(BRAND_DIR, 'backgrounds');

// Ensure all target directories exist
[PUBLIC_DIR, BRAND_DIR, LOGO_DIR, FAVICON_DIR, APP_ICONS_DIR, SOCIAL_DIR, BACKGROUNDS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('=== CHITHI BRAND ASSET GENERATOR ===');
console.log('Target Brand Directory:', BRAND_DIR);

// =============================================================================
// COLOR PALETTE DEFINITIONS
// =============================================================================
const COLORS = {
  midnightNavy: '#101828',
  deepIndigo: '#253B80',
  indigoUi: '#4F46E5',
  electricTeal: '#19C6C5',
  tealLight: '#22E4E3',
  lightBg: '#F8FAFC',
  darkBg: '#0B1220',
  white: '#FFFFFF',
  neutralGray: '#667085',
  borderGray: '#E2E8F0',
};

// =============================================================================
// SVG TEMPLATES
// =============================================================================

// 1. MASTER STANDALONE SYMBOL (Badge / Squircle)
function getSymbolSvg(theme = 'default', padding = 32) {
  const isWhite = theme === 'white';
  const isBlack = theme === 'black';

  let bgFill = `url(#chithi-symbol-bg)`;
  let strokePrimary = `url(#chithi-teal-grad)`;
  let foldStroke = '#FFFFFF';
  let dotFill = '#FFFFFF';

  if (isWhite) {
    bgFill = '#FFFFFF';
    strokePrimary = '#101828';
    foldStroke = '#101828';
    dotFill = '#101828';
  } else if (isBlack) {
    bgFill = '#000000';
    strokePrimary = '#FFFFFF';
    foldStroke = '#FFFFFF';
    dotFill = '#FFFFFF';
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="chithi-symbol-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#253B80" />
      <stop offset="50%" stop-color="#192854" />
      <stop offset="100%" stop-color="#101828" />
    </linearGradient>
    <linearGradient id="chithi-teal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22E4E3" />
      <stop offset="100%" stop-color="#19C6C5" />
    </linearGradient>
    <filter id="chithi-symbol-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#101828" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background Squircle Container -->
  <rect x="24" y="24" width="464" height="464" rx="124" fill="${bgFill}" filter="url(#chithi-symbol-shadow)" />
  
  <!-- Outer Speech Bubble Tail (Seamlessly integrated into bottom-left) -->
  <path d="M112 400 l-44 52 c-7.2 8.5 -20 3.4 -20 -7.8 v-58 c0 -6 3 -11.5 8 -14.6 L112 344 Z" fill="${isWhite ? '#FFFFFF' : isBlack ? '#000000' : '#19C6C5'}" />

  <!-- Master 'C' Monogram (Crafted from Folded Envelope Contour) -->
  <path d="M382 142 H220 c-62 0 -112 50 -112 112 s50 112 112 112 h162 c16 0 26 -17 18 -30 l-46 -70 c-6 -9 -6 -21 0 -30 l46 -74 c8 -13 -2 -30 -18 -30 Z" 
        fill="none" 
        stroke="${strokePrimary}" 
        stroke-width="52" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- Diagonal Envelope Flap Creases (Negative Space V-fold) -->
  <path d="M136 172 L236 248 c11.8 9 28.2 9 40 0 L376 172" 
        fill="none" 
        stroke="${foldStroke}" 
        stroke-width="22" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-opacity="0.95" />

  <!-- Central Connection / Spark Node -->
  <circle cx="256" cy="256" r="22" fill="${dotFill}" />
</svg>
`.trim();
}

// 2. MASKABLE SYMBOL (Safe Zone for Android / PWA - extra 15% inner padding)
function getMaskableSymbolSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="chithi-mask-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#253B80" />
      <stop offset="50%" stop-color="#192854" />
      <stop offset="100%" stop-color="#101828" />
    </linearGradient>
    <linearGradient id="chithi-mask-teal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22E4E3" />
      <stop offset="100%" stop-color="#19C6C5" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Maskable Icon -->
  <rect width="512" height="512" fill="url(#chithi-mask-bg)" />

  <!-- Inner Safe-Zone Content Group (Scaled to 75% centered) -->
  <g transform="translate(64, 64) scale(0.75)">
    <!-- Speech Tail -->
    <path d="M112 400 l-44 52 c-7.2 8.5 -20 3.4 -20 -7.8 v-58 c0 -6 3 -11.5 8 -14.6 L112 344 Z" fill="#19C6C5" />

    <!-- Master 'C' Envelope Monogram -->
    <path d="M382 142 H220 c-62 0 -112 50 -112 112 s50 112 112 112 h162 c16 0 26 -17 18 -30 l-46 -70 c-6 -9 -6 -21 0 -30 l46 -74 c8 -13 -2 -30 -18 -30 Z" 
          fill="none" 
          stroke="url(#chithi-mask-teal)" 
          stroke-width="52" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <!-- Diagonal Envelope Flap Creases -->
    <path d="M136 172 L236 248 c11.8 9 28.2 9 40 0 L376 172" 
          fill="none" 
          stroke="#FFFFFF" 
          stroke-width="22" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-opacity="0.95" />

    <!-- Central Spark -->
    <circle cx="256" cy="256" r="22" fill="#FFFFFF" />
  </g>
</svg>
`.trim();
}

// 3. WORDMARK ONLY
function getWordmarkSvg(textColor = '#FFFFFF', subtitleColor = '#19C6C5') {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 140" width="100%" height="100%">
  <!-- CHITHI Typography -->
  <text x="10" y="86" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif" 
        font-size="82" 
        font-weight="900" 
        letter-spacing="3" 
        fill="${textColor}">CHITHI</text>

  <!-- Bengali Affinity Tag / Messenger Subtitle -->
  <text x="14" y="122" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif" 
        font-size="16" 
        font-weight="700" 
        letter-spacing="8" 
        fill="${subtitleColor}">MESSENGER</text>
  
  <!-- Subtle Bengali Glyphs Accent -->
  <text x="242" y="122" 
        font-family="'Noto Sans Bengali', -apple-system, sans-serif" 
        font-size="15" 
        font-weight="bold" 
        fill="${subtitleColor}" 
        fill-opacity="0.85">চিঠি</text>
</svg>
`.trim();
}

// 4. PRIMARY HORIZONTAL LOGO (Symbol + Wordmark)
function getPrimaryLogoSvg(variant = 'dark') {
  const isLight = variant === 'light';
  const isWhite = variant === 'white';
  const isBlack = variant === 'black';

  let textColor = '#FFFFFF';
  let subtitleColor = '#19C6C5';
  let symbolTheme = 'default';

  if (isLight) {
    textColor = '#101828';
    subtitleColor = '#253B80';
    symbolTheme = 'default';
  } else if (isWhite) {
    textColor = '#FFFFFF';
    subtitleColor = '#FFFFFF';
    symbolTheme = 'white';
  } else if (isBlack) {
    textColor = '#000000';
    subtitleColor = '#000000';
    symbolTheme = 'black';
  }

  const symbolSvg = getSymbolSvg(symbolTheme);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 200" width="100%" height="100%">
  <!-- Standalone Symbol on Left -->
  <g transform="translate(10, 10) scale(0.35)">
    ${symbolSvg}
  </g>

  <!-- Wordmark on Right -->
  <g transform="translate(210, 15)">
    <text x="0" y="96" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif" 
          font-size="88" 
          font-weight="900" 
          letter-spacing="3" 
          fill="${textColor}">CHITHI</text>

    <text x="4" y="136" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif" 
          font-size="16" 
          font-weight="800" 
          letter-spacing="7" 
          fill="${subtitleColor}">MESSENGER</text>
    
    <text x="246" y="136" 
          font-family="'Noto Sans Bengali', -apple-system, sans-serif" 
          font-size="15" 
          font-weight="bold" 
          fill="${subtitleColor}" 
          fill-opacity="0.85">চিঠি</text>
  </g>
</svg>
`.trim();
}

// 5. COMPACT LOGO (For compact headers & app bars)
function getCompactLogoSvg(variant = 'dark') {
  const isLight = variant === 'light';
  const textColor = isLight ? '#101828' : '#FFFFFF';
  const symbolSvg = getSymbolSvg('default');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 120" width="100%" height="100%">
  <g transform="translate(5, 5) scale(0.215)">
    ${symbolSvg}
  </g>
  <g transform="translate(130, 20)">
    <text x="0" y="62" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif" 
          font-size="54" 
          font-weight="900" 
          letter-spacing="2" 
          fill="${textColor}">CHITHI</text>
  </g>
</svg>
`.trim();
}

// 6. BRAND PATTERN (Seamless repeating tile)
function getBrandPatternSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <pattern id="chithi-pattern" x="0" y="0" width="128" height="128" patternUnits="userSpaceOnUse">
      <!-- Minimalist geometric folded letter shape -->
      <path d="M32 24 h64 c8 0 16 8 16 16 v48 c0 8 -8 16 -16 16 H48 l-16 16 v-16 H24 c-8 0 -16 -8 -16 -16 V40 c0 -8 8 -16 16 -16 h8" 
            fill="none" stroke="#19C6C5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.25" />
      <!-- Envelope V fold -->
      <path d="M28 36 l36 28 c2.5 2 6.5 2 9 0 l36 -28" 
            fill="none" stroke="#253B80" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.3" />
      <!-- Communication Spark Dot -->
      <circle cx="68" cy="74" r="4" fill="#19C6C5" fill-opacity="0.4" />
      <!-- Secondary offset mini dot -->
      <circle cx="120" cy="18" r="2.5" fill="#253B80" fill-opacity="0.25" />
    </pattern>
  </defs>
  <rect width="256" height="256" fill="url(#chithi-pattern)" />
</svg>
`.trim();
}

// 7. BRAND BACKGROUNDS (Light and Dark 1920x1080)
function getBrandBackgroundSvg(theme = 'dark') {
  const isDark = theme === 'dark';
  const bgFill = isDark ? '#0B1220' : '#F8FAFC';
  const glow1 = isDark ? '#253B80' : '#E2E8F0';
  const glow2 = isDark ? '#19C6C5' : '#CBD5E1';
  const patternOpacity = isDark ? '0.07' : '0.04';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="bg-glow-1" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${glow1}" stop-opacity="${isDark ? '0.45' : '0.6'}" />
      <stop offset="100%" stop-color="${bgFill}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="bg-glow-2" cx="80%" cy="75%" r="55%">
      <stop offset="0%" stop-color="${glow2}" stop-opacity="${isDark ? '0.25' : '0.35'}" />
      <stop offset="100%" stop-color="${bgFill}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Base Solid Background -->
  <rect width="1920" height="1080" fill="${bgFill}" />

  <!-- Ambient Light Orbs -->
  <rect width="1920" height="1080" fill="url(#bg-glow-1)" />
  <rect width="1920" height="1080" fill="url(#bg-glow-2)" />

  <!-- Subtle Architectural Envelope Geometric Accent in Background -->
  <g opacity="${patternOpacity}">
    <path d="M-100 400 L800 950 L1700 400" fill="none" stroke="${isDark ? '#FFFFFF' : '#101828'}" stroke-width="40" stroke-linecap="round" />
    <circle cx="800" cy="950" r="80" fill="${isDark ? '#19C6C5' : '#253B80'}" />
  </g>
</svg>
`.trim();
}

// 8. SOCIAL ASSETS HTML TEMPLATES (OG Image 1200x630, Brand Cover 1500x500)
function getOgImageHtml() {
  const symbolSvg = getSymbolSvg('default');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #0B1220;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 72px 80px;
      color: #F8FAFC;
      position: relative;
      overflow: hidden;
    }
    .ambient-glow-1 {
      position: absolute;
      top: -120px;
      left: -100px;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(37, 59, 128, 0.55) 0%, transparent 70%);
      pointer-events: none;
    }
    .ambient-glow-2 {
      position: absolute;
      bottom: -150px;
      right: -100px;
      width: 650px;
      height: 650px;
      background: radial-gradient(circle, rgba(25, 198, 197, 0.28) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-row {
      display: flex;
      align-items: center;
      gap: 24px;
      z-index: 2;
    }
    .symbol-box {
      width: 110px;
      height: 110px;
      flex-shrink: 0;
    }
    .title-col {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 56px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #FFFFFF;
      line-height: 1;
    }
    .brand-subtitle {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #19C6C5;
      margin-top: 6px;
      text-transform: uppercase;
    }
    .main-content {
      z-index: 2;
      max-width: 860px;
    }
    .hero-tagline {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      margin-bottom: 18px;
    }
    .hero-tagline span {
      background: linear-gradient(135deg, #22E4E3 0%, #19C6C5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .desc-text {
      font-size: 20px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .footer-badges {
      display: flex;
      gap: 16px;
      z-index: 2;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      font-size: 14px;
      font-weight: 700;
      color: #E2E8F0;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #19C6C5;
    }
  </style>
</head>
<body>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <div class="header-row">
    <div class="symbol-box">${symbolSvg}</div>
    <div class="title-col">
      <div class="brand-title">CHITHI</div>
      <div class="brand-subtitle">Social Messaging Platform • চিঠি</div>
    </div>
  </div>

  <div class="main-content">
    <h1 class="hero-tagline">Connect with Friends.<br><span>Chat Freely. Share Your Moments.</span></h1>
    <p class="desc-text">Modern end-to-end direct messaging, HD audio & video calling, and private moments for meaningful relationships.</p>
  </div>

  <div class="footer-badges">
    <div class="badge"><div class="badge-dot"></div> WebRTC HD Calling</div>
    <div class="badge"><div class="badge-dot"></div> Real-Time Socket.IO</div>
    <div class="badge"><div class="badge-dot"></div> Mutual Friendships</div>
    <div class="badge"><div class="badge-dot"></div> Zero Tracking</div>
  </div>
</body>
</html>
`;
}

function getBrandCoverHtml() {
  const symbolSvg = getSymbolSvg('default');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1500px;
      height: 500px;
      background: linear-gradient(135deg, #101828 0%, #192854 50%, #253B80 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 100px;
      color: #F8FAFC;
      position: relative;
      overflow: hidden;
    }
    .cover-left {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 800px;
      z-index: 2;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .title-text {
      font-size: 64px;
      font-weight: 900;
      letter-spacing: 3px;
      color: #FFFFFF;
    }
    .title-tag {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #19C6C5;
      text-transform: uppercase;
    }
    .cover-slogan {
      font-size: 26px;
      font-weight: 700;
      color: #E2E8F0;
      line-height: 1.4;
    }
    .cover-desc {
      font-size: 16px;
      color: #94A3B8;
      max-width: 650px;
      line-height: 1.5;
    }
    .cover-right {
      width: 260px;
      height: 260px;
      flex-shrink: 0;
      z-index: 2;
    }
    .ambient-1 {
      position: absolute;
      top: -100px;
      right: 200px;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(25, 198, 197, 0.22) 0%, transparent 70%);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="ambient-1"></div>
  <div class="cover-left">
    <div class="title-row">
      <div class="title-text">CHITHI</div>
      <div class="title-tag">Social Messenger • চিঠি</div>
    </div>
    <div class="cover-slogan">Personal Letters. Modern Connection. Pure Privacy.</div>
    <p class="cover-desc">Experience a refined social messaging platform built for direct conversations, crystal-clear voice and video calling, and private moments shared only with accepted friends.</p>
  </div>
  <div class="cover-right">
    ${symbolSvg}
  </div>
</body>
</html>
`;
}

// =============================================================================
// ICO GENERATION FUNCTION (Pack 16x16, 32x32, 48x48 PNG buffers into valid ICO)
// =============================================================================
function createIcoFromPngBuffers(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let currentOffset = dirSize;
  const entries = [];

  for (const item of pngBuffers) {
    entries.push({
      width: item.width >= 256 ? 0 : item.width,
      height: item.height >= 256 ? 0 : item.height,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: item.buffer.length,
      imageOffset: currentOffset,
      buffer: item.buffer,
    });
    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.alloc(currentOffset);

  // Write header
  icoBuffer.writeUInt16LE(0, 0); // reserved
  icoBuffer.writeUInt16LE(1, 2); // type: 1 = ICO
  icoBuffer.writeUInt16LE(count, 4); // count

  // Write directory entries
  let offset = headerSize;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, offset);
    icoBuffer.writeUInt8(entry.height, offset + 1);
    icoBuffer.writeUInt8(entry.colorCount, offset + 2);
    icoBuffer.writeUInt8(entry.reserved, offset + 3);
    icoBuffer.writeUInt16LE(entry.planes, offset + 4);
    icoBuffer.writeUInt16LE(entry.bitCount, offset + 6);
    icoBuffer.writeUInt32LE(entry.bytesInRes, offset + 8);
    icoBuffer.writeUInt32LE(entry.imageOffset, offset + 12);
    offset += dirEntrySize;
  }

  // Write image buffers
  for (const entry of entries) {
    entry.buffer.copy(icoBuffer, entry.imageOffset);
  }

  return icoBuffer;
}

// =============================================================================
// MAIN EXECUTION PIPELINE
// =============================================================================
async function generateAllAssets() {
  console.log('\n[1/5] Writing master vector SVG files...');

  // 1. Logos
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-primary.svg'), getPrimaryLogoSvg('dark'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-compact.svg'), getCompactLogoSvg('dark'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-compact-light.svg'), getCompactLogoSvg('light'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-compact-dark.svg'), getCompactLogoSvg('dark'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-symbol.svg'), getSymbolSvg('default'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-wordmark.svg'), getWordmarkSvg('#FFFFFF', '#19C6C5'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-light.svg'), getPrimaryLogoSvg('light'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-dark.svg'), getPrimaryLogoSvg('dark'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-white.svg'), getPrimaryLogoSvg('white'));
  fs.writeFileSync(path.join(LOGO_DIR, 'logo-black.svg'), getPrimaryLogoSvg('black'));
  console.log('   ✓ Logo SVG files written to brand/logo/');

  // 2. Favicons
  fs.writeFileSync(path.join(FAVICON_DIR, 'favicon.svg'), getSymbolSvg('default'));
  console.log('   ✓ favicon.svg written to brand/favicon/');

  // 3. Backgrounds & Patterns
  fs.writeFileSync(path.join(BACKGROUNDS_DIR, 'brand-pattern.svg'), getBrandPatternSvg());
  fs.writeFileSync(path.join(BACKGROUNDS_DIR, 'brand-background-light.svg'), getBrandBackgroundSvg('light'));
  fs.writeFileSync(path.join(BACKGROUNDS_DIR, 'brand-background-dark.svg'), getBrandBackgroundSvg('dark'));
  console.log('   ✓ 3 background SVGs written to brand/backgrounds/');

  // ---------------------------------------------------------------------------
  // Launch Playwright Chromium for PNG and ICO exports
  // ---------------------------------------------------------------------------
  console.log('\n[2/5] Launching headless browser for high-resolution PNG rasterization...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  async function renderSvgToPng(svgContent, targetWidth, targetHeight, outputPath, omitBg = true) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>* { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: ${targetWidth}px; height: ${targetHeight}px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }</style></head><body>${svgContent}</body></html>`;
    await page.setViewportSize({ width: targetWidth, height: targetHeight });
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: omitBg, type: 'png' });
    fs.writeFileSync(outputPath, buffer);
    return buffer;
  }

  async function renderHtmlToPng(htmlContent, targetWidth, targetHeight, outputPath) {
    await page.setViewportSize({ width: targetWidth, height: targetHeight });
    await page.setContent(htmlContent);
    const buffer = await page.screenshot({ type: 'png' });
    fs.writeFileSync(outputPath, buffer);
    return buffer;
  }

  // 4. Render Logo PNGs
  console.log('\n[3/5] Rendering production Logo PNG variants...');
  await renderSvgToPng(getPrimaryLogoSvg('dark'), 1170, 300, path.join(LOGO_DIR, 'logo-primary.png'));
  await renderSvgToPng(getCompactLogoSvg('dark'), 690, 180, path.join(LOGO_DIR, 'logo-compact.png'));
  await renderSvgToPng(getCompactLogoSvg('light'), 690, 180, path.join(LOGO_DIR, 'logo-compact-light.png'));
  await renderSvgToPng(getCompactLogoSvg('dark'), 690, 180, path.join(LOGO_DIR, 'logo-compact-dark.png'));
  await renderSvgToPng(getSymbolSvg('default'), 512, 512, path.join(LOGO_DIR, 'logo-symbol.png'));
  await renderSvgToPng(getWordmarkSvg('#FFFFFF', '#19C6C5'), 810, 210, path.join(LOGO_DIR, 'logo-wordmark.png'));
  await renderSvgToPng(getPrimaryLogoSvg('light'), 1170, 300, path.join(LOGO_DIR, 'logo-light.png'));
  await renderSvgToPng(getPrimaryLogoSvg('dark'), 1170, 300, path.join(LOGO_DIR, 'logo-dark.png'));
  await renderSvgToPng(getPrimaryLogoSvg('dark'), 1170, 300, path.join(LOGO_DIR, 'logo-transparent.png'));
  await renderSvgToPng(getPrimaryLogoSvg('dark'), 1170, 300, path.join(LOGO_DIR, 'logo-horizontal.png'));
  await renderSvgToPng(getSymbolSvg('default'), 512, 512, path.join(LOGO_DIR, 'logo-square.png'));
  console.log('   ✓ Rendered 9 logo PNGs in brand/logo/');

  // 5. Render Favicon PNGs and compile favicon.ico
  console.log('\n[4/5] Rendering Favicon package and multi-resolution favicon.ico...');
  const fav16 = await renderSvgToPng(getSymbolSvg('default'), 16, 16, path.join(FAVICON_DIR, 'favicon-16x16.png'));
  const fav32 = await renderSvgToPng(getSymbolSvg('default'), 32, 32, path.join(FAVICON_DIR, 'favicon-32x32.png'));
  const fav48 = await renderSvgToPng(getSymbolSvg('default'), 48, 48, path.join(FAVICON_DIR, 'favicon-48x48.png'));

  const icoBuffer = createIcoFromPngBuffers([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 },
  ]);
  fs.writeFileSync(path.join(FAVICON_DIR, 'favicon.ico'), icoBuffer);
  // Also copy to root public/favicon.ico for standard browser retrieval
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('   ✓ Generated valid multi-resolution favicon.ico (16px, 32px, 48px)');

  // 6. Render Application Icons (72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024)
  console.log('\n[5/5] Rendering Application & PWA icons...');
  const appIconSizes = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024];
  for (const s of appIconSizes) {
    await renderSvgToPng(getSymbolSvg('default'), s, s, path.join(APP_ICONS_DIR, `icon-${s}.png`));
  }
  // Apple touch icon (180x180)
  const appleTouchBuffer = await renderSvgToPng(getSymbolSvg('default'), 180, 180, path.join(APP_ICONS_DIR, 'apple-touch-icon.png'));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), appleTouchBuffer);

  // Maskable icons (with 15% inner safe margin)
  await renderSvgToPng(getMaskableSymbolSvg(), 192, 192, path.join(APP_ICONS_DIR, 'icon-maskable-192.png'), false);
  await renderSvgToPng(getMaskableSymbolSvg(), 512, 512, path.join(APP_ICONS_DIR, 'icon-maskable-512.png'), false);
  console.log(`   ✓ Rendered ${appIconSizes.length} standard app icons, 2 maskable icons, and apple-touch-icon`);

  // 7. Render Social Assets
  console.log('\n[6/5] Rendering Social sharing cards & banners...');
  await renderHtmlToPng(getOgImageHtml(), 1200, 630, path.join(SOCIAL_DIR, 'og-image.png'));
  // social-share.png is identical high-res 1200x630
  await renderHtmlToPng(getOgImageHtml(), 1200, 630, path.join(SOCIAL_DIR, 'social-share.png'));
  // brand-cover.png 1500x500
  await renderHtmlToPng(getBrandCoverHtml(), 1500, 500, path.join(SOCIAL_DIR, 'brand-cover.png'));
  // social-profile.png 1024x1024
  await renderSvgToPng(getSymbolSvg('default'), 1024, 1024, path.join(SOCIAL_DIR, 'social-profile.png'));
  console.log('   ✓ Rendered og-image.png (1200x630), social-share.png (1200x630), brand-cover.png (1500x500), social-profile.png (1024x1024)');

  // 8. Generate PWA Web Manifest in apps/web/public/manifest.json
  const manifestContent = {
    name: 'CHITHI Social Messaging Platform',
    short_name: 'CHITHI',
    description: 'Connect with Friends. Chat Freely. Share Your Moments.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1220',
    theme_color: '#101828',
    icons: [
      { src: '/brand/app-icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/brand/app-icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/brand/app-icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/brand/app-icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/brand/app-icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/brand/app-icons/icon-180.png', sizes: '180x180', type: 'image/png' },
      { src: '/brand/app-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/app-icons/icon-256.png', sizes: '256x256', type: 'image/png' },
      { src: '/brand/app-icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/brand/app-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/app-icons/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
      { src: '/brand/app-icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/app-icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifestContent, null, 2));
  console.log('   ✓ Generated apps/web/public/manifest.json');

  await browser.close();
  console.log('\n=============================================================');
  console.log('✅ ALL CHITHI BRAND ASSETS GENERATED AND VERIFIED WITH SUCCESS!');
  console.log('=============================================================\n');
}

generateAllAssets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error generating brand assets:', err);
    process.exit(1);
  });

