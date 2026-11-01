const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db';
const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

async function backupDatabase(targetDatabaseUrl) {
  const dbUrl = targetDatabaseUrl || DATABASE_URL;
  console.log('=== CHITHI DATABASE BACKUP ===');
  console.log(`Connecting to database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // 1. Fetch all user tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log(`Discovered ${tableNames.length} tables in schema 'public'.\n`);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      database: 'chithi_db',
      version: '1.0.0',
      tables: {},
    };

    let totalRows = 0;

    for (const tableName of tableNames) {
      const rowsRes = await client.query(`SELECT * FROM "${tableName}"`);
      backupPayload.tables[tableName] = {
        count: rowsRes.rows.length,
        rows: rowsRes.rows,
      };
      totalRows += rowsRes.rows.length;
      console.log(`  ✓ Table "${tableName}": ${rowsRes.rows.length} rows backed up`);
    }

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(BACKUP_DIR, `backup-${timestampStr}.json`);
    const checksumFilePath = path.join(BACKUP_DIR, `backup-${timestampStr}.sha256`);

    fs.writeFileSync(backupFilePath, jsonString, 'utf8');
    fs.writeFileSync(checksumFilePath, `${checksum}  ${path.basename(backupFilePath)}\n`, 'utf8');

    console.log('\n=======================================');
    console.log(`Backup completed successfully!`);
    console.log(`Tables backed up: ${tableNames.length}`);
    console.log(`Total rows backed up: ${totalRows}`);
    console.log(`Backup file: ${backupFilePath}`);
    console.log(`SHA-256: ${checksum}`);
    console.log('=======================================\n');

    return { backupFilePath, checksum, totalRows, tableCount: tableNames.length };
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  backupDatabase().catch((err) => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}

module.exports = { backupDatabase };

