# Deployment And Security Evidence

## Render Deployment

The repository supports Docker-based Render deployment.

Render can build from:

```text
Dockerfile
```

The Docker container starts the Flask app through Gunicorn:

```bash
gunicorn app:app --bind 0.0.0.0:${PORT:-10000}
```

## Required Render Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Yes | Protects Flask sessions. Use a long random value. |
| `FORCE_HTTPS` | Recommended | Set to `true` on Render so secure cookies are used over HTTPS. |
| `TRUST_PROXY` | Recommended | Set to `true` on Render so Flask trusts the Render proxy headers. |
| `DATABASE_PATH` | Optional | Use `/data/baylis.sqlite3` only when a Render persistent disk is attached. |

Render sets `PORT` automatically.

## Production Security Notes

| Control | Current implementation |
| --- | --- |
| Password hashing | Werkzeug `generate_password_hash` and `check_password_hash`. |
| Session security | Flask session cookie uses `HTTPOnly` and `SameSite=Lax`. |
| HTTPS cookies | Enabled when `FORCE_HTTPS=true`. |
| Role-based access | Landlord-only routes check user role server-side. |
| Protected pages | Resident, landlord, community, profile, and settings pages redirect unauthenticated users. |
| Audit trail | Login, profile, request, property, and community workflow events are logged. |
| CSRF support | `/api/security/csrf` issues a CSRF token cookie used by the front-end helper. |
| Secrets | `.env` files are ignored by git. Use Render environment variables. |

## Deployment Evidence Checklist

1. Push latest `main` branch to GitHub.
2. Confirm Render service is connected to `McauleeMaddison/Baylis-Property-LTD`.
3. Confirm `SECRET_KEY` exists in Render.
4. Confirm `FORCE_HTTPS=true` and `TRUST_PROXY=true` in Render.
5. Run `Manual Deploy -> Clear build cache & deploy`.
6. Confirm the Render logs show Gunicorn binding to the assigned port.
7. Test `/`, `/login`, `/register`, `/resident.html`, `/landlord.html`, and `/community.html`.

## Important SQLite Deployment Note

SQLite is persistent on a normal local machine. On Render, container files can be replaced during redeploys. For true Render persistence with SQLite, add a Render disk and set:

```text
DATABASE_PATH=/data/baylis.sqlite3
```

If a persistent disk is not configured, use the app as an assessment MVP rather than a production data store.
