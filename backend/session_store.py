"""Custom, dependency-light persistent session store for Flask.

Legacy Express app used express-session's default in-memory MemoryStore
(sessions lost on every restart -- a defect). This module replaces that with
a real filesystem-backed store: session data is written to JSON files on
disk, so sessions survive process restarts.
"""

import json
import os
import time
import uuid

from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict


class FileSystemSessionStore:
    """Persists session data as JSON files on disk.

    Each session is stored in its own file named after its session id, so
    sessions survive process restarts (unlike an in-memory MemoryStore).
    """

    def __init__(self, directory, default_ttl_seconds=60 * 60 * 24):
        self.directory = directory
        self.default_ttl_seconds = default_ttl_seconds
        os.makedirs(self.directory, exist_ok=True)

    def _path(self, session_id):
        safe_id = "".join(c for c in session_id if c.isalnum() or c in "-_")
        return os.path.join(self.directory, "session_%s.json" % safe_id)

    def create(self):
        """Allocate a brand new session id (no data persisted yet)."""
        return uuid.uuid4().hex

    def load(self, session_id):
        """Return the stored dict for session_id, or None if absent/expired."""
        path = self._path(session_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r") as f:
                record = json.load(f)
        except (json.JSONDecodeError, OSError, ValueError):
            return None
        if record.get("expires_at") is not None and record["expires_at"] < time.time():
            self.destroy(session_id)
            return None
        return record.get("data", {})

    def save(self, session_id, data, ttl_seconds=None):
        """Persist data for session_id to disk, resetting its expiry."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        record = {"data": data, "expires_at": time.time() + ttl}
        path = self._path(session_id)
        tmp_path = path + ".tmp-%s" % uuid.uuid4().hex
        # Session records contain the authenticated user's id/username, so
        # they're created owner-only (0o600) rather than relying on the
        # process umask, which would commonly leave them world-readable
        # (e.g. mode 0o644) on a shared host.
        fd = os.open(tmp_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            with os.fdopen(fd, "w") as f:
                json.dump(record, f)
        except Exception:
            os.remove(tmp_path)
            raise
        os.replace(tmp_path, path)

    def destroy(self, session_id):
        """Remove the persisted record for session_id, if any."""
        path = self._path(session_id)
        if os.path.exists(path):
            os.remove(path)


class FileSystemSession(CallbackDict, SessionMixin):
    def __init__(self, initial=None, sid=None, new=False):
        def on_update(_self):
            _self.modified = True

        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.new = new
        self.modified = False


class FileSystemSessionInterface(SessionInterface):
    """Wires FileSystemSessionStore into Flask's session machinery."""

    session_class = FileSystemSession

    def __init__(self, store):
        self.store = store

    def open_session(self, app, request):
        cookie_name = app.config.get("SESSION_COOKIE_NAME", "session")
        sid = request.cookies.get(cookie_name)
        if not sid:
            return self.session_class(sid=self.store.create(), new=True)
        data = self.store.load(sid)
        if data is None:
            return self.session_class(sid=self.store.create(), new=True)
        return self.session_class(data, sid=sid)

    def save_session(self, app, session, response):
        cookie_name = app.config.get("SESSION_COOKIE_NAME", "session")
        domain = self.get_cookie_domain(app)
        path = self.get_cookie_path(app)

        if not session:
            if session.modified:
                self.store.destroy(session.sid)
                response.delete_cookie(cookie_name, domain=domain, path=path)
            return

        if not session.modified and not session.new:
            return

        self.store.save(session.sid, dict(session))
        response.set_cookie(
            cookie_name,
            session.sid,
            httponly=self.get_cookie_httponly(app),
            secure=self.get_cookie_secure(app),
            samesite=self.get_cookie_samesite(app),
            domain=domain,
            path=path,
        )
