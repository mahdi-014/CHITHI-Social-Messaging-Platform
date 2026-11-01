const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function restoreDatabase(backupFilePath, targetDatabaseUrl) {
  const dbUrl = targetDatabaseUrl || process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';
  console.log('=== CHITHI DATABASE RESTORATION ===');
  console.log(`Target database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`Reading backup file: ${backupFilePath}`);

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist: ${backupFilePath}`);
  }

  const rawJson = fs.readFileSync(backupFilePath, 'utf8');

  // Checksum validation
  const checksumFilePath = backupFilePath.replace(/\.json$/, '.sha256');
  if (fs.existsSync(checksumFilePath)) {
    const expectedChecksum = fs.readFileSync(checksumFilePath, 'utf8').trim().split(/\s+/)[0];
    const actualChecksum = crypto.createHash('sha256').update(rawJson).digest('hex');
    if (expectedChecksum !== actualChecksum) {
      throw new Error(`Checksum verification failed! Expected: ${expectedChecksum}, Actual: ${actualChecksum}`);
    }
    console.log(`[PASS] Backup integrity verified via SHA-256: ${actualChecksum}`);
  }

  const backupData = JSON.parse(rawJson);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    // Disable FK trigger checks during bulk restore to handle circular references (e.g. conversation <-> message)
    await client.query("SET session_replication_role = 'replica';");

    // Ordered list of tables to insert respecting foreign key dependency tree
    const insertionOrder = [
      'users',
      'user_profiles',
      'user_settings',
      'devices',
      'user_sessions',
      'friendships',
      'friend_requests',
      'blocks',
      'conversations',
      'direct_conversation_pairs',
      'conversation_members',
      'media_assets',
      'messages',
      'message_attachments',
      'message_receipts',
      'message_reactions',
      'posts',
      'post_media',
      'post_reactions',
      'post_comments',
      'notifications',
      'call_sessions',
      'reports',
      'outbox_events',
    ];

    let restoredCount = 0;

    for (const tableName of insertionOrder) {
      const tableData = backupData.tables[tableName];
      if (!tableData || !tableData.rows || tableData.rows.length === 0) {
        continue;
      }

      console.log(`  Restoring "${tableName}" (${tableData.rows.length} rows)...`);

      for (const row of tableData.rows) {
        const columns = Object.keys(row).map((k) => `"${k}"`).join(', ');
        const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(row);

        const sql = `
          INSERT INTO "${tableName}" (${columns})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING;
        `;

        await client.query(sql, values);
        restoredCount++;
      }
    }

    await client.query("SET session_replication_role = 'origin';");
    await client.query('COMMIT');

    console.log('\n=======================================');
    console.log('Restoration completed successfully!');
    console.log(`Total rows processed: ${restoredCount}`);
    console.log('=======================================\n');

    return { success: true, restoredCount };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Restoration transaction failed, rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0];
  const url = args[1];

  if (!file) {
    console.error('Usage: node restore-db.js <path-to-backup.json> [database-url]');
    process.exit(1);
  }

  restoreDatabase(file, url).catch((err) => {
    console.error('Restore failed:', err);
    process.exit(1);
  });
}

module.exports = { restoreDatabase };
