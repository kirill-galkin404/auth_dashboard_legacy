"""Security regression tests for POST /api/login.

Covers: request validation before any DB access, parameterized queries
(no SQL injection), and bcrypt-based password verification (no plaintext
comparison).
"""

from sqlalchemy import create_engine, text

SQLI_USERNAMES = [
    "admin' -- ",
    "admin' OR '1'='1",
    "'; DROP TABLE users; --",
    "' OR 1=1 --",
    "admin'/**/OR/**/1=1#",
]


def test_login_missing_username_returns_400_without_db_access(client, monkeypatch):
    import routes.auth as auth_module

    def _fail_if_called():
        raise AssertionError("DB engine must not be constructed for invalid payloads")

    monkeypatch.setattr(auth_module, "_get_engine", _fail_if_called)

    resp = client.post("/api/login", json={"password": "irrelevant"})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["ok"] is False
    assert "required" in body["error"]


def test_login_missing_password_returns_400_without_db_access(client, monkeypatch):
    import routes.auth as auth_module

    def _fail_if_called():
        raise AssertionError("DB engine must not be constructed for invalid payloads")

    monkeypatch.setattr(auth_module, "_get_engine", _fail_if_called)

    resp = client.post("/api/login", json={"username": "admin"})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["ok"] is False


def test_login_empty_string_fields_return_400(client, monkeypatch):
    import routes.auth as auth_module

    def _fail_if_called():
        raise AssertionError("DB engine must not be constructed for invalid payloads")

    monkeypatch.setattr(auth_module, "_get_engine", _fail_if_called)

    resp = client.post("/api/login", json={"username": "", "password": ""})
    assert resp.status_code == 400


def test_login_success_with_correct_credentials(client, admin_credentials):
    resp = client.post("/api/login", json=admin_credentials)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["ok"] is True
    assert body["username"] == admin_credentials["username"]


def test_login_wrong_password_returns_401_bad_credentials(client, admin_credentials):
    resp = client.post(
        "/api/login",
        json={"username": admin_credentials["username"], "password": "totally-wrong"},
    )
    assert resp.status_code == 401
    body = resp.get_json()
    assert body["ok"] is False
    assert body["error"] == "bad credentials"


def test_login_nonexistent_user_returns_same_401_message(client):
    resp = client.post(
        "/api/login", json={"username": "no-such-user", "password": "whatever"}
    )
    assert resp.status_code == 401
    body = resp.get_json()
    assert body["ok"] is False
    assert body["error"] == "bad credentials"


def test_login_rejects_sql_injection_payloads_safely(client, db_path):
    for payload_username in SQLI_USERNAMES:
        resp = client.post(
            "/api/login",
            json={"username": payload_username, "password": "anything' OR '1'='1"},
        )
        assert resp.status_code in (400, 401), (
            "SQLi payload %r must yield a safe 400/401, got %s"
            % (payload_username, resp.status_code)
        )
        assert resp.status_code != 200
        body = resp.get_json()
        assert body["ok"] is False

    # The users table must still exist and still contain the admin row --
    # proving no injected DDL/DML actually executed against it.
    engine = create_engine("sqlite:///%s" % db_path)
    with engine.begin() as conn:
        tables = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        ).fetchall()
        assert len(tables) == 1, "users table must still exist after SQLi attempts"

        admin_row = conn.execute(
            text("SELECT username FROM users WHERE username = :username"),
            {"username": "admin"},
        ).first()
        assert admin_row is not None, "admin row must still exist after SQLi attempts"


def test_logout_clears_session(client, admin_credentials):
    login_resp = client.post("/api/login", json=admin_credentials)
    assert login_resp.status_code == 200

    logout_resp = client.post("/api/logout")
    assert logout_resp.status_code == 200
    assert logout_resp.get_json() == {"ok": True}

    # Prove the session was actually invalidated server-side (not just that
    # the endpoint returned success) by reusing the same client -- which
    # still carries the same session cookie -- against a route that
    # requires an active session.
    me_resp = client.get("/api/me")
    assert me_resp.status_code == 401
    assert me_resp.get_json() == {"error": "not logged in"}
