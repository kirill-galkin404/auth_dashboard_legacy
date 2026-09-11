"""Application configuration sourced entirely from environment variables.

No secrets are hardcoded here. If the session-secret environment variable is
missing, importing this module raises immediately so the app fails fast at
startup instead of silently falling back to an insecure default.
"""

import os

SESSION_SECRET = os.environ.get("SESSION_SECRET")
if not SESSION_SECRET:
    raise RuntimeError(
        "SESSION_SECRET environment variable is not set. Refusing to start "
        "with no session secret configured (no insecure default is provided)."
    )

# Path to the SQLite database file used by the app. Defaults to a local file
# next to this module if DB_PATH is not provided, but can be overridden via
# the environment for tests/deployment.
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "data.sqlite"))

# Comma-separated list of allowed CORS origins, e.g.
# "http://localhost:5173,https://example.com"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

# Directory used by the session store to persist session data on disk.
SESSION_FILE_DIR = os.getenv(
    "SESSION_FILE_DIR", os.path.join(os.path.dirname(__file__), ".flask_session")
)

# Whether the session cookie requires HTTPS (the `Secure` cookie attribute).
# Defaults to False so local/dev HTTP setups keep working; set
# SESSION_COOKIE_SECURE=true once the app is actually served over HTTPS.
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").strip().lower() in (
    "1",
    "true",
    "yes",
)
