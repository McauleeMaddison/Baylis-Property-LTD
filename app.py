from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="static", static_url_path="", template_folder="templates")
app.secret_key = "change-this-secret-key"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False


requests_data = []
messages_data = []


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
    "resident123": {
        "username": "resident123",
        "email": "resident@example.com",
        "role": "resident",
        "password": generate_password_hash("resident123"),
        "profile": {"displayName": "Resident User"},
        "contact": {"email": "resident@example.com"},
        "prefs": {"emailUpdates": True, "communityVisible": True},
        "stats": {"requests": 0, "posts": 0},
    },
    "landlord123": {
        "username": "landlord123",
        "email": "landlord@example.com",
        "role": "landlord",
        "password": generate_password_hash("landlord123"),
        "profile": {"displayName": "Landlord User"},
        "contact": {"email": "landlord@example.com"},
        "prefs": {"emailUpdates": False, "communityVisible": False},
        "stats": {"requests": 0, "posts": 0},
    },
}


def get_current_user():
    username = session.get("username")
    return users.get(username)


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

        user = users.get(identifier)
        if not user:
            user = next((u for u in users.values() if u["email"] == identifier), None)

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

        if not username or not email or not role or not password:
            flash("All fields are required.", "error")
            return redirect(url_for("register"))

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return redirect(url_for("register"))

        if username in users or any(user["email"] == email for user in users.values()):
            flash("That username or email is already registered.", "error")
            return redirect(url_for("register"))

        users[username] = {
            "username": username,
            "email": email,
            "role": role,
            "password": generate_password_hash(password),
        }
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
