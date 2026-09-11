"""Auth routes: POST /api/login, POST /api/logout.

Phase-1 scaffolding only. Credential verification here is a minimal
placeholder (in-memory, bcrypt-hashed) -- it deliberately does NOT touch the
database, so it introduces no SQL-injection surface. Step S-0006 (a later
step, different lane) replaces this with real DB-backed, parameterized
credential checks. This step's job is the session store + logout + auth
guard lifecycle.
"""

import bcrypt
from flask import Blueprint, current_app, jsonify, request, session

auth_bp = Blueprint("auth", __name__)

# Placeholder credential store for scaffolding/dev only. No plaintext
# secrets, no SQL of any kind -- replaced entirely by S-0006's DB-backed
# implementation.
_PLACEHOLDER_USERS = {
    "admin": bcrypt.hashpw(b"admin123", bcrypt.gensalt()),
}


@auth_bp.route("/api/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    password = payload.get("password")

    if not username or not password or not isinstance(username, str) or not isinstance(password, str):
        return jsonify(ok=False, error="bad credentials"), 401

    stored_hash = _PLACEHOLDER_USERS.get(username)
    if stored_hash is None or not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
        return jsonify(ok=False, error="bad credentials"), 401

    session["user"] = {"username": username}
    session.modified = True
    return jsonify(ok=True, username=username)


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session_store = current_app.config["SESSION_STORE"]
    sid = getattr(session, "sid", None)
    session.clear()
    session.modified = True
    if sid:
        session_store.destroy(sid)
    return jsonify(ok=True)
