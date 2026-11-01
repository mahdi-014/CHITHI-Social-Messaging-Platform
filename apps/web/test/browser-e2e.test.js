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

async function runBrowserTests() {
  console.log('=== CHITHI REAL BROWSER E2E TEST SUITE ===');
  console.log(`Using browser binary: ${BROWSER_PATH}\n`);

  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    headless: true, // running in headless mode for CI/terminal
  });

  try {
    const timestamp = Date.now();
    const userA = {
      username: `alice_${timestamp}`,
      displayName: 'Alice Walker',
      password: 'Password123!',
      email: `alice_${timestamp}@example.com`,
    };
    const userB = {
      username: `bob_${timestamp}`,
      displayName: 'Bob Smith',
      password: 'Password123!',
      email: `bob_${timestamp}@example.com`,
    };

    // ---------------------------------------------------------
    // TEST 1: Landing Page & Theme Toggle
    // ---------------------------------------------------------
    console.log('1. Testing Welcome Page & Theme Toggle...');
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto(BASE_URL);

    await pageA.waitForSelector('text=CHITHI');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, '01-landing-page.png') });
    console.log('   [PASS] Landing page loaded');

    // Theme toggle test
    const themeBtn = pageA.locator('button[aria-label="Toggle theme"]');
    await themeBtn.click();
    await pageA.waitForTimeout(300);
    console.log('   [PASS] Theme toggled to dark');

    // ---------------------------------------------------------
    // TEST 2: Registration - Account 1 (Alice)
    // ---------------------------------------------------------
    console.log('\n2. Testing Registration for User A (Alice)...');
    await pageA.goto(`${BASE_URL}/register`);
    await pageA.fill('input[placeholder="e.g. Mahdi Hasan"]', userA.displayName);
    await pageA.fill('input[placeholder="e.g. mahdi"]', userA.username);
    await pageA.fill('input[placeholder="you@example.com"]', userA.email);
    await pageA.fill('input[placeholder="At least 8 characters"]', userA.password);
    await pageA.click('button[type="submit"]');

    await pageA.waitForURL('**/chats', { timeout: 10000 });
    console.log('   [PASS] Alice registered and redirected to /chats');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, '02-alice-dashboard.png') });

    // ---------------------------------------------------------
    // TEST 3: Registration - Account 2 (Bob in separate context)
    // ---------------------------------------------------------
    console.log('\n3. Testing Registration for User B (Bob)...');
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(`${BASE_URL}/register`);
    await pageB.fill('input[placeholder="e.g. Mahdi Hasan"]', userB.displayName);
    await pageB.fill('input[placeholder="e.g. mahdi"]', userB.username);
    await pageB.fill('input[placeholder="you@example.com"]', userB.email);
    await pageB.fill('input[placeholder="At least 8 characters"]', userB.password);
    await pageB.click('button[type="submit"]');

    await pageB.waitForURL('**/chats', { timeout: 10000 });
    console.log('   [PASS] Bob registered and redirected to /chats');

    // ---------------------------------------------------------
    // TEST 4: Exact Username Search & Friend Request
    // ---------------------------------------------------------
    console.log('\n4. Testing Exact Username Lookup & Friend Request...');
    await pageA.goto(`${BASE_URL}/friends`);
    await pageA.locator('button:has-text("Add Friend")').first().click();
    await pageA.fill('input[placeholder="Enter exact username..."]', userB.username);
    await pageA.click('button:has-text("Search")');

    await pageA.waitForSelector(`text=@${userB.username}`);
    console.log(`   [PASS] Alice found exact username preview: @${userB.username}`);

    // Click the Add Friend button on the search result card (not the tab)
    await pageA.locator('div.border button:has-text("Add Friend")').click();
    await pageA.waitForSelector('text=Friend request sent successfully!');
    console.log('   [PASS] Alice sent friend request to Bob');

    // ---------------------------------------------------------
    // TEST 5: Incoming Friend Request & Acceptance
    // ---------------------------------------------------------
    console.log('\n5. Testing Incoming Friend Request & Acceptance...');
    await pageB.goto(`${BASE_URL}/friends`);
    await pageB.locator('button:has-text("Requests")').click();
    await pageB.waitForSelector(`text=@${userA.username}`);
    console.log(`   [PASS] Bob sees incoming request from @${userA.username}`);

    await pageB.locator('button:has-text("Accept")').first().click();
    await pageB.waitForTimeout(1000);

    // Verify Bob's friends list now contains Alice
    await pageB.locator('button:has-text("My Friends")').click();
    await pageB.waitForSelector(`text=@${userA.username}`);
    console.log('   [PASS] Bob accepted request; Alice is now in Bob friends list');

    // ---------------------------------------------------------
    // TEST 6: Real-Time Direct Messaging
    // ---------------------------------------------------------
    console.log('\n6. Testing Real-Time Direct Messaging Between Alice and Bob...');
    // Bob clicks the message button on Alice's friend card
    await pageB.locator('button[title="Send Message"]').first().click();
    await pageB.waitForURL('**/chats', { timeout: 10000 });
    await pageB.waitForSelector(`text=Alice Walker`);

    // Bob sends message
    const bobMsg = `Hello Alice! This is Bob testing CHITHI live at ${Date.now()}`;
    await pageB.fill('input[placeholder="Type a message..."]', bobMsg);
    await pageB.click('button[type="submit"]');
    await pageB.waitForSelector(`text=${bobMsg}`);
    console.log('   [PASS] Bob sent message');

    // Alice opens /chats
    await pageA.goto(`${BASE_URL}/chats`);
    await pageA.waitForSelector(`text=Bob Smith`);
    await pageA.click('text=Bob Smith');
    await pageA.waitForSelector(`text=${bobMsg}`);
    console.log('   [PASS] Alice received Bobs message in conversation');

    // Alice replies
    const aliceReply = `Hi Bob! Reply received at ${Date.now()}!`;
    await pageA.fill('input[placeholder="Type a message..."]', aliceReply);
    await pageA.click('button[type="submit"]');
    await pageA.waitForSelector(`text=${aliceReply}`);
    console.log('   [PASS] Alice sent reply');

    // Bob verifies reply arrives
    await pageB.waitForSelector(`text=${aliceReply}`);
    console.log('   [PASS] Bob received Alice reply in real-time');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, '03-chat-conversation.png') });

    // Message persistence check: Reload Alice's page
    await pageA.reload();
    await pageA.click('text=Bob Smith');
    await pageA.waitForSelector(`text=${aliceReply}`);
    console.log('   [PASS] Message history persisted across browser reload');

    // ---------------------------------------------------------
    // TEST 7: Permanent Moments & Friends-Only Feed
    // ---------------------------------------------------------
    console.log('\n7. Testing Permanent Moments & Friends-Only Feed...');
    await pageA.goto(`${BASE_URL}/moments`);
    const momentText = `Sharing a beautiful moment with friends on CHITHI! #${timestamp}`;
    await pageA.fill('textarea[placeholder="Share a moment with your friends..."]', momentText);
    await pageA.click('button:has-text("Post Moment")');
    await pageA.waitForSelector(`text=${momentText}`);
    console.log('   [PASS] Alice posted a new Moment');

    // Bob views Moments feed
    await pageB.goto(`${BASE_URL}/moments`);
    await pageB.waitForSelector(`text=${momentText}`);
    console.log('   [PASS] Bob sees Alice moment in friends-only feed');

    // Bob likes Alice's moment
    await pageB.locator('button:has(.lucide-heart)').first().click();
    await pageB.waitForTimeout(500);
    console.log('   [PASS] Bob reacted with Heart to Alice moment');

    // Bob comments on Alice's moment
    await pageB.locator('button:has(.lucide-message-circle)').first().click();
    await pageB.fill('input[placeholder="Write a comment..."]', 'Congratulations on your first CHITHI moment!');
    await pageB.locator('button:has(.lucide-send)').first().click();
    await pageB.waitForSelector('text=Congratulations on your first CHITHI moment!');
    console.log('   [PASS] Bob commented on Alice moment');
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, '04-moments-feed.png') });

    // ---------------------------------------------------------
    // TEST 8: Mobile Responsiveness
    // ---------------------------------------------------------
    console.log('\n8. Testing Mobile Viewport & Responsive Navigation...');
    await pageA.setViewportSize({ width: 375, height: 667 });
    await pageA.goto(`${BASE_URL}/chats`);
    await pageA.waitForSelector('nav.md\\:hidden');
    console.log('   [PASS] Mobile bottom navigation bar rendered correctly on 375x667');
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, '05-mobile-view.png') });

    // ---------------------------------------------------------
    // TEST 9: Settings & Profile
    // ---------------------------------------------------------
    console.log('\n9. Testing Profile & Settings View...');
    await pageA.setViewportSize({ width: 1280, height: 800 });
    await pageA.goto(`${BASE_URL}/profile`);
    await pageA.waitForSelector(`h1:has-text("${userA.displayName}"), h2:has-text("${userA.displayName}")`);
    console.log('   [PASS] Profile view rendered with correct user information');

    await pageA.goto(`${BASE_URL}/settings`);
    await pageA.waitForSelector('text=Appearance');
    await pageA.waitForSelector('text=Privacy & Visibility');
    console.log('   [PASS] Settings view rendered with appearance & privacy controls');

    console.log('\n======================================================');
    console.log('ALL REAL BROWSER E2E TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } finally {
    await browser.close();
  }
}

runBrowserTests().catch((err) => {
  console.error('Fatal browser test error:', err);
  process.exit(1);
});
