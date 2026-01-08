import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = process.env.SERVER_ENV_FILE
  ? path.resolve(process.env.SERVER_ENV_FILE)
  : path.resolve(__dirname, ".env");

dotenv.config({ path: envPath });

const parsePort = (value) => {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : 3306;
};

const requiredKeys = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length) {
  console.warn(
    `⚠️  Missing MySQL env vars: ${missingKeys.join(
      ", "
    )}. Update server/.env or your hosting provider's variables.`
  );
}

const host = process.env.MYSQL_HOST || "127.0.0.1";
const isLocalHost = host === "localhost" || host === "127.0.0.1";

export const connectionConfig = {
  host,
  port: parsePort(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "railway",
};

const sslRaw = (process.env.MYSQL_SSL || "").toLowerCase();
const sslMode = sslRaw || (isLocalHost ? "disabled" : (host.includes("proxy.rlwy.net") ? "skip-verify" : "required"));
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
