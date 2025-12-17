import mysql from "mysql2/promise";
import dotenv from "dotenv";
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

export const connectionConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: parsePort(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "railway",
};

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
