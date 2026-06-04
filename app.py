import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="static", static_url_path="", template_folder="templates")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-for-production")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False


VALID_ROLES = {"resident", "landlord"}
requests_data = []
messages_data = []


def build_user(username, email, role, password, display_name=None):
    return {
        "username": username,
        "email": email,
        "role": role,
        "password": generate_password_hash(password, method="pbkdf2:sha256"),
        "profile": {"displayName": display_name or username},
        "contact": {"email": email, "preferred": "email"},
        "prefs": {"emailUpdates": True, "communityVisible": True},
        "stats": {"requests": 0, "posts": 0},
    }


def make_user_response(user):
    return {
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "profile": user.get("profile", {}),
        "contact": user.get("contact", {}),
        "prefs": user.get("prefs", {}),
        "stats": user.get("stats", {}),
    }


@app.context_processor
def inject_context():
    return {
        "year": datetime.now().year,
        "user": get_current_user(),
    }

users = {
    "resident123": build_user("resident123", "resident@example.com", "resident", "resident123", "Resident User"),
    "landlord123": build_user("landlord123", "landlord@example.com", "landlord", "landlord123", "Landlord User"),
}


def get_current_user():
    username = session.get("username")
    return users.get(username)


def find_user(identifier):
    return users.get(identifier) or next((u for u in users.values() if u["email"] == identifier), None)


def require_current_user():
    user = get_current_user()
    if not user:
        return None
    return user


@app.route("/api/auth/me")
def auth_me():
    user = require_current_user()
    if not user:
        return jsonify({"user": None}), 401
    return jsonify({"user": make_user_response(user)})


@app.route("/api/auth/login", methods=("POST",))
def api_login():
    data = request.get_json(silent=True) or request.form
    identifier = data.get("username", "").strip()
    password = data.get("password", "")
    selected_role = data.get("role", "").strip().lower()

    user = find_user(identifier)
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid username or password."}), 401

    if selected_role and selected_role != user["role"]:
        return jsonify({"error": "The selected role does not match your account role."}), 403

    session["username"] = user["username"]
    return jsonify({"status": "ok", "user": make_user_response(user)})


