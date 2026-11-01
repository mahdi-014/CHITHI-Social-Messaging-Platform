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

async function runProfileSettingsBrowserTests() {
  console.log('====================================================');
  console.log('🎨 CHITHI MESSENGER PROFILE & SETTINGS BROWSER E2E');
  console.log('====================================================');
  console.log(`Using binary: ${BROWSER_PATH}\n`);

  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const ts = Date.now();
    const userA = {
      username: `prof_a_${ts}`,
      displayName: 'Alice Messenger',
      password: 'Password123!',
      email: `prof_a_${ts}@example.com`,
    };
    const userB = {
      username: `prof_b_${ts}`,
      displayName: 'Bob Messenger',
      password: 'Password123!',
      email: `prof_b_${ts}@example.com`,
    };

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`   [PAGE ERROR LOG] ${msg.text()}`);
    });
    page.on('pageerror', err => console.log(`   [PAGE EXCEPTION] ${err.message}`));

    // -----------------------------------------------------------------
    // STEP 1: Register User A and User B
    // -----------------------------------------------------------------
    console.log('\n[1/6] Registering test users for profile and settings verification...');
    
    // Register User B in background via API
    const regB = await fetch('http://localhost:4000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    check(regB.ok, 'User B registered in database for social interactions');

    // Register User A in browser
    await page.goto(`${BASE_URL}/register`);
    await page.waitForSelector('input[placeholder="e.g. Mahdi Hasan"]');
    await page.fill('input[placeholder="e.g. Mahdi Hasan"]', userA.displayName);
    await page.fill('input[placeholder="e.g. mahdi"]', userA.username);
    await page.fill('input[placeholder="you@example.com"]', userA.email);
    await page.fill('input[placeholder="At least 8 characters"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/chats', { timeout: 10000 });
    check(page.url().includes('/chats'), 'User A registered and logged in');

    // -----------------------------------------------------------------
    // STEP 2: Verify My Profile Page (/profile)
    // -----------------------------------------------------------------
    console.log('\n[2/6] Verifying My Profile page (/profile)...');
    await page.locator('aside nav a[href="/profile"]').first().click();
    await page.waitForSelector('button:has-text("Edit Profile")', { timeout: 15000 });

    const profileName = await page.textContent('h1');
    check(profileName.includes(userA.displayName), `Profile display name contains "${userA.displayName}"`);

    const handleText = await page.textContent(`text=@${userA.username}`);
    check(!!handleText, `Profile displays @${userA.username}`);

    const activeBadge = await page.textContent('text=Active Now');
    check(!!activeBadge, 'Profile displays "Active Now" online status badge');

    // Check tabs
    const overviewTab = await page.$('text=Overview & About');
    const momentsTab = await page.$('text=My Moments');
    const friendsTab = await page.$('text=Friends List');
    check(!!overviewTab && !!momentsTab && !!friendsTab, 'All profile tabs rendered (Overview, Moments, Friends)');

    // Test Edit Profile Modal
    await page.click('button:has-text("Edit Profile")');
    await page.waitForSelector('text=Update your display name and personal bio', { timeout: 6000 });
    check(true, 'Edit Profile modal opens with smooth backdrop');

    // Update bio
    const newBio = 'Hello from CHITHI Messenger test! Living life with code.';
    await page.fill('textarea', newBio);
    await page.click('button:has-text("Save Changes")');
    await page.waitForSelector('text=Profile updated successfully', { timeout: 6000 });
    check(true, 'Profile bio updated successfully');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-01-my-profile.png') });
    console.log('   📸 Screenshot saved: redesign-01-my-profile.png');

    // -----------------------------------------------------------------
    // STEP 3: Verify Messenger Settings Page (/settings) - Desktop
    // -----------------------------------------------------------------
    console.log('\n[3/6] Verifying Messenger Settings page (/settings) on Desktop...');
    await page.locator('aside nav a[href="/settings"]').first().click();
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Verify 8 categories on left navigation
    const expectedCategories = [
      'Appearance',
      'Privacy & Visibility',
      'Notifications & Sounds',
      'Profile Information',
      'Account & Security',
      'Chat & Calling',
      'Blocked Accounts',
      'Sessions & Sign Out',
    ];

    for (const cat of expectedCategories) {
      const el = await page.$(`button:has-text("${cat}")`);
      check(!!el, `Settings left navigation contains category: ${cat}`);
    }

    // Test Theme switching (Appearance)
    await page.click('button:has-text("Dark Mode")');
    await page.waitForTimeout(500);
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    check(htmlClass.includes('dark'), 'Appearance switches smoothly to Dark Mode');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-02-settings-dark.png') });
    console.log('   📸 Screenshot saved: redesign-02-settings-dark.png');

    // Switch back to light or system
    await page.click('button:has-text("Light Mode")');
    await page.waitForTimeout(500);

    // Test Privacy & Visibility tab
    await page.click('button:has-text("Privacy & Visibility")');
    await page.waitForSelector('text=Show Active Status', { timeout: 5000 });
    check(true, 'Privacy & Visibility category loads with toggles');

    const onlineToggle = await page.$('button[role="switch"]');
    check(!!onlineToggle, 'MessengerToggle switch rendered for active status');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-03-settings-privacy.png') });
    console.log('   📸 Screenshot saved: redesign-03-settings-privacy.png');

    // Test Account & Security tab
    await page.click('button:has-text("Account & Security")');
    await page.waitForSelector('text=Account Credentials', { timeout: 5000 });
    const emailElem = await page.textContent(`text=${userA.email}`);
    check(!!emailElem, `Account tab displays registered email ${userA.email}`);

    // Test Blocked Accounts tab
    await page.click('button:has-text("Blocked Accounts")');
    await page.waitForSelector('text=No Blocked Accounts', { timeout: 5000 });
    check(true, 'Blocked accounts empty state renders cleanly');

    // -----------------------------------------------------------------
    // STEP 4: Verify Settings Mobile Navigation (Drill-down layout)
    // -----------------------------------------------------------------
    console.log('\n[4/6] Verifying Settings drill-down navigation on Mobile Viewport...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 8000 });

    // On mobile, category list is displayed
    const appearanceBtn = await page.$('button:has-text("Appearance")');
    check(!!appearanceBtn, 'Mobile view shows settings category list tiles');

    // Tap Appearance to drill down
    await page.click('button:has-text("Appearance")');
    await page.waitForSelector('button:has-text("Settings")', { timeout: 5000 });
    check(true, 'Mobile drills down to category view with "← Settings" back button');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-04-settings-mobile.png') });
    console.log('   📸 Screenshot saved: redesign-04-settings-mobile.png');

    // Tap back button
    await page.click('button:has-text("Settings")');
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 });
    check(true, 'Mobile back button returns to root category list');

    // Reset viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // -----------------------------------------------------------------
    // STEP 5: Verify View Other User Profile (/profile/[username])
    // -----------------------------------------------------------------
    console.log('\n[5/6] Verifying View Other User Profile (/profile/[username])...');
    await page.goto(`${BASE_URL}/profile/${userB.username}`);
    await page.waitForSelector(`h1:has-text("${userB.displayName}"), h2:has-text("${userB.displayName}")`, { timeout: 10000 });
    check(true, `Other user profile for ${userB.displayName} loaded successfully`);

    const addFriendBtn = await page.$('button:has-text("Add Friend")');
    check(!!addFriendBtn, 'Other user profile has "Add Friend" action button');

    // Test sending friend request directly from profile
    await page.click('button:has-text("Add Friend")');
    await page.waitForSelector('text=Request Sent', { timeout: 6000 });
    check(true, 'Friend request sent directly from profile view (shows "Request Sent")');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-05-other-user-profile.png') });
    console.log('   📸 Screenshot saved: redesign-05-other-user-profile.png');

    // -----------------------------------------------------------------
    // STEP 6: Verify Friends Page and UserProfileModal
    // -----------------------------------------------------------------
    console.log('\n[6/6] Verifying Friends page and UserProfileModal popup...');
    await page.locator('aside nav a[href="/friends"]').first().click();
    await page.waitForSelector('h1:has-text("Friends")', { timeout: 10000 });

    // Go to Sent Requests tab to see outgoing request
    await page.click('button:has-text("Requests")');
    await page.waitForSelector(`text=${userB.displayName}`, { timeout: 6000 });
    check(true, `Sent request for ${userB.displayName} visible in requests tab`);

    // Click on User B in requests tab to open UserProfileModal
    await page.click(`button:has-text("${userB.displayName}")`);
    await page.waitForSelector('.backdrop-blur-sm', { timeout: 5000 });
    check(true, 'Clicking user in friends/requests opens UserProfileModal');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign-06-profile-modal.png') });
    console.log('   📸 Screenshot saved: redesign-06-profile-modal.png');

    console.log('\n====================================================');
    console.log(`🎉 ALL BROWSER E2E CHECKS PASSED: ${passedChecks}/${totalChecks}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Browser test failed with error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runProfileSettingsBrowserTests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
