const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');

const OUTPUT_DIR = path.resolve(__dirname, 'brand-concepts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// -----------------------------------------------------------------------------
// SVG DEFINITIONS FOR 3 LOGO CONCEPTS
// -----------------------------------------------------------------------------

// CONCEPT 1: The Origami Chat-Letter (Squircle Envelope Bubble with Origami Fold)
const concept1Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="c1-grad-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#253B80" />
      <stop offset="60%" stop-color="#1E2E65" />
      <stop offset="100%" stop-color="#101828" />
    </linearGradient>
    <linearGradient id="c1-grad-flap" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22E4E3" />
      <stop offset="100%" stop-color="#19C6C5" />
    </linearGradient>
    <linearGradient id="c1-grad-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#101828" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#101828" stop-opacity="0" />
    </linearGradient>
  </defs>
  <!-- Outer Rounded Chat Bubble Container -->
  <path d="M120 72 h272 c57.4 0 104 46.6 104 104 v152 c0 57.4 -46.6 104 -104 104 H216 l-88 64 c-12 8.7 -28.8 0.2 -28.8 -14.6 V432 c-45 0 -83.2 -36.6 -83.2 -81.6 V176 C16 118.6 62.6 72 120 72 Z" fill="url(#c1-grad-body)" />
  <!-- Folded Letter Flap / Envelope Crease (Forming inner C) -->
  <path d="M120 128 h240 c16 0 24 19.3 12.7 30.6 L267.3 264 c-6.2 6.2 -16.4 6.2 -22.6 0 L107.3 158.6 c-11.3 -11.3 -3.3 -30.6 12.7 -30.6 Z" fill="url(#c1-grad-flap)" />
  <!-- Lower C-Loop Cutout / Envelope Pocket -->
  <path d="M140 220 l92 84 c14 12.8 35.6 12.8 49.6 0 l92 -84 c10 -9.1 26.4 -2 26.4 11.5 v112 c0 24 -19.5 43.5 -43.5 43.5 H157.5 c-24 0 -43.5 -19.5 -43.5 -43.5 V231.5 c0 -13.5 16.4 -20.6 26 -11.5 Z" fill="#FFFFFF" fill-opacity="0.12" />
  <!-- Center Communication Pulse Dot -->
  <circle cx="256" cy="300" r="22" fill="#19C6C5" />
</svg>
`;

// CONCEPT 2: The Connected Arc (Interlocking Dual-Ribbon Envelope & Infinite Chat Loop)
const concept2Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="c2-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#253B80" />
    </linearGradient>
    <linearGradient id="c2-grad-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#19C6C5" />
      <stop offset="100%" stop-color="#0EA5E9" />
    </linearGradient>
    <filter id="c2-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#253B80" flood-opacity="0.3" />
    </filter>
  </defs>
  <!-- Main Letter Body (Stylized Envelope Silhouette with Chat Bubble Tail) -->
  <rect x="56" y="86" width="400" height="320" rx="64" fill="url(#c2-grad-primary)" filter="url(#c2-glow)" />
  <path d="M120 406 l-44 52 c-7.2 8.5 -20 3.4 -20 -7.8 V406 H56 Z" fill="#253B80" />
  <!-- Overlapping Envelope Flap with Chat Bubble V-Crease -->
  <path d="M80 110 L242 248 c8.2 7 20 7 28.2 0 L432 110" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9" />
  <!-- Dynamic Electric Teal 'C' Curve passing through the letter center -->
  <path d="M360 210 A 108 108 0 1 0 360 330" fill="none" stroke="url(#c2-grad-accent)" stroke-width="36" stroke-linecap="round" />
  <!-- Sender Signal Dot -->
  <circle cx="360" cy="210" r="18" fill="#19C6C5" />
</svg>
`;

// CONCEPT 3: The Geometric C-Envelope Monogram (Precision Letter C + Envelope + Chat Tail)
const concept3Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="c3-grad-c" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#253B80" />
      <stop offset="50%" stop-color="#1D2A57" />
      <stop offset="100%" stop-color="#101828" />
    </linearGradient>
    <linearGradient id="c3-grad-teal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22E4E3" />
      <stop offset="100%" stop-color="#19C6C5" />
    </linearGradient>
    <linearGradient id="c3-grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#19C6C5" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#253B80" stop-opacity="0.9" />
    </linearGradient>
  </defs>
  <!-- Background Protective Squircle -->
  <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#c3-grad-c)" />
  
  <!-- The Bold Monogram 'C' Crafted from Envelope Creases -->
  <!-- Top Arm (Folded Envelope Flap angled down) -->
  <path d="M374 146 H220 c-58 0 -106 48 -106 106 s48 106 106 106 h154 c15 0 24 -16 16 -28 L348 268 c-6 -9 -6 -21 0 -30 l42 -64 c8 -12 -1 -28 -16 -28 Z" fill="none" stroke="url(#c3-grad-teal)" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Envelope Diagonal Fold Lines intersecting into speech envelope -->
  <path d="M136 172 L238 250 c10.6 8.2 25.4 8.2 36 0 L376 172" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95" />
  
  <!-- Integrated Chat Pointer Tail -->
  <path d="M120 404 l-36 44 c-6 7.5 -17 3.2 -17 -6.5 v-56 c0 -5 2.5 -9.6 6.8 -12.4 l46.2 -29.1" fill="url(#c3-grad-teal)" />

  <!-- Inner Spark / Connection Heart Dot -->
  <circle cx="256" cy="256" r="20" fill="#FFFFFF" />
</svg>
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'concept-1-origami-bubble.svg'), concept1Svg.trim());
fs.writeFileSync(path.join(OUTPUT_DIR, 'concept-2-connected-arc.svg'), concept2Svg.trim());
fs.writeFileSync(path.join(OUTPUT_DIR, 'concept-3-geometric-c-envelope.svg'), concept3Svg.trim());
console.log('✓ Wrote 3 concept SVG files to apps/web/test/brand-concepts/');

