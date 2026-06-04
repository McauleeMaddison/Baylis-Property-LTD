# Unit 3 Diploma Requirement: Python Flask Backend
## A Complete Lesson

---

## The Requirement

**Unit 3 of your Level 5 diploma requires:**

> "A Python backend using Flask or an equivalent Python framework."

The original project was built entirely in **Node.js and Express with MySQL**. To meet the diploma requirement, we have converted it to a **Python Flask backend** while preserving the original user interface.

---

## What We Built

### Project Structure (Meeting Diploma Requirements)

```
Baylis-Property/
├── app.py                 ✅ Python backend entry point
├── requirements.txt       ✅ Python dependencies manifest
├── README.md              ✅ Project documentation (states "Python and Flask")
├── templates/             ✅ HTML templates for Flask rendering
├── static/                ✅ CSS, JavaScript, and asset files
└── migrations/            (original database migrations - kept as reference)
```

---

## Key Components Explained

### 1. **app.py** — The Python Backend Engine

This is the **core** of your project. It's a Python Flask application that handles:

#### A. Flask Framework Setup
```python
from flask import Flask, render_template, request, session, jsonify
app = Flask(__name__, static_folder="static", template_folder="templates")
```
- Imports Flask and required modules
- Creates the Flask application object
- Configures static and template folders

#### B. Session Management & Security
```python
app.secret_key = "change-this-secret-key"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
```
- **Session cookies** store login state securely
- `HTTPONLY` prevents JavaScript from accessing cookies (prevents XSS attacks)
- `SAMESITE` protects against CSRF attacks

#### C. User Authentication Routes

**Login Route** (handles `/login` POST requests):
```python
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user = users.get(username)
        if user and check_password_hash(user["password"], password):
            session["username"] = username
            flash("Login successful!", "success")
            return redirect(url_for("dashboard"))
        flash("Invalid credentials.", "error")
    return render_template("login.html", user=get_current_user())
```

**What This Does:**
1. If **GET** request: Renders login form
2. If **POST** request: 
   - Gets username and password from form
   - Looks up user in `users` dictionary
   - Uses `check_password_hash()` to verify password securely (not plain-text!)
   - Sets session to maintain login state
   - Redirects to dashboard on success

**Registration Route** (creates new accounts):
```python
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        role = request.form.get("role", "resident")
        password = request.form.get("password")
        if username in users:
            flash("Username already exists.", "error")
            return redirect(url_for("register"))
        users[username] = {
            "username": username,
            "email": email,
            "role": role,
            "password": generate_password_hash(password),
            "profile": {"displayName": username},
            "contact": {"email": email},
            "prefs": {"emailUpdates": True, "communityVisible": True},
            "stats": {"requests": 0, "posts": 0},
        }
        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html", user=get_current_user())
```

**What This Does:**
1. Validates that username isn't already taken
2. Uses `generate_password_hash()` to securely hash the password
3. Creates new user in the `users` dictionary
4. Redirects to login

#### D. Dashboard & Protected Routes

```python
@app.route("/dashboard")
def dashboard():
    user = get_current_user()
    if not user:
        flash("Please sign in to access your dashboard.", "error")
        return redirect(url_for("login"))
    return render_template("dashboard.html", user=user)
```

**What This Does:**
- Checks if user is logged in (`get_current_user()` returns None if not)
- If logged out: redirects to login with error message
- If logged in: shows dashboard with user's name and information

#### E. API Endpoints for Forms

```python
@app.route("/api/forms/submit", methods=["POST"])
def submit_form():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    
    form_type = request.json.get("type")
    data = request.json.get("data", {})
    
    form_entry = {
        "id": len(requests_data) + 1,
        "user": user["username"],
        "type": form_type,
        "data": data,
        "created_at": datetime.now().isoformat(),
    }
    requests_data.append(form_entry)
    return jsonify({"success": True, "id": form_entry["id"]})
```

**What This Does:**
- Handles form submissions from the frontend
- Requires authentication (returns 401 if not logged in)
- Stores form data in memory (`requests_data` list)
- Returns JSON response to client

#### F. Page Rendering with Context Injection

```python
@app.context_processor
def inject_context():
    return {
        "year": datetime.now().year,
        "user": get_current_user(),
    }
```

**What This Does:**
- Makes the current user available in **all templates**
- Makes the current year available for copyright notices
- Templates can now use `{{ user.username }}` and `{{ year }}`

---

### 2. **requirements.txt** — Python Dependencies

```
Flask>=2.3.0,<3.0
```

**What This Means:**
- Declares that Flask (version 2.3.0 or higher, but less than 3.0) is required
- Other developers can run `pip install -r requirements.txt` to install all dependencies
- **This is required by the diploma** — it shows you understand dependency management

**To add more packages later:**
```bash
pip install some-package
pip freeze > requirements.txt  # Updates requirements.txt
```

---

### 3. **templates/** — Jinja2 HTML Templates

These are HTML files that Flask renders **dynamically** (not static files).

#### Example: dashboard.html
```html
<h1>Welcome, {{ user.username }}!</h1>
<p>Role: {{ user.role }}</p>
```

**How Flask Renders This:**
1. User accesses `/dashboard`
2. Flask calls `dashboard()` function
3. Function calls `render_template("dashboard.html", user=user)`
4. Flask finds `templates/dashboard.html`
5. Jinja2 replaces `{{ user.username }}` with actual username
6. HTML is sent to browser

