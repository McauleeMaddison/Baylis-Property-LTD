# Baylis Property LTD

Baylis Property LTD is a mobile-friendly property management web application for residents and landlords. It uses Python, Flask, SQLite, HTML templates, CSS, and JavaScript to support resident service requests, landlord request management, community posts, notifications, profile settings, and audit evidence.

## Level 5 Evidence Pack

The project now includes assessment evidence in `docs/`:

| File | Evidence |
| --- | --- |
| `docs/user-requirements.md` | User groups, functional requirements, non-functional requirements, and acceptance criteria. |
| `docs/database-schema.md` | Persistent database tables, relationships, and CRUD coverage. |
| `docs/testing-evidence.md` | Automated test evidence, syntax checks, and manual testing checklist. |
| `docs/deployment-and-security.md` | Render deployment settings, environment variables, and security notes. |
| `docs/landlord-workflow.md` | Landlord operational workflow evidence. |

## Project Structure

```text
Baylis-Property/
├── app.py
├── Dockerfile
├── requirements.txt
├── docs/
├── tests/
├── templates/
├── static/
└── README.md
```

## Technology Used

| Area | Technology |
| --- | --- |
| Backend language | Python |
| Backend framework | Flask |
| Production server | Gunicorn |
| Database | SQLite |
| Templates | HTML with Jinja2 support |
| Frontend assets | CSS and JavaScript |
| Authentication | Flask sessions and Werkzeug password hashing |
| Deployment | Docker-ready for Render |
| Tests | Python `unittest` |

## Key Features

- Resident and landlord login/registration
- Role-based page and API access
- Persistent SQLite database
- Resident property selection
- Cleaning and repair request creation
- Landlord request queue, filters, and status updates
- Property create, read, update, and delete workflow
- Community posts and comments
- Notifications and mark-read actions
- Profile/contact/preference updates
- Session list/revoke support
- Security audit log for landlord review
- Mobile-friendly responsive interface

## How To Run Locally

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

3. Start the Flask backend:

```bash
python3 app.py
```

4. Open the application:

```text
http://127.0.0.1:5000
```

The app creates a local SQLite database at:

```text
instance/baylis.sqlite3
```

## Test Accounts

| Username | Password | Role |
| --- | --- | --- |
| `resident123` | `resident123` | Resident |
| `landlord123` | `landlord123` | Landlord |

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/login` | Login page and form handler |
| `/register` | Registration page and form handler |
| `/dashboard` | Protected dashboard page |
| `/resident.html` | Protected resident portal |
| `/landlord.html` | Protected landlord portal |
| `/community.html` | Protected community page |
| `/profile.html` | Protected profile page |
| `/settings.html` | Protected settings page |
| `/api/auth/me` | Current user JSON |
| `/api/auth/login` | JSON login endpoint |
| `/api/auth/register` | JSON registration endpoint |
| `/api/properties` | Property list/create endpoint |
| `/api/requests` | Request list endpoint |
| `/api/forms/cleaning` | Cleaning request endpoint |
| `/api/forms/repairs` | Repair request endpoint |
| `/api/community` | Community post endpoint |
| `/api/notifications` | Notification endpoint |
| `/api/security/audit` | Landlord audit log endpoint |

## Testing

Run automated tests:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m unittest discover -s tests -v
```

Run syntax checks:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m py_compile app.py tests/test_app.py
for f in static/js/*.js; do node --check "$f" || exit 1; done
```

Latest local result:

```text
Ran 6 tests in 12.817s
OK
```

## Render Deployment

The repository includes a `Dockerfile` for Render.

Required Render environment variable:

```text
SECRET_KEY=<long random secret>
```

Recommended Render environment variables:

```text
FORCE_HTTPS=true
TRUST_PROXY=true
```

If a Render persistent disk is attached, set:

```text
DATABASE_PATH=/data/baylis.sqlite3
```

Then deploy with:

```text
Manual Deploy -> Clear build cache & deploy
```

## Assessment Note

This is now stronger than a static MVP because it includes persistent data storage, role-based workflows, CRUD behaviour, automated tests, deployment configuration, security notes, and assessment documentation. It should still be reviewed against the exact marking rubric before final submission.
