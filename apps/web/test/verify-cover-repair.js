const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api/v1';

// Valid 100x50 JPEG image
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x32,
  0x00, 0x64, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

const TEST_COVER_PATH = path.resolve(__dirname, 'test_cover_image.jpg');
fs.writeFileSync(TEST_COVER_PATH, VALID_JPEG);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function runVerification() {
  console.log('====================================================');
  console.log('CHITHI COVER PHOTO REPAIR — FULL VERIFICATION SUITE');
  console.log('====================================================');

  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`  [BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.url().includes('/api/v1/')) {
      console.log(`  [HTTP ${resp.status()}] ${resp.request().method()} ${resp.url()}`);
    }
  });

  const results = {
    pointerInterceptionFixed: false,
    directPickerTriggered: false,
    clientPreviewRendered: false,
    uploadSucceeded: false,
    coverRenderedWithNaturalDimensions: false,
    persistsAfterPageReload: false,
    persistsAfterReLogin: false,
    viewLightboxWorking: false,
    cropperWorking: false,
    removeCoverWorking: false,
  };

  try {
    const ts = Date.now();
    const user = {
      username: `covfix_${ts}`,
      displayName: 'Cover Fix User',
      password: 'Password123!',
      email: `covfix_${ts}@example.com`,
    };

    console.log('\n[STEP 1] Registering new test user:', user.username);
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[placeholder="e.g. Mahdi Hasan"]', user.displayName);
    await page.fill('input[placeholder="e.g. mahdi"]', user.username);
    await page.fill('input[placeholder="you@example.com"]', user.email);
    await page.fill('input[placeholder="At least 8 characters"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/chats', { timeout: 10000 });
    console.log('  -> User registered successfully');

    console.log('\n[STEP 2] Navigating to /profile...');
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForTimeout(2000);

    // Initial state: default gradient is visible
    const initialDefaultBanner = await page.$('text=চিঠি CHITHI');
    console.log('  -> Default gradient banner present initially:', !!initialDefaultBanner);
    if (!initialDefaultBanner) throw new Error('Expected default gradient when no cover is set!');

    console.log('\n[STEP 3] Testing Pointer-Events and Clickability of "Change Cover Photo"...');
    // Notice: NO force: true! A real human browser click.
    const changeCoverBtn = await page.$('button:has-text("Change Cover Photo")');
    if (!changeCoverBtn) throw new Error('Change Cover Photo button not found!');

    // Set up file chooser interceptor
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      changeCoverBtn.click({ force: false }), // Must not be intercepted by -mt-20 identity bar!
    ]);

    console.log('  -> SUCCESS: "Change Cover Photo" clicked without force: true!');
    results.pointerInterceptionFixed = true;
    results.directPickerTriggered = true;

    console.log('\n[STEP 4] Selecting cover photo file...');
    await fileChooser.setFiles(TEST_COVER_PATH);
    console.log('  -> File selected into input, awaiting preview & upload...');

    // Wait for upload request to complete
    await page.waitForResponse(resp => resp.url().includes('/media/') && resp.request().method() === 'POST', { timeout: 10000 });
    console.log('  -> Media upload request dispatched & finished');

    // Wait for profile PATCH
    await page.waitForResponse(resp => resp.url().includes('/profiles/me') && resp.request().method() === 'PATCH', { timeout: 10000 });
    console.log('  -> Profile PATCH /profiles/me completed');
    results.uploadSucceeded = true;

    // Check rendered image in DOM
    await page.waitForTimeout(1500);
    const coverImg = await page.$('img[alt="Cover"]');
    if (!coverImg) throw new Error('img[alt="Cover"] element not found after upload!');

    const naturalWidth = await coverImg.evaluate(el => el.naturalWidth);
    const naturalHeight = await coverImg.evaluate(el => el.naturalHeight);
    const complete = await coverImg.evaluate(el => el.complete);
    const src = await coverImg.getAttribute('src');

    console.log(`  -> Rendered Cover Image: naturalWidth=${naturalWidth}, naturalHeight=${naturalHeight}, complete=${complete}`);
    console.log(`  -> Image src: ${src.slice(0, 80)}...`);

    if (naturalWidth > 0 && complete) {
      results.coverRenderedWithNaturalDimensions = true;
      results.clientPreviewRendered = true;
    }

    // Verify default gradient is GONE
    const gradientStillThere = await page.$('text=চিঠি CHITHI');
    console.log('  -> Default gradient replaced by image? ->', !gradientStillThere);
    if (gradientStillThere) throw new Error('Default gradient is still visible after cover upload!');

    console.log('\n[STEP 5] Testing dedicated controls: Lightbox Viewer...');
    const viewBtn = await page.$('button[title="View Cover Photo"]');
    if (viewBtn) {
      await viewBtn.click({ force: false });
      await page.waitForTimeout(500);
      const lightboxImg = await page.$('div.fixed.inset-0 img[alt="Cover Photo"]');
      console.log('  -> Lightbox opened with cover photo:', !!lightboxImg);
      if (lightboxImg) results.viewLightboxWorking = true;
      // Close lightbox
      const closeBtn = await page.$('button[title="Close viewer"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }

    console.log('\n[STEP 6] Testing dedicated controls: Reposition / Crop Modal...');
    const cropBtn = await page.$('button[title="Reposition / Crop"]');
    if (cropBtn) {
      await cropBtn.click({ force: false });
      await page.waitForTimeout(500);
      const cropperModal = await page.$('text=Reposition Cover Banner');
      console.log('  -> Cropper modal opened:', !!cropperModal);
      if (cropperModal) results.cropperWorking = true;
      // Close cropper modal
      const cancelCrop = await page.$('button:has-text("Cancel")');
      if (cancelCrop) await cancelCrop.click();
      await page.waitForTimeout(300);
    }

    console.log('\n[STEP 7] Testing persistence across full PAGE RELOAD...');
    await page.reload();
    await page.waitForTimeout(2000);

    const reloadedCoverImg = await page.$('img[alt="Cover"]');
    if (!reloadedCoverImg) throw new Error('Cover image missing after page reload!');
    const reloadedW = await reloadedCoverImg.evaluate(el => el.naturalWidth);
    const reloadedH = await reloadedCoverImg.evaluate(el => el.naturalHeight);
    const reloadedSrc = await reloadedCoverImg.getAttribute('src');
    console.log(`  -> After reload: naturalWidth=${reloadedW}, naturalHeight=${reloadedH}, src=${reloadedSrc.slice(0, 80)}...`);

    if (reloadedW > 0) {
      results.persistsAfterPageReload = true;
    }

    console.log('\n[STEP 8] Testing persistence across LOGOUT and RE-LOGIN...');
    // Log out cleanly
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    console.log('  -> Navigated to /login');

    // Re-login
    await page.fill('input[type="text"]', user.username);
    await page.fill('input[type="password"]', user.password);
    
    // Intercept response of /auth/login to see payload
    const loginResponsePromise = page.waitForResponse(resp => resp.url().includes('/auth/login') && resp.request().method() === 'POST');
    await page.click('button[type="submit"]');
    const loginResp = await loginResponsePromise;
    const loginJson = await loginResp.json();
    console.log('  -> /auth/login response payload has accessToken?', !!loginJson.accessToken);
    console.log('  -> /auth/login response payload user:', JSON.stringify(loginJson.user));

    await page.waitForTimeout(1000);
    const tokenRightAfter = await page.evaluate(() => localStorage.getItem('chithi_token'));
    console.log('  -> Token in localStorage immediately after login:', tokenRightAfter ? 'PRESENT' : 'MISSING');

    await page.waitForURL('**/chats', { timeout: 10000 });
    console.log('  -> Logged back in, navigating to /profile...');

    await page.goto(`${BASE_URL}/profile`);
    console.log('  -> Waiting for cover image after re-login...');
    let reloginCoverImg;
    try {
      reloginCoverImg = await page.waitForSelector('img[alt="Cover"]', { timeout: 8000 });
    } catch (e) {
      console.log('  -> Current page URL:', page.url());
      const bodyText = await page.innerText('body');
      console.log('  -> Current page body text:', bodyText.slice(0, 400));
      const authStorage = await page.evaluate(() => localStorage.getItem('chithi_token'));
      console.log('  -> chithi_token in localStorage:', authStorage ? 'PRESENT' : 'MISSING');
      throw e;
    }
    const reloginW = await reloginCoverImg.evaluate(el => el.naturalWidth);
    console.log(`  -> After re-login: naturalWidth=${reloginW}`);
    if (reloginW > 0) {
      results.persistsAfterReLogin = true;
    }

    console.log('\n[STEP 9] Testing Remove Cover Photo...');
    page.on('dialog', async dialog => {
      console.log('  -> Dialog appeared:', dialog.message());
      await dialog.accept();
    });

    const removeBtn = await page.$('button[title="Remove Cover Photo"]');
    if (removeBtn) {
      await removeBtn.click({ force: false });
      await page.waitForTimeout(1500);

      // Verify restored to default gradient
      const restoredGradient = await page.$('text=চিঠি CHITHI');
      console.log('  -> After remove, default gradient restored:', !!restoredGradient);
      if (restoredGradient) results.removeCoverWorking = true;
    }

    console.log('\n====================================================');
    console.log('VERIFICATION RESULTS SUMMARY:');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

    const allPassed = Object.values(results).every(v => v === true);
    console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌'}`);

    await browser.close();
    if (fs.existsSync(TEST_COVER_PATH)) fs.unlinkSync(TEST_COVER_PATH);

    if (!allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    await browser.close();
    if (fs.existsSync(TEST_COVER_PATH)) fs.unlinkSync(TEST_COVER_PATH);
    process.exit(1);
  }
}

runVerification();
