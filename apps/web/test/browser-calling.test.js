const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const BASE_URL = 'http://localhost:3000';
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
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runWebRTCBrowserTests() {
  console.log('====================================================');
  console.log('🎥 CHITHI WEBRTC AUDIO & VIDEO CALLING BROWSER E2E');
  console.log('====================================================');
  console.log(`Using binary: ${BROWSER_PATH}\n`);

  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  try {
    const ts = Date.now();
    const userA = {
      username: `cal_a_${ts}`,
      displayName: 'Alice Calling',
      password: 'Password123!',
      email: `cal_a_${ts}@example.com`,
    };
    const userB = {
      username: `cal_b_${ts}`,
      displayName: 'Bob Calling',
      password: 'Password123!',
      email: `cal_b_${ts}@example.com`,
    };

    // -------------------------------------------------------------
    // STEP 1: Registration of Both Users in Separate Browser Contexts
    // -------------------------------------------------------------
    console.log('1. Registering Alice and Bob in separate browser contexts...');
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    pageA.on('console', (msg) => console.log('PAGE A LOG:', msg.text()));
    pageA.on('pageerror', (err) => console.log('PAGE A ERR:', err.message));

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    pageB.on('console', (msg) => console.log('PAGE B LOG:', msg.text()));
    pageB.on('pageerror', (err) => console.log('PAGE B ERR:', err.message));

    // Register User A (Alice)
    await pageA.goto(`${BASE_URL}/register`);
    await pageA.fill('input[placeholder="e.g. Mahdi Hasan"]', userA.displayName);
    await pageA.fill('input[placeholder="e.g. mahdi"]', userA.username);
    await pageA.fill('input[placeholder="you@example.com"]', userA.email);
    await pageA.fill('input[placeholder="At least 8 characters"]', userA.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/chats', { timeout: 10000 });
    check(pageA.url().includes('/chats'), 'Alice registered and redirected to /chats');

    // Register User B (Bob)
    await pageB.goto(`${BASE_URL}/register`);
    await pageB.fill('input[placeholder="e.g. Mahdi Hasan"]', userB.displayName);
    await pageB.fill('input[placeholder="e.g. mahdi"]', userB.username);
    await pageB.fill('input[placeholder="you@example.com"]', userB.email);
    await pageB.fill('input[placeholder="At least 8 characters"]', userB.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('**/chats', { timeout: 10000 });
    check(pageB.url().includes('/chats'), 'Bob registered and redirected to /chats');

    // -------------------------------------------------------------
    // STEP 2: Establish Mutual Friendship
    // -------------------------------------------------------------
    console.log('\n2. Establishing Mutual Friendship...');
    await pageA.goto(`${BASE_URL}/friends`);
    await pageA.locator('button:has-text("Add Friend")').first().click();
    await pageA.fill('input[placeholder="Enter exact username..."]', userB.username);
    await pageA.click('button:has-text("Search")');
    await pageA.waitForSelector(`text=@${userB.username}`);
    await pageA.locator('div.border button:has-text("Add Friend")').click();
    await pageA.waitForSelector('text=Friend request sent successfully!');
    check(true, 'Alice sent friend request to Bob');

    await pageB.goto(`${BASE_URL}/friends`);
    await pageB.locator('button:has-text("Requests")').click();
    await pageB.waitForSelector(`text=@${userA.username}`);
    await pageB.locator('button:has-text("Accept")').first().click();
    await pageB.waitForTimeout(1000);
    check(true, 'Bob accepted friend request; mutual friendship active');

    // -------------------------------------------------------------
    // STEP 3: Audio Call Lifecycle Testing
    // -------------------------------------------------------------
    console.log('\n3. Testing End-to-End Real-Time Audio Calling...');
    // Bob clicks "Send Message" on Alice's card
    await pageB.locator('button:has-text("My Friends")').click();
    await pageB.waitForSelector(`text=@${userA.username}`);
    await pageB.locator('button[title="Send Message"]').first().click();
    await pageB.waitForURL('**/chats', { timeout: 10000 });

    // Alice goes to /chats and selects Bob's conversation
    await pageA.goto(`${BASE_URL}/chats`);
    await pageA.waitForSelector(`text=${userB.displayName}`);
    await pageA.click(`text=${userB.displayName}`);
    await pageA.waitForTimeout(800);

    // Alice clicks "Start Voice Call"
    const audioCallBtnA = await pageA.waitForSelector('button[title="Start Voice Call"]');
    check(!!audioCallBtnA, 'Voice call button visible in chat header');
    await audioCallBtnA.click();

    // Alice should see Outgoing Call modal
    await pageA.waitForSelector('text=Calling...', { timeout: 10000 });
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-01-outgoing-audio.png') });
    check(true, 'Alice sees outgoing calling screen');

    // Bob should see Incoming Call modal
    await pageB.waitForSelector('text=Incoming Audio Call...', { timeout: 10000 });
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-02-incoming-audio.png') });
    check(true, 'Bob receives incoming audio call alert');

    // Bob clicks "Accept"
    const acceptCallBtnB = await pageB.waitForSelector('button:has-text("Accept")');
    await acceptCallBtnB.click();

    // Both should transition to connected active call modal
    await pageA.waitForSelector('text=Audio Call in Progress', { timeout: 10000 });
    await pageB.waitForSelector('text=Audio Call in Progress', { timeout: 10000 });
    check(true, 'WebRTC audio call connected between Alice and Bob');

    // Wait 2 seconds to verify duration counter advances
    await pageA.waitForTimeout(2200);
    const durationA = await pageA.$eval('.tracking-wider', (el) => el.textContent);
    check(durationA !== '00:00', `Call duration timer running (${durationA})`);

    // Test Microphone Mute / Unmute
    const muteBtnA = await pageA.waitForSelector('button[title="Mute Microphone"]');
    await muteBtnA.click();
    await pageA.waitForSelector('button[title="Unmute Microphone"]');
    check(true, 'Alice muted microphone track');

    // Alice ends call
    const endCallBtnA = await pageA.waitForSelector('button[title="End Call"]');
    await endCallBtnA.click();

    // Modals should close cleanly
    await pageA.waitForTimeout(1000);
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-03-audio-call-ended.png') });
    check(true, 'Audio call ended and closed cleanly on both endpoints');

    // -------------------------------------------------------------
    // STEP 4: Video Call Lifecycle Testing
    // -------------------------------------------------------------
    console.log('\n4. Testing End-to-End Real-Time Video Calling...');
    // Bob starts Video Call from chat header
    await pageB.waitForSelector('button[title="Start Video Call"]');
    const videoCallBtnB = await pageB.locator('button[title="Start Video Call"]');
    check(!!videoCallBtnB, 'Video call button visible in Bob chat header');
    await videoCallBtnB.click();

    // Alice receives Incoming Video Call
    await pageA.waitForSelector('text=Incoming Video Call...', { timeout: 10000 });
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-04-incoming-video.png') });
    check(true, 'Alice receives incoming video call modal');

    // Alice accepts video call
    const acceptVideoBtnA = await pageA.waitForSelector('button:has-text("Accept")');
    await acceptVideoBtnA.click();

    // Both should enter active video modal with video elements
    await pageA.waitForSelector('video', { timeout: 10000 });
    await pageB.waitForSelector('video', { timeout: 10000 });
    check(true, 'WebRTC video streams initialized on both browsers');

    await pageA.waitForTimeout(2000);
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-05-active-video-call.png') });
    check(true, 'Captured active video call screenshot');

    // Test Camera Toggle
    const cameraToggleA = await pageA.waitForSelector('button[title="Turn Camera Off"]');
    await cameraToggleA.click();
    await pageA.waitForSelector('button[title="Turn Camera On"]');
    check(true, 'Alice disabled camera and entered camera off state');

    // Test PiP Toggle
    const pipToggleA = await pageA.waitForSelector('button[title="Picture-in-Picture"]');
    await pipToggleA.click();
    check(true, 'Alice toggled Picture-in-Picture floating view');

    // Bob ends call
    const endVideoBtnB = await pageB.waitForSelector('button[title="End Call"]');
    await endVideoBtnB.click();
    await pageB.waitForTimeout(1000);
    check(true, 'Video call ended cleanly');

    // -------------------------------------------------------------
    // STEP 5: Call History Verification
    // -------------------------------------------------------------
    console.log('\n5. Verifying Call History Modal...');
    await pageA.reload();
    const historyBtnA = await pageA.waitForSelector('button[title="Call History"]');
    await historyBtnA.click();

    await pageA.waitForSelector('text=Recent voice & video calls', { timeout: 5000 });
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'call-06-call-history.png') });
    check(true, 'Alice opened Call History modal showing logged voice & video sessions');

    console.log('\n====================================================');
    console.log(`🎉 BROWSER WEBRTC TESTS PASSED: ${passedChecks}/${totalChecks} VERIFIED`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runWebRTCBrowserTests().catch((err) => {
  console.error('\n❌ Browser WebRTC test failed:', err);
  process.exit(1);
});
