"""Auth routes: POST /api/login, POST /api/logout.

Login is DB-backed: it validates the incoming payload before touching the
database, then fetches the user row by username via a parameterized
SQLAlchemy query and verifies the submitted password with
`bcrypt.checkpw` (constant-time comparison against the stored bcrypt
hash). This replaces the legacy Express handler's string-concatenated SQL
(`"... WHERE username = '" + username + "' ..."`, a SQL-injection vector)
and its plaintext-equality password check.

Uses the same DB-access pattern as backend/seed.py: load
backend/migrations/0001_create_users.py by file path (its filename starts
with a digit, so it isn't importable as a dotted module) and reuse its
`run()` / `get_engine()` / `resolve_db_path()` helpers for a SQLAlchemy
engine consistent with config.DB_PATH.
"""

import importlib.util
import os

import bcrypt
from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy import text

import config

auth_bp = Blueprint("auth", __name__)

_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_HERE)


def _load_migration():
    """Loads backend/migrations/0001_create_users.py by file path.

    Mirrors backend/seed.py's `_load_migration` helper so both modules
    share the same DB engine/connection pattern.
    """
    path = os.path.join(_BACKEND_DIR, "migrations", "0001_create_users.py")
    spec = importlib.util.spec_from_file_location("migration_0001_create_users", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_migration = _load_migration()

# Created once at import time (app startup) and reused across requests,
# rather than constructing a brand-new SQLAlchemy engine and re-running the
# `CREATE TABLE IF NOT EXISTS users` migration DDL on every single login
# call. `run()` is still idempotent, so this is equivalent, just no longer
# wasteful per-request overhead.
_engine = _migration.run(_migration.resolve_db_path(config.DB_PATH))


def _get_engine():
    """Returns the shared SQLAlchemy engine for the configured DB."""
    return _engine


@auth_bp.route("/api/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    password = payload.get("password")

    if (
        not isinstance(username, str)
        or not isinstance(password, str)
        or not username.strip()
        or not password
    ):
        return jsonify(ok=False, error="username and password are required"), 400

    engine = _get_engine()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id, username, password_hash FROM users WHERE username = :username"),
            {"username": username},
        ).mappings().first()

    if row is None or not bcrypt.checkpw(
        password.encode("utf-8"), row["password_hash"].encode("utf-8")
    ):
        # Same message whether the username doesn't exist or the password is
        # wrong -- avoids disclosing which field was incorrect.
        return jsonify(ok=False, error="bad credentials"), 401

    session["user"] = {"id": row["id"], "username": row["username"]}
    session.modified = True
    return jsonify(ok=True, username=row["username"])


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session_store = current_app.config["SESSION_STORE"]
    sid = getattr(session, "sid", None)
    session.clear()
    session.modified = True
    if sid:
        session_store.destroy(sid)
    return jsonify(ok=True)
