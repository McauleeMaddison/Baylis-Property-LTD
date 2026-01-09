import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');
[
  path.join(repoRoot, '.env'),
  path.join(repoRoot, '.env.production'),
  path.join(serverRoot, '.env'),
  path.join(serverRoot, '.env.production'),
].forEach((envPath) => dotenv.config({ path: envPath, override: false }));

const useMemory = process.env.USE_INMEMORY_DB === 'true';
const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
const missing = required.filter((k) => !process.env[k]);

if (useMemory) {
  console.log('Skipping migration: USE_INMEMORY_DB=true (using in-memory datastore).');
  process.exit(0);
}
if (missing.length) {
  console.warn(`Skipping migration: missing MySQL env vars (${missing.join(', ')}). Set them and rerun npm run migrate when ready.`);
  process.exit(0);
}

const migratePath = path.join(serverRoot, 'migrate.js');
const migrations = [
  '0001_init.sql',
  '0002_security.sql',
  '0003_drop_otp_challenges.sql',
  '0004_request_status.sql',
  '0005_notifications.sql',
];

const runMigration = (file) => new Promise((resolve) => {
  const sqlPath = path.join(serverRoot, '..', 'migrations', file);
  const child = spawn(process.execPath, [migratePath, sqlPath], {
    stdio: 'inherit',
    cwd: serverRoot,
  });
  child.on('error', (err) => {
    console.warn(`[prestart] Migration spawn error: ${err.message || err}`);
    resolve(false);
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.warn(`[prestart] Migration failed (${file}) with code ${code}. Continuing startup (using existing schema). Verify DB credentials/SSL and rerun migrations when ready.`);
      resolve(false);
    } else {
      resolve(true);
    }
  });
});

let ok = true;
for (const file of migrations) {
  const result = await runMigration(file);
  if (!result) ok = false;
}
process.exit(ok ? 0 : 0);
