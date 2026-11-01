const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { cleanupFromManifest } = require('./production-smoke-test-cleanup');

async function testSafetyGuards() {
  console.log('=== TESTING PRODUCTION SMOKE TEST CLEANUP SAFETY GUARDS ===\n');

  const tmpDir = path.resolve(__dirname, '..', '..', '..', 'C:/Users/TheFool/.gemini/antigravity/brain/21886a08-753d-4fe9-8837-579b8edd8ffe/scratch');

  // Test 1: Non-existent manifest
  try {
    await cleanupFromManifest('/tmp/does-not-exist.json');
    assert.fail('Should have failed for non-existent manifest');
  } catch (err) {
    assert(err.message.includes('manifest file does not exist'));
    console.log('✓ PASS: Non-existent manifest rejected.');
  }

  // Test 2: Manifest with malformed UUID
  const malformedManifest = path.join(tmpDir, 'test-manifest-malformed.json');
  fs.writeFileSync(malformedManifest, JSON.stringify({
    testRunId: 'test-malformed',
    userIds: ['not-a-valid-uuid'],
  }));
  try {
    await cleanupFromManifest(malformedManifest);
    assert.fail('Should have failed for malformed UUID');
  } catch (err) {
    assert(err.message.includes('Malformed UUID detected'));
    console.log('✓ PASS: Malformed UUID safely rejected.');
  }

  // Test 3: Manifest with duplicate IDs
  const duplicateManifest = path.join(tmpDir, 'test-manifest-duplicate.json');
  fs.writeFileSync(duplicateManifest, JSON.stringify({
    testRunId: 'test-dup',
    userIds: [
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001',
    ],
  }));
  try {
    await cleanupFromManifest(duplicateManifest);
    assert.fail('Should have failed for duplicate user IDs');
  } catch (err) {
    assert(err.message.includes('Duplicate user IDs detected'));
    console.log('✓ PASS: Duplicate user IDs safely rejected.');
  }

  console.log('✓ PASS: Safety architecture validated.\n');
  console.log('All safety guard tests passed successfully!');
}

testSafetyGuards().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
