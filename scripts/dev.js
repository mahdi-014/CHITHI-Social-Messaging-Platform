const { spawn } = require('child_process');
const path = require('path');

console.log('=== CHITHI DEVELOPMENT ENVIRONMENT RUNNER ===');

// 1. Start Database Daemon
console.log('[Runner] Starting PostgreSQL daemon...');
const db = spawn('node', ['apps/api/scripts/db-daemon.js'], {
  stdio: 'inherit',
  shell: true,
});

// 2. Wait 2 seconds for DB then start API
setTimeout(() => {
  console.log('[Runner] Starting NestJS API...');
  const api = spawn('node', ['apps/api/dist/main.js'], {
    stdio: 'inherit',
    shell: true,
  });

  // 3. Start Next.js Web
  console.log('[Runner] Starting Next.js Web...');
  const web = spawn('pnpm', ['--filter', '@chithi/web', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => {
    console.log('\n[Runner] Shutting down CHITHI services...');
    web.kill();
    api.kill();
    db.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, 2500);
