# 🚀 Quick Checklist: Render Deployment

## ✅ Already Done
- Render account + project created
- Repo connected and first deploy attempted
- Migration script (`server/migrate.js`) + schema (`migrations/0001_init.sql`) ready

## 📋 Finish these steps (~2 minutes)

### 1. Add Environment Variables (Render Dashboard)
- [ ] Open https://render.com → select your **Baylis Property** web service
- [ ] Go to **Environment** → **Add Environment Variable**
- [ ] Add the following:
  - [ ] `NODE_ENV = production`
  - [ ] `PORT = 5000`
  - [ ] `HOST = 0.0.0.0`
  - [ ] `MYSQL_HOST` (from Render MySQL service)
  - [ ] `MYSQL_USER` (from Render MySQL service)
  - [ ] `MYSQL_PASSWORD` (from Render MySQL service)
  - [ ] `MYSQL_DATABASE` (from Render MySQL service)
- [ ] Click **Save Changes** and wait for the service to redeploy (green checkmark)

### 2. Run the Migration
- [ ] Open the web service → **Shell**
- [ ] Run:
  ```bash
  cd /opt/render/project/src/server
  npm run migrate
  ```
- [ ] Confirm output like:
  ```
  Running migration: migrations/0001_init.sql
  ✅ Migrations completed successfully
  ```

---

## 🎉 After That
1. Add your custom domain under **Custom Domains** (Render shows DNS records).
2. Update Google Search Console with the new URL and resubmit `sitemap.xml`.
3. Monitor Render logs for any runtime errors.

---

## 📚 Helpful Docs
- [`RENDER-DEPLOYMENT.md`](RENDER-DEPLOYMENT.md) – Full Render setup guide.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) – Other hosting options and tips.

---

Ping once those boxes are checked so we can move on to SEO + monitoring. 🙌
