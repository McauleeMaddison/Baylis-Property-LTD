import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createDbConnection, connectionConfig } from "./mysql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = process.env.SERVER_ENV_FILE
  ? path.resolve(process.env.SERVER_ENV_FILE)
  : path.resolve(__dirname, ".env");

dotenv.config({ path: envPath });

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
  const conn = await createDbConnection({ multipleStatements: true });
  console.log(
    `Running migration ${path.basename(file)} against ${connectionConfig.host}:${connectionConfig.port}`
  );
  await conn.query(sql);
  await conn.end();
  console.log("Migration complete");
}

runMigration(sqlPath).catch((err) => {
  console.error(err);
  process.exit(1);
});
