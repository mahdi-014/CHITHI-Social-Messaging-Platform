/**
 * CHITHI — Comprehensive End-to-End Functional Test Suite
 * Tests full friendship lifecycle, messaging, moments feed, and privacy rules.
 */

const API_BASE = 'http://localhost:4000/api/v1';

async function request(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== CHITHI FUNCTIONAL INTEGRATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetails?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (errorDetails) console.error('   Details:', errorDetails);
      failed++;
    }
  }

  const timestamp = Date.now();
  const userA_name = `user_a_${timestamp}`;
  const userB_name = `user_b_${timestamp}`;
  const userC_name = `user_c_${timestamp}`; // stranger

  // 1. REGISTRATION
  console.log('\n--- 1. Authentication & Registration ---');
  const regA = await request('/auth/register', {
    method: 'POST',
    body: {
      username: userA_name,
      password: 'StrongPassword123!',
      displayName: 'User Alpha',
      email: `${userA_name}@example.com`,
    },
  });
  assert(regA.status === 201 && !!regA.data.accessToken, 'User A registered successfully');
  const tokenA = regA.data?.accessToken;
  const userAId = regA.data?.user?.id;

  // Duplicate registration test
  const dupReg = await request('/auth/register', {
    method: 'POST',
    body: {
      username: userA_name,
      password: 'StrongPassword123!',
      displayName: 'Duplicate User',
    },
  });
  assert(dupReg.status === 409, 'Registration with duplicate username rejected with 409 Conflict');

  const regB = await request('/auth/register', {
    method: 'POST',
    body: {
      username: userB_name,
      password: 'StrongPassword123!',
      displayName: 'User Beta',
      email: `${userB_name}@example.com`,
    },
  });
  assert(regB.status === 201 && !!regB.data.accessToken, 'User B registered successfully');
  const tokenB = regB.data?.accessToken;
  const userBId = regB.data?.user?.id;

  const regC = await request('/auth/register', {
    method: 'POST',
    body: {
      username: userC_name,
      password: 'StrongPassword123!',
      displayName: 'User Charlie (Stranger)',
      email: `${userC_name}@example.com`,
    },
  });
  assert(regC.status === 201 && !!regC.data.accessToken, 'User C (Stranger) registered successfully');
  const tokenC = regC.data?.accessToken;
  const userCId = regC.data?.user?.id;

  // 2. LOGIN
  console.log('\n--- 2. Login & Credential Verification ---');
  const loginSuccess = await request('/auth/login', {
    method: 'POST',
    body: {
      identifier: userA_name,
      password: 'StrongPassword123!',
    },
  });
  assert(loginSuccess.status === 200 && !!loginSuccess.data.accessToken, 'Login with correct credentials succeeds');

  const loginFail = await request('/auth/login', {
    method: 'POST',
    body: {
      identifier: userA_name,
      password: 'WrongPassword!',
    },
  });
  assert(loginFail.status === 401, 'Login with wrong password rejected with 401 Unauthorized');

  // 3. EXACT USERNAME LOOKUP
  console.log('\n--- 3. Exact Username Search & Privacy ---');
  const searchA_for_B = await request(`/users/search?username=${userB_name}`, { token: tokenA });
  assert(
    searchA_for_B.status === 200 && searchA_for_B.data?.user?.username === userB_name && searchA_for_B.data?.user?.friendshipStatus === 'none',
    'User A finds User B by exact username with friendshipStatus: none',
  );

  const searchMissing = await request(`/users/search?username=non_existent_person_12345`, { token: tokenA });
  assert(searchMissing.status === 200 && searchMissing.data?.user === null, 'Non-existent username returns null');

  // 4. FRIEND REQUESTS & LIFECYCLE
  console.log('\n--- 4. Friend Request & Mutual Friendship ---');
  // Self request test
  const selfReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenA,
    body: { receiverId: userAId },
  });
  assert(selfReq.status === 400, 'Self friend request rejected with 400 Bad Request');

  // A sends friend request to B
  const sendReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenA,
    body: { receiverId: userBId, message: 'Hey Beta, lets connect!' },
  });
  assert(sendReq.status === 201, 'User A sends friend request to User B');
  const requestId = sendReq.data.id;

  // Duplicate request check (A -> B again)
  const dupReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenA,
    body: { receiverId: userBId },
  });
  assert(dupReq.status === 409, 'Duplicate friend request rejected with 409 Conflict');

  // Reverse request check (B -> A while A -> B pending)
  const reverseReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenB,
    body: { receiverId: userAId },
  });
  assert(reverseReq.status === 409, 'Reverse friend request while pending rejected with 409 Conflict');

  // B views incoming requests
  const incomingB = await request('/friend-requests/incoming', { token: tokenB });
  assert(
    incomingB.status === 200 && incomingB.data.length === 1 && incomingB.data[0].id === requestId,
    'User B receives User As pending friend request in incoming list',
  );

  // B accepts A's request
  const acceptReq = await request(`/friend-requests/${requestId}/accept`, {
    method: 'POST',
    token: tokenB,
  });
  assert(acceptReq.status === 200, 'User B accepts friend request atomically');

  // Check friends list for both A and B
  const friendsA = await request('/friends', { token: tokenA });
  const friendsB = await request('/friends', { token: tokenB });
  assert(
    friendsA.status === 200 && friendsA.data.some((f: any) => f.friendId === userBId),
    'User A has User B in friends list',
  );
  assert(
    friendsB.status === 200 && friendsB.data.some((f: any) => f.friendId === userAId),
    'User B has User A in friends list (mutual friendship established)',
  );

  // 5. DIRECT MESSAGING & PRIVACY ENFORCEMENT
  console.log('\n--- 5. Direct Messaging & Authorization ---');
  // Stranger C tries to start direct conversation with A (non-friend)
  const strangerConv = await request('/conversations/direct', {
    method: 'POST',
    token: tokenC,
    body: { friendId: userAId },
  });
  assert(strangerConv.status === 403, 'Non-friend (Stranger C) blocked from starting conversation with User A (403)');

  // Friend A starts conversation with Friend B
  const directConv = await request('/conversations/direct', {
    method: 'POST',
    token: tokenA,
    body: { friendId: userBId },
  });
  assert(directConv.status === 200 && !!directConv.data.id, 'User A opens direct conversation with friend User B');
  const conversationId = directConv.data.id;

  // Idempotency: B opens conversation with A -> returns the EXACT SAME conversation
  const directConvFromB = await request('/conversations/direct', {
    method: 'POST',
    token: tokenB,
    body: { friendId: userAId },
  });
  assert(
    directConvFromB.status === 200 && directConvFromB.data.id === conversationId,
    'Conversation retrieval is idempotent (canonical pair mapping)',
  );

  // Stranger C tries to send message into conversation
  const strangerMsg = await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: tokenC,
    body: {
      messageType: 'text',
      body: 'I am eavesdropping!',
    },
  });
  assert(strangerMsg.status === 403, 'Non-member (Stranger C) blocked from sending message to conversation (403)');

  // Stranger C tries to read conversation history
  const strangerHistory = await request(`/conversations/${conversationId}/messages`, {
    token: tokenC,
  });
  assert(strangerHistory.status === 403, 'Non-member (Stranger C) blocked from reading conversation messages (403)');

  // User A sends message with clientMessageId
  const clientMsgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const sendMsg = await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: tokenA,
    body: {
      clientMessageId: clientMsgId,
      messageType: 'text',
      body: 'Hello Beta! This is our first CHITHI message.',
    },
  });
  assert(sendMsg.status === 201 && sendMsg.data.body === 'Hello Beta! This is our first CHITHI message.', 'User A sends direct message successfully');
  const messageId = sendMsg.data.id;

  // Retry sending identical message with same clientMessageId -> Idempotency check
  const retryMsg = await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: tokenA,
    body: {
      clientMessageId: clientMsgId,
      messageType: 'text',
      body: 'Hello Beta! This is our first CHITHI message.',
    },
  });
  assert(retryMsg.status === 201 && retryMsg.data.id === messageId, 'Client message retry is idempotent and returns existing message ID without duplicate row');

  // User B reads message history
  const historyB = await request(`/conversations/${conversationId}/messages`, { token: tokenB });
  assert(
    historyB.status === 200 && historyB.data.messages.length === 1 && historyB.data.messages[0].id === messageId,
    'User B retrieves persisted message history with cursor pagination',
  );

  // User B sends read receipt
  const receipt = await request(`/messages/${messageId}/receipt`, {
    method: 'POST',
    token: tokenB,
    body: { status: 'read' },
  });
  assert(receipt.status === 200, 'User B submits read receipt');

  // 6. MOMENTS, FRIENDS-ONLY FEED & PRIVACY
  console.log('\n--- 6. Permanent Moments & Friends-Only Feed ---');
  // User A creates a friends-only Moment
  const createPostA = await request('/posts', {
    method: 'POST',
    token: tokenA,
    body: {
      postType: 'text',
      contentText: 'Enjoying a peaceful evening on CHITHI! #FirstMoment',
    },
  });
  assert(createPostA.status === 201 && createPostA.data.visibility === 'friends_only', 'User A creates a permanent friends-only Moment');
  const postAId = createPostA.data.id;

  // User B (accepted friend) fetches their feed -> MUST contain User A's post
  const feedB = await request('/feed', { token: tokenB });
  assert(
    feedB.status === 200 && feedB.data.posts.some((p: any) => p.id === postAId),
    'User B (accepted friend) sees User As post in chronological feed',
  );

  // User C (Stranger / non-friend) fetches their feed -> MUST NOT contain User A's post
  const feedC = await request('/feed', { token: tokenC });
  assert(
    feedC.status === 200 && !feedC.data.posts.some((p: any) => p.id === postAId),
    'User C (Stranger) feed does NOT contain User As friends-only post',
  );

  // User C tries to fetch User A's post directly by UUID -> MUST BE 403 Forbidden
  const directGetStranger = await request(`/posts/${postAId}`, { token: tokenC });
  assert(
    directGetStranger.status === 403,
    'User C (Stranger) blocked from fetching friends-only post by UUID (403 Forbidden)',
  );

  // User B reacts to User A's post
  const reaction = await request(`/posts/${postAId}/reactions`, {
    method: 'POST',
    token: tokenB,
    body: { reactionType: 'heart' },
  });
  assert(reaction.status === 200 && reaction.data.action === 'added', 'User B reacts with heart to User As post');

  // User B comments on User A's post
  const comment = await request(`/posts/${postAId}/comments`, {
    method: 'POST',
    token: tokenB,
    body: { body: 'Beautiful thought, Alpha!' },
  });
  assert(comment.status === 201 && comment.data.body === 'Beautiful thought, Alpha!', 'User B comments on User As post');

  // 7. NOTIFICATIONS
  console.log('\n--- 7. Notifications ---');
  const notifsA = await request('/notifications', { token: tokenA });
  assert(
    notifsA.status === 200 && notifsA.data.length >= 2,
    'User A received notifications for friend acceptance, reaction, and comment',
  );

  // 8. UNFRIEND & POST-UNFRIEND VISIBILITY
  console.log('\n--- 8. Unfriend & Access Revocation ---');
  const unfriend = await request(`/friends/${userBId}`, {
    method: 'DELETE',
    token: tokenA,
  });
  assert(unfriend.status === 200, 'User A unfriends User B');

  // Verify friendship is gone
  const friendsA_after = await request('/friends', { token: tokenA });
  assert(!friendsA_after.data.some((f: any) => f.friendId === userBId), 'User B is no longer in User As friends list');

  // Post-unfriend: User B can no longer view User A's friends-only post!
  const getPostAfterUnfriend = await request(`/posts/${postAId}`, { token: tokenB });
  assert(
    getPostAfterUnfriend.status === 403,
    'Unfriending immediately revokes access to friends-only post (403 Forbidden)',
  );

  // Post-unfriend: User B can no longer send new direct messages!
  const msgAfterUnfriend = await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: tokenB,
    body: {
      messageType: 'text',
      body: 'Can I still message you?',
    },
  });
  assert(
    msgAfterUnfriend.status === 403,
    'Unfriending disables sending new direct messages between former friends (403 Forbidden)',
  );

  // 9. BLOCK BEHAVIOR
  console.log('\n--- 9. User Blocking ---');
  const block = await request(`/users/${userCId}/block`, {
    method: 'POST',
    token: tokenA,
  });
  assert(block.status === 200, 'User A blocks Stranger User C');

  // User C tries to send friend request to User A after block
  const blockedReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenC,
    body: { receiverId: userAId },
  });
  assert(blockedReq.status === 403, 'Blocked user cannot send friend request (403 Forbidden)');

  // 10. REFRESH TOKEN ROTATION & LOGOUT
  console.log('\n--- 10. Refresh Token Rotation & Session Revocation ---');
  const refreshRes = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: regA.data.refreshToken },
  });
  assert(refreshRes.status === 200 && !!refreshRes.data.accessToken, 'Refresh token rotated successfully to new token pair');
  const rotatedAccessA = refreshRes.data?.accessToken;
  const rotatedRefreshA = refreshRes.data?.refreshToken;

  // Replay attack prevention: Old refresh token must be rejected
  const replayRes = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: regA.data.refreshToken },
  });
  assert(replayRes.status === 401, 'Replay attack prevented: Revoked old refresh token rejected with 401 Unauthorized');

  // Verify rotated access token works
  const meRes = await request('/users/me', { token: rotatedAccessA });
  assert(meRes.status === 200 && meRes.data.username === userA_name, 'Rotated access token authenticated user profile');

  // Logout session revocation
  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    token: rotatedAccessA,
  });
  assert(logoutRes.status === 200, 'User logged out and session revoked');

  // Trying to use rotated refresh token after logout must fail
  const postLogoutRefresh = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: rotatedRefreshA },
  });
  assert(postLogoutRefresh.status === 401, 'Refresh after logout rejected with 401 (session revoked)');

  // 11. MEDIA PIPELINE, MAGIC BYTES & PRIVACY ENFORCEMENT
  console.log('\n--- 11. Media Upload Pipeline & Access Control ---');
  const uploadIntent = await request('/media/upload-intents', {
    method: 'POST',
    token: tokenB,
    body: {
      fileName: 'avatar_photo.jpg',
      fileSize: 128,
      mimeType: 'image/jpeg',
      category: 'avatar',
    },
  });
  assert(uploadIntent.status === 201 && !!uploadIntent.data.mediaAssetId, 'Upload intent created for image/jpeg');
  const mediaAssetId = uploadIntent.data?.mediaAssetId;

  // Upload invalid binary (text pretending to be JPEG) -> Magic bytes rejection
  const invalidBuffer = Buffer.from('FAKE_BINARY_DATA_NOT_JPEG_HEADER');
  const invalidUploadRes = await fetch(`${API_BASE}/media/${mediaAssetId}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: invalidBuffer,
  });
  assert(invalidUploadRes.status === 400, 'Spoofed file rejected: Magic bytes mismatch returns 400 Bad Request');

  // Upload valid JPEG binary (starts with standard JPEG magic bytes: FF D8 FF E0)
  const validJpegBuffer = Buffer.alloc(128);
  validJpegBuffer[0] = 0xff;
  validJpegBuffer[1] = 0xd8;
  validJpegBuffer[2] = 0xff;
  validJpegBuffer[3] = 0xe0;

  const validUploadRes = await fetch(`${API_BASE}/media/${mediaAssetId}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: validJpegBuffer,
  });
  const uploadJson = await validUploadRes.json();
  assert(validUploadRes.status === 200 && uploadJson.success === true, 'Genuine JPEG binary uploaded and stored successfully');

  // Complete upload
  const completeRes = await request(`/media/${mediaAssetId}/complete`, {
    method: 'POST',
    token: tokenB,
  });
  assert(completeRes.status === 200 && completeRes.data.processingStatus === 'ready', 'Upload completed and status marked ready');

  // Owner downloads media stream
  const ownerDownload = await fetch(`${API_BASE}/media/${mediaAssetId}/file`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const downloadedBuffer = Buffer.from(await ownerDownload.arrayBuffer());
  assert(
    ownerDownload.status === 200 && downloadedBuffer.equals(validJpegBuffer),
    'Owner downloaded media stream matching uploaded bytes bit-for-bit',
  );

  // Stranger unauthorized download test on private media
  // First create a non-avatar media intent for user B (e.g. post video or unattached media)
  const privateIntent = await request('/media/upload-intents', {
    method: 'POST',
    token: tokenB,
    body: {
      fileName: 'secret_file.pdf',
      fileSize: 64,
      mimeType: 'application/pdf',
      category: 'post_image',
    },
  });
  const privateMediaId = privateIntent.data?.mediaAssetId;
  const pdfBuffer = Buffer.from('%PDF-1.4\nTest PDF content for CHITHI media testing.\n');
  await fetch(`${API_BASE}/media/${privateMediaId}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: pdfBuffer,
  });

  // Stranger User C attempts to download User B's unshared private PDF
  const strangerDownload = await fetch(`${API_BASE}/media/${privateMediaId}/file`, {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  assert(strangerDownload.status === 403, 'Stranger download of unshared media blocked with 403 Forbidden');

  // 12. SECURITY HEADERS & RATE LIMITING
  console.log('\n--- 12. Security Hardening & Rate Limiting ---');
  const healthCheck = await fetch('http://localhost:4000/health');
  const helmetHeader = healthCheck.headers.get('x-content-type-options');
  const frameHeader = healthCheck.headers.get('x-frame-options');
  assert(helmetHeader === 'nosniff', 'Security header X-Content-Type-Options: nosniff enforced');
  assert(frameHeader === 'SAMEORIGIN', 'Security header X-Frame-Options: SAMEORIGIN enforced');

  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
