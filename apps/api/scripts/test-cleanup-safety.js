const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
const assert = require('assert');
const { cleanupSyntheticTestData, validateTargetEnvironment } = require('./cleanup-synthetic-test-data');

const TEST_DB_NAME = 'chithi_cleanup_safety_test';
const TEST_DB_URL = `postgresql://chithi:chithi_secret@localhost:5432/${TEST_DB_NAME}`;

async function runCleanupSafetySuite() {
  console.log('================================================================');
  console.log('CHITHI DATABASE CLEANUP SAFETY & ISOLATION TEST SUITE');
  console.log('================================================================\n');

  // Test 1: Production Environment Protection
  console.log('[TEST 1] Testing production environment rejection...');
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.throws(
      () => validateTargetEnvironment(TEST_DB_URL),
      /NODE_ENV=production/,
      'Must reject when NODE_ENV=production'
    );
    console.log('  ✓ [PASS] NODE_ENV=production safely blocked execution.');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // Test 2: External / Cloud Host Protection
  console.log('[TEST 2] Testing external cloud endpoint rejection...');
  assert.throws(
    () => validateTargetEnvironment('postgresql://user:pass@chithi-prod-db.us-east-1.rds.amazonaws.com:5432/chithi_db'),
    /not a recognized local or test database endpoint/,
    'Must reject external production host'
  );
  console.log('  ✓ [PASS] External cloud database host safely rejected.');

  // Test 3: Production Database Name Protection
  console.log('[TEST 3] Testing dangerous database name rejection...');
  assert.throws(
    () => validateTargetEnvironment('postgresql://chithi:pass@localhost:5432/chithi_production'),
    /matches protected production naming patterns/,
    'Must reject database name with "production"'
  );
  console.log('  ✓ [PASS] Production database name safely rejected.\n');

  // Test 4: Isolated Temporary Database Setup
  console.log('[TEST 4] Creating temporary isolated test database...');
  const defaultClient = new Client({ connectionString: 'postgresql://chithi:chithi_secret@localhost:5432/postgres' });
  await defaultClient.connect();

  try {
    await defaultClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await defaultClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}";`);
    await defaultClient.query(`CREATE DATABASE "${TEST_DB_NAME}";`);
    console.log(`  ✓ [PASS] Created isolated database: ${TEST_DB_NAME}`);
  } finally {
    await defaultClient.end();
  }

  console.log('  Pushing Prisma schema to isolated test database...');
  execSync(`npx prisma db push --skip-generate --schema=prisma/schema.prisma`, {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
  console.log('  ✓ [PASS] Schema synchronized.\n');

  // Test 5: Seed test database with real and synthetic test users
  console.log('[TEST 5] Seeding test database with legitimate and synthetic accounts...');
  const testClient = new Client({ connectionString: TEST_DB_URL });
  await testClient.connect();

  try {
    // Insert 2 legitimate real accounts
    await testClient.query(`
      INSERT INTO users (id, username, email, password_hash, account_status) VALUES
      ('11111111-1111-1111-1111-111111111111', 'dr_smith', 'dr.smith@medicalhospital.org', 'hash1', 'active'),
      ('22222222-2222-2222-2222-222222222222', 'jane_engineer', 'jane@innovatetech.io', 'hash2', 'active');
    `);

    // Insert 3 synthetic accounts matching test generator patterns
    await testClient.query(`
      INSERT INTO users (id, username, email, password_hash, account_status) VALUES
      ('33333333-3333-3333-3333-333333333333', 'alice_1793554438363', 'alice_1793554438363@example.com', 'hash3', 'active'),
      ('44444444-4444-4444-4444-444444444444', 'bob_1793554438363', 'bob_1793554438363@example.com', 'hash4', 'active'),
      ('55555555-5555-5555-5555-555555555555', 'covfix_1793554438363', 'covfix_1793554438363@example.com', 'hash5', 'active');
    `);

    // Insert user_profiles for all 5
    await testClient.query(`
      INSERT INTO user_profiles (user_id, display_name) VALUES
      ('11111111-1111-1111-1111-111111111111', 'Dr. Smith'),
      ('22222222-2222-2222-2222-222222222222', 'Jane Engineer'),
      ('33333333-3333-3333-3333-333333333333', 'Synthetic Alice'),
      ('44444444-4444-4444-4444-444444444444', 'Synthetic Bob'),
      ('55555555-5555-5555-5555-555555555555', 'Synthetic Cover Fix');
    `);

    // Real friendship between Dr. Smith and Jane
    await testClient.query(`
      INSERT INTO friendships (user_low_id, user_high_id) VALUES
      ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
    `);

    // Synthetic friendship between Alice and Bob
    await testClient.query(`
      INSERT INTO friendships (user_low_id, user_high_id) VALUES
      ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
    `);

    console.log('  ✓ [PASS] Database seeded with 2 real users + 3 synthetic test users.\n');
  } finally {
    await testClient.end();
  }

  // Test 6: Verify Dry-Run Mode
  console.log('[TEST 6] Testing Dry-Run Mode...');
  const dryRunResult = await cleanupSyntheticTestData({
    databaseUrl: TEST_DB_URL,
    dryRun: true,
  });

  assert.strictEqual(dryRunResult.dryRun, true, 'Result must be dryRun: true');
  assert.strictEqual(dryRunResult.syntheticCount, 3, 'Must identify exactly 3 synthetic accounts');

  // Verify that NO users were deleted
  const checkClient1 = new Client({ connectionString: TEST_DB_URL });
  await checkClient1.connect();
  const usersAfterDryRun = await checkClient1.query('SELECT count(*)::int as count FROM users;');
  assert.strictEqual(usersAfterDryRun.rows[0].count, 5, 'All 5 users must remain after dry run');
  await checkClient1.end();
  console.log('  ✓ [PASS] Dry-run executed safely. 0 records deleted.\n');

  // Test 7: Verify Execution Mode
  console.log('[TEST 7] Testing Execution Mode on Isolated Database...');
  const execResult = await cleanupSyntheticTestData({
    databaseUrl: TEST_DB_URL,
    dryRun: false,
    skipBackup: true,
  });

  assert.strictEqual(execResult.dryRun, false, 'Result must be dryRun: false');
  assert.strictEqual(execResult.deletedUsers, 3, 'Must delete exactly 3 synthetic accounts');
  assert.strictEqual(execResult.remainingUsers, 2, 'Exactly 2 real users must remain');
  assert.strictEqual(execResult.orphanCount, 0, 'Must have zero orphan records');

  // Verify the exact remaining users
  const checkClient2 = new Client({ connectionString: TEST_DB_URL });
  await checkClient2.connect();
  const remainingRows = await checkClient2.query('SELECT username, email FROM users ORDER BY username;');
  assert.strictEqual(remainingRows.rows.length, 2);
  assert.strictEqual(remainingRows.rows[0].username, 'dr_smith');
  assert.strictEqual(remainingRows.rows[1].username, 'jane_engineer');

  // Verify real friendship remains intact
  const realFriendship = await checkClient2.query('SELECT count(*)::int as count FROM friendships;');
  assert.strictEqual(realFriendship.rows[0].count, 1, 'Legitimate friendship must be preserved');
  await checkClient2.end();

  console.log('  ✓ [PASS] Execution completed successfully!');
  console.log('  ✓ [PASS] Real users dr_smith and jane_engineer are 100% PRESERVED.');
  console.log('  ✓ [PASS] Synthetic accounts alice_*, bob_*, covfix_* removed cleanly.');
  console.log('  ✓ [PASS] 0 orphan records confirmed.\n');

  // Test 8: Clean Tear-down
  console.log('[TEST 8] Tearing down temporary test database...');
  const tearDownClient = new Client({ connectionString: 'postgresql://chithi:chithi_secret@localhost:5432/postgres' });
  await tearDownClient.connect();
  try {
    await tearDownClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await tearDownClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}";`);
    console.log(`  ✓ [PASS] Cleaned up temporary test database: ${TEST_DB_NAME}\n`);
  } finally {
    await tearDownClient.end();
  }

  console.log('================================================================');
  console.log('🎉 ALL DATABASE CLEANUP SAFETY TESTS PASSED (8/8)');
  console.log('================================================================\n');
}

if (require.main === module) {
  runCleanupSafetySuite().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
  });
}

module.exports = { runCleanupSafetySuite };
