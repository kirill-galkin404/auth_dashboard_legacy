"""Seeds the default admin account into the `users` table.

Idempotent, matching the legacy count-based guard in server/db.js: only
inserts a row when the users table is empty, so re-running this script
never creates duplicate admin accounts.

Unlike the legacy seed (a plaintext password baked directly into
server/db.js), the seeded password here is bcrypt-hashed, and its
plaintext value is never hardcoded in this file. Set SEED_ADMIN_PASSWORD
to choose the seeded password explicitly (e.g. for local dev/CI). If it's
unset, a random secure password is generated and printed once so it can be
captured and rotated.

Usable two ways:
  - As a script:  python seed.py [db_path]
  - As a module:  seed(db_path=None, password=None) -- returns the
    plaintext password used for a newly-created admin account, or None if
    the table was already seeded (no-op).
"""

import importlib.util
import os
import secrets
import sys

import bcrypt
from sqlalchemy import text

ADMIN_USERNAME = "admin"
_HERE = os.path.dirname(os.path.abspath(__file__))


def _load_migration():
    """Loads backend/migrations/0001_create_users.py by file path.

    Its filename starts with a digit, so it isn't a valid dotted-import
    module name -- loading by path (the same trick tools like Alembic use
    for numerically-prefixed revision files) avoids needing a differently
    named module just to be importable.
    """
    path = os.path.join(_HERE, "migrations", "0001_create_users.py")
    spec = importlib.util.spec_from_file_location("migration_0001_create_users", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def seed(db_path=None, password=None):
    """Seeds the admin account if (and only if) the users table is empty.

    Returns the plaintext password used for the newly-created admin
    account, or None if the table was already seeded (no-op, idempotent).
    """
    migration = _load_migration()
    engine = migration.run(db_path)

    with engine.begin() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count and count > 0:
            return None

        plaintext_password = password or os.environ.get("SEED_ADMIN_PASSWORD")
        generated = False
        if not plaintext_password:
            plaintext_password = secrets.token_urlsafe(16)
            generated = True

        password_hash = bcrypt.hashpw(
            plaintext_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        conn.execute(
            text(
                "INSERT INTO users (username, password_hash) "
                "VALUES (:username, :password_hash)"
            ),
            {"username": ADMIN_USERNAME, "password_hash": password_hash},
        )

        if generated:
            print(
                "seeded default admin account (username=%s) with a generated "
                "password since SEED_ADMIN_PASSWORD was not set. "
                "Generated password: %s -- rotate via SEED_ADMIN_PASSWORD."
                % (ADMIN_USERNAME, plaintext_password)
            )
        else:
            print("seeded default admin account (username=%s)" % ADMIN_USERNAME)

        return plaintext_password


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    seed(target)