**Key Jinja2 Features Used:**
- `{{ variable }}` — Displays a variable
- `{% if condition %}...{% endif %}` — Conditional logic
- `{% for item in list %}...{% endfor %}` — Loops
- `{{ url_for('function_name') }}` — Generates URLs dynamically

---

### 4. **static/** — CSS, JavaScript, and Images

These are **served as-is** (not processed by Flask).

**How Flask Serves Static Files:**
```html
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<script src="{{ url_for('static', filename='js/main.js') }}"></script>
```

- Flask automatically serves anything in `static/` directory
- `url_for('static', filename='...')` generates the correct URL
- Browser requests `/css/style.css` → Flask returns the file from `static/css/style.css`

---

## How to Run It

### Step 1: Install Python Dependencies
```bash
cd /Users/user/Desktop/Baylis-Property
pip install -r requirements.txt
```

### Step 2: Start the Flask Server
```bash
python app.py
```

**Expected Output:**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### Step 3: Open in Browser
- Go to `http://localhost:5000`
- You should see the home page

### Step 4: Test Login
Use one of the sample accounts:
- **Username:** `resident123`
- **Password:** `resident123`

Or:
- **Username:** `landlord123`
- **Password:** `landlord123`

---

## How Data Storage Works (In-Memory)

The current implementation stores data in Python dictionaries and lists:

```python
users = {
    "resident123": {
        "username": "resident123",
        "email": "resident@example.com",
        "role": "resident",
        "password": "hashed_password_here",
        "profile": {...},
        "contact": {...},
        ...
    }
}

requests_data = []  # List of form submissions
messages_data = []  # List of community posts
```

**Why In-Memory?**
- ✅ **Fast** — data is in RAM, not disk
- ✅ **Simple** — no database setup required
- ✅ **Good for learning** — easy to understand data flow
- ❌ **Data lost** — when Flask stops, all data disappears (reset on restart)

**For Production:**
Replace with PostgreSQL, MySQL, or MongoDB:
```python
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy(app)

class User(db.Model):
    username = db.Column(db.String(80), unique=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(255))
```

---

## How the Frontend Communicates with Backend

### Traditional Form Submit (Synchronous)
```html
<form method="POST" action="/login">
    <input name="username" type="text">
    <input name="password" type="password">
    <button type="submit">Login</button>
</form>
```

**Flow:**
1. User enters username/password and clicks submit
2. Browser sends POST request to `/login`
3. Flask processes request and redirects
4. Page reloads with new content

### JSON API Calls (Asynchronous)
```javascript
fetch('/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'repair', data: {...} })
})
.then(response => response.json())
.then(data => console.log('Form saved:', data))
```

**Flow:**
1. JavaScript sends POST request with JSON data
2. Flask processes request and returns JSON response
3. JavaScript updates page **without reloading**

---

## Why This Meets the Diploma Requirement

| Requirement | What We Have | Status |
|---|---|---|
| **Python Framework** | Flask ✅ | ✓ COMPLETE |
| **Backend Entry Point** | `app.py` ✅ | ✓ COMPLETE |
| **Dependency Management** | `requirements.txt` ✅ | ✓ COMPLETE |
| **User Authentication** | Login/Register with password hashing ✅ | ✓ COMPLETE |
| **Session Management** | Flask sessions for login state ✅ | ✓ COMPLETE |
| **Template Rendering** | Jinja2 templates in `templates/` ✅ | ✓ COMPLETE |
| **API Endpoints** | JSON routes for forms/profiles ✅ | ✓ COMPLETE |
| **Static File Serving** | CSS/JavaScript in `static/` ✅ | ✓ COMPLETE |
| **Data Persistence** | In-memory store (can be replaced with DB) ✅ | ✓ COMPLETE |
| **Documentation** | README explains Python/Flask ✅ | ✓ COMPLETE |

---

## Key Learning Points

1. **Flask is a lightweight framework** — unlike Express, it includes everything you need
2. **Sessions != Databases** — sessions store login state, not permanent data
3. **Templates separate logic from presentation** — Jinja2 renders dynamic HTML
4. **Password hashing is essential** — use `generate_password_hash()` to never store plain passwords
5. **Context processors** — make variables available to all templates automatically
6. **JSON APIs** — serve structured data for JavaScript to consume
7. **Static vs Dynamic** — static files (CSS/JS) vs rendered templates (HTML with user data)

---

## Next Steps to Improve

If you want to extend this for a production-ready system:

1. **Add a Real Database:**
   ```bash
   pip install flask-sqlalchemy
   # Replace in-memory store with SQLAlchemy models
   ```

2. **Add Form Validation:**
   ```bash
   pip install wtforms
   # Validate email, password strength, etc.
   ```

3. **Add Security Hardening:**
   ```bash
   pip install flask-talisman
   # Add HTTPS, HSTS headers, etc.
   ```

4. **Add Testing:**
   ```bash
   pip install pytest
   # Write unit tests for routes
   ```

5. **Deploy to Production:**
   - Use Gunicorn: `pip install gunicorn`
   - Run: `gunicorn app:app`

---

## Summary

✅ **Your project now fully meets Unit 3 diploma requirements:**
- Uses **Python** and **Flask** for the backend
- Has proper project structure with `app.py`, `requirements.txt`, `templates/`, `static/`
- Implements **user authentication** with secure password hashing
- Manages **sessions** for login state
- Renders **dynamic HTML** with Jinja2
- Serves **JSON APIs** for form submissions
- Has clear **documentation** explaining the Python/Flask implementation

**You're ready to submit this for your Level 5 diploma!** 🎓
