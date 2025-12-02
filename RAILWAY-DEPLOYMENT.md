# Railway + MySQL Deployment Guide

## Quick Overview
You're going to:
1. ✅ Create a Railway account (connects to your GitHub)
2. ✅ Deploy your Node.js app + MySQL database automatically
3. ✅ Configure environment variables
4. ✅ Run database migrations
5. ✅ Connect your custom domain
6. ✅ Submit to Google Search Console for indexing

**Estimated time: 15-20 minutes**

---

## Step 1: Sign Up for Railway

1. Go to **https://railway.app**
2. Click **"Start Project"** (top right)
3. Click **"GitHub"** to sign in with GitHub
4. **Authorize Railway** to access your GitHub account
5. Select your **Baylis-Property-LTD** repository

Railway will automatically detect Node.js and create a project.

---

## Step 2: Add MySQL Database

1. In your Railway dashboard, click **"Add Service"** (+ icon)
2. Select **"MySQL"** from the list
3. Railway creates a MySQL instance instantly

**Railway automatically generates:**
- MYSQL_HOST
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE

(You'll see these in the MySQL service card)

---

## Step 3: Configure Environment Variables

### In Railway Dashboard:
1. Click on the **Node app service** (your Baylis app)
2. Go to **"Variables"** tab
3. Add each variable (click **"Add Variable"**):

```
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
```

### Link MySQL Automatically:
1. In same **Variables** tab, scroll to "Add Reference"
2. For each MySQL credential, add:
   - `MYSQL_HOST` → Select MySQL service → `MYSQL_HOST`
   - `MYSQL_USER` → Select MySQL service → `MYSQL_USER`
   - `MYSQL_PASSWORD` → Select MySQL service → `MYSQL_PASSWORD`
   - `MYSQL_DATABASE` → Select MySQL service → `MYSQL_DATABASE`

This auto-links your MySQL credentials!

### Google Sheets Integration (Optional):
If you use Google Sheets integration, add:
```
GOOGLE_API_KEY=your-api-key-here
GOOGLE_SHEET_ID=your-sheet-id-here
```

---

## Step 4: Deploy & Verify

1. Railway **auto-deploys** when you push to GitHub
2. Check the **Deployment** tab for status
3. Once deployed, you'll see a **Preview URL** (e.g., `baylis-property-xxx.railway.app`)
4. Click it to test your app

---

## Step 5: Run Database Migrations

Your MySQL database is created but **tables don't exist yet**.

### Option A: Using Railway Terminal (Easiest)
1. Go to **Deployments** tab
2. Click the three dots menu → **"View Deployment"**
3. At the bottom, open the **Terminal**
4. Run:
   ```bash
   cd /app/server && npm run migrate
   ```

### Option B: Using CLI (Alternative)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connect to project
railway link

# Run migration via their Node runtime
railway run "cd server && npm run migrate"
```

---

## Step 6: Register a Domain

### Option A: Use Railway's Domain (Fastest, No Cost)
- Railway gives you a free domain: `baylis-property-xxx.railway.app`
- This works for Google indexing!
- Skip to Step 7

### Option B: Custom Domain (Recommended)
1. Go to **Namecheap**, **GoDaddy**, or **Google Domains**
2. Search for your domain (e.g., `baylisproperty.co.uk`)
3. Register it (~$8-15/year)
4. Note your domain registrar login info

---

## Step 7: Connect Custom Domain to Railway

### In Railway Dashboard:
1. Select your **Node app**
2. Go to **"Settings"** → **"Domain"**
3. Click **"Add Domain"**
4. Enter your domain: `baylisproperty.co.uk`
5. Railway shows you DNS records to add

### In Your Domain Registrar (e.g., GoDaddy):
1. Log in to your registrar
2. Go to **DNS Settings**
3. Add the DNS records Railway provided:
   - Type A record: `xxx.railway.app`
   - Or CNAME record (if provided)
4. Save changes

**Note:** DNS changes take 24-48 hours to propagate. Your site might not work immediately.

---

## Step 8: Submit to Google Search Console

Once your domain is working (test at `https://baylisproperty.co.uk`):

1. Go to **https://search.google.com/search-console**
2. Click **"URL prefix"** → Enter `https://baylisproperty.co.uk`
3. **Verify ownership:**
   - Option 1: Add HTML file to your site (Railway → put file in root)
   - Option 2: Add DNS record (easier) - go to your registrar
4. Click **"Verify"**
5. Once verified, go to **"Sitemaps"**
6. Add: `https://baylisproperty.co.uk/sitemap.xml`
7. Click **"Submit"**

Google will crawl your site within 2-4 weeks!

---

## Step 9: Test Everything

### Test your app:
```bash
# Visit in browser
https://baylisproperty.co.uk
```

### Test endpoints:
```bash
curl https://baylisproperty.co.uk/api/auth/login
curl https://baylisproperty.co.uk/robots.txt
curl https://baylisproperty.co.uk/sitemap.xml
```

### Test database connection:
1. Create a test user at registration page
2. Check if it saves in the database

---

## Troubleshooting

### App won't start?
1. **Check logs:** Railway Dashboard → Deployments → View Logs
2. **Common issues:**
   - Missing env vars (MySQL credentials)
   - Port binding error
   - Node version issue

### Database connection fails?
```
Error: connect ENOENT /var/run/mysqld/mysqld.sock
```
**Solution:** 
- Verify MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD are set
- Run migration manually: `railway run "cd server && npm run migrate"`

### Domain not working after 48 hours?
- Check DNS records were added correctly
- Use online DNS checker: https://dnschecker.org

### Google not indexing?
- Wait 2-4 weeks for first crawl
- Check Google Search Console for errors
- Ensure robots.txt allows crawling: `Allow: /`

---

## Your Production URLs

Once set up:
- **Live app:** `https://baylisproperty.co.uk`
- **API:** `https://baylisproperty.co.uk/api`
- **Database:** Managed by Railway (no direct access needed)
- **Backups:** Railway auto-backups MySQL daily

---

## Monthly Costs

| Service | Cost |
|---------|------|
| Railway (Node + MySQL) | $5-15/month |
| Domain | $1/month (~$12/year) |
| **Total** | **$6-16/month** |

---

## Next Steps

1. **Now:** Go to https://railway.app and sign up
2. **Link your GitHub repo**
3. **Add MySQL service**
4. **Follow Steps 3-8 above**
5. **Come back and let me know when it's deployed!**

Questions? I can help troubleshoot any issues.
