# User Requirements Evidence

## Project Aim

Baylis Property LTD is a mobile-friendly property management web application for residents and landlords. The application supports account access, resident maintenance requests, property selection, landlord request management, community communication, notifications, and audit evidence.

## User Groups

| User group | Need |
| --- | --- |
| Resident | Submit cleaning and repair requests for their selected property. |
| Resident | Track request status and view recent activity. |
| Resident | Post community messages and comment on posts. |
| Landlord | View all resident requests across properties. |
| Landlord | Filter requests by property, status, type, and search text. |
| Landlord | Update request status and create property records. |
| Landlord | Review notifications and audit events. |

## Functional Requirements

| ID | Requirement | Evidence in project |
| --- | --- | --- |
| FR1 | Users can register and log in with resident or landlord roles. | `app.py` auth routes and tests. |
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
| FR12 | Users can update profile/contact/preferences. | `/api/profile/about`, `/api/profile/contact`, `/api/profile/prefs`. |

## Non-Functional Requirements

| ID | Requirement | Evidence in project |
| --- | --- | --- |
| NFR1 | Mobile-friendly layout. | Responsive templates and CSS with viewport metadata. |
| NFR2 | Persistent data storage. | SQLite database configured through `DATABASE_PATH`. |
| NFR3 | Secure session handling. | Flask sessions, `SECRET_KEY`, HTTP-only session cookie. |
| NFR4 | Production deployment support. | `Dockerfile`, `gunicorn`, Render notes. |
| NFR5 | Testable backend behaviour. | `tests/test_app.py` automated test coverage. |
| NFR6 | Clear assessment evidence. | Documentation in `docs/`. |

## Acceptance Criteria

1. A resident can log in, select a property, submit a request, and see it after a new browser session.
2. A landlord can log in, view the resident request, and update its status.
3. The resident receives a notification when the landlord updates the request.
4. A landlord can add, rename, and delete a property.
5. A resident can create a community post and a landlord can comment on it.
6. Protected pages redirect unauthenticated users to login.
7. The automated test suite passes.
