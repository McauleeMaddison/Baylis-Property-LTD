import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = process.env.SERVER_ENV_FILE
  ? [path.resolve(process.env.SERVER_ENV_FILE)]
  : [
      path.resolve(__dirname, "..", "..", ".env"),
      path.resolve(__dirname, "..", "..", ".env.production"),
      path.resolve(__dirname, ".env"),
      path.resolve(__dirname, ".env.production"),
    ];

envPaths.forEach((envPath) => dotenv.config({ path: envPath, override: false }));

const pickEnv = (...keys) => {
  for (const key of keys) {
    if (process.env[key] && process.env[key] !== "CHANGE_ME") return process.env[key];
  }
  return "";
};

const parsePort = (value) => {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : 3306;
};

const urlValue = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_CONNECTION_URL || "";
const hasUrl = Boolean(urlValue);

const requiredKeys = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
const missingKeys = requiredKeys.filter((key) => {
  if (key === "MYSQL_HOST") return !pickEnv("MYSQL_HOST", "MYSQLHOST");
  if (key === "MYSQL_USER") return !pickEnv("MYSQL_USER", "MYSQLUSER");
  if (key === "MYSQL_PASSWORD") return !pickEnv("MYSQL_PASSWORD", "MYSQLPASSWORD");
  if (key === "MYSQL_DATABASE") return !pickEnv("MYSQL_DATABASE", "MYSQLDATABASE");
  return true;
});
if (!hasUrl && missingKeys.length) {
  console.warn(
    `⚠️  Missing MySQL env vars: ${missingKeys.join(
      ", "
    )}. Update server/.env or your hosting provider's variables.`
  );
}

const host = pickEnv("MYSQL_HOST", "MYSQLHOST") || "127.0.0.1";

export const connectionConfig = {
  host,
  port: parsePort(pickEnv("MYSQL_PORT", "MYSQLPORT")),
  user: pickEnv("MYSQL_USER", "MYSQLUSER") || "root",
  password: pickEnv("MYSQL_PASSWORD", "MYSQLPASSWORD") || "",
  database: pickEnv("MYSQL_DATABASE", "MYSQLDATABASE") || "railway",
};

if (hasUrl) {
  try {
    const parsed = new URL(urlValue);
    connectionConfig.host = parsed.hostname;
    connectionConfig.port = parsePort(parsed.port || pickEnv("MYSQL_PORT", "MYSQLPORT"));
    connectionConfig.user = decodeURIComponent(parsed.username || "");
    connectionConfig.password = decodeURIComponent(parsed.password || "");
    connectionConfig.database = parsed.pathname.replace(/^\/+/, "");
  } catch (err) {
    console.warn(`⚠️  Invalid DATABASE_URL/MYSQL_URL: ${err.message}`);
  }
}

const isLocalHost =
  connectionConfig.host === "localhost" ||
  connectionConfig.host === "127.0.0.1" ||
  connectionConfig.host.endsWith(".local");

const sslRaw = (process.env.MYSQL_SSL || "").toLowerCase();
const sslMode = sslRaw || (isLocalHost ? "disabled" : (connectionConfig.host.includes("proxy.rlwy.net") ? "skip-verify" : "required"));
if (sslMode === "disabled" || sslMode === "false" || sslMode === "0" || sslMode === "off") {
  delete connectionConfig.ssl;
} else if (sslMode === "skip-verify") {
  connectionConfig.ssl = { rejectUnauthorized: false };
} else if (sslMode === "true" || sslMode === "required" || sslMode === "require" || sslMode === "enable" || sslMode === "1") {
  connectionConfig.ssl = { rejectUnauthorized: true };
}
if (process.env.MYSQL_SSL_CA_FILE) {
  const caPath = path.resolve(process.env.MYSQL_SSL_CA_FILE);
  connectionConfig.ssl = {
    ...(connectionConfig.ssl || {}),
    ca: await fs.promises.readFile(caPath, "utf8"),
  };
}
if (process.env.MYSQL_SSL_CA) {
  connectionConfig.ssl = {
    ...(connectionConfig.ssl || {}),
    ca: process.env.MYSQL_SSL_CA,
  };
}

export const createDbConnection = (overrides = {}) =>
  mysql.createConnection({
    ...connectionConfig,
    multipleStatements: false,
    ...overrides,
  });

export const db = await createDbConnection();

console.log(
  `Connected to MySQL database at ${connectionConfig.host}:${connectionConfig.port}`
);
