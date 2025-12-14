Baylis Property LTD
====================

Modern property-management platform for landlords and residents. The application bundles secure authentication, request tracking, community messaging, and profile/settings tools into a single responsive experience.

---

Live Demo
---------
- **Frontend & API**: https://baylis-property-ltd.onrender.com (static pages auto-target the Render API at `/api`)
- **API base**: `https://baylis-property-ltd.onrender.com/api` (overridden to `/api` automatically for local development)

---

Table of Contents
-----------------
1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running the Server](#running-the-server)
7. [Testing](#testing)
8. [Deployment Guidance](#deployment-guidance)
9. [Project Structure](#project-structure)

---

Features
--------
- **Role-based portals** – dedicated dashboards for residents and landlords, including request summaries and contextual navigation.
- **Secure auth** – password hashing, CSRF protection, session management, rate limiting, and optional 2FA via one-time codes.
- **Request workflows** – submit and monitor cleaning/repair/community forms with toast notifications and local persistence.
- **Profile & settings** – update contact details, communication preferences, dark mode/accent themes, and logout-all functionality.
- **Community hub** – post announcements, comment, like, and filter/paginate threads.
- **Responsive UI** – mobile-friendly layout with dark/light modes, accessible focus states, and accent theming.

Technology Stack
----------------
- **Frontend**: Vanilla HTML/CSS/JS, modular scripts per page, global helpers in `js/script.js`.
- **Backend**: Node.js (ES modules), Express, Helmet, Morgan, `mysql2` for persistence, bcrypt for hashing.
- **Database**: MySQL 8 (tables in `migrations/0001_init.sql`).
- **Tooling**: Nodemon for dev, Jest/Supertest scaffolding for API tests, Cypress placeholder for e2e, Docker Compose for local MySQL.

Getting Started
---------------
```bash
git clone https://github.com/<your-org>/Baylis-Property-LTD.git
cd Baylis-Property-LTD
npm install             # root dev tooling
cd server
npm install             # backend dependencies
cp .env.example .env    # fill values as described below
```

Environment Variables
---------------------
Set the following keys in `server/.env` (local) and in your hosting environment:

| Key | Description |
| --- | ----------- |
| `NODE_ENV` | `development` or `production`. |
| `PORT` | HTTP port for Express (default 5000). |
| `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | MySQL connection details. |
| `SESSION_SECRET` | Long random string for cookies/CSRF/OTP HMAC. |
| `SESSION_COOKIE_NAME`, `CSRF_COOKIE_NAME`, `SESSION_TTL_MS` | Session/cookie tuning (defaults provided). |
| `TRUST_PROXY`, `FORCE_HTTPS` | Reverse proxy settings. |
| `OTP_WINDOW_MS`, `OTP_MAX_ATTEMPTS`, `RESET_WINDOW_MS`, `REQUIRE_2FA` | Security policies. |
| `APP_BASE_URL` | Public site URL (used in password reset links). |
| Optional: `GOOGLE_API_KEY`, `GOOGLE_SHEET_ID` | For sheet integrations if enabled. |

Database Setup
--------------
### Docker (local)
```bash
docker compose up -d db
# or manually:
# docker run --name baylis-mysql \
#   -e MYSQL_ROOT_PASSWORD=root_pw_temp \
#   -e MYSQL_DATABASE=baylis_db \
#   -e MYSQL_USER=baylis_user \
#   -e MYSQL_PASSWORD=baylis_pass \
#   -p 3306:3306 -d mysql:8
```

### Initialize schema & demo users
```bash
cd server
node scripts/mysql-init.js
```
The script creates tables (`users`, `requests`, `community_posts`, `sessions`, `password_resets`, `otp_challenges`) and seeds demo accounts (`resident123` / `resident123`, `landlord123` / `landlord123`).

### Manual migration / quick reset
If you prefer to run SQL migrations directly, use the ESM-friendly migrator from the repo root:
```bash
# assumes docker compose db service is already healthy
MYSQL_HOST=127.0.0.1 \
MYSQL_USER=baylis_user \
MYSQL_PASSWORD=baylis_pass \
MYSQL_DATABASE=baylis_db \
node server/migrate.js migrations/0001_init.sql
```

### Local test workflow (repeatable)
1. `docker compose up -d db` – start MySQL 8 with credentials from `docker-compose.yml`.
2. Run `node server/migrate.js migrations/0001_init.sql` (or `server/scripts/mysql-init.js`) after exporting the same credentials:
   ```bash
   MYSQL_HOST=127.0.0.1 \
   MYSQL_USER=baylis_user \
   MYSQL_PASSWORD=baylis_pass \
   MYSQL_DATABASE=baylis_db \
   node server/migrate.js migrations/0001_init.sql
   ```
3. Run API tests or start the server with those variables available.
4. Stop MySQL with `docker compose down` when you’re done.

Running the Server
------------------
```bash
cd server
npm run dev   # nodemon index.js
# or
npm start     # node index.js
```
Visit `http://localhost:5000`. OTP/reset codes appear in the server logs (look for 📧/📱 lines).

Testing
-------
```bash
cd server
npm test      # runs Jest/Supertest API suite (add tests under server/tests/)
```
E2E scaffolding exists in the root package (`npm run cypress:open`) if Cypress is installed; failures won’t block CI by default.

- For a full Render walkthrough (GitHub integration, managed MySQL, migrations, custom domains) see [`RENDER-DEPLOYMENT.md`](RENDER-DEPLOYMENT.md).

Deployment Guidance
-------------------
- **Render (recommended)**: build command `npm install && cd server && npm install`, start command `cd server && npm start`, then follow `RENDER-DEPLOYMENT.md` to provision hosting, and [`RAILWAY-MYSQL.md`](RAILWAY-MYSQL.md) if you want to plug in Railway’s free MySQL.
- **Fly / other PaaS**: configure build command `npm install && cd server && npm install`, start command `npm --prefix server start`, add env vars via the platform UI, and run `node scripts/mysql-init.js` once via the shell.
- **Traditional VPS**: clone repo, install Node + MySQL, set env vars in `/etc/environment` or process manager (PM2/systemd), `npm --prefix server install`, `node scripts/mysql-init.js`, then `pm2 start npm --name baylis -- start --prefix server`.
- Ensure HTTPS termination (Cloudflare, Nginx, or platform-provided certs) and set `FORCE_HTTPS=true` plus `TRUST_PROXY=1` behind reverse proxies.

Project Structure
-----------------
```
├── index.html / *.html         # Landing + dashboards
├── css/, js/                   # Frontend assets
├── server/
│   ├── index.js                # Express entry point
│   ├── mysql.js                # DB connection
│   ├── models/, middleware/, scripts/, tests/
│   ├── package.json
│   └── .env.example / .env
├── migrations/0001_init.sql    # Schema definition
├── docker-compose.yml          # Local MySQL helper
└── README.md                   # You are here
```

---

For questions or deployment support, open an issue or reach out via the project’s maintainer channel. Happy building! 🚀
