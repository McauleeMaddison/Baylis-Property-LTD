# Baylis Property LTD

Baylis Property LTD is a mobile-friendly property management web application for residents and landlords. It uses Python, Flask, SQLite, HTML templates, CSS, and JavaScript to support resident service requests, landlord request management, property administration, community posts, notifications, profile settings, and audit evidence.

## Live Deployment

Live site: <https://baylis-property-ltd.onrender.com>

## Repository

GitHub repository: <https://github.com/McauleeMaddison/Baylis-Property-LTD>

This README is the single project documentation file for assessment and deployment evidence.

## Project Aim

The aim of the project is to provide a modern, professional property management app where:

- Residents can register, sign in, select their property, create maintenance requests, track status updates, and post community messages.
- Landlords can sign in, manage properties, view all resident requests, update request statuses, review notifications, and inspect an audit log.
- Landlord registration is invitation-code protected so public users cannot create landlord accounts without approval.
- The application demonstrates full-stack behaviour with persistent storage, server-side routing, role-based access, CRUD operations, tests, deployment configuration, and security notes.

## Project Structure

```text
Baylis-Property/
├── app.py
├── Dockerfile
├── requirements.txt
├── tests/
│   └── test_app.py
├── templates/
├── static/
│   ├── assets/
│   ├── css/
│   └── js/
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

- Resident self-registration
- Invitation-code protected landlord registration
- Role-based page and API access
- Persistent SQLite data storage
- Resident property selection
- Cleaning and repair request creation
- Landlord request queue with filters and status updates
- Property create, read, update, and delete workflow
- Community posts and comments
- Notifications and mark-read actions
- Profile, contact, and preference updates
- Session list and revoke support
- Password change and reset routes
- Security audit log for landlord review
- Mobile-friendly responsive interface
- Docker and Gunicorn production deployment support
- Demo accounts are opt-in through `SEED_DEMO_USERS=true` and should not be enabled for public production use

## User Requirements

| User group | Requirement |
| --- | --- |
| Resident | Submit cleaning and repair requests for their selected property. |
| Resident | Track request status and view recent activity. |
| Resident | Post community messages and comment on posts. |
| Landlord | View all resident requests across properties. |
| Landlord | Filter requests by property, status, type, and search text. |
| Landlord | Update request status and manage property records. |
| Landlord | Review notifications and audit events. |

## Functional Requirements Evidence

| ID | Requirement | Evidence |
| --- | --- | --- |
| FR1 | Residents can self-register; landlord accounts require a private invitation code. | `app.py` auth routes and `tests/test_app.py`. |
| FR2 | Passwords are stored securely using hashing. | Werkzeug password hashing in `app.py`. |
| FR3 | Residents can select their property. | `/api/profile/property` and resident portal. |
| FR4 | Residents can create cleaning requests. | `/api/forms/cleaning` and SQLite `service_requests`. |
| FR5 | Residents can create repair requests. | `/api/forms/repairs` and SQLite `service_requests`. |
| FR6 | Landlords can view all requests. | `/api/requests` with landlord role access. |
| FR7 | Landlords can update request status. | `/api/requests/<id>/status`. |
| FR8 | Landlords can create, edit, and delete properties. | `/api/properties` CRUD routes. |
| FR9 | Users can post community messages and comments. | `/api/community` and comment routes. |
| FR10 | Users can view notifications. | `/api/notifications`. |
| FR11 | Landlords can review an audit log. | `/api/security/audit`. |
| FR12 | Users can update profile, contact, and preferences. | `/api/profile/about`, `/api/profile/contact`, `/api/profile/prefs`. |

## Non-Functional Requirements Evidence

| ID | Requirement | Evidence |
| --- | --- | --- |
| NFR1 | Mobile-friendly layout. | Responsive templates and CSS with viewport metadata. |
| NFR2 | Persistent data storage. | SQLite database configured through `DATABASE_PATH`. |
| NFR3 | Secure session handling. | Flask sessions, `SECRET_KEY`, HTTP-only session cookie. |
| NFR4 | Production deployment support. | `Dockerfile`, Gunicorn, and Render environment notes. |
| NFR5 | Testable backend behaviour. | Automated tests in `tests/test_app.py`. |
| NFR6 | Clear assessment evidence. | Requirements, schema, testing, deployment, security, and workflow evidence in this README. |

## Acceptance Criteria

1. A resident can log in, select a property, submit a request, and see it after a new browser session.
2. A landlord can log in, view the resident request, and update its status.
3. The resident receives a notification when the landlord updates the request.
4. A landlord can add, rename, and delete a property.
5. A resident can create a community post and a landlord can comment on it.
6. Protected pages redirect unauthenticated users to login.
7. The automated test suite passes.

## Database Schema Evidence

The backend uses SQLite through Python's standard `sqlite3` module. The database path is controlled by `DATABASE_PATH`; if this is not set, the app uses:

```text
instance/baylis.sqlite3
```

| Table | Purpose |
| --- | --- |
| `users` | Stores resident and landlord accounts, profile details, contact preferences, hashed password, and selected property. |
| `properties` | Stores managed property records. |
| `service_requests` | Stores resident cleaning and repair requests with status and property assignment. |
| `community_posts` | Stores community posts. |
| `community_comments` | Stores comments linked to community posts. |
| `notifications` | Stores resident/landlord notification records and read state. |
| `audit_logs` | Stores security and workflow events for landlord review. |
| `auth_sessions` | Stores active session metadata for settings/security evidence. |
| `password_resets` | Stores password reset tokens with expiry and used state. |

## Database Relationships

| Relationship | Description |
| --- | --- |
| `users.property_id -> properties.id` | Residents can be assigned to a property. |
| `service_requests.username -> users.username` | Requests belong to the resident who created them. |
| `service_requests.property_id -> properties.id` | Requests are routed to a property. |
| `community_posts.username -> users.username` | Posts belong to the author. |
| `community_comments.post_id -> community_posts.id` | Comments belong to a post. |
| `community_comments.username -> users.username` | Comments belong to the commenter. |
| `notifications.target_username -> users.username` | Notifications can target a single user. |
| `audit_logs.actor_username -> users.username` | Audit events can be linked to the actor. |
| `auth_sessions.username -> users.username` | Session records belong to a user. |
| `password_resets.username -> users.username` | Reset tokens belong to a user. |

## CRUD Coverage

| Data area | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | Register | `/api/auth/me` | Profile/contact/prefs/password | Session logout/revoke |
| Properties | `POST /api/properties` | `GET /api/properties` | `PATCH /api/properties/<id>` | `DELETE /api/properties/<id>` |
| Requests | `POST /api/forms/cleaning`, `POST /api/forms/repairs` | `GET /api/requests`, profile activity | `PATCH /api/requests/<id>`, status route | `DELETE /api/requests/<id>` |
| Community | `POST /api/community`, comments route | `GET /api/community`, `GET /api/posts` | Comments update activity | Cascade deletion support |
| Notifications | Created by workflow events | `GET /api/notifications` | Mark read/read all | Removed when user is deleted by cascade |

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

## Landlord Workflow Evidence

The landlord portal is an operational dashboard for managing resident requests across properties.

1. The landlord logs in using the landlord account.
2. The landlord opens `/landlord.html`.
3. The dashboard loads requests, properties, community posts, notifications, and audit logs from the Flask API.
4. The landlord filters requests by property, type, status, or search term.
5. The landlord changes a request status to `open`, `in_progress`, or `done`.
6. The resident receives a notification when the request status changes.
7. The audit log records the status update event.

| Feature | Evidence |
| --- | --- |
| Request queue | `GET /api/requests` returns all requests to landlords. |
| Status updates | `POST /api/requests/<id>/status`. |
| Property management | `POST`, `PATCH`, and `DELETE /api/properties`. |
| Property-level summary | Landlord JavaScript groups requests by property. |
| Notifications | `GET /api/notifications` and mark-read routes. |
| Audit log | `GET /api/security/audit`. |
| CSV export | Landlord front end exports filtered request data. |

## How To Run Locally

1. Open a terminal in the project folder.
1. Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

1. Start the Flask backend:

```bash
python3 app.py
```

1. Open the application:

```text
http://127.0.0.1:5000
```

## Test Accounts

These accounts are seeded for automated tests and can be enabled for local demonstration by setting `SEED_DEMO_USERS=true`. Do not enable demo accounts on a public production deployment.

| Username | Password | Role |
| --- | --- | --- |
| `resident123` | `resident123` | Resident |
| `landlord123` | `landlord123` | Landlord |

## Automated Testing

Run the automated test suite:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m unittest discover -s tests -v
```

