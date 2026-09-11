"""Migration 0001: create the `users` table.

Replaces the legacy pattern of running ad hoc `CREATE TABLE IF NOT EXISTS`
inline at every server boot (see server/db.js) with a tracked, standalone
migration file. The table's own SQL still uses `CREATE TABLE IF NOT
EXISTS` -- that's a normal idempotent-migration pattern, not a repeat of
the defect being fixed (running untracked ad hoc DDL at boot time, with no
migration file to review, version, or replay).

Usable two ways:
  - As a script:  python 0001_create_users.py [db_path]
  - As a module:  run(db_path) -- returns a SQLAlchemy engine, and is
    imported by backend/seed.py, and later by backend/routes/auth.py
    (S-0006, a separate step/lane) for a shared DB connection helper. This
    migration does not implement any login/credential-check query itself.
"""

import os
import sys

from sqlalchemy import create_engine, text

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data.sqlite"
)

CREATE_USERS_TABLE_SQL = text(
    "CREATE TABLE IF NOT EXISTS users ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "username TEXT NOT NULL UNIQUE, "
    "password_hash TEXT NOT NULL"
    ")"
)


def get_engine(db_path):
    """Returns a SQLAlchemy engine for the sqlite database at db_path."""
    return create_engine("sqlite:///%s" % db_path)


def resolve_db_path(db_path=None):
    """Resolves the effective db path: explicit arg > DB_PATH env > default."""
    return db_path or os.environ.get("DB_PATH", DEFAULT_DB_PATH)


def run(db_path=None):
    """Applies this migration (idempotent) and returns the engine used."""
    engine = get_engine(resolve_db_path(db_path))
    with engine.begin() as conn:
        conn.execute(CREATE_USERS_TABLE_SQL)
    return engine


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    run(target)
    print("migration 0001_create_users applied to %s" % resolve_db_path(target))
