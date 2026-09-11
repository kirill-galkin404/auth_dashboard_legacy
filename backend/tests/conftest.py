"""Shared pytest fixtures for backend tests.

Sets required environment variables (SESSION_SECRET, DB_PATH,
SESSION_FILE_DIR) and seeds a real admin user into a temporary sqlite
database *before* `app`/`config` are imported, since config.py reads its
settings from the environment at import time and raises if SESSION_SECRET
is unset.
"""

import os
import sys
import tempfile

import pytest

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

ADMIN_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture(scope="session")
def admin_credentials():
    return {"username": "admin", "password": ADMIN_PASSWORD}


@pytest.fixture(scope="session")
def app_module():
    """Configures the environment, seeds a temp DB, and imports the app."""
    tmp_dir = tempfile.mkdtemp(prefix="auth-dashboard-test-")
    db_path = os.path.join(tmp_dir, "test-data.sqlite")
    session_dir = os.path.join(tmp_dir, "flask_session")

    os.environ["SESSION_SECRET"] = "test-session-secret"
    os.environ["DB_PATH"] = db_path
    os.environ["SESSION_FILE_DIR"] = session_dir
    os.environ.setdefault("ALLOWED_ORIGINS", "")

    import seed as seed_module

    seed_module.seed(db_path=db_path, password=ADMIN_PASSWORD)

    import app as app_module  # noqa: F401 (imported for its side effects/state)

    return app_module


@pytest.fixture()
def client(app_module):
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as test_client:
        yield test_client


@pytest.fixture()
def db_path(app_module):
    import config

    return config.DB_PATH
