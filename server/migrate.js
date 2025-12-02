import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function runMigration(file) {
  const sql = fs.readFileSync(file, 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || ''
  });
  console.log('Running migration:', file);
  await conn.query(sql);
  await conn.end();
  console.log('Migration complete');
}

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('Usage: node migrate.js <path-to-sql-file>');
  process.exit(1);
}

runMigration(argv[0]).catch(err => {
  console.error(err);
  process.exit(1);
});