Latest local result:

```text
Ran 8 tests in 17.477s
OK
```

## Syntax Checks

Run backend and frontend syntax checks:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m py_compile app.py tests/test_app.py
for f in static/js/*.js; do node --check "$f" || exit 1; done
```

Latest local result: passed.

## Manual Test Checklist

| Area | Steps | Expected result |
| --- | --- | --- |
| Resident login | Log in as `resident123` / `resident123`. | Resident portal is available. |
| Resident property | Select a property and save. | Selected property appears as the active property. |
| Cleaning request | Submit date and cleaning type. | Request appears in resident history and landlord queue. |
| Repair request | Submit issue details. | Request appears in resident history and landlord queue. |
| Landlord login | Log in as `landlord123` / `landlord123`. | Landlord portal is available. |
| Status update | Change a request to `In progress`. | Resident notification is created. |
| Property admin | Add, rename, and delete a property. | Property list updates. |
| Community | Create a post and add a comment. | Feed shows post and comment. |
| Protected routes | Visit `/resident.html` while logged out. | User is redirected to login. |
| Landlord page security | Log in as `resident123` and visit `/landlord.html`. | User is redirected away from the landlord portal. |
| Landlord API security | Log in as `resident123` and call landlord-only APIs. | API returns `403 Forbidden`. |
| Landlord registration security | Try to register a landlord without the private code. | Registration is refused. |

## Render Deployment

The repository includes a `Dockerfile` for Docker-based Render deployment.

The container starts the Flask app through Gunicorn:

```bash
gunicorn app:app --bind 0.0.0.0:${PORT:-10000}
```

Required Render environment variable:

```text
SECRET_KEY=<long random secret>
```

Recommended Render environment variables:

```text
FORCE_HTTPS=true
TRUST_PROXY=true
LANDLORD_REGISTRATION_CODE=<private landlord invitation code>
SEED_DEMO_USERS=false
```

If `LANDLORD_REGISTRATION_CODE` is not set, public landlord self-registration is disabled. Existing landlord accounts can still sign in.
If the app was previously deployed with demo accounts, change those passwords, remove those accounts, or reset the database before public use.

If a Render persistent disk is attached, set:

```text
DATABASE_PATH=/data/baylis.sqlite3
```

Render sets `PORT` automatically.

Deployment steps:

1. Push the latest `main` branch to GitHub.
2. Confirm Render is connected to `McauleeMaddison/Baylis-Property-LTD`.
3. Confirm `SECRET_KEY` exists in Render.
4. Confirm `FORCE_HTTPS=true` and `TRUST_PROXY=true` in Render.
5. Run `Manual Deploy -> Clear build cache & deploy`.
6. Confirm Render logs show Gunicorn binding to the assigned port.
7. Test `/`, `/login`, `/register`, `/resident.html`, `/landlord.html`, and `/community.html`.

## Security Notes

| Control | Current implementation |
| --- | --- |
| Password hashing | Werkzeug `generate_password_hash` and `check_password_hash`. |
| Session security | Flask session cookie uses `HTTPOnly` and `SameSite=Lax`. |
| HTTPS cookies | Enabled when `FORCE_HTTPS=true`. |
| Role-based access | Landlord-only routes check user role server-side. |
| Landlord registration | New landlord accounts require `LANDLORD_REGISTRATION_CODE`; residents cannot create landlord accounts publicly. |
| Demo account safety | Demo users are not seeded unless `SEED_DEMO_USERS=true` or the automated test suite is running. |
| Protected pages | Resident, landlord, community, profile, and settings pages redirect unauthenticated users. |
| Audit trail | Login, profile, request, property, and community workflow events are logged. |
| CSRF support | `/api/security/csrf` issues a CSRF token cookie used by the front-end helper. |
| Secrets | `.env` files are ignored by git. Use Render environment variables. |

## SQLite Deployment Note

SQLite is persistent on a normal local machine. On Render, container files can be replaced during redeploys. For true Render persistence with SQLite, add a Render disk and set:

```text
DATABASE_PATH=/data/baylis.sqlite3
```

If a persistent disk is not configured, use the app as an assessment MVP rather than a production data store.

## Level 5 Assessment Note

This project now includes stronger evidence for a Level 5 web application submission:

- Persistent data storage
- Role-based resident and landlord workflows
- CRUD behaviour
- Automated tests
- Tests proving residents cannot access landlord pages/APIs
- Invitation-code protected landlord registration
- Deployment configuration
- Security notes
- User requirements
- Database schema evidence
- Manual testing checklist
- Landlord workflow evidence

The final submission should still be checked against the exact marking brief before hand-in.
