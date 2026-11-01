import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

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

async function runCallingTests() {
  console.log('====================================================');
  console.log('🧪 CHITHI PHASE 3.5: AUDIO & VIDEO CALLING TEST SUITE');
  console.log('====================================================\n');

  const ts = Date.now();
  const userA_name = `call_a_${ts}`;
  const userB_name = `call_b_${ts}`;
  const userC_name = `call_c_${ts}`;
  const password = 'Password123!';

  console.log('1. Registering test users for calling suite...');
  const resA = await request('/auth/register', {
    method: 'POST',
    body: { username: userA_name, password, displayName: 'Caller Alice' },
  });
  assert(resA.status === 201, 'Registered Caller Alice');
  const tokenA = resA.data.accessToken;
  const userA = resA.data.user;

  const resB = await request('/auth/register', {
    method: 'POST',
    body: { username: userB_name, password, displayName: 'Callee Bob' },
  });
  assert(resB.status === 201, 'Registered Callee Bob');
  const tokenB = resB.data.accessToken;
  const userB = resB.data.user;

  const resC = await request('/auth/register', {
    method: 'POST',
    body: { username: userC_name, password, displayName: 'Stranger Charlie' },
  });
  assert(resC.status === 201, 'Registered Stranger Charlie');
  const tokenC = resC.data.accessToken;
  const userC = resC.data.user;

  assert(!!userA.id && !!userB.id && !!userC.id, 'Created 3 isolated test accounts');

  console.log('\n2. Testing Short-Lived Coturn / TURN Credentials RFC 5766...');
  const turnResA = await request('/calls/turn-credentials', { token: tokenA });
  assert(turnResA.status === 200, 'TURN credentials endpoint responded HTTP 200');
  assert(Array.isArray(turnResA.data.iceServers), 'iceServers array returned');
  assert(turnResA.data.iceServers.length >= 2, 'STUN and TURN servers configured');

  const turnServer = turnResA.data.iceServers.find((s: any) => s.username);
  assert(!!turnServer, 'TURN server entry with credentials found');
  assert(turnServer.username.includes(userA.id), 'RFC 5766 username contains user UUID');
  assert(typeof turnServer.credential === 'string' && turnServer.credential.length > 10, 'HMAC-SHA1 credential generated');

  console.log('\n3. Establishing Mutual Friendship & Direct Conversation...');
  const fReq = await request('/friend-requests', {
    method: 'POST',
    token: tokenA,
    body: { receiverId: userB.id },
  });
  assert(fReq.status === 201, 'Alice sent friend request to Bob');

  const fAccept = await request(`/friend-requests/${fReq.data.id}/accept`, {
    method: 'POST',
    token: tokenB,
  });
  assert(fAccept.status === 201 || fAccept.status === 200, 'Bob accepted Alice friend request');

  const convRes = await request('/conversations/direct', {
    method: 'POST',
    token: tokenA,
    body: { friendId: userB.id },
  });
  assert(convRes.status === 200 || convRes.status === 201, 'Direct conversation established');
  const conversationId = convRes.data.id;
  assert(!!conversationId, 'Valid conversation ID returned');

  console.log('\n4. Testing Audio Call Initiation, Acceptance, and Termination...');
  const inviteRes = await request('/calls/invite', {
    method: 'POST',
    token: tokenA,
    body: {
      conversationId,
      callType: 'audio',
    },
  });
  assert(inviteRes.status === 201, 'Audio call invite created (HTTP 201)');
  const callId = inviteRes.data.call.id;
  assert(inviteRes.data.call.status === 'initiating', 'Call status is initiating');
  assert(inviteRes.data.call.callType === 'audio', 'Call type is audio');
  assert(inviteRes.data.callerIceServers.length >= 2, 'Caller received ICE servers');

  // Callee B accepts
  const acceptRes = await request(`/calls/${callId}/accept`, {
    method: 'POST',
    token: tokenB,
  });
  assert(acceptRes.status === 201 || acceptRes.status === 200, 'Callee Bob accepted call');
  assert(acceptRes.data.status === 'accepted', 'Call status updated to accepted');
  assert(!!acceptRes.data.acceptedAt, 'acceptedAt timestamp recorded');

  // Wait 1.1s to test duration computation
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // Caller A ends call
  const endRes = await request(`/calls/${callId}/end`, {
    method: 'POST',
    token: tokenA,
    body: { reason: 'caller_hung_up' },
  });
  assert(endRes.status === 201 || endRes.status === 200, 'Caller Alice ended call');
  assert(endRes.data.status === 'ended', 'Call status updated to ended');
  assert(endRes.data.durationSeconds >= 1, `Call duration computed accurately (${endRes.data.durationSeconds}s)`);
  assert(endRes.data.endReason === 'caller_hung_up', 'End reason recorded as caller_hung_up');

  console.log('\n5. Testing Video Call Rejection Flow...');
  const videoInvite = await request('/calls/invite', {
    method: 'POST',
    token: tokenA,
    body: {
      conversationId,
      callType: 'video',
    },
  });
  const videoCallId = videoInvite.data.call.id;
  assert(videoInvite.data.call.callType === 'video', 'Video call invitation created');

  const rejectRes = await request(`/calls/${videoCallId}/reject`, {
    method: 'POST',
    token: tokenB,
    body: { reason: 'busy' },
  });
  assert(rejectRes.data.status === 'rejected', 'Call rejected by callee');
  assert(rejectRes.data.endReason === 'busy', 'Call endReason recorded as busy');

  console.log('\n6. Testing Call Cancellation by Caller...');
  const cancelInvite = await request('/calls/invite', {
    method: 'POST',
    token: tokenA,
    body: {
      conversationId,
      callType: 'audio',
    },
  });
  const cancelCallId = cancelInvite.data.call.id;
  const cancelRes = await request(`/calls/${cancelCallId}/cancel`, {
    method: 'POST',
    token: tokenA,
  });
  assert(cancelRes.data.status === 'cancelled', 'Call cancelled by caller');
  assert(cancelRes.data.endReason === 'cancelled', 'End reason recorded as cancelled');

  console.log('\n7. Testing Real-time WebRTC Signaling over Socket.IO...');
  const socketA: Socket = io(SOCKET_URL, {
    auth: { token: tokenA },
    transports: ['websocket'],
  });
  const socketB: Socket = io(SOCKET_URL, {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
    new Promise<void>((resolve) => socketB.on('connect', () => resolve())),
  ]);
  assert(socketA.connected && socketB.connected, 'Both users connected to Socket.IO signaling server');

  // Setup listener promises
  const incomingPromise = new Promise<any>((resolve) => {
    socketB.once('call:incoming', (data) => resolve(data));
  });
  const ringingPromise = new Promise<any>((resolve) => {
    socketA.once('call:ringing', (data) => resolve(data));
  });
  const acceptedPromise = new Promise<any>((resolve) => {
    socketA.once('call:accepted', (data) => resolve(data));
  });
  const offerPromise = new Promise<any>((resolve) => {
    socketB.once('call:offer', (data) => resolve(data));
  });
  const answerPromise = new Promise<any>((resolve) => {
    socketA.once('call:answer', (data) => resolve(data));
  });
  const iceCandidatePromise = new Promise<any>((resolve) => {
    socketB.once('call:ice-candidate', (data) => resolve(data));
  });
  const endedPromise = new Promise<any>((resolve) => {
    socketB.once('call:ended', (data) => resolve(data));
  });

  // User A initiates call via Socket.IO
  const socketInviteRes = await new Promise<any>((resolve) => {
    socketA.emit(
      'call:invite',
      { conversationId, callType: 'video' },
      (ack: any) => resolve(ack),
    );
  });
  assert(socketInviteRes.success === true, 'Socket call:invite succeeded');
  const signalingCallId = socketInviteRes.call.id;

  // Callee B receives call:incoming
  const incomingData = await incomingPromise;
  assert(incomingData.callId === signalingCallId, 'Callee received call:incoming with correct callId');
  assert(incomingData.caller.id === userA.id, 'Callee verified caller identity');

  // Callee B sends call:ringing
  socketB.emit('call:ringing', { callId: signalingCallId });
  const ringingData = await ringingPromise;
  assert(ringingData.callId === signalingCallId, 'Caller received call:ringing notification');

  // Callee B accepts call
  socketB.emit('call:accept', { callId: signalingCallId });
  const acceptedData = await acceptedPromise;
  assert(acceptedData.callId === signalingCallId, 'Caller received call:accepted notification');

  // WebRTC SDP Offer / Answer Exchange
  const mockSdpOffer = { type: 'offer', sdp: 'v=0\r\no=alice 12345 1 IN IP4 127.0.0.1\r\ns=CHITHI-WebRTC\r\n' };
  socketA.emit('call:offer', {
    callId: signalingCallId,
    receiverId: userB.id,
    sdp: mockSdpOffer,
  });
  const offerData = await offerPromise;
  assert(offerData.sdp.sdp === mockSdpOffer.sdp, 'Callee received relayed SDP Offer over Socket.IO');

  const mockSdpAnswer = { type: 'answer', sdp: 'v=0\r\no=bob 67890 1 IN IP4 127.0.0.1\r\ns=CHITHI-WebRTC-Answer\r\n' };
  socketB.emit('call:answer', {
    callId: signalingCallId,
    callerId: userA.id,
    sdp: mockSdpAnswer,
  });
  const answerData = await answerPromise;
  assert(answerData.sdp.sdp === mockSdpAnswer.sdp, 'Caller received relayed SDP Answer over Socket.IO');

  // Trickle ICE Candidate Exchange
  const mockCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
  socketA.emit('call:ice-candidate', {
    callId: signalingCallId,
    targetUserId: userB.id,
    candidate: mockCandidate,
  });
  const candidateData = await iceCandidatePromise;
  assert(candidateData.candidate.candidate === mockCandidate.candidate, 'Relayed ICE candidate between peers');

  // Caller A ends call
  socketA.emit('call:end', { callId: signalingCallId, reason: 'normal_clearing' });
  const endedData = await endedPromise;
  assert(endedData.callId === signalingCallId, 'Peer received call:ended event with termination payload');

  socketA.disconnect();
  socketB.disconnect();

  console.log('\n8. Testing Call History Endpoint...');
  const historyRes = await request('/calls/history?limit=10', { token: tokenA });
  assert(historyRes.status === 200, 'Call history endpoint responded HTTP 200');
  assert(Array.isArray(historyRes.data.calls), 'History contains calls list');
  assert(historyRes.data.calls.length >= 4, `Call history returned ${historyRes.data.calls.length} logged sessions`);

  const mostRecent = historyRes.data.calls[0];
  assert(!!mostRecent.caller && !!mostRecent.receiver, 'History includes peer user profile details');

  console.log('\n9. Testing Security Constraints: Non-friend & Blocked Calls...');
  // Non-member / non-friend call
  const unauthCall = await request('/calls/invite', {
    method: 'POST',
    token: tokenC,
    body: { conversationId, callType: 'audio' },
  });
  assert(unauthCall.status === 403 || unauthCall.status === 404, 'Unauthorized non-member call rejected with 403/404');

  // Block User B
  const blockRes = await request(`/users/${userB.id}/block`, {
    method: 'POST',
    token: tokenA,
  });
  assert(blockRes.status === 200 || blockRes.status === 201, 'Alice blocked Bob');

  // Call to blocked user
  const blockedCall = await request('/calls/invite', {
    method: 'POST',
    token: tokenA,
    body: { conversationId, callType: 'audio' },
  });
  assert(blockedCall.status === 403, 'Call to blocked user rejected with 403 Forbidden');
  assert(blockedCall.data?.code === 'BLOCKED', 'Error code returned BLOCKED');

  console.log('\n====================================================');
  console.log(`✅ CALLING SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');
}

runCallingTests().catch((err) => {
  console.error('\n❌ Calling test failed:', err);
  process.exit(1);
});
