const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

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
    console.log('[DB] Initializing new cluster at', pgDataDir);
    await pg.initialise();
  }

  console.log('[DB] Starting PostgreSQL on port 5432...');
  await pg.start();
  console.log('[DB] PostgreSQL server running on port 5432!');

  try {
    await pg.createDatabase('chithi_db');
    console.log('[DB] Database "chithi_db" is ready.');
  } catch (err) {
    if (!err.message?.includes('already exists')) {
      console.log('[DB] createDatabase note:', err.message);
    }
  }

  process.on('SIGINT', async () => {
    console.log('[DB] Stopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[DB] Stopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });

  // Keep process alive
  setInterval(() => {}, 1000 * 60);
}

main().catch((err) => {
  console.error('[DB] Fatal error:', err);
  process.exit(1);
});
