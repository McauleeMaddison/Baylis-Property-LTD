# Deploy to Railway in 5 Minutes

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Start Project"
3. Sign in with GitHub (authorize Railway to access your repos)

## Step 2: Create New Project
1. Click "New Project" → "Deploy from GitHub repo"
2. Select `Baylis-Property-LTD` repository
3. Railway will auto-detect Node.js and create the deployment

## Step 3: Add MySQL Database
1. In your Railway dashboard, click "Add Service"
2. Select "MySQL"
3. Railway creates a MySQL instance automatically

## Step 4: Configure Environment Variables
In Railway dashboard, go to **Variables** and add:

```
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
MYSQL_HOST=${{ Mysql.MYSQL_HOST }}
MYSQL_USER=${{ Mysql.MYSQL_USER }}
MYSQL_PASSWORD=${{ Mysql.MYSQL_PASSWORD }}
MYSQL_DATABASE=${{ Mysql.MYSQL_DATABASE }}
GOOGLE_API_KEY=your-key-here
GOOGLE_SHEET_ID=your-sheet-id-here
```

## Step 5: Run Database Migration
1. Once deployed, go to the **Deploy** tab
2. Click the three dots menu → "View Logs"
3. In the terminal at bottom, run:
   ```bash
   npm run migrate
   ```

## Step 6: Connect Custom Domain
1. Go to **Settings** → **Domain**
2. Click "Add Domain"
3. Enter your domain: `baylisproperty.co.uk`
4. Railway gives you DNS records to point your domain
5. Go to your domain registrar (GoDaddy, Namecheap, etc.) and add those DNS records

## Step 7: Google Search Console
1. Go to https://search.google.com/search-console
2. Add property: `https://baylisproperty.co.uk`
3. Verify via DNS or HTML file (Railway or registrar dashboard)
4. Submit sitemap: `https://baylisproperty.co.uk/sitemap.xml`

## Costs
- Railway: ~$5-10/month
- Domain: ~$8/year
- **Total: ~$15-20/year**

## Your Deployed URLs
- Live app: `https://baylisproperty.co.uk`
- Admin dashboard: `https://railway.app`
- Database: Managed by Railway (no SSH needed)

## Troubleshooting

**App won't start?**
- Check Railway logs: Dashboard → Select app → View Logs
- Verify all env vars are set correctly

**Database connection error?**
- Run migration: `npm run migrate`
- Check MYSQL_* variables match Railway's MySQL service

**Domain not working?**
- DNS changes take 24-48 hours
- Verify DNS records in your registrar

---

That's it! Your app is now live and Google will start indexing it within 2-4 weeks.
