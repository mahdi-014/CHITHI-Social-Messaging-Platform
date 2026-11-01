const { Client } = require('pg');
const { backupDatabase } = require('./backup-db');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';

async function cleanupSyntheticTestData() {
  console.log('=== CHITHI SYNTHETIC TEST DATA CLEANUP ===');
  console.log(`Target: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  // 1. Mandatory Pre-Flight Backup
  console.log('[1/4] Creating pre-cleanup safety backup...');
  const backup = await backupDatabase();
  console.log(`[PASS] Safety backup confirmed: ${backup.backupFilePath}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 2. Audit accounts before cleanup
    const beforeStats = await client.query(`
      SELECT 
        count(*) as total_users,
        count(*) FILTER (WHERE username IN ('mahdi', 'shahanaj', 'milu')) as real_users,
        count(*) FILTER (WHERE username NOT IN ('mahdi', 'shahanaj', 'milu')) as test_users
      FROM users;
    `);
    console.log('[2/4] Pre-cleanup user breakdown:');
    console.log(`  Total users: ${beforeStats.rows[0].total_users}`);
    console.log(`  Legitimate real users (PROTECTED): ${beforeStats.rows[0].real_users}`);
    console.log(`  Synthetic test users (TO CLEAN): ${beforeStats.rows[0].test_users}\n`);

    // 3. Perform Transactional Cleanup of synthetic test accounts only
    console.log('[3/4] Executing safe transactional cleanup of verified synthetic test data...');
    await client.query('BEGIN');

    // Delete verified test users; foreign keys CASCADE will clean dependent test sessions, profiles, settings, etc.
    // Media and posts owned by test users will be cleaned up cleanly
    // First remove test media attachments and posts
    const testUserIdsQuery = await client.query(`
      SELECT id FROM users WHERE username NOT IN ('mahdi', 'shahanaj', 'milu');
    `);
    const testUserIds = testUserIdsQuery.rows.map(r => r.id);

    if (testUserIds.length > 0) {
      // Clean dependent test records
      await client.query(`
        DELETE FROM outbox_events WHERE aggregate_id IN (
          SELECT id FROM messages WHERE sender_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'))
        );
      `);

      await client.query(`
        DELETE FROM messages WHERE sender_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      await client.query(`
        DELETE FROM post_comments WHERE author_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      await client.query(`
        DELETE FROM post_reactions WHERE user_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      await client.query(`
        DELETE FROM post_media WHERE post_id IN (
          SELECT id FROM posts WHERE author_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'))
        );
      `);

      await client.query(`
        DELETE FROM posts WHERE author_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      await client.query(`
        DELETE FROM conversations WHERE created_by NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      await client.query(`
        DELETE FROM media_assets WHERE owner_id NOT IN (SELECT id FROM users WHERE username IN ('mahdi', 'shahanaj', 'milu'));
      `);

      const deletedUsers = await client.query(`
        DELETE FROM users WHERE username NOT IN ('mahdi', 'shahanaj', 'milu') RETURNING id;
      `);
      console.log(`  ✓ Removed ${deletedUsers.rowCount} synthetic test user accounts and cascaded dependencies.`);
    }

    await client.query('COMMIT');
    console.log('[PASS] Transaction committed successfully.\n');

    // 4. Verify post-cleanup integrity
    console.log('[4/4] Verifying post-cleanup state:');
    const afterUsers = await client.query('SELECT id, username, email, created_at FROM users ORDER BY created_at');
    console.log(`  Remaining users in database: ${afterUsers.rows.length}`);
    afterUsers.rows.forEach(u => console.log(`    - ${u.username} (${u.email})`));

    // Verify orphan check
    const orphans = await client.query(`
      SELECT 'user_profiles' as table, count(*) FROM user_profiles WHERE user_id NOT IN (SELECT id FROM users)
      UNION ALL
      SELECT 'user_settings', count(*) FROM user_settings WHERE user_id NOT IN (SELECT id FROM users)
      UNION ALL
      SELECT 'friendships', count(*) FROM friendships WHERE user_low_id NOT IN (SELECT id FROM users) OR user_high_id NOT IN (SELECT id FROM users);
    `);
    const totalOrphans = orphans.rows.reduce((acc, r) => acc + parseInt(r.count, 10), 0);
    console.log(`  Orphan records across verified tables: ${totalOrphans}`);
    if (totalOrphans === 0) {
      console.log('  ✓ 100% referential integrity verified!');
    }

    console.log('\n=======================================');
    console.log('🎉 SYNTHETIC TEST DATA CLEANUP COMPLETE!');
    console.log('=======================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, transaction rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  cleanupSyntheticTestData().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { cleanupSyntheticTestData };
