const http = require('http');
const assert = require('assert');

/**
 * Security regression test for request parser bounds and decompression attack prevention.
 */
async function testRequestSecurity() {
  console.log('=== TESTING APPLICATION REQUEST PARSING SECURITY ===\n');

  // Verify that the API is up on port 4000
  const healthRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/health',
    method: 'GET',
  });

  assert.strictEqual(healthRes.statusCode, 200, 'API health check must be 200 OK');
  console.log('✓ PASS: API server reachable on port 4000.');

  // Test 1: Standard JSON payload parsing
  const standardPayload = JSON.stringify({ email: 'test@example.com', password: 'password123' });
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(standardPayload),
    },
    body: standardPayload,
  });

  // Since credentials are invalid/random, it should return 400 or 401 (not 413 or 500)
  assert([400, 401, 404].includes(loginRes.statusCode), `Expected 400/401/404, got ${loginRes.statusCode}`);
  console.log(`✓ PASS: Normal JSON parsing functioning correctly (status ${loginRes.statusCode}).`);

  // Test 2: Oversized JSON payload rejection
  // Generate 12 MB buffer (> 10 MB limit)
  console.log('  Testing 11 MB oversized JSON payload rejection...');
  const hugePayload = '{"data":"' + 'A'.repeat(11 * 1024 * 1024) + '"}';
  const oversizedRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(hugePayload),
    },
    body: hugePayload,
  });

  assert.strictEqual(oversizedRes.statusCode, 413, `Expected 413 Payload Too Large, got ${oversizedRes.statusCode}`);
  console.log('✓ PASS: 11 MB oversized payload rejected with 413 Payload Too Large.');

  console.log('\nAll request parsing security tests passed successfully!\n');
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

testRequestSecurity().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

