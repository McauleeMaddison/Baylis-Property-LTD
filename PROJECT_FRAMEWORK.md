Project framework and recommended structure
=========================================

This file describes a complete, production-ready project layout for the Baylis-Property-LTD application and explains where to put things and why. The repository already contains a working full-stack app; these additions scaffold a robust structure for development, deployment, testing and maintenance.

Top-level layout (recommended)
------------------------------

- `server/` — backend application (Node/Express). Already present.
  - `index.js` — main API server entry.
  - `app.js` — static server entry (optional).
  - `models/` — models and database access.
  - `scripts/` — DB init / seed scripts.
  - `Dockerfile` — container image for the server.
  - `pm2.config.js` — process manager config for production.
  - `migrate.js` — migration runner (added).
- `migrations/` — SQL migrations (added) to track schema changes.
- `docker-compose.yml` — development / CI topology (app + db) (added).
- `SETUP.md` / `README.md` — project docs (already present; updated).
- `.github/workflows/ci.yml` — CI (already present; may be extended).
- `CONTRIBUTING.md` / `SECURITY.md` — governance and disclosure workflows (added).
- `Makefile` — convenient commands for local development (added).

Goals of this framework
-----------------------

- Make development reproducible via `docker-compose`.
- Provide a minimal container setup for production builds.
- Keep secrets out of source control (use `.env` locally and env management for CI/prod).
- Track schema changes via migrations in `migrations/`.
- Provide basic process management for production with PM2.
- Provide simple commands in `Makefile` for common tasks.

How to use
----------

1. Copy `server/.env.example` to `server/.env` and populate credentials.
2. Start services in development:

   ```bash
   make up
   make migrate
   make start
   ```

3. To run migrations manually:

   ```bash
   node server/migrate.js migrations/0001_init.sql
   ```

Notes for maintainers
---------------------

- Add each schema change as a new migration file (`migrations/0002_*.sql`) and update CI to run migrations before tests/deploys.
- For production deployment: build the `server` image using the `server/Dockerfile`, run behind a reverse proxy (NGINX) and use a managed MySQL service for reliability.

This scaffold is intentionally minimal — it provides the foundation for CI/CD, migration management, and containerized development. Extend it with tests, linter configs, and monitoring as needed for your Level 5 diploma submission.
