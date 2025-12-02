# 🚀 Quick Checklist: Add Variables & Run Migration

## ✅ What's Ready On Your Computer
- Migration script: `server/migrate.js` ✓
- Database schema: `migrations/0001_init.sql` ✓
- npm script: `npm run migrate` ✓
- All code deployed to Railway ✓

## 📋 What You Need To Do (2 minutes)

### Part 1: Add Variables to Railway Dashboard
- [ ] Go to https://railway.app
- [ ] Open your **Baylis-Property-LTD** project
- [ ] Click **Node app** → **Variables** tab
- [ ] Add 7 variables (see `RAILWAY-VARIABLES-SETUP.md` for exact values):
  - [ ] NODE_ENV = production
  - [ ] PORT = 5000
  - [ ] HOST = 0.0.0.0
  - [ ] MYSQL_HOST = interchange.proxy.rlwy.net
  - [ ] MYSQL_USER = root
  - [ ] MYSQL_PASSWORD = didGTHTsWpbvkkewgSFlRyEmgDpXSvIi
  - [ ] MYSQL_DATABASE = railway
- [ ] Wait for app to redeploy (green checkmark)

### Part 2: Run Migration
- [ ] Go to **Deployments** tab
- [ ] Click three dots (•••) → **View Deployment**
- [ ] Scroll down → Open **Terminal**
- [ ] Copy this command:
  ```bash
  npm run migrate
  ```
- [ ] Press Enter
- [ ] Look for ✅ success message

### Expected Terminal Output:
```
Running migration: migrations/0001_init.sql
Migration complete
```

---

## 🎉 Once Complete

Your database is ready!

**Next steps:**
1. Register a domain (baylisproperty.co.uk)
2. Point domain to Railway
3. Submit to Google Search Console
4. Google will index your site in 2-4 weeks

---

## 📚 Helpful Docs
- `RAILWAY-VARIABLES-SETUP.md` - Copy-paste guide for variables
- `RAILWAY-DEPLOYMENT.md` - Full deployment guide
- `ADD-MYSQL-TO-RAILWAY.md` - MySQL setup details

---

**Text me when you've added all 7 variables and run the migration!** 🚀
