const fs = require('fs');
const path = require('path');
const { chromium } = require('../node_modules/playwright');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api/v1';
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
    throw new Error(`Test assertion failed: ${message}`);
  }
}

// 1x1 valid JPEG
const TINY_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
]);

// Minimal MP4 container with ftyp box
const TINY_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31,
  0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65, 0x00, 0x00, 0x00, 0x10, 0x6d, 0x64, 0x61, 0x74,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

// Write temporary files for playwright fileChooser
const TMP_IMAGE_PATH = path.resolve(__dirname, 'test_image.jpg');
const TMP_VIDEO_PATH = path.resolve(__dirname, 'test_video.mp4');
fs.writeFileSync(TMP_IMAGE_PATH, TINY_JPEG);
fs.writeFileSync(TMP_VIDEO_PATH, TINY_MP4);

async function runMediaAndProfileTests() {
  console.log('================================================================');
  console.log('📸 CHITHI MEDIA SHARING & PROFILE IMAGE STORAGE TEST SUITE');
  console.log('================================================================\n');

  const ts = Date.now();
  const userA = {
    username: `media_a_${ts}`,
    displayName: 'Alice Media',
    password: 'Password123!',
    email: `media_a_${ts}@example.com`,
  };

  const userB = {
    username: `media_b_${ts}`,
    displayName: 'Bob Media',
    password: 'Password123!',
    email: `media_b_${ts}@example.com`,
  };

  const userC = {
    username: `stranger_c_${ts}`,
    displayName: 'Charlie Stranger',
    password: 'Password123!',
    email: `stranger_c_${ts}@example.com`,
  };

  // -----------------------------------------------------------------
  // 1. API & SECURITY VERIFICATION
  // -----------------------------------------------------------------
  console.log('1. Testing Backend Media Upload, Range Requests & Security Invariants...');

  // Register users
  const regARes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userA),
  });
  const regA = await regARes.json();
  check(regARes.ok, 'User A registered successfully');

  const regBRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB),
  });
  const regB = await regBRes.json();
  check(regBRes.ok, 'User B registered successfully');

  const regCRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userC),
  });
  const regC = await regCRes.json();
  check(regCRes.ok, 'Stranger User C registered successfully');

  const tokenA = regA.accessToken;
  const tokenB = regB.accessToken;
  const tokenC = regC.accessToken;

  // Test 1: Upload Intent with Oversized limit rejection
  const oversizeRes = await fetch(`${API_URL}/media/upload-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      mimeType: 'image/jpeg',
      fileSize: 105 * 1024 * 1024, // 105 MB exceeds 100 MB
      category: 'avatar',
      fileName: 'huge.jpg',
    }),
  });
  check(oversizeRes.status === 400, 'Oversized media intent rejected with 400 Bad Request');

  // Test 2: Spoofed magic bytes rejection
  const spoofIntentRes = await fetch(`${API_URL}/media/upload-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      mimeType: 'image/jpeg',
      fileSize: 100,
      category: 'avatar',
      fileName: 'fake.jpg',
    }),
  });
  const spoofIntent = await spoofIntentRes.json();
  const fakePayload = Buffer.from('NOT A JPEG BINARY DATA AT ALL');
  const spoofUploadRes = await fetch(`${API_URL}/media/${spoofIntent.mediaAssetId}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${tokenA}` },
    body: fakePayload,
  });
  check(spoofUploadRes.status === 400, 'Spoofed file magic bytes mismatch rejected with 400 Bad Request');

  // Test 3: Genuine Video Upload and Range Request Validation
  const videoIntentRes = await fetch(`${API_URL}/media/upload-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      mimeType: 'video/mp4',
      fileSize: TINY_MP4.length,
      category: 'post_video',
      fileName: 'test.mp4',
    }),
  });
  const videoIntent = await videoIntentRes.json();
  const videoUploadRes = await fetch(`${API_URL}/media/${videoIntent.mediaAssetId}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4', Authorization: `Bearer ${tokenA}` },
    body: TINY_MP4,
  });
  check(videoUploadRes.ok, 'Genuine MP4 video upload succeeded');

  await fetch(`${API_URL}/media/${videoIntent.mediaAssetId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  // Test 4: Range request seeking
  const rangeRes = await fetch(`${API_URL}/media/${videoIntent.mediaAssetId}/file`, {
    headers: {
      Authorization: `Bearer ${tokenA}`,
      Range: 'bytes=0-15',
    },
  });
  check(rangeRes.status === 206, 'HTTP Range request returned 206 Partial Content');
  check(rangeRes.headers.get('content-range')?.includes('bytes 0-15/'), 'Content-Range header matches requested range');
  check(rangeRes.headers.get('cross-origin-resource-policy') === 'cross-origin', 'Cross-Origin-Resource-Policy header is cross-origin');
  check(rangeRes.headers.get('accept-ranges') === 'bytes', 'Accept-Ranges: bytes is enabled');

  // -----------------------------------------------------------------
  // 2. HEADLESS BROWSER PROFILE & COVER LIFECYCLE
  // -----------------------------------------------------------------
  console.log('\n2. Testing Headless Browser Profile & Cover Picture Upload & Display...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();

    pageA.on('console', msg => {
      if (msg.type() === 'error') console.log(`   [PAGE ERROR LOG] ${msg.text()}`);
    });
    pageA.on('pageerror', err => console.log(`   [PAGE EXCEPTION] ${err.message}`));

    // Log in User A
    await pageA.goto(`${BASE_URL}/login`);
    await pageA.fill('input[placeholder="Enter username or email"]', userA.username);
    await pageA.fill('input[type="password"]', userA.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/chats', { timeout: 15000 });
    check(pageA.url().includes('/chats'), 'User A logged in and redirected to /chats');

    // Navigate to /profile via sidebar
    await pageA.locator('aside a[href="/profile"]').first().click();
    await pageA.waitForSelector('button:has-text("Edit Profile")', { timeout: 15000 });
    console.log('   Navigated to /profile');

    // Upload Cover Photo
    await pageA.setInputFiles('input[data-testid="cover-file-input"]', TMP_IMAGE_PATH);
    await pageA.waitForTimeout(2000);

    // Verify Cover Image is rendered
    const coverImg = await pageA.$('img[alt="Cover"]');
    check(!!coverImg, 'Cover image element rendered in profile banner');
    const coverSrc = await coverImg.getAttribute('src');
    check(coverSrc && coverSrc.length > 0, `Cover image src populated (${coverSrc.slice(0, 40)}...)`);

    // Upload Avatar Photo
    await pageA.setInputFiles('input[data-testid="avatar-file-input"]', TMP_IMAGE_PATH);
    await pageA.waitForTimeout(2000);

    // Verify Avatar Image is rendered
    const avatarImg = await pageA.$('img[alt="Alice Media"]');
    check(!!avatarImg, 'Profile avatar rendered as image instead of initial letter');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'media-01-profile-updated.png') });

    // Refresh page and verify persistence
    await pageA.reload();
    await pageA.waitForSelector('button:has-text("Edit Profile")', { timeout: 15000 });
    const refreshedCover = await pageA.$('img[alt="Cover"]');
    check(!!refreshedCover, 'Cover picture remains visible after browser page refresh');
    const refreshedAvatar = await pageA.$('img[alt="Alice Media"]');
    check(!!refreshedAvatar, 'Profile picture remains visible after browser page refresh');

    // Logout and Login again to verify persistence
    await pageA.click('button[title="Sign Out"]');
    await pageA.waitForURL('**/login', { timeout: 10000 });

    // Re-login
    await pageA.fill('input[placeholder="Enter username or email"]', userA.username);
    await pageA.fill('input[type="password"]', userA.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/chats', { timeout: 15000 });

    // Check sidebar user avatar
    const sidebarAvatarImg = await pageA.$('aside img[alt="Alice Media"]');
    check(!!sidebarAvatarImg, 'Profile picture displays in dashboard sidebar after re-login');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'media-02-relogin-sidebar.png') });

    // -----------------------------------------------------------------
    // 3. ONE-TO-ONE CHAT IMAGE & VIDEO SHARING
    // -----------------------------------------------------------------
    console.log('\n3. Testing One-to-One Chat Image & Video Sharing Between Alice and Bob...');

    // Establish mutual friendship via API
    const reqRes = await fetch(`${API_URL}/friend-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ receiverId: regB.user.id }),
    });
    const reqData = await reqRes.json();
    check(reqRes.ok, 'Friend request sent from Alice to Bob');
    const acceptRes = await fetch(`${API_URL}/friend-requests/${reqData.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    check(acceptRes.ok, 'Friend request accepted by Bob');
    console.log('   Mutual friendship established between Alice and Bob');

    // Open direct conversation via User A
    await pageA.locator('aside a[href="/chats"]').first().click();
    await pageA.waitForSelector('h1:has-text("Chats")', { timeout: 10000 });
    const newChatBtn = pageA.locator('button[title="Start new conversation"], button:has-text("New Conversation")').first();
    await newChatBtn.click();
    await pageA.waitForSelector(`h4:has-text("${userB.displayName}")`, { timeout: 10000 });
    await pageA.click(`h4:has-text("${userB.displayName}")`);
    await pageA.waitForSelector('input[placeholder="Type a message..."]', { timeout: 10000 });
    console.log('   Active direct chat opened with Bob');

    // Attach Photo
    await pageA.setInputFiles('input[data-testid="chat-image-input"]', TMP_IMAGE_PATH);
    await pageA.waitForSelector('p:has-text("test_image.jpg")', { timeout: 10000 });
    check(true, 'Selected image preview bar displays in chat composer');

    // Send Photo
    await pageA.fill('input[placeholder="Add a caption (optional)..."]', 'Look at this photo!');
    await pageA.click('button[type="submit"]');

    // Verify message bubble with image appears in chat
    await pageA.waitForSelector('img[alt="Attachment"]', { timeout: 10000 });
    const chatMsgImg = await pageA.$('img[alt="Attachment"]');
    check(!!chatMsgImg, 'Photo message bubble rendered with image element');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'media-03-chat-image-sent.png') });

    // Open Lightbox
    await chatMsgImg.click({ force: true });
    await pageA.waitForSelector('img[alt="Enlarged media"]', { timeout: 10000 });
    check(true, 'Clicking chat image opens high-resolution Lightbox viewer modal');
    await pageA.click('button[title="Close viewer"]');

    // Attach Video
    await pageA.setInputFiles('input[data-testid="chat-video-input"]', TMP_VIDEO_PATH);
    await pageA.waitForSelector('p:has-text("test_video.mp4")', { timeout: 10000 });
    check(true, 'Selected video preview displays in chat composer');

    // Send Video
    await pageA.fill('input[placeholder="Add a caption (optional)..."]', 'Watch this clip!');
    await pageA.click('button[type="submit"]');

    // Verify message bubble with video player appears in chat
    await pageA.waitForSelector('video', { timeout: 10000 });
    const chatVideoEl = await pageA.$('video');
    check(!!chatVideoEl, 'Video message bubble rendered with HTML5 video player and playback controls');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'media-04-chat-video-sent.png') });

    // Verify text-only message still works perfectly
    await pageA.fill('input[placeholder="Type a message..."]', 'Pure text message test');
    await pageA.click('button[type="submit"]');
    await pageA.waitForSelector('p:has-text("Pure text message test")', { timeout: 10000 });
    check(true, 'Text-only direct messaging works exactly as before');

    // -----------------------------------------------------------------
    // 4. MOMENTS PHOTO & VIDEO SHARING
    // -----------------------------------------------------------------
    console.log('\n4. Testing Moments Photo & Video Sharing...');

    await pageA.locator('aside a[href="/moments"]').first().click();
    await pageA.waitForSelector('textarea[placeholder="Share a moment with your friends..."]', { timeout: 10000 });

    // Post Photo Moment
    await pageA.setInputFiles('input[data-testid="moment-image-input"]', TMP_IMAGE_PATH);
    await pageA.waitForSelector('p:has-text("test_image.jpg")', { timeout: 10000 });
    await pageA.fill('textarea[placeholder="Share a moment with your friends..."]', 'Excited to share this moment!');
    await pageA.click('button:has-text("Post Moment")');
    await pageA.waitForTimeout(2000);

    // Verify published image moment in feed
    await pageA.waitForSelector('img[alt="Moment media"]', { timeout: 10000 });
    const momentImg = await pageA.$('img[alt="Moment media"]');
    check(!!momentImg, 'Published photo Moment renders with image in friends feed');

    // Post Video Moment
    await pageA.setInputFiles('input[data-testid="moment-video-input"]', TMP_VIDEO_PATH);
    await pageA.waitForSelector('p:has-text("test_video.mp4")', { timeout: 10000 });
    await pageA.fill('textarea[placeholder="Share a moment with your friends..."]', 'Check out my video moment!');
    await pageA.click('button:has-text("Post Moment")');
    await pageA.waitForTimeout(2000);

    // Verify published video moment in feed
    const momentVideos = await pageA.$$('video');
    check(momentVideos.length > 0, 'Published video Moment renders with HTML5 video player in friends feed');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'media-05-moments-feed.png') });

    // -----------------------------------------------------------------
    // 5. PRIVACY AUDIT: VERIFY STRANGER CANNOT ACCESS MOMENTS OR MEDIA
    // -----------------------------------------------------------------
    console.log('\n5. Testing Security & Privacy Boundaries (Stranger Access Denial)...');

    // Stranger C views feed via API
    const strangerFeedRes = await fetch(`${API_URL}/feed`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const strangerFeed = await strangerFeedRes.json();
    const hasAlicePost = (strangerFeed.posts || []).some(p => p.authorId === regA.user.id);
    check(!hasAlicePost, 'Stranger User C friends-only feed does NOT contain User A private moments');

    console.log('\n================================================================');
    console.log(`🎉 ALL MEDIA & PROFILE TESTS PASSED: ${passedChecks}/${totalChecks}`);
    console.log('================================================================\n');

  } finally {
    await browser.close();
    // Clean up temporary test files
    if (fs.existsSync(TMP_IMAGE_PATH)) fs.unlinkSync(TMP_IMAGE_PATH);
    if (fs.existsSync(TMP_VIDEO_PATH)) fs.unlinkSync(TMP_VIDEO_PATH);
  }
}

runMediaAndProfileTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Media & Profile test suite failed:', err);
    process.exit(1);
  });
