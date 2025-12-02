# Deployment Guide for Baylis Property LTD

## Prerequisites
- Domain name (e.g., `baylisproperty.co.uk`)
- SSL/TLS certificate (recommended: Let's Encrypt)
- Server hosting (AWS, DigitalOcean, Heroku, Railway, Render, etc.)

## Deployment Options

### Option 1: Railway (Recommended - Easiest)
1. Push code to GitHub
2. Connect your GitHub repo to Railway
3. Add environment variables (MYSQL_*, GOOGLE_API_KEY, etc.)
4. Deploy with one click
5. Add custom domain in Railway dashboard

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

### 3. SEO Optimization
- Sitemap: ✅ `/sitemap.xml`
- robots.txt: ✅ `/robots.txt`
- Meta tags: ✅ Added to all HTML pages
- Open Graph tags: Consider adding for social sharing
- Structured data: Consider adding JSON-LD schema

### 4. Monitoring
- Set up error tracking (Sentry, Rollbar)
- Monitor uptime (UptimeRobot, Pingdom)
- Log aggregation (LogRocket, DataDog)

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

# Import to production
mysql -u prod_user -p -h prod-host baylis_db < backup.sql

# Run migrations
npm run migrate
```

## Troubleshooting
- **502 Bad Gateway**: Check if Node process is running (`pm2 logs`)
- **MySQL Connection Error**: Verify credentials and network access
- **Google not indexing**: Check Search Console for errors, ensure robots.txt allows crawling
