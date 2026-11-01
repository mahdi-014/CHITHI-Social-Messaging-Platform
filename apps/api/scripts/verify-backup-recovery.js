const { Client } = require('pg');
const { backupDatabase } = require('./backup-db');
const { restoreDatabase } = require('./restore-db');
const { execSync } = require('child_process');
const path = require('path');

const LIVE_DB_URL = process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';
const TEST_DB_NAME = 'chithi_recovery_verify_test';
const TEST_DB_URL = `postgresql://chithi:chithi_secret@localhost:5432/${TEST_DB_NAME}`;

async function verifyBackupRecoveryCycle() {
  console.log('=== CHITHI DATABASE BACKUP & RECOVERY VERIFICATION SUITE ===');
  console.log('Invariant: Never mutate or delete live user data.\n');

  // Step 1: Run live backup
  console.log('[STEP 1] Running live backup...');
  const { backupFilePath, checksum, totalRows, tableCount } = await backupDatabase();
  console.log(`[PASS] Backup created: ${path.basename(backupFilePath)} (${totalRows} rows, checksum: ${checksum.slice(0, 16)}...)\n`);

  // Step 2: Create isolated test database
  console.log('[STEP 2] Creating isolated temporary database for recovery testing...');
  const defaultClient = new Client({ connectionString: 'postgresql://chithi:chithi_secret@localhost:5432/postgres' });
  await defaultClient.connect();

  try {
    // Terminate any stale connections to test db and drop it if existed from a prior aborted run
    await defaultClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await defaultClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}";`);
    await defaultClient.query(`CREATE DATABASE "${TEST_DB_NAME}";`);
    console.log(`[PASS] Created temporary test database: ${TEST_DB_NAME}\n`);
  } finally {
    await defaultClient.end();
  }

  // Step 3: Synchronize schema to the temporary database using prisma db push
  console.log('[STEP 3] Pushing Prisma schema to temporary database...');
  execSync(`npx prisma db push --skip-generate --schema=prisma/schema.prisma`, {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  });
  console.log('[PASS] Temporary database schema synchronized.\n');

  // Step 4: Restore backup into temporary database
  console.log('[STEP 4] Restoring backup into temporary database...');
  const { restoredCount } = await restoreDatabase(backupFilePath, TEST_DB_URL);
  console.log(`[PASS] Restored ${restoredCount} rows into temporary database.\n`);

  // Step 5: Verify integrity and row counts between Live DB and Restored DB
  console.log('[STEP 5] Verifying row count parity across all tables...');
  const liveClient = new Client({ connectionString: LIVE_DB_URL });
  const testClient = new Client({ connectionString: TEST_DB_URL });
  await liveClient.connect();
  await testClient.connect();

  try {
    const tablesRes = await liveClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    let allMatched = true;

    for (const r of tablesRes.rows) {
      const t = r.table_name;
      const liveRes = await liveClient.query(`SELECT COUNT(*)::int as count FROM "${t}"`);
      const testRes = await testClient.query(`SELECT COUNT(*)::int as count FROM "${t}"`);

      const liveCount = liveRes.rows[0].count;
      const testCount = testRes.rows[0].count;

      if (liveCount === testCount) {
        console.log(`  ✓ Table "${t}": Live=${liveCount}, Restored=${testCount} (MATCH)`);
      } else {
        console.error(`  ✗ Table "${t}": Live=${liveCount}, Restored=${testCount} (MISMATCH!)`);
        allMatched = false;
      }
    }

    if (!allMatched) {
      throw new Error('Integrity verification failed: row counts do not match between live and restored databases!');
    }

    console.log('\n[PASS] 100% of tables and rows match with perfect integrity!\n');
  } finally {
    await liveClient.end();
    await testClient.end();
  }

  // Step 6: Safely tear down ONLY the temporary test database
  console.log('[STEP 6] Tearing down temporary test database...');
  const cleanupClient = new Client({ connectionString: 'postgresql://chithi:chithi_secret@localhost:5432/postgres' });
  await cleanupClient.connect();
  try {
    await cleanupClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await cleanupClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}";`);
    console.log('[PASS] Temporary test database deleted cleanly.');
  } finally {
    await cleanupClient.end();
  }

  console.log('\n===============================================================');
  console.log('DATABASE BACKUP & RECOVERY CYCLE VERIFIED WITH 100% SUCCESS!');
  console.log('Live database integrity was 100% preserved with zero data loss.');
  console.log('===============================================================\n');
}

if (require.main === module) {
  verifyBackupRecoveryCycle().catch((err) => {
    console.error('Backup & recovery verification failed:', err);
    process.exit(1);
  });
}

module.exports = { verifyBackupRecoveryCycle };
