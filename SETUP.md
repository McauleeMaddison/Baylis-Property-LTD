# Local Setup

Follow these steps to run the app locally (development):

1. Copy environment file and populate secrets (do not commit):

```bash
cp server/.env.example server/.env
# edit server/.env with your local DB credentials and API keys
```

2. Start a local MySQL for development (Docker example):

```bash
docker run --name baylis-mysql \
  -e MYSQL_ROOT_PASSWORD=root_pw_temp \
  -e MYSQL_DATABASE=baylis_db \
  -e MYSQL_USER=Mcaulee \
  -e MYSQL_PASSWORD=Blazefj1312 \
  -p 3306:3306 -d mysql:8
```

3. Install server dependencies and create tables:

```bash
cd server
npm install
node scripts/mysql-init.js
```

4. Start the app (seeds demo users):

```bash
npm run dev
# or for production-like
NODE_ENV=production npm start
```

5. Connect to DB:

```bash
mysql -h localhost -u Mcaulee -p baylis_db
# password: Blazefj1312 (if using the example above)
```

Security note: `server/.env` must never be committed to source control. Rotate any credentials that were exposed.
