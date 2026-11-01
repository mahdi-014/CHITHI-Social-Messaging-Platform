const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { Client } = require('pg');
const { restoreDatabase } = require('./restore-db');

const pgDataDir = path.resolve(__dirname, '../.pgdata');

async function main() {
  const pg = new EmbeddedPostgres({
    port: 5432,
    databaseDir: pgDataDir,
    user: 'chithi',
    password: 'chithi_secret',
    persistent: true,
  });

  const isInitialized = fs.existsSync(path.join(pgDataDir, 'PG_VERSION'));
  if (!isInitialized) {
    console.log('[Init] Initializing new cluster at', pgDataDir);
    await pg.initialise();
  }

  const pidFile = path.join(pgDataDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim().split('\n')[0], 10);
      try {
        process.kill(pid, 0);
      } catch (e) {
        console.log('[Init] Removing stale postmaster.pid (PID', pid, 'not running)');
        fs.unlinkSync(pidFile);
      }
    } catch (e) {
      fs.unlinkSync(pidFile);
    }
  }

  console.log('[Init] Starting PostgreSQL...');
  await pg.start();
  console.log('[Init] PostgreSQL running.');

  try {
    await pg.createDatabase('chithi_db');
    console.log('[Init] Database "chithi_db" created or exists.');
  } catch (err) {
    // Already exists
  }

  const dbUrl = 'postgresql://chithi:chithi_secret@localhost:5432/chithi_db?schema=public';

  // Check if tables already exist
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const res = await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';");
  const tableCount = parseInt(res.rows[0].count, 10);
  await client.end();

  console.log(`[Init] Existing public tables: ${tableCount}`);

  if (tableCount === 0) {
    console.log('[Init] Pushing Prisma schema to chithi_db...');
    execSync('npx prisma db push --skip-generate --schema=prisma/schema.prisma', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    console.log('[Init] Prisma schema pushed successfully.');

    // Find latest backup
    const backupDir = path.resolve(__dirname, '../backups');
    const backups = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    if (backups.length > 0) {
      const latestBackup = path.join(backupDir, backups[backups.length - 1]);
      console.log(`[Init] Restoring from latest backup: ${latestBackup}`);
      await restoreDatabase(latestBackup, dbUrl);
      console.log('[Init] Database restored successfully!');
    }
  }

  console.log('[Init] Stopping PostgreSQL cleanly...');
  await pg.stop();
  console.log('[Init] Database setup complete!');
}

main().catch((err) => {
  console.error('[Init] Error:', err);
  process.exit(1);
});

