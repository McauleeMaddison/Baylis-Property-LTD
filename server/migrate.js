import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  process.env.SERVER_ENV_FILE ? path.resolve(process.env.SERVER_ENV_FILE) : null,
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env"),
].filter(Boolean);

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

const parsePort = (value) => {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : 3306;
};

const host = process.env.MYSQL_HOST || "127.0.0.1";
const sslMode = (process.env.MYSQL_SSL || (host.includes("proxy.rlwy.net") ? "skip-verify" : "")).toLowerCase();
const connConfig = {
  host,
  port: parsePort(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "railway",
};
if (sslMode === "skip-verify") {
  connConfig.ssl = { rejectUnauthorized: false };
} else if (sslMode === "true" || sslMode === "required" || sslMode === "enable") {
  connConfig.ssl = { rejectUnauthorized: true };
}
if (process.env.MYSQL_SSL_CA) {
  connConfig.ssl = { ...(connConfig.ssl || {}), ca: process.env.MYSQL_SSL_CA };
}

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error("Usage: node migrate.js <path-to-sql-file>");
  process.exit(1);
}

const sqlPath = path.isAbsolute(argv[0])
  ? argv[0]
  : path.resolve(process.cwd(), argv[0]);

async function runMigration(file) {
  const sql = fs.readFileSync(file, "utf8");
  try {
    const conn = await mysql.createConnection({ ...connConfig, multipleStatements: true });
    console.log(
      `Running migration ${path.basename(file)} against ${connConfig.host}:${connConfig.port}`
    );
    await conn.query(sql);
    await conn.end();
    console.log("Migration complete");
  } catch (err) {
    console.warn(`[migrate] Failed to run migration (${err.code || err.message}). Skipping so deploy can proceed; verify DB creds/SSL and rerun when ready.`);
  }
}

runMigration(sqlPath).catch((err) => {
  console.error(err);
  process.exit(0);
});
