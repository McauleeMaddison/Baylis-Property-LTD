# Baylis Property LTD

This project uses Python and Flask for the backend.

Baylis Property LTD is a small property management web application for residents and landlords. It demonstrates a Python Flask server, HTML templates, static CSS and JavaScript assets, session-based login, registration, profile updates, and simple in-memory request/message data.

## Unit 3 Requirement Evidence

The Unit 3 resubmission requires a Python backend. This repository now contains the required Flask project structure:

```text
Baylis-Property/
├── app.py
├── requirements.txt
├── templates/
├── static/
└── README.md
```

## What Each Part Does

`app.py` is the Python backend. It creates the Flask application, defines the website routes, handles login and registration, stores the current user in the Flask session, protects API routes, and returns HTML or JSON responses.

`requirements.txt` lists the Python package needed to run the backend. At the moment the project only needs Flask.

`templates/` contains the HTML pages rendered or served by Flask. Examples include `index.html`, `login.html`, `register.html`, `dashboard.html`, `resident.html`, `landlord.html`, `profile.html`, `privacy.html`, and `terms.html`.

`static/` contains frontend assets used by the templates. This includes CSS, JavaScript, images, logos, and the favicon.

`README.md` explains how to install, run, and evidence the Python/Flask backend for assessment.

## Technology Used

| Area | Technology |
| --- | --- |
| Backend language | Python |
| Backend framework | Flask |
| Templates | HTML with Jinja2 support |
| Frontend assets | CSS and JavaScript |
| Authentication | Flask sessions and Werkzeug password hashing |
| Data storage | In-memory Python dictionaries and lists |

## How To Run The Project

1. Open a terminal in the project folder.
2. Install the Python dependency:

```bash
python3 -m pip install -r requirements.txt
```

3. Start the Flask backend:

```bash
python3 app.py
```

4. Open the application in a browser:

```text
http://127.0.0.1:5000
```

## Test Accounts

| Username | Password | Role |
| --- | --- | --- |
| `resident123` | `resident123` | Resident |
| `landlord123` | `landlord123` | Landlord |

## Main Flask Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/login` | Login page and form handler |
| `/register` | Registration page and form handler |
| `/logout` | Clears the current Flask session |
| `/dashboard` | Protected dashboard page |
| `/resident.html` | Resident portal page |
| `/landlord.html` | Landlord portal page |
| `/community.html` | Community page |
| `/profile.html` | Profile page |
| `/api/auth/me` | Returns the logged-in user as JSON |
| `/api/auth/login` | JSON login endpoint |
| `/api/auth/register` | JSON registration endpoint |
| `/api/auth/logout` | JSON logout endpoint |
| `/api/forms/cleaning` | Stores a cleaning request |
| `/api/forms/repairs` | Stores a repair request |
| `/api/forms/message` | Stores a community message |
| `/profile/about` | Updates profile information |
| `/profile/contact` | Updates contact information |
| `/profile/prefs` | Updates user preferences |
| `/profile/avatar` | Handles avatar upload requests |
| `/profile/activity` | Returns the current user's requests and posts |

## How The Backend Works

1. Flask starts in `app.py`.
2. The user visits a route such as `/login`.
3. Flask renders the matching template from `templates/`.
4. When the user submits a form, Flask reads the request data.
5. Passwords are checked with Werkzeug password hashing.
6. A successful login stores the username in the Flask session.
7. Protected routes check the session before returning private data.
8. Static files are loaded from `static/`.

## Assessment Notes

The active backend for this resubmission is Python and Flask. Run `python3 app.py` and visit `http://127.0.0.1:5000` to review the Flask version.

The data is stored in memory for this diploma submission, so newly registered users, requests, and messages reset when the Flask server restarts. This keeps the repair simple and makes the Python backend clear for Unit 3.

## Quick Verification

Use these commands to check the backend:

```bash
python3 -m py_compile app.py
python3 app.py
```

If the server starts and the login/register pages load, the required Python Flask backend is present.
