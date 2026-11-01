const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let passedChecks = 0;
let totalChecks = 0;

function check(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`   ✓ [PASS] ${message}`);
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    throw new Error(`QA check failed: ${message}`);
  }
}

// Read PNG dimensions from IHDR chunk (bytes 16-24)
function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
    throw new Error(`Invalid PNG signature in ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// Read ICO header and sizes
function parseIco(filePath) {
  const buf = fs.readFileSync(filePath);
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  if (reserved !== 0 || type !== 1) {
    throw new Error(`Invalid ICO header in ${filePath}`);
  }
  const icons = [];
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    let w = buf.readUInt8(offset);
    let h = buf.readUInt8(offset + 1);
    icons.push({ width: w === 0 ? 256 : w, height: h === 0 ? 256 : h });
  }
  return { count, icons };
}

async function runBrandQa() {
  console.log('====================================================');
  console.log('🎨 CHITHI BRAND ASSETS & UI INTEGRATION QA SUITE');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // 1. FILE EXISTENCE & INTEGRITY CHECKS
  // -----------------------------------------------------------------
  console.log('1. Auditing File Existence & Asset Integrity...');

  const expectedLogos = [
    'logo-primary.svg', 'logo-primary.png',
    'logo-compact.svg', 'logo-compact.png',
    'logo-symbol.svg', 'logo-symbol.png',
    'logo-wordmark.svg', 'logo-wordmark.png',
    'logo-light.svg', 'logo-light.png',
    'logo-dark.svg', 'logo-dark.png',
    'logo-white.svg', 'logo-black.svg',
    'logo-transparent.png', 'logo-horizontal.png', 'logo-square.png'
  ];

  for (const name of expectedLogos) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'logo', name);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `Logo file exists and non-empty: brand/logo/${name}`);
  }

  const expectedFavicons = [
    'favicon.ico', 'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png'
  ];
  for (const name of expectedFavicons) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'favicon', name);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `Favicon exists and non-empty: brand/favicon/${name}`);
  }
  check(fs.existsSync(path.join(PUBLIC_DIR, 'favicon.ico')), 'Root favicon.ico exists in public/');
  check(fs.existsSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png')), 'Root apple-touch-icon.png exists in public/');
  check(fs.existsSync(path.join(PUBLIC_DIR, 'manifest.json')), 'Web App Manifest exists in public/manifest.json');

  // -----------------------------------------------------------------
  // 2. DIMENSION & FORMAT VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n2. Verifying Image Dimensions & Specifications...');

  // Social
  const ogDim = getPngDimensions(path.join(PUBLIC_DIR, 'brand', 'social', 'og-image.png'));
  check(ogDim.width === 1200 && ogDim.height === 630, `og-image.png dimensions are exact 1200x630 (got ${ogDim.width}x${ogDim.height})`);

  const shareDim = getPngDimensions(path.join(PUBLIC_DIR, 'brand', 'social', 'social-share.png'));
  check(shareDim.width === 1200 && shareDim.height === 630, `social-share.png dimensions are exact 1200x630 (got ${shareDim.width}x${shareDim.height})`);

  const coverDim = getPngDimensions(path.join(PUBLIC_DIR, 'brand', 'social', 'brand-cover.png'));
  check(coverDim.width === 1500 && coverDim.height === 500, `brand-cover.png dimensions are exact 1500x500 (got ${coverDim.width}x${coverDim.height})`);

  const profDim = getPngDimensions(path.join(PUBLIC_DIR, 'brand', 'social', 'social-profile.png'));
  check(profDim.width === 1024 && profDim.height === 1024, `social-profile.png dimensions are exact 1024x1024 (got ${profDim.width}x${profDim.height})`);

  // App Icons
  const appSizes = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024];
  for (const s of appSizes) {
    const dim = getPngDimensions(path.join(PUBLIC_DIR, 'brand', 'app-icons', `icon-${s}.png`));
    check(dim.width === s && dim.height === s, `App icon icon-${s}.png dimensions match ${s}x${s}`);
  }

  // Favicon ICO parsing
  const icoInfo = parseIco(path.join(PUBLIC_DIR, 'favicon.ico'));
  check(icoInfo.count >= 3, `favicon.ico contains multi-resolution icon frames (${icoInfo.count} frames)`);
  const icoSizes = icoInfo.icons.map(i => `${i.width}x${i.height}`).join(', ');
  check(icoSizes.includes('16x16') && icoSizes.includes('32x32') && icoSizes.includes('48x48'), `favicon.ico contains required sizes 16, 32, 48 (${icoSizes})`);

  // -----------------------------------------------------------------
  // 3. BROWSER METADATA & UI RENDERING VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n3. Testing Browser Headless Metadata & UI Rendering...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // Visit Landing page
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=CHITHI', { timeout: 10000 });

    // Verify Title & Meta Tags
    const title = await page.title();
    check(title.includes('CHITHI'), `Page title contains "CHITHI" (actual: "${title}")`);

    const ogImage = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content'));
    check(ogImage && ogImage.includes('/brand/social/og-image.png'), `OG Image meta tag points to /brand/social/og-image.png (got: ${ogImage})`);

    const twitterCard = await page.$eval('meta[name="twitter:card"]', el => el.getAttribute('content'));
    check(twitterCard === 'summary_large_image', 'Twitter card meta tag is summary_large_image');

    const manifestLink = await page.$eval('link[rel="manifest"]', el => el.getAttribute('href'));
    check(manifestLink === '/manifest.json', 'Link rel="manifest" configured correctly');

    // Verify Brand Logo in Header
    const logoImg = await page.$('header img[alt="CHITHI"]');
    check(!!logoImg, 'Landing header renders CHITHI brand logo image');
    const logoSrc = await logoImg.getAttribute('src');
    check(logoSrc.includes('logo-symbol.svg'), `Header logo src points to SVG symbol (got: ${logoSrc})`);

    // Capture Landing Screenshots
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brand-01-landing-dark.png') });
    console.log('   📸 Screenshot saved: brand-01-landing-dark.png');

    // Toggle Light Mode
    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brand-02-landing-light.png') });
    console.log('   📸 Screenshot saved: brand-02-landing-light.png');

    // Visit Login Page
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[placeholder="Enter username or email"]', { timeout: 10000 });
    const loginLogo = await page.$('a img[alt="CHITHI"]');
    check(!!loginLogo, 'Login page renders brand symbol logo');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brand-03-login.png') });
    console.log('   📸 Screenshot saved: brand-03-login.png');

    // Visit Register Page
    await page.goto('http://localhost:3000/register');
    await page.waitForSelector('input[placeholder="e.g. Mahdi Hasan"]', { timeout: 10000 });
    const regLogo = await page.$('a img[alt="CHITHI"]');
    check(!!regLogo, 'Register page renders brand symbol logo');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brand-04-register.png') });
    console.log('   📸 Screenshot saved: brand-04-register.png');

    // Test Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.waitForSelector('header img[alt="CHITHI"]', { timeout: 10000 });
    check(true, 'Mobile viewport renders header brand logo cleanly');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brand-05-mobile-landing.png') });
    console.log('   📸 Screenshot saved: brand-05-mobile-landing.png');

    console.log('\n====================================================');
    console.log(`🎉 ALL BRAND QA CHECKS PASSED: ${passedChecks}/${totalChecks}`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runBrandQa()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Brand QA failed:', err);
    process.exit(1);
  });
