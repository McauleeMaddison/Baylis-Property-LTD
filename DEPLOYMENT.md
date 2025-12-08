# Deployment Guide for Baylis Property LTD

## Prerequisites
- Domain name (e.g., `baylisproperty.co.uk`)
- SSL/TLS certificate (recommended: Let's Encrypt)
- Server hosting (Render, Fly.io, DigitalOcean, etc.)

## Deployment Options

### Option 1: Render (Recommended - Easiest)
1. Push code to GitHub
2. On Render: **New + → Web Service → GitHub**, select this repo
3. Build command: `npm install && cd server && npm install`
4. Start command: `cd server && npm start`
5. Add environment variables (MYSQL_*, GOOGLE_API_KEY, etc.) plus link the Render MySQL service
6. Open the service shell and run `cd /opt/render/project/src/server && npm run migrate`
7. Add a custom domain under **Custom Domains**
8. See [`RENDER-DEPLOYMENT.md`](RENDER-DEPLOYMENT.md) for step-by-step screenshots

### Option 2: DigitalOcean App Platform
1. Create a DigitalOcean account
2. Connect GitHub repository
3. Configure app spec (Docker-based deployment)
4. Set environment variables
5. Add custom domain and SSL

### Option 3: Docker + Self-Hosted VPS
```bash
# Build Docker image
docker build -t baylis-property ./server

# Push to Docker registry (Docker Hub, ECR, etc.)
docker tag baylis-property your-registry/baylis-property:latest
docker push your-registry/baylis-property:latest

# Deploy on VPS (Ubuntu)
ssh user@your-vps
docker pull your-registry/baylis-property:latest
docker run -d \
  -p 80:5000 \
  -p 443:5000 \
  -e MYSQL_HOST=db.example.com \
  -e MYSQL_USER=baylis_user \
  -e MYSQL_PASSWORD=secure_password \
  -e MYSQL_DATABASE=baylis_db \
  --name baylis-app \
  your-registry/baylis-property:latest
```

### Option 4: Heroku
```bash
heroku create baylis-property
heroku addons:create cleardb:ignite
git push heroku main
```

## Environment Variables Required
```
PORT=5000
NODE_ENV=production
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=baylis_db
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SHEET_ID=your-google-sheet-id
```

## Post-Deployment Steps

### 1. SSL/TLS Certificate (using Let's Encrypt with Nginx)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d baylisproperty.co.uk -d www.baylisproperty.co.uk
```

### 2. Google Search Console
1. Go to https://search.google.com/search-console
2. Add your domain (verify ownership via DNS/HTML file)
3. Submit sitemap: https://baylisproperty.co.uk/sitemap.xml
4. Monitor search performance and fix any crawl errors

### 3. SEO & Monitoring
- Sitemap: ✅ `/sitemap.xml`
- robots.txt: ✅ `/robots.txt`
- Meta tags: ✅ Added to all HTML pages
- Consider Open Graph tags + JSON-LD schema for richer previews
- Add monitoring (Sentry/Rollbar, UptimeRobot, Render health checks)

## Domain Setup
1. Register domain (Namecheap, GoDaddy, Google Domains)
2. Point DNS to your hosting provider:
   - A record: `baylisproperty.co.uk` → Your-VPS-IP or PaaS provider IP
   - CNAME: `www` → `baylisproperty.co.uk` or provider URL
3. Configure SSL certificate

## Migration from Development
```bash
# Export dev database
mysqldump -u root -p baylis_db > backup.sql

# Import to production (Render managed MySQL exposes standard MySQL endpoint)
mysql -u prod_user -p -h prod-host baylis_db < backup.sql

# Run migrations
npm run migrate
```

## Troubleshooting
- **502 Bad Gateway**: Check if Node process is running (`pm2 logs`)
- **MySQL Connection Error**: Verify credentials and network access
- **Google not indexing**: Check Search Console for errors, ensure robots.txt allows crawling
