# pyright: reportMissingImports=false
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from flask import (
    Flask,
    g,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    session,
    flash,
    url_for,
)  # type: ignore[reportMissingImports]
from werkzeug.middleware.proxy_fix import ProxyFix  # type: ignore[reportMissingImports]
from werkzeug.security import check_password_hash, generate_password_hash  # type: ignore[reportMissingImports]


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = os.environ.get("DATABASE_PATH", str(BASE_DIR / "instance" / "baylis.sqlite3"))
VALID_ROLES = {"resident", "landlord"}
VALID_REQUEST_STATUSES = {"open", "in_progress", "done", "closed"}


def env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


app = Flask(__name__, static_folder="static", static_url_path="", template_folder="templates")
app.config["DATABASE"] = DATABASE_PATH
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-for-production")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = env_flag("FORCE_HTTPS", False)
app.config["LANDLORD_REGISTRATION_CODE"] = os.environ.get("LANDLORD_REGISTRATION_CODE", "").strip()
app.config["SEED_DEMO_USERS"] = env_flag("SEED_DEMO_USERS", False)

if env_flag("TRUST_PROXY", False):
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('resident', 'landlord')),
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    unit TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    preferred_contact TEXT DEFAULT 'email',
    email_updates INTEGER DEFAULT 1,
    community_visible INTEGER DEFAULT 1,
    avatar_url TEXT DEFAULT '',
    property_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('cleaning', 'repair')),
    cleaning_type TEXT DEFAULT '',
    issue TEXT DEFAULT '',
    date TEXT DEFAULT '',
    property_id TEXT,
    username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    photos_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT '',
    message TEXT NOT NULL,
    username TEXT NOT NULL,
    pinned INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_username TEXT,
    target_role TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    related_type TEXT DEFAULT '',
    related_id TEXT DEFAULT '',
    read_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (target_username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_username TEXT,
    event TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (actor_username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    sid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);
"""


DEFAULT_PROPERTIES = [
    ("baylis-house-flat-1", "Baylis House - Flat 1"),
    ("baylis-house-flat-2", "Baylis House - Flat 2"),
    ("baylis-house-flat-3", "Baylis House - Flat 3"),
]

DEFAULT_USERS = [
    ("resident123", "resident@example.com", "resident", "resident123", "Resident User", "baylis-house-flat-1"),
    ("landlord123", "landlord@example.com", "landlord", "landlord123", "Landlord User", None),
]


def utc_now():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def parse_iso(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def get_db():
    if "db" not in g:
        db_path = app.config["DATABASE"]
        if db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_database():
    db = get_db()
    db.executescript(SCHEMA_SQL)
    now = utc_now()
    for property_id, label in DEFAULT_PROPERTIES:
        db.execute(
            """
            INSERT OR IGNORE INTO properties (id, label, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (property_id, label, now, now),
        )

    if app.config.get("TESTING") or app.config.get("SEED_DEMO_USERS"):
        for username, email, role, password, display_name, property_id in DEFAULT_USERS:
            db.execute(
                """
                INSERT OR IGNORE INTO users (
                    username, email, role, password_hash, display_name, property_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    username,
                    email,
                    role,
                    generate_password_hash(password, method="pbkdf2:sha256"),
                    display_name,
                    property_id,
                    now,
                    now,
                ),
            )
    db.commit()


def get_request_data():
    return request.get_json(silent=True) or request.form


def user_select_sql(where_clause):
    return f"""
        SELECT u.*, p.label AS property_label
        FROM users u
        LEFT JOIN properties p ON p.id = u.property_id
        {where_clause}
    """


def get_user_row(username):
    if not username:
        return None
    return get_db().execute(user_select_sql("WHERE u.username = ?"), (username,)).fetchone()


def find_user_row(identifier):
    if not identifier:
        return None
    ident = identifier.strip()
    return get_db().execute(
        user_select_sql("WHERE u.username = ? OR lower(u.email) = lower(?)"),
        (ident, ident),
    ).fetchone()


def count_user_requests(username):
    return get_db().execute(
        "SELECT COUNT(*) FROM service_requests WHERE username = ?",
        (username,),
    ).fetchone()[0]


def count_user_posts(username):
    return get_db().execute(
        "SELECT COUNT(*) FROM community_posts WHERE username = ?",
        (username,),
    ).fetchone()[0]


def make_user_response(row):
    if row is None:
        return None
    return {
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "profile": {
            "displayName": row["display_name"],
            "unit": row["unit"] or "",
            "bio": row["bio"] or "",
            "avatarUrl": row["avatar_url"] or "",
            "propertyId": row["property_id"] or "",
            "propertyLabel": row["property_label"] or "",
        },
        "contact": {
            "email": row["email"],
            "phone": row["phone"] or "",
            "preferred": row["preferred_contact"] or "email",
        },
        "prefs": {
            "emailUpdates": bool(row["email_updates"]),
            "communityVisible": bool(row["community_visible"]),
        },
        "stats": {
            "requests": count_user_requests(row["username"]),
            "posts": count_user_posts(row["username"]),
        },
    }


def get_current_user():
    username = session.get("username")
    if not username:
        return None
    sid = session.get("sid")
    if sid:
        record = get_db().execute(
            "SELECT revoked_at FROM auth_sessions WHERE sid = ?",
            (sid,),
        ).fetchone()
        if record and record["revoked_at"]:
            session.clear()
            return None
    return make_user_response(get_user_row(username))


def require_current_user():
    user = get_current_user()
    if not user:
        return None
    return user


def require_role(*roles):
    user = require_current_user()
    if not user or user["role"] not in roles:
        return None
    return user


def validate_landlord_registration(role, provided_code):
    if role != "landlord":
        return None

    expected_code = str(app.config.get("LANDLORD_REGISTRATION_CODE") or "").strip()
    if not expected_code:
        return "Landlord registration is invitation-only. Please contact Baylis Property LTD."

    candidate = str(provided_code or "").strip()
    if not candidate or not secrets.compare_digest(candidate, expected_code):
        return "Invalid landlord registration code."

    return None


def log_event(event, severity="info", user=None, metadata=None):
    actor = None
    if isinstance(user, dict):
        actor = user.get("username")
    elif isinstance(user, str):
        actor = user
    elif session.get("username"):
        actor = session.get("username")
    get_db().execute(
        """
        INSERT INTO audit_logs (actor_username, event, severity, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (actor, event, severity, json.dumps(metadata or {}), utc_now()),
    )


def create_notification(title, body, target_username=None, target_role=None, related_type="", related_id=""):
    get_db().execute(
        """
        INSERT INTO notifications (
            target_username, target_role, title, body, related_type, related_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (target_username, target_role, title, body, related_type, str(related_id or ""), utc_now()),
    )


def ensure_session_record(username):
    sid = session.get("sid") or secrets.token_urlsafe(24)
    session["sid"] = sid
    now = utc_now()
    get_db().execute(
        """
        INSERT INTO auth_sessions (sid, username, user_agent, ip_address, created_at, last_seen)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET
            username = excluded.username,
            user_agent = excluded.user_agent,
            ip_address = excluded.ip_address,
            last_seen = excluded.last_seen,
            revoked_at = NULL
        """,
        (
            sid,
            username,
            request.headers.get("User-Agent", "")[:255],
            request.remote_addr or "",
            now,
            now,
        ),
    )


@app.before_request
def refresh_auth_session():
    if not session.get("username") or not session.get("sid"):
        return
    get_db().execute(
        "UPDATE auth_sessions SET last_seen = ? WHERE sid = ? AND revoked_at IS NULL",
        (utc_now(), session["sid"]),
    )
    get_db().commit()


@app.context_processor
def inject_context():
    return {
        "year": datetime.now().year,
        "user": get_current_user(),
    }


def request_select_sql(where_clause=""):
    return f"""
        SELECT
            r.*,
            p.label AS property_label,
            u.display_name,
            u.username AS resident_username
        FROM service_requests r
        JOIN users u ON u.username = r.username
        LEFT JOIN properties p ON p.id = r.property_id
        {where_clause}
    """


def row_to_request(row):
    photos = []
    if row["photos_json"]:
        try:
            photos = json.loads(row["photos_json"])
        except json.JSONDecodeError:
            photos = []
    property_label = row["property_label"] or ""
    return {
        "id": row["id"],
        "type": row["type"],
        "category": row["type"],
        "cleaningType": row["cleaning_type"] or "",
        "issue": row["issue"] or "",
        "date": row["date"] or "",
        "propertyId": row["property_id"] or "",
        "propertyLabel": property_label,
        "address": property_label,
        "user": row["resident_username"],
        "name": row["display_name"] or row["resident_username"],
        "status": row["status"],
        "photos": photos,
        "createdAt": row["created_at"],
        "submittedAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "closedAt": row["closed_at"] or "",
    }


def fetch_request_by_id(request_id):
    row = get_db().execute(
        request_select_sql("WHERE r.id = ?"),
        (request_id,),
    ).fetchone()
    return row_to_request(row) if row else None


def slugify_property(label):
    base = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:48] or "property"
    candidate = base
    counter = 2
    db = get_db()
    while db.execute("SELECT 1 FROM properties WHERE id = ?", (candidate,)).fetchone():
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def property_response(row):
    return {
        "id": row["id"],
        "label": row["label"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_properties():
    return [
        property_response(row)
        for row in get_db().execute("SELECT * FROM properties ORDER BY label ASC").fetchall()
    ]


def post_select_sql(where_clause=""):
    return f"""
        SELECT
            p.*,
            u.display_name,
            u.username AS author_username
        FROM community_posts p
        JOIN users u ON u.username = p.username
        {where_clause}
    """


def comments_for_post(post_id):
    rows = get_db().execute(
        """
        SELECT c.*, u.display_name
        FROM community_comments c
        JOIN users u ON u.username = c.username
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        """,
        (post_id,),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "author": row["display_name"] or row["username"],
            "username": row["username"],
            "message": row["message"],
            "createdAt": row["created_at"],
        }
        for row in rows
    ]


def row_to_post(row):
    author = row["display_name"] or row["author_username"]
    return {
        "id": row["id"],
        "title": row["title"] or "Community update",
        "message": row["message"],
        "author": author,
        "name": author,
        "username": row["author_username"],
        "pinned": bool(row["pinned"]),
        "likes": row["likes"] or 0,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "comments": comments_for_post(row["id"]),
    }


def create_service_request(user, request_type, data):
    db = get_db()
    property_id = (data.get("propertyId") or user["profile"].get("propertyId") or "").strip()
    if not property_id:
        return None, "A property must be selected before submitting a request."
    property_row = db.execute("SELECT id FROM properties WHERE id = ?", (property_id,)).fetchone()
    if not property_row:
        return None, "Selected property was not found."

    now = utc_now()
    if request_type == "cleaning":
        cleaning_type = (data.get("type") or data.get("cleaningType") or "").strip()
        date = (data.get("date") or "").strip()
        if not cleaning_type or not date:
            return None, "Cleaning type and date are required."
        issue = ""
    elif request_type == "repair":
        cleaning_type = ""
        date = ""
        issue = (data.get("issue") or "").strip()
        if not issue:
            return None, "Repair issue is required."
    else:
        return None, "Unknown request type."

    photos = []
    if request.files:
        photos = [file.filename for file in request.files.getlist("photos") if file.filename][:4]

    cursor = db.execute(
        """
        INSERT INTO service_requests (
            type, cleaning_type, issue, date, property_id, username, status, photos_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
        """,
        (
            request_type,
            cleaning_type,
            issue,
            date,
            property_id,
            user["username"],
            json.dumps(photos),
            now,
            now,
        ),
    )
    request_id = cursor.lastrowid
    detail = cleaning_type if request_type == "cleaning" else issue
    create_notification(
        "New resident request",
        f"{user['profile'].get('displayName') or user['username']} submitted: {detail}",
        target_role="landlord",
        related_type="request",
        related_id=request_id,
    )
    log_event("request_created", user=user, metadata={"requestId": request_id, "type": request_type})
    db.commit()
    return fetch_request_by_id(request_id), None


@app.route("/api/security/csrf")
def csrf_token():
    token = session.get("csrf_token") or secrets.token_urlsafe(32)
    session["csrf_token"] = token
    response = make_response(jsonify({"csrfToken": token}))
    response.set_cookie(
        "csrfToken",
        token,
        secure=app.config["SESSION_COOKIE_SECURE"],
        httponly=False,
        samesite="Lax",
    )
    return response


@app.route("/api/auth/me")
def auth_me():
    user = require_current_user()
    if not user:
        return jsonify({"user": None}), 401
    return jsonify({"user": user})


@app.route("/api/auth/login", methods=("POST",))
def api_login():
    data = get_request_data()
    identifier = data.get("username", "").strip()
    password = data.get("password", "")
    selected_role = data.get("role", "").strip().lower()

    user_row = find_user_row(identifier)
    if not user_row or not check_password_hash(user_row["password_hash"], password):
        log_event("login_failed", "warning", metadata={"identifier": identifier})
        get_db().commit()
        return jsonify({"error": "Invalid username or password."}), 401

    if selected_role and selected_role != user_row["role"]:
        log_event("login_role_mismatch", "warning", user=user_row["username"], metadata={"selectedRole": selected_role})
        get_db().commit()
        return jsonify({"error": "The selected role does not match your account role."}), 403

    session["username"] = user_row["username"]
    ensure_session_record(user_row["username"])
    log_event("login_success", user=user_row["username"])
    get_db().commit()
    return jsonify({"status": "ok", "user": make_user_response(get_user_row(user_row["username"]))})


@app.route("/api/auth/register", methods=("POST",))
def api_register():
    data = get_request_data()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    role = data.get("role", "").strip().lower()
    password = data.get("password", "")
    landlord_code = data.get("landlordCode") or data.get("landlord_code") or ""

    if not username or not email or role not in VALID_ROLES or not password:
        return jsonify({"error": "Username, email, valid role and password are required."}), 400

    landlord_error = validate_landlord_registration(role, landlord_code)
    if landlord_error:
        log_event("landlord_registration_blocked", "warning", metadata={"username": username, "email": email})
        get_db().commit()
        return jsonify({"error": landlord_error}), 403

    if find_user_row(username) or find_user_row(email):
        return jsonify({"error": "That username or email is already registered."}), 409

    now = utc_now()
    get_db().execute(
        """
        INSERT INTO users (username, email, role, password_hash, display_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            username,
            email,
            role,
            generate_password_hash(password, method="pbkdf2:sha256"),
            username,
            now,
            now,
        ),
    )
    session["username"] = username
    ensure_session_record(username)
    log_event("user_registered", user=username, metadata={"role": role})
    get_db().commit()
    return jsonify({"status": "created", "user": make_user_response(get_user_row(username))}), 201


@app.route("/api/auth/logout", methods=("POST",))
def api_logout():
    sid = session.get("sid")
    if sid:
        get_db().execute("UPDATE auth_sessions SET revoked_at = ? WHERE sid = ?", (utc_now(), sid))
        log_event("logout", user=session.get("username"))
        get_db().commit()
    session.clear()
    return jsonify({"status": "ok"})


@app.route("/api/auth/change-password", methods=("POST",))
def api_change_password():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = get_request_data()
    current = data.get("current", "")
    password = data.get("password", "")
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    user_row = get_user_row(user["username"])
    if not check_password_hash(user_row["password_hash"], current):
        return jsonify({"error": "Current password is incorrect."}), 403
    get_db().execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?",
        (generate_password_hash(password, method="pbkdf2:sha256"), utc_now(), user["username"]),
    )
    log_event("password_changed", user=user)
    get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/auth/request-reset", methods=("POST",))
def api_request_reset():
    data = get_request_data()
    identifier = data.get("username") or data.get("email") or ""
    user_row = find_user_row(identifier)
    if user_row:
        now = datetime.utcnow().replace(microsecond=0)
        token = secrets.token_urlsafe(24)
        get_db().execute(
            """
            INSERT INTO password_resets (token, username, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                token,
                user_row["username"],
                now.isoformat() + "Z",
                (now + timedelta(hours=1)).isoformat() + "Z",
            ),
        )
        log_event("password_reset_requested", user=user_row["username"])
        get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/auth/reset", methods=("POST",))
def api_reset_password():
    data = get_request_data()
    token = data.get("token", "").strip()
    password = data.get("password", "")
    if not token or len(password) < 6:
        return jsonify({"error": "Valid token and password are required."}), 400
    row = get_db().execute(
        "SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL",
        (token,),
    ).fetchone()
    if not row or parse_iso(row["expires_at"]) < datetime.utcnow():
        return jsonify({"error": "Reset token is invalid or expired."}), 400
    get_db().execute(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?",
        (generate_password_hash(password, method="pbkdf2:sha256"), utc_now(), row["username"]),
    )
    get_db().execute("UPDATE password_resets SET used_at = ? WHERE token = ?", (utc_now(), token))
    log_event("password_reset_completed", user=row["username"])
    get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/auth/sessions")
def api_sessions():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    rows = get_db().execute(
        """
        SELECT * FROM auth_sessions
        WHERE username = ? AND revoked_at IS NULL
        ORDER BY last_seen DESC
        """,
        (user["username"],),
    ).fetchall()
    return jsonify({
        "sessions": [
            {
                "sid": row["sid"],
                "userAgent": row["user_agent"],
                "ipAddress": row["ip_address"],
                "createdAt": row["created_at"],
                "lastSeen": row["last_seen"],
                "current": row["sid"] == session.get("sid"),
            }
            for row in rows
        ]
    })


@app.route("/api/auth/sessions/revoke", methods=("POST",))
def api_revoke_session():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    sid = get_request_data().get("sid", "")
    if not sid or sid == session.get("sid"):
        return jsonify({"error": "Cannot revoke the current session here."}), 400
    get_db().execute(
        "UPDATE auth_sessions SET revoked_at = ? WHERE sid = ? AND username = ?",
        (utc_now(), sid, user["username"]),
    )
    log_event("session_revoked", user=user, metadata={"sid": sid})
    get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/auth/logout-all", methods=("POST",))
def api_logout_all():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    get_db().execute(
        "UPDATE auth_sessions SET revoked_at = ? WHERE username = ? AND revoked_at IS NULL",
        (utc_now(), user["username"]),
    )
    log_event("logout_all", user=user)
    get_db().commit()
    session.clear()
    return jsonify({"status": "ok"})


@app.route("/api/properties", methods=("GET", "POST"))
def api_properties():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    if request.method == "GET":
        return jsonify({
            "properties": list_properties(),
            "selectedPropertyId": user["profile"].get("propertyId", ""),
        })
    if user["role"] != "landlord":
        return jsonify({"error": "landlord access required"}), 403
    label = (get_request_data().get("label") or "").strip()
    if not label:
        return jsonify({"error": "Property label is required."}), 400
    now = utc_now()
    property_id = slugify_property(label)
    try:
        get_db().execute(
            "INSERT INTO properties (id, label, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (property_id, label, now, now),
        )
    except sqlite3.IntegrityError:
        return jsonify({"error": "That property already exists."}), 409
    log_event("property_created", user=user, metadata={"propertyId": property_id})
    get_db().commit()
    return jsonify({"property": property_response(get_db().execute("SELECT * FROM properties WHERE id = ?", (property_id,)).fetchone())}), 201


@app.route("/api/properties/<property_id>", methods=("PATCH", "DELETE"))
def api_property_detail(property_id):
    user = require_role("landlord")
    if not user:
        return jsonify({"error": "landlord access required"}), 403
    row = get_db().execute("SELECT * FROM properties WHERE id = ?", (property_id,)).fetchone()
    if not row:
        return jsonify({"error": "Property not found."}), 404
    if request.method == "PATCH":
        label = (get_request_data().get("label") or "").strip()
        if not label:
            return jsonify({"error": "Property label is required."}), 400
        try:
            get_db().execute(
                "UPDATE properties SET label = ?, updated_at = ? WHERE id = ?",
                (label, utc_now(), property_id),
            )
        except sqlite3.IntegrityError:
            return jsonify({"error": "That property already exists."}), 409
        log_event("property_updated", user=user, metadata={"propertyId": property_id})
        get_db().commit()
        return jsonify({"property": property_response(get_db().execute("SELECT * FROM properties WHERE id = ?", (property_id,)).fetchone())})
    get_db().execute("DELETE FROM properties WHERE id = ?", (property_id,))
    log_event("property_deleted", user=user, metadata={"propertyId": property_id})
    get_db().commit()
    return "", 204


@app.route("/api/profile/property", methods=("POST",))
def api_profile_property():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    property_id = (get_request_data().get("propertyId") or "").strip()
    row = get_db().execute("SELECT * FROM properties WHERE id = ?", (property_id,)).fetchone()
    if not row:
        return jsonify({"error": "Selected property was not found."}), 404
    get_db().execute(
        "UPDATE users SET property_id = ?, updated_at = ? WHERE username = ?",
        (property_id, utc_now(), user["username"]),
    )
    log_event("profile_property_updated", user=user, metadata={"propertyId": property_id})
    get_db().commit()
    return jsonify({
        "status": "ok",
        "property": property_response(row),
        "user": make_user_response(get_user_row(user["username"])),
    })


@app.route("/api/requests")
def api_requests():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    if user["role"] == "landlord":
        rows = get_db().execute(request_select_sql("ORDER BY r.created_at DESC")).fetchall()
    else:
        rows = get_db().execute(
            request_select_sql("WHERE r.username = ? ORDER BY r.created_at DESC"),
            (user["username"],),
        ).fetchall()
    return jsonify([row_to_request(row) for row in rows])


@app.route("/api/requests/<int:request_id>", methods=("GET", "PATCH", "DELETE"))
def api_request_detail(request_id):
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    current = fetch_request_by_id(request_id)
    if not current:
        return jsonify({"error": "Request not found."}), 404
    if user["role"] != "landlord" and current["user"] != user["username"]:
        return jsonify({"error": "forbidden"}), 403
    if request.method == "GET":
        return jsonify(current)
    if request.method == "DELETE":
        if user["role"] != "landlord" and current["status"] != "open":
            return jsonify({"error": "Only open requests can be deleted by residents."}), 403
        get_db().execute("DELETE FROM service_requests WHERE id = ?", (request_id,))
        log_event("request_deleted", user=user, metadata={"requestId": request_id})
        get_db().commit()
        return "", 204
    data = get_request_data()
    status = (data.get("status") or current["status"]).strip().lower()
    if status not in VALID_REQUEST_STATUSES:
        return jsonify({"error": "Invalid status."}), 400
    if user["role"] != "landlord" and status != current["status"]:
        return jsonify({"error": "Only landlords can update request status."}), 403
    get_db().execute(
        """
        UPDATE service_requests
        SET status = ?, issue = COALESCE(NULLIF(?, ''), issue), updated_at = ?, closed_at = ?
        WHERE id = ?
        """,
        (
            status,
            (data.get("issue") or "").strip(),
            utc_now(),
            utc_now() if status in {"done", "closed"} else None,
            request_id,
        ),
    )
    log_event("request_updated", user=user, metadata={"requestId": request_id, "status": status})
    get_db().commit()
    return jsonify(fetch_request_by_id(request_id))


@app.route("/api/requests/<int:request_id>/status", methods=("POST",))
def api_request_status(request_id):
    user = require_role("landlord")
    if not user:
        return jsonify({"error": "landlord access required"}), 403
    status = (get_request_data().get("status") or "").strip().lower()
    if status not in VALID_REQUEST_STATUSES:
        return jsonify({"error": "Invalid status."}), 400
    current = fetch_request_by_id(request_id)
    if not current:
        return jsonify({"error": "Request not found."}), 404
    get_db().execute(
        "UPDATE service_requests SET status = ?, updated_at = ?, closed_at = ? WHERE id = ?",
        (status, utc_now(), utc_now() if status in {"done", "closed"} else None, request_id),
    )
    create_notification(
        "Request status updated",
        f"Your {current['type']} request is now {status.replace('_', ' ')}.",
        target_username=current["user"],
        related_type="request",
        related_id=request_id,
    )
    log_event("request_status_updated", user=user, metadata={"requestId": request_id, "status": status})
    get_db().commit()
    return jsonify(fetch_request_by_id(request_id))


@app.route("/api/forms/<form_type>", methods=("POST",))
def submit_form(form_type):
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    if form_type == "cleaning":
        payload, error = create_service_request(user, "cleaning", request.form)
    elif form_type == "repairs":
        payload, error = create_service_request(user, "repair", request.form)
    elif form_type == "message":
        message = (request.form.get("message") or "").strip()
        if not message:
            return jsonify({"error": "Message is required."}), 400
        post = create_community_post(user, {"title": "Resident update", "message": message})
        return jsonify({"status": "ok", "payload": post})
    else:
        return jsonify({"error": "unknown_form"}), 404
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"status": "ok", "payload": payload})


def create_community_post(user, data):
    now = utc_now()
    title = (data.get("title") or "Community update").strip() or "Community update"
    message = (data.get("message") or "").strip()
    cursor = get_db().execute(
        """
        INSERT INTO community_posts (title, message, username, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (title, message, user["username"], now, now),
    )
    post_id = cursor.lastrowid
    create_notification(
        "New community post",
        f"{user['profile'].get('displayName') or user['username']} posted: {title}",
        target_role="landlord",
        related_type="post",
        related_id=post_id,
    )
    log_event("community_post_created", user=user, metadata={"postId": post_id})
    get_db().commit()
    row = get_db().execute(post_select_sql("WHERE p.id = ?"), (post_id,)).fetchone()
    return row_to_post(row)


@app.route("/api/community", methods=("GET", "POST"))
def api_community():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    if request.method == "GET":
        rows = get_db().execute(post_select_sql("ORDER BY p.created_at DESC")).fetchall()
        return jsonify([row_to_post(row) for row in rows])
    data = get_request_data()
    if not (data.get("message") or "").strip():
        return jsonify({"error": "Message is required."}), 400
    return jsonify(create_community_post(user, data)), 201


@app.route("/api/posts")
def api_posts():
    return api_community()


@app.route("/api/community/<int:post_id>/comments", methods=("POST",))
def api_community_comments(post_id):
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    post = get_db().execute("SELECT * FROM community_posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "Post not found."}), 404
    message = (get_request_data().get("message") or "").strip()
    if not message:
        return jsonify({"error": "Comment message is required."}), 400
    get_db().execute(
        "INSERT INTO community_comments (post_id, username, message, created_at) VALUES (?, ?, ?, ?)",
        (post_id, user["username"], message, utc_now()),
    )
    if post["username"] != user["username"]:
        create_notification(
            "New comment",
            f"{user['profile'].get('displayName') or user['username']} commented on your post.",
            target_username=post["username"],
            related_type="post",
            related_id=post_id,
        )
    log_event("community_comment_created", user=user, metadata={"postId": post_id})
    get_db().commit()
    return jsonify({"status": "ok", "comments": comments_for_post(post_id)}), 201


@app.route("/api/notifications")
def api_notifications():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    rows = get_db().execute(
        """
        SELECT * FROM notifications
        WHERE
            target_username = ?
            OR target_role = ?
            OR (target_username IS NULL AND target_role IS NULL)
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user["username"], user["role"], limit),
    ).fetchall()
    return jsonify({
        "notifications": [
            {
                "id": row["id"],
                "title": row["title"],
                "body": row["body"],
                "relatedType": row["related_type"],
                "relatedId": row["related_id"],
                "readAt": row["read_at"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]
    })


@app.route("/api/notifications/read", methods=("POST",))
def api_notifications_read():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    ids = get_request_data().get("ids") or []
    if not isinstance(ids, list):
        ids = []
    now = utc_now()
    for notification_id in ids:
        get_db().execute(
            """
            UPDATE notifications
            SET read_at = ?
            WHERE id = ?
              AND (target_username = ? OR target_role = ? OR (target_username IS NULL AND target_role IS NULL))
            """,
            (now, notification_id, user["username"], user["role"]),
        )
    get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/notifications/read-all", methods=("POST",))
def api_notifications_read_all():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    get_db().execute(
        """
        UPDATE notifications
        SET read_at = COALESCE(read_at, ?)
        WHERE target_username = ? OR target_role = ? OR (target_username IS NULL AND target_role IS NULL)
        """,
        (utc_now(), user["username"], user["role"]),
    )
    get_db().commit()
    return jsonify({"status": "ok"})


@app.route("/api/security/audit")
def api_security_audit():
    user = require_role("landlord")
    if not user:
        return jsonify({"error": "landlord access required"}), 403
    limit = min(max(int(request.args.get("limit", 50)), 1), 100)
    rows = get_db().execute(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return jsonify({
        "logs": [
            {
                "id": row["id"],
                "userId": row["actor_username"],
                "event": row["event"],
                "severity": row["severity"],
                "metadata": json.loads(row["metadata_json"] or "{}"),
                "createdAt": row["created_at"],
            }
            for row in rows
        ]
    })


@app.route("/api/profile/about", methods=("POST",))
@app.route("/profile/about", methods=("POST",))
def profile_about():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = get_request_data()
    get_db().execute(
        """
        UPDATE users
        SET display_name = ?, unit = ?, bio = ?, updated_at = ?
        WHERE username = ?
        """,
        (
            data.get("displayName", user["profile"].get("displayName", "")).strip() or user["username"],
            data.get("unit", user["profile"].get("unit", "")).strip(),
            data.get("bio", user["profile"].get("bio", "")).strip(),
            utc_now(),
            user["username"],
        ),
    )
    log_event("profile_about_updated", user=user)
    get_db().commit()
    return jsonify({"status": "ok", "profile": make_user_response(get_user_row(user["username"]))["profile"]})


@app.route("/api/profile/contact", methods=("POST",))
@app.route("/profile/contact", methods=("POST",))
def profile_contact():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = get_request_data()
    email = data.get("email", user["email"]).strip()
    phone = data.get("phone", user["contact"].get("phone", "")).strip()
    preferred = data.get("preferred", user["contact"].get("preferred", "email")).strip() or "email"
    get_db().execute(
        "UPDATE users SET email = ?, phone = ?, preferred_contact = ?, updated_at = ? WHERE username = ?",
        (email, phone, preferred, utc_now(), user["username"]),
    )
    log_event("profile_contact_updated", user=user)
    get_db().commit()
    return jsonify({"status": "ok", "contact": make_user_response(get_user_row(user["username"]))["contact"]})


@app.route("/api/profile/prefs", methods=("POST",))
@app.route("/profile/prefs", methods=("POST",))
def profile_prefs():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    data = get_request_data()
    get_db().execute(
        """
        UPDATE users
        SET email_updates = ?, community_visible = ?, updated_at = ?
        WHERE username = ?
        """,
        (
            1 if data.get("emailUpdates", user["prefs"].get("emailUpdates", False)) else 0,
            1 if data.get("communityVisible", user["prefs"].get("communityVisible", False)) else 0,
            utc_now(),
            user["username"],
        ),
    )
    log_event("profile_preferences_updated", user=user)
    get_db().commit()
    return jsonify({"status": "ok", "prefs": make_user_response(get_user_row(user["username"]))["prefs"]})


@app.route("/api/profile/avatar", methods=("POST",))
@app.route("/profile/avatar", methods=("POST",))
def profile_avatar():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    avatar_url = "/assets/logo.svg"
    if request.files.get("avatar"):
        avatar_url = "/assets/logo.svg"
    get_db().execute(
        "UPDATE users SET avatar_url = ?, updated_at = ? WHERE username = ?",
        (avatar_url, utc_now(), user["username"]),
    )
    log_event("profile_avatar_updated", user=user)
    get_db().commit()
    return jsonify({"status": "ok", "profile": make_user_response(get_user_row(user["username"]))["profile"]})


@app.route("/api/profile/activity")
@app.route("/profile/activity")
def profile_activity():
    user = require_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    requests_query = request_select_sql("WHERE r.username = ? ORDER BY r.created_at DESC")
    requests = [row_to_request(row) for row in get_db().execute(requests_query, (user["username"],)).fetchall()]
    posts = [
        row_to_post(row)
        for row in get_db().execute(post_select_sql("WHERE p.username = ? ORDER BY p.created_at DESC"), (user["username"],)).fetchall()
    ]
    notifications = api_notifications().json["notifications"]
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

        user_row = find_user_row(identifier)
        if not user_row or not check_password_hash(user_row["password_hash"], password):
            flash("Invalid username or password.", "error")
            log_event("login_failed", "warning", metadata={"identifier": identifier})
            get_db().commit()
            return redirect(url_for("login"))

        if selected_role and selected_role != user_row["role"]:
            flash("The selected role does not match your account role.", "error")
            log_event("login_role_mismatch", "warning", user=user_row["username"], metadata={"selectedRole": selected_role})
            get_db().commit()
            return redirect(url_for("login"))

        session["username"] = user_row["username"]
        ensure_session_record(user_row["username"])
        log_event("login_success", user=user_row["username"])
        get_db().commit()
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
        landlord_code = request.form.get("landlordCode", "")

        if not username or not email or role not in VALID_ROLES or not password:
            flash("All fields are required.", "error")
            return redirect(url_for("register"))

        landlord_error = validate_landlord_registration(role, landlord_code)
        if landlord_error:
            flash(landlord_error, "error")
            log_event("landlord_registration_blocked", "warning", metadata={"username": username, "email": email})
            get_db().commit()
            return redirect(url_for("register"))

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return redirect(url_for("register"))

        if find_user_row(username) or find_user_row(email):
            flash("That username or email is already registered.", "error")
            return redirect(url_for("register"))

        now = utc_now()
        get_db().execute(
            """
            INSERT INTO users (username, email, role, password_hash, display_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                username,
                email,
                role,
                generate_password_hash(password, method="pbkdf2:sha256"),
                username,
                now,
                now,
            ),
        )
        session["username"] = username
        ensure_session_record(username)
        log_event("user_registered", user=username, metadata={"role": role})
        get_db().commit()
        flash("Your account has been created. Welcome to Baylis Property LTD!", "success")
        return redirect(url_for("dashboard"))

    return render_template("register.html", user=get_current_user())


@app.route("/logout")
def logout():
    sid = session.get("sid")
    if sid:
        get_db().execute("UPDATE auth_sessions SET revoked_at = ? WHERE sid = ?", (utc_now(), sid))
        log_event("logout", user=session.get("username"))
        get_db().commit()
    session.clear()
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

    protected_pages = {
        "resident": {"resident"},
        "landlord": {"landlord"},
        "community": VALID_ROLES,
        "profile": VALID_ROLES,
        "settings": VALID_ROLES,
    }
    if page in protected_pages:
        user = get_current_user()
        if not user:
            flash("Please sign in to continue.", "error")
            return redirect(url_for("login"))
        if user["role"] not in protected_pages[page]:
            flash("Your account role cannot access that page.", "error")
            return redirect(url_for("dashboard"))

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


with app.app_context():
    init_database()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=env_flag("FLASK_DEBUG", False), host="0.0.0.0", port=port)