@app.route("/api/auth/register", methods=("POST",))
def api_register():
    data = request.get_json(silent=True) or request.form
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    role = data.get("role", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or role not in VALID_ROLES or not password:
        return jsonify({"error": "Username, email, valid role and password are required."}), 400

    if username in users or any(user["email"] == email for user in users.values()):
        return jsonify({"error": "That username or email is already registered."}), 409

    users[username] = build_user(username, email, role, password)
    session["username"] = username
    return jsonify({"status": "created", "user": make_user_response(users[username])}), 201


@app.route("/api/auth/logout", methods=("POST",))
def api_logout():
    session.pop("username", None)
    return jsonify({"status": "ok"})


@app.route("/api/forms/<form_type>", methods=("POST",))
def submit_form(form_type):
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401

    if form_type == "cleaning":
        payload = {
            "type": request.form.get("type", ""),
            "date": request.form.get("date", ""),
            "propertyId": request.form.get("propertyId", ""),
            "user": user["username"],
            "submittedAt": datetime.utcnow().isoformat() + "Z",
            "status": "open",
            "category": "cleaning",
        }
        requests_data.append(payload)
        user.setdefault("stats", {}).setdefault("requests", 0)
        user["stats"]["requests"] += 1
        return jsonify({"status": "ok", "payload": payload})

    if form_type == "repairs":
        payload = {
            "issue": request.form.get("issue", ""),
            "propertyId": request.form.get("propertyId", ""),
            "user": user["username"],
            "submittedAt": datetime.utcnow().isoformat() + "Z",
            "status": "open",
            "category": "repairs",
        }
        requests_data.append(payload)
        user.setdefault("stats", {}).setdefault("requests", 0)
        user["stats"]["requests"] += 1
        return jsonify({"status": "ok", "payload": payload})

    if form_type == "message":
        payload = {
            "message": request.form.get("message", ""),
            "user": user["username"],
            "submittedAt": datetime.utcnow().isoformat() + "Z",
            "category": "community",
        }
        messages_data.append(payload)
        user.setdefault("stats", {}).setdefault("posts", 0)
        user["stats"]["posts"] += 1
        return jsonify({"status": "ok", "payload": payload})

    return jsonify({"error": "unknown_form"}), 404


@app.route("/profile/about", methods=("POST",))
def profile_about():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    user["profile"] = {
        "displayName": data.get("displayName", user.get("profile", {}).get("displayName", "")),
        "unit": data.get("unit", user.get("profile", {}).get("unit", "")),
        "bio": data.get("bio", user.get("profile", {}).get("bio", "")),
    }
    return jsonify({"status": "ok", "profile": user["profile"]})


@app.route("/profile/contact", methods=("POST",))
def profile_contact():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    user["contact"] = {
        "email": data.get("email", user.get("contact", {}).get("email", user["email"])),
        "phone": data.get("phone", user.get("contact", {}).get("phone", "")),
        "preferred": data.get("preferred", user.get("contact", {}).get("preferred", "email")),
    }
    return jsonify({"status": "ok", "contact": user["contact"]})


@app.route("/profile/prefs", methods=("POST",))
def profile_prefs():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    user["prefs"] = {
        "emailUpdates": bool(data.get("emailUpdates", user.get("prefs", {}).get("emailUpdates", False))),
        "communityVisible": bool(data.get("communityVisible", user.get("prefs", {}).get("communityVisible", False))),
    }
    return jsonify({"status": "ok", "prefs": user["prefs"]})


@app.route("/profile/avatar", methods=("POST",))
def profile_avatar():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    file = request.files.get("avatar")
    if file:
        user["profile"]["avatarUrl"] = "/assets/logo.svg"
    return jsonify({"status": "ok", "profile": user["profile"]})


@app.route("/profile/activity")
def profile_activity():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    requests = [r for r in requests_data if r.get("user") == user["username"]]
    posts = [m for m in messages_data if m.get("user") == user["username"]]
    notifications = []
    return jsonify({"requests": requests, "posts": posts, "notifications": notifications})


@app.route("/")
def index():
    return render_template("index.html", user=get_current_user())


@app.route("/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        identifier = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        selected_role = request.form.get("role", "").strip().lower()

        if not identifier or not password:
            flash("Please enter both username and password.", "error")
            return redirect(url_for("login"))

        user = find_user(identifier)

        if not user or not check_password_hash(user["password"], password):
            flash("Invalid username or password.", "error")
            return redirect(url_for("login"))

        if selected_role and selected_role != user["role"]:
            flash("The selected role does not match your account role.", "error")
            return redirect(url_for("login"))

        session["username"] = user["username"]
        flash("You have successfully signed in.", "success")
        return redirect(url_for("dashboard"))

    return render_template("login.html", user=get_current_user())


@app.route("/register", methods=("GET", "POST"))
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        role = request.form.get("role", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not email or role not in VALID_ROLES or not password:
            flash("All fields are required.", "error")
            return redirect(url_for("register"))

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return redirect(url_for("register"))

        if username in users or any(user["email"] == email for user in users.values()):
            flash("That username or email is already registered.", "error")
            return redirect(url_for("register"))

        users[username] = build_user(username, email, role, password)
        session["username"] = username
        flash("Your account has been created. Welcome to Baylis Property LTD!", "success")
        return redirect(url_for("dashboard"))

    return render_template("register.html", user=get_current_user())


@app.route("/logout")
def logout():
    session.pop("username", None)
    flash("You have been logged out.", "success")
    return redirect(url_for("index"))


@app.route("/dashboard")
def dashboard():
    user = get_current_user()
    if not user:
        flash("Please sign in to access your dashboard.", "error")
        return redirect(url_for("login"))
    return render_template("dashboard.html", user=user)


@app.route("/privacy")
def privacy():
    return render_template("privacy.html", user=get_current_user())


@app.route("/terms")
def terms():
    return render_template("terms.html", user=get_current_user())


@app.route("/<page>.html")
def render_static_page(page):
    allowed_pages = {
        "index", "login", "register", "resident", "landlord", "community",
        "profile", "settings", "reset", "privacy", "terms", "404",
    }
    if page not in allowed_pages:
        return not_found(None)
    return render_template(f"{page}.html", user=get_current_user())


@app.route("/resident")
def resident_alias():
    return redirect(url_for("render_static_page", page="resident"))


@app.route("/landlord")
def landlord_alias():
    return redirect(url_for("render_static_page", page="landlord"))


@app.route("/community")
def community_alias():
    return redirect(url_for("render_static_page", page="community"))


@app.route("/profile")
def profile_alias():
    return redirect(url_for("render_static_page", page="profile"))


@app.route("/settings")
def settings_alias():
    return redirect(url_for("render_static_page", page="settings"))


@app.route("/reset")
def reset_alias():
    return redirect(url_for("render_static_page", page="reset"))


@app.errorhandler(404)
def not_found(error):
    return render_template("404.html", user=get_current_user()), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)
