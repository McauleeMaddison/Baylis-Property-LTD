# Railway Variables Setup - Copy & Paste Guide

## Your MySQL Credentials (from Railway)

```
MYSQL_HOST: interchange.proxy.rlwy.net
MYSQL_USER: root
MYSQL_PASSWORD: didGTHTsWpbvkkewgSFlRyEmgDpXSvIi
MYSQL_DATABASE: railway
```

---

## STEP 1: Go to Railway Dashboard

1. Open https://railway.app
2. Click your **Baylis-Property-LTD** project
3. Click on your **Node app** (NOT MySQL)
4. Go to **"Variables"** tab

---

## STEP 2: Add Each Variable

Click **"Add Variable"** for each one below and copy-paste exactly:

### Variable 1
```
Name: NODE_ENV
Value: production
```

### Variable 2
```
Name: PORT
Value: 5000
```

### Variable 3
```
Name: HOST
Value: 0.0.0.0
```

### Variable 4
```
Name: MYSQL_HOST
Value: interchange.proxy.rlwy.net
```

### Variable 5
```
Name: MYSQL_USER
Value: root
```

### Variable 6
```
Name: MYSQL_PASSWORD
Value: didGTHTsWpbvkkewgSFlRyEmgDpXSvIi
```

### Variable 7
```
Name: MYSQL_DATABASE
Value: railway
```

---

## STEP 3: Click Save

After adding all 7 variables, Railway will auto-redeploy your app.

---

## STEP 4: Verify All Variables Are Set

Your Variables tab should look like this:

```
NODE_ENV = production
PORT = 5000
HOST = 0.0.0.0
MYSQL_HOST = interchange.proxy.rlwy.net
MYSQL_USER = root
MYSQL_PASSWORD = didGTHTsWpbvkkewgSFlRyEmgDpXSvIi
MYSQL_DATABASE = railway
```

✅ All 7 variables set!

---

## STEP 5: Check Deployment Status

1. Go to **"Deployments"** tab
2. Wait for deployment to complete (you'll see a green checkmark ✅)
3. Your app will restart with the new variables

---

## STEP 6: Open Terminal & Run Migration

1. In **"Deployments"** tab, click the three dots (•••)
2. Select **"View Deployment"**
3. Scroll to bottom → Open **"Terminal"**
4. Copy and paste this command:

```bash
npm run migrate
```

5. Press Enter
6. You should see:
   ```
   ✅ Migrations completed successfully
   Database tables created!
   ```

---

## That's It!

Once you see ✅ in the terminal, your database is ready to go!

Next steps:
- Register a domain
- Submit to Google Search Console
- Your app will appear in Google search! 🎉