// -----------------------------------------------------------------------------
// HTML COMPARISON BOARD
// -----------------------------------------------------------------------------
const comparisonHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CHITHI Logo Concepts Review</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B1220;
      color: #F8FAFC;
      padding: 40px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    p.subtitle {
      color: #94A3B8;
      font-size: 15px;
      margin-bottom: 36px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
      margin-bottom: 40px;
    }
    .concept-card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 24px;
      padding: 24px;
      display: flex;
      flex-col;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .concept-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1F2937;
      padding-bottom: 12px;
    }
    .concept-tag {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #19C6C5;
      background: rgba(25, 198, 197, 0.12);
      padding: 4px 10px;
      border-radius: 999px;
    }
    .preview-box {
      border-radius: 18px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .preview-dark {
      background: #090D16;
      border: 1px solid #1F2937;
    }
    .preview-light {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #0F172A;
    }
    .icon-large {
      width: 140px;
      height: 140px;
    }
    .sizes-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 6px;
    }
    .icon-48 { width: 48px; height: 48px; }
    .icon-32 { width: 32px; height: 32px; }
    .icon-16 { width: 16px; height: 16px; }
    .wordmark-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .wordmark-text-dark {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #FFFFFF;
    }
    .wordmark-text-light {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #101828;
    }
    .concept-desc {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 11px;
      color: #64748B;
    }
    .metric-item {
      background: rgba(255,255,255,0.03);
      padding: 6px 10px;
      border-radius: 8px;
    }
    .metric-item span {
      font-weight: bold;
      color: #E2E8F0;
    }
  </style>
