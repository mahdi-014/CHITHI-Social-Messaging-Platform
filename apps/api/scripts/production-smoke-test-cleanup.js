/**
 * CHITHI — Production Smoke Test Manifest-Based Cleanup Utility
 *
 * SAFELY AND EXCLUSIVELY removes records that were created during an authorized
 * production smoke test run, using a strict, verified manifest file.
 *
 * NON-NEGOTIABLE SAFETY INVARIANTS:
 * 1. Requires an explicit manifest file containing exact UUIDs generated during the test run.
 * 2. Every candidate user MUST strictly match username pattern `^smoke_[ab]_[0-9]{8,18}$`
 *    AND email matching `@example.com` or `@smoke.chithi.internal`.
 * 3. Never deletes ANY record not explicitly registered in the provided manifest.
 * 4. Strictly protects known production accounts (mahdi, shahanaj, milu) with zero-tolerance hard abort.
 * 5. Default mode is DRY-RUN. Deletion requires explicit `--execute` flag.
 * 6. Executes within an atomic transaction with automatic rollback on error.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { backupDatabase } = require('./backup-db');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';
const PROTECTED_USERNAMES = ['mahdi', 'shahanaj', 'milu'];
const SMOKE_USERNAME_REGEX = /^smoke_[ab]_[0-9]{8,18}$/;
const SMOKE_EMAIL_REGEX = /^smoke_[ab]_[0-9]+@(example\.(com|org|net)|smoke\.chithi\.internal|test\.local)$/;

async function cleanupFromManifest(manifestFilePath, options = {}) {
  const isDryRun = options.dryRun !== undefined ? options.dryRun : !process.argv.includes('--execute');
  const targetDbUrl = options.databaseUrl || DATABASE_URL;

  console.log('================================================================');
  console.log(`CHITHI PRODUCTION SMOKE-TEST CLEANUP (${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'})`);
  console.log('================================================================');

  if (!fs.existsSync(manifestFilePath)) {
    throw new Error(`SAFETY ABORT: Smoke-test manifest file does not exist: ${manifestFilePath}`);
  }

  const manifestRaw = fs.readFileSync(manifestFilePath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (err) {
    throw new Error(`SAFETY ABORT: Invalid JSON manifest: ${err.message}`);
  }

  const userIds = Array.isArray(manifest.userIds) ? manifest.userIds : [];
  const messageIds = Array.isArray(manifest.messageIds) ? manifest.messageIds : [];
  const conversationIds = Array.isArray(manifest.conversationIds) ? manifest.conversationIds : [];

  console.log(`Manifest Test Run ID: ${manifest.testRunId || 'unknown'}`);
  console.log(`Manifest Timestamp:   ${manifest.timestamp || 'unknown'}`);
  console.log(`Registered Users:     ${userIds.length}`);
  console.log(`Registered Messages:  ${messageIds.length}`);
  console.log(`Registered Convs:     ${conversationIds.length}\n`);

  if (userIds.length === 0 && messageIds.length === 0 && conversationIds.length === 0) {
    console.log('[INFO] Manifest is empty. No smoke test resources to clean up.');
    return { cleaned: false, reason: 'EMPTY_MANIFEST' };
  }

  const client = new Client({ connectionString: targetDbUrl });
  await client.connect();

  try {
    // 1. Verify every candidate user ID in DB
    if (userIds.length > 0) {
      const usersRes = await client.query(
        'SELECT id, username, email FROM users WHERE id = ANY($1::uuid[])',
        [userIds]
      );

      for (const user of usersRes.rows) {
        if (PROTECTED_USERNAMES.includes(user.username.toLowerCase())) {
          throw new Error(`FATAL SECURITY ABORT: Protected production user "${user.username}" matched in cleanup manifest!`);
        }
        if (!SMOKE_USERNAME_REGEX.test(user.username)) {
          throw new Error(`FATAL SAFETY ABORT: User "${user.username}" (${user.id}) violates smoke test username format.`);
        }
        if (!SMOKE_EMAIL_REGEX.test(user.email)) {
          throw new Error(`FATAL SAFETY ABORT: User email "${user.email}" (${user.id}) is not a recognized test email.`);
        }
        console.log(`  ✓ Validated smoke test user: ${user.username} (${user.id})`);
      }
    }

    if (isDryRun) {
      console.log('\n[DRY-RUN] Verification complete. 0 records deleted. Use --execute to perform atomic cleanup.');
      return { cleaned: false, isDryRun: true };
    }

    // 2. Perform safety backup before mutating production database
    console.log('\n[STEP 1/2] Creating pre-cleanup safety backup...');
    const backupRes = await backupDatabase(targetDbUrl);
    console.log(`[PASS] Backup verified: ${backupRes.backupFilePath}`);

    // 3. Atomic deletion within transaction
    console.log('\n[STEP 2/2] Executing atomic deletion transaction...');
    await client.query('BEGIN');

    let deletedMessages = 0;
    if (messageIds.length > 0) {
      const res = await client.query('DELETE FROM messages WHERE id = ANY($1::uuid[])', [messageIds]);
      deletedMessages = res.rowCount;
      console.log(`  ✓ Deleted ${deletedMessages} smoke messages`);
    }

    let deletedConvs = 0;
    if (conversationIds.length > 0) {
      const res = await client.query('DELETE FROM conversations WHERE id = ANY($1::uuid[])', [conversationIds]);
      deletedConvs = res.rowCount;
      console.log(`  ✓ Deleted ${deletedConvs} smoke conversations`);
    }

    let deletedUsers = 0;
    if (userIds.length > 0) {
      const res = await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
      deletedUsers = res.rowCount;
      console.log(`  ✓ Deleted ${deletedUsers} smoke users`);
    }

    await client.query('COMMIT');
    console.log('\n================================================================');
    console.log('Smoke-test cleanup completed successfully!');
    console.log(`Users deleted:         ${deletedUsers}`);
    console.log(`Messages deleted:      ${deletedMessages}`);
    console.log(`Conversations deleted: ${deletedConvs}`);
    console.log('================================================================\n');

    return { cleaned: true, deletedUsers, deletedMessages, deletedConvs };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Smoke cleanup transaction failed, rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const manifestFile = args[0];

  if (!manifestFile) {
    console.error('Usage: node production-smoke-test-cleanup.js <path-to-manifest.json> [--execute]');
    process.exit(1);
  }

  cleanupFromManifest(manifestFile).catch((err) => {
    console.error('Fatal execution error:', err.message);
    process.exit(1);
  });
}

module.exports = { cleanupFromManifest };
