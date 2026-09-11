"""Python/Flask backend entrypoint.

Replaces server/app.js (Express). Session secret, DB path, and allowed CORS
origins are loaded from environment variables via config.py -- config.py
raises at import time if the session secret is unset, so this app fails
fast instead of falling back to a hardcoded default secret.
"""

import os
import sys
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory, session

# When this file is run directly (`python backend/app.py`), it loads as the
# module `__main__`. routes/me.py and routes/dashboard.py import
# `login_required` via `from app import login_required`, which would
# otherwise force Python to load this same file a second time under the
# name "app" -- re-executing it from the top and colliding with the
# still-in-progress `routes.dashboard`/`routes.me` imports below. Aliasing
# "app" to this already-executing module up front makes that import resolve
# to the one module object that's actually running, regardless of whether
# it's loaded as `__main__` or `app`.
sys.modules.setdefault("app", sys.modules[__name__])

import config
from routes.auth import auth_bp
from session_store import FileSystemSessionInterface, FileSystemSessionStore

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")
FRONTEND_DIST_DIR = os.path.join(REPO_ROOT, "frontend", "dist")

# Serve the built React app (frontend/dist) once it exists (S-0008); until
# then, fall back to the legacy AngularJS public/ directory so the Phase 1
# client keeps working. This is a static-root fallback, not a dev proxy --
# in local dev, run the Vite dev server separately and point it at this API.
STATIC_DIR = FRONTEND_DIST_DIR if os.path.isdir(FRONTEND_DIST_DIR) else PUBLIC_DIR

app = Flask(__name__, static_folder=None)

app.config["SECRET_KEY"] = config.SESSION_SECRET
app.config["SESSION_COOKIE_NAME"] = "session"
app.config["SESSION_STORE"] = FileSystemSessionStore(config.SESSION_FILE_DIR)
app.session_interface = FileSystemSessionInterface(app.config["SESSION_STORE"])

app.register_blueprint(auth_bp)


def login_required(view):
    """Reusable auth guard: matches legacy 401 {"error": "not logged in"}.

    Intended for reuse by backend/routes/me.py and backend/routes/dashboard.py
    (added in a later step) as well as any routes defined here.
    """

    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user"):
            return jsonify(error="not logged in"), 401
        return view(*args, **kwargs)

    return wrapped


# routes/me.py and routes/dashboard.py import `login_required` from this
# module, so they're imported here -- after login_required is defined --
# rather than alongside the other top-level imports, to avoid a circular
# import (this module would otherwise still be mid-initialization, with no
# login_required attribute yet, when they try to import it).
from routes.dashboard import dashboard_bp  # noqa: E402
from routes.me import me_bp  # noqa: E402

app.register_blueprint(me_bp)
app.register_blueprint(dashboard_bp)


@app.after_request
def apply_cors(response):
    origin = request.headers.get("Origin")
    if origin and origin in config.ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the built frontend (or legacy public/) statically."""
    full_path = os.path.join(STATIC_DIR, path) if path else ""
    if path and os.path.isfile(full_path):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", "3000")))