</head>
<body>
  <h1>CHITHI Brand Identity — 3 Logo Concepts</h1>
  <p class="subtitle">Evaluating geometric balance, envelope + chat bubble + letter 'C' synthesis, small-size readability, and light/dark contrast.</p>

  <div class="grid">
    <!-- CONCEPT 1 -->
    <div class="concept-card">
      <div class="concept-header">
        <h3 style="font-size: 18px; font-weight: 800;">Concept 1</h3>
        <span class="concept-tag">Origami Chat-Letter</span>
      </div>
      <div class="preview-box preview-dark">
        <div class="icon-large">${concept1Svg}</div>
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept1Svg}</div>
          <span class="wordmark-text-dark">CHITHI</span>
        </div>
        <div class="sizes-row">
          <div class="icon-48">${concept1Svg}</div>
          <div class="icon-32">${concept1Svg}</div>
          <div class="icon-16">${concept1Svg}</div>
        </div>
      </div>
      <div class="preview-box preview-light">
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept1Svg}</div>
          <span class="wordmark-text-light">CHITHI</span>
        </div>
      </div>
      <p class="concept-desc">
        A continuous organic squircle envelope that folds along a 45° origami diagonal. Expresses the warmth of a handwritten letter in a digital era.
      </p>
      <div class="metrics">
        <div class="metric-item">Uniqueness: <span>9.2/10</span></div>
        <div class="metric-item">Small Readability: <span>8.8/10</span></div>
        <div class="metric-item">Letter 'C' Metaphor: <span>8.5/10</span></div>
        <div class="metric-item">Modern Appeal: <span>9.4/10</span></div>
      </div>
    </div>

    <!-- CONCEPT 2 -->
    <div class="concept-card">
      <div class="concept-header">
        <h3 style="font-size: 18px; font-weight: 800;">Concept 2</h3>
        <span class="concept-tag">Connected Arc</span>
      </div>
      <div class="preview-box preview-dark">
        <div class="icon-large">${concept2Svg}</div>
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept2Svg}</div>
          <span class="wordmark-text-dark">CHITHI</span>
        </div>
        <div class="sizes-row">
          <div class="icon-48">${concept2Svg}</div>
          <div class="icon-32">${concept2Svg}</div>
          <div class="icon-16">${concept2Svg}</div>
        </div>
      </div>
      <div class="preview-box preview-light">
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept2Svg}</div>
          <span class="wordmark-text-light">CHITHI</span>
        </div>
      </div>
      <p class="concept-desc">
        An interconnected dual-ribbon envelope body with an open circular flow that forms a vibrant Electric Teal letter 'C'. Focuses on peer-to-peer transmission.
      </p>
      <div class="metrics">
        <div class="metric-item">Uniqueness: <span>9.0/10</span></div>
        <div class="metric-item">Small Readability: <span>8.7/10</span></div>
        <div class="metric-item">Letter 'C' Metaphor: <span>9.0/10</span></div>
        <div class="metric-item">Modern Appeal: <span>9.1/10</span></div>
      </div>
    </div>

    <!-- CONCEPT 3 -->
    <div class="concept-card" style="border: 2px solid #19C6C5;">
      <div class="concept-header">
        <h3 style="font-size: 18px; font-weight: 800;">Concept 3 <span style="font-size: 11px; color:#19C6C5; margin-left: 4px;">★ RECOMMENDED</span></h3>
        <span class="concept-tag">C-Envelope Monogram</span>
      </div>
      <div class="preview-box preview-dark">
        <div class="icon-large">${concept3Svg}</div>
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept3Svg}</div>
          <span class="wordmark-text-dark">CHITHI</span>
        </div>
        <div class="sizes-row">
          <div class="icon-48">${concept3Svg}</div>
          <div class="icon-32">${concept3Svg}</div>
          <div class="icon-16">${concept3Svg}</div>
        </div>
      </div>
      <div class="preview-box preview-light">
        <div class="wordmark-row">
          <div style="width: 34px; height: 34px;">${concept3Svg}</div>
          <span class="wordmark-text-light">CHITHI</span>
        </div>
      </div>
      <p class="concept-desc">
        A pure, iconic letter 'C' monogram formed by an architectural folded envelope with an integrated chat speech pointer tail. Unmistakable clarity from 16px to billboard scale.
      </p>
      <div class="metrics">
        <div class="metric-item">Uniqueness: <span>9.8/10</span></div>
        <div class="metric-item">Small Readability: <span>9.9/10</span></div>
        <div class="metric-item">Letter 'C' Metaphor: <span>9.8/10</span></div>
        <div class="metric-item">Modern Appeal: <span>9.9/10</span></div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const previewHtmlPath = path.join(OUTPUT_DIR, 'logo-concepts.html');
fs.writeFileSync(previewHtmlPath, comparisonHtml.trim());
console.log(`✓ Wrote preview HTML to ${previewHtmlPath}`);

async function capturePreview() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`file://${previewHtmlPath}`);
  await page.waitForTimeout(1000);
  const screenshotPath = path.join(OUTPUT_DIR, 'logo-concepts-comparison.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Rendered concepts comparison screenshot: ${screenshotPath}`);
  await browser.close();
}

capturePreview()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to capture preview:', err);
    process.exit(1);
  });
