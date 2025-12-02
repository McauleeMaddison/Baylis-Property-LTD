# How to Add MySQL to Your Railway Project

## Step-by-Step Guide

### Step 1: Open Your Railway Dashboard
1. Go to https://railway.app
2. Log in with GitHub
3. Click on your **Baylis-Property-LTD** project

### Step 2: Add MySQL Service
1. Click the **"+ New"** button (or **"Add Service"**)
2. Select **"MySQL"** from the list
3. Railway will automatically create a MySQL database instance

**That's it!** Railway generates the credentials automatically.

---

## Step 3: Link MySQL to Your Node App

Once MySQL is created, you'll see a **MySQL card** in your project dashboard.

### Get Your MySQL Credentials:
1. Click on the **MySQL service card**
2. Go to the **"Variables"** tab
3. You'll see:
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

### Link to Your Node App:
1. Click on your **Node app** (Baylis app)
2. Go to **"Variables"** tab
3. Click **"Add Reference"**
4. For each variable, select:
   - `MYSQL_HOST` → MySQL service → `MYSQL_HOST`
   - `MYSQL_USER` → MySQL service → `MYSQL_USER`
   - `MYSQL_PASSWORD` → MySQL service → `MYSQL_PASSWORD`
   - `MYSQL_DATABASE` → MySQL service → `MYSQL_DATABASE`

This automatically links your app to the database!

---

## Step 4: Verify Connection

### Check if variables are set:
1. Go to your Node app → **Variables** tab
2. You should see all 4 MySQL variables are now linked (with a reference icon 🔗)

### Example of what you'll see:
```
MYSQL_HOST=${{ MySQL.MYSQL_HOST }}
MYSQL_USER=${{ MySQL.MYSQL_USER }}
MYSQL_PASSWORD=${{ MySQL.MYSQL_PASSWORD }}
MYSQL_DATABASE=${{ MySQL.MYSQL_DATABASE }}
```

---

## Step 5: Run Migrations

Now that MySQL is connected, create the tables:

1. Go to **Deployments** tab
2. Click the three dots menu (•••)
3. Select **"View Deployment"**
4. Scroll to the bottom and open the **Terminal**
5. Run:
   ```bash
   npm run migrate
   ```

You should see:
```
✅ Migrations completed successfully
```

---

## Troubleshooting

### MySQL service won't start?
- Wait 1-2 minutes for Railway to provision the database
- Refresh the page
- Check Railway status: https://status.railway.app

### Can't see MySQL Variables?
- Click on the MySQL service card again
- Go to "Variables" tab (not "Settings")
- Scroll down to see all available variables

### Migration command fails?
**Error: "ENOENT: cannot find module 'mysql2'"**
- Your Node dependencies aren't installed
- Run: `npm install` in the Railway terminal first

**Error: "Access denied for user"**
- MySQL variables aren't linked correctly
- Re-do Step 3 (Link to Node App)

**Error: "Table already exists"**
- This is normal! It means migrations already ran
- Your database is set up correctly

---

## Verify Your Setup

### Test 1: Check MySQL is Running
In Railway terminal:
```bash
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -D $MYSQL_DATABASE -e "SHOW TABLES;"
```

You should see your tables: `users`, `requests`, `community_posts`, `sessions`

### Test 2: Check App Can Connect
1. Visit your Railway app URL (e.g., `baylis-property-xxx.railway.app`)
2. Try to register a new user
3. If it works, your database is connected!

---

## Next Steps

Once MySQL is working:
- ✅ MySQL Service Added
- ✅ Variables Linked
- ✅ Migrations Run
- ⏳ **Next: Register a domain and set up Google Search Console**

Let me know when MySQL is set up, and I'll help with the next steps! 🚀
