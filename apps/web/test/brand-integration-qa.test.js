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

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
    throw new Error(`Invalid PNG signature in ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

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

async function runBrandIntegrationQa() {
  console.log('================================================================');
  console.log('💎 CHITHI MASTER BRAND INTEGRATION & ASSET AUDIT QA SUITE');
  console.log('================================================================\n');

  // -----------------------------------------------------------------
  // 1. ASSET PRESENCE AUDIT (Category A - E)
  // -----------------------------------------------------------------
  console.log('1. Auditing Brand Assets Existence & Integrity...');

  const expectedLogos = [
    'logo-primary.svg', 'logo-primary.png',
    'logo-compact.svg', 'logo-compact.png',
    'logo-compact-light.svg', 'logo-compact-light.png',
    'logo-compact-dark.svg', 'logo-compact-dark.png',
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

  const expectedSocials = ['og-image.png', 'social-share.png', 'brand-cover.png', 'social-profile.png'];
  for (const name of expectedSocials) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'social', name);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `Social asset exists: brand/social/${name}`);
  }

  const expectedBackgrounds = ['brand-pattern.svg', 'brand-background-light.svg', 'brand-background-dark.svg'];
  for (const name of expectedBackgrounds) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'backgrounds', name);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `Background pattern exists: brand/backgrounds/${name}`);
  }

  // App Icons
  const appSizes = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024];
  for (const s of appSizes) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'app-icons', `icon-${s}.png`);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `App icon exists: brand/app-icons/icon-${s}.png`);
    const dim = getPngDimensions(fp);
    check(dim.width === s && dim.height === s, `App icon icon-${s}.png dimensions match ${s}x${s}`);
  }

  const maskableSizes = [192, 512];
  for (const s of maskableSizes) {
    const fp = path.join(PUBLIC_DIR, 'brand', 'app-icons', `icon-maskable-${s}.png`);
    check(fs.existsSync(fp) && fs.statSync(fp).size > 0, `Maskable app icon exists: icon-maskable-${s}.png`);
  }

  // Manifest verification
  const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
  check(fs.existsSync(manifestPath), 'manifest.json exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  check(manifest.name === 'CHITHI Social Messaging Platform', 'Manifest name matches brand identity');
  check(manifest.short_name === 'CHITHI', 'Manifest short_name is CHITHI');
  check(manifest.icons && manifest.icons.length >= 8, `Manifest has ${manifest.icons.length} icon definitions`);
  const hasMaskable = manifest.icons.some(i => i.purpose && i.purpose.includes('maskable'));
  check(hasMaskable, 'Manifest includes maskable icon definitions');

  // Favicon ICO inspection
  const icoInfo = parseIco(path.join(PUBLIC_DIR, 'favicon.ico'));
  check(icoInfo.count >= 3, `favicon.ico contains multi-resolution icon frames (${icoInfo.count} frames)`);

  // -----------------------------------------------------------------
  // 2. BROWSER HEADLESS INTEGRATION & ROUTE VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n2. Testing Headless Browser Brand UI Integration Across All Routes...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // A. Landing Page (/)
    console.log('   Testing Landing Page (/)...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=CHITHI', { timeout: 10000 });

    const title = await page.title();
    check(title.includes('CHITHI'), `Root title contains "CHITHI" (${title})`);

    const ogImg = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content'));
    check(ogImg.includes('/brand/social/og-image.png'), `OG Image points to brand asset (${ogImg})`);

    const headerLogo = await page.$('header img[alt="CHITHI"]');
    check(!!headerLogo, 'Header contains brand logo image');
    const headerLogoSrc = await headerLogo.getAttribute('src');
    check(headerLogoSrc.includes('logo-symbol.svg'), `Header logo uses logo-symbol.svg (${headerLogoSrc})`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-01-landing-dark.png') });

    // Toggle theme to Light
    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    if (await themeBtn.count() > 0) {
      await themeBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-02-landing-light.png') });
      console.log('   Captured Landing Light mode screenshot');
    }

    // B. Login Page (/login)
    console.log('   Testing Login Page (/login)...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[placeholder="Enter username or email"]', { timeout: 10000 });
    const loginLogo = await page.$('a img[alt="CHITHI"]');
    check(!!loginLogo, 'Login page renders brand symbol logo');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-03-login.png') });

    // C. Register Page (/register)
    console.log('   Testing Register Page (/register)...');
    await page.goto('http://localhost:3000/register');
    await page.waitForSelector('input[placeholder="e.g. Mahdi Hasan"]', { timeout: 10000 });
    const regLogo = await page.$('a img[alt="CHITHI"]');
    check(!!regLogo, 'Register page renders brand symbol logo');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-04-register.png') });

    // D. 404 Not Found Page (/non-existent-page-404)
    console.log('   Testing Custom Branded 404 Page...');
    await page.goto('http://localhost:3000/non-existent-route-for-branding-test');
    await page.waitForSelector('text=Page Not Found', { timeout: 10000 });
    const notFoundLogo = await page.$('img[alt="CHITHI"]');
    check(!!notFoundLogo, '404 Page renders BrandLogo component');
    const returnBtn = await page.$('a:has-text("Return to CHITHI"), a[href="/chats"]');
    check(!!returnBtn, '404 Page has return navigation button');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-05-not-found-404.png') });

    // E. Perform Authentication for Dashboard Routes
    console.log('   Authenticating test user for dashboard inspection via register...');
    const ts = Date.now();
    await page.goto('http://localhost:3000/register');
    await page.fill('input[placeholder="e.g. Mahdi Hasan"]', 'Brand QA Tester');
    await page.fill('input[placeholder="e.g. mahdi"]', `qa_${ts}`);
    await page.fill('input[placeholder="you@example.com"]', `qa_${ts}@example.com`);
    await page.fill('input[placeholder="At least 8 characters"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to /chats
    await page.waitForURL('**/chats', { timeout: 15000 });
    console.log('   Successfully navigated to /chats');

    // Verify Sidebar Logo
    const sidebarLogo = await page.$('aside img[alt="CHITHI"]');
    check(!!sidebarLogo, 'Authenticated dashboard sidebar displays CHITHI brand logo');
    const sidebarLogoSrc = await sidebarLogo.getAttribute('src');
    check(sidebarLogoSrc.includes('logo-symbol.svg'), `Sidebar logo src is logo-symbol.svg (${sidebarLogoSrc})`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-06-chats-dashboard.png') });

    // F. Settings Page (/settings)
    console.log('   Testing Settings Page (/settings)...');
    await page.goto('http://localhost:3000/settings');
    await page.waitForSelector('text=Settings', { timeout: 10000 });

    // Verify Brand Logo in footer or accent preview
    const settingsBrandImages = await page.$$('img[alt="CHITHI"]');
    check(settingsBrandImages.length >= 1, `Settings page renders brand logo elements (found: ${settingsBrandImages.length})`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-07-settings.png') });

    // G. Mobile Viewport Test (390x844)
    console.log('   Testing Mobile Viewport Responsive Layout...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/chats');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'integration-08-mobile-chats.png') });

    console.log('\n================================================================');
    console.log(`🎉 ALL BRAND INTEGRATION QA CHECKS PASSED: ${passedChecks}/${totalChecks}`);
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runBrandIntegrationQa()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Brand Integration QA failed:', err);
    process.exit(1);
  });
