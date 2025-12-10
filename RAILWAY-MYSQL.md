# Railway MySQL Integration (for Render-hosted API)

Use this guide when you want to keep the web service on Render but host the MySQL database on Railway’s free tier. The process mirrors the old full-Railway deployment, but only the database lives there.

---

## 1. Create the Railway Database
1. Visit <https://railway.app> → **Start a New Project**.
2. Choose **Provision MySQL**. (You do *not* need to deploy your GitHub repo here.)
3. Wait for the service to show **Running**.
4. Click the **MySQL** card → **Variables**:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
5. Copy those four values—they’re what Render needs.

> Optional: click **Connect** and run `SHOW DATABASES;` to confirm connectivity. Railway auto-creates the `railway` database.

---

## 2. Update Render Environment Variables
In your Render web service:

1. Go to **Environment** → **Add Environment Variable**.
2. Paste the values you copied, mapping them like so:
   ```
   MYSQL_HOST=<MYSQLHOST from Railway>
   MYSQL_USER=<MYSQLUSER>
   MYSQL_PASSWORD=<MYSQLPASSWORD>
   MYSQL_DATABASE=<MYSQLDATABASE>
   ```
3. Leave the rest (`NODE_ENV`, `PORT`, `SESSION_SECRET`, etc.) as before.
4. Save changes and trigger **Manual Deploy → Clear build cache & deploy**.

---

## 3. Run the Migration Against Railway
After the deploy finishes:
1. Web service → **Shell**.
2. Execute:
   ```bash
   cd /opt/render/project/src/server
   npm run migrate
   ```
3. You should see:
   ```
   Running migration: ../migrations/0001_init.sql
   Migration complete
   ```

---

## 4. Verify Locally (Optional)
You can also point your local `.env` at Railway to test with the production data:
```
MYSQL_HOST=<same as Render>
MYSQL_USER=<same as Render>
MYSQL_PASSWORD=<same as Render>
MYSQL_DATABASE=<same as Render>
```
Then run `node server/migrate.js migrations/0001_init.sql` to confirm the connection.

---

## 5. Final Checks
- Keep the Railway database service awake by visiting it occasionally (free tier sleeps like Render).
- Rotate the password under Railway → **Variables** if it ever leaks; update Render env vars and redeploy.
- Backups: in Railway, click **Settings → Data** to export snapshots if needed.

Once these steps are done, your Render app reads/writes through `server/mysql.js` using the Railway-hosted MySQL instance. Every new GitHub deploy will automatically reuse those environment variables, so no more manual edits are required.
