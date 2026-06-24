"""foods trigram search index (Postgres only)

Speeds up the catalog search (`name ILIKE %q%`) once the table holds the full
USDA dump (~2M rows). Without a trigram GIN index a substring ILIKE is a
sequential scan. SQLite (tests) has no pg_trgm, so the migration is a no-op
there.

Revision ID: a1f2c3d4e5b6
Revises: 6779cc6938a9
Create Date: 2026-06-24 19:10:00.000000
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a1f2c3d4e5b6"
down_revision: str | None = "6779cc6938a9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_foods_name_trgm "
        "ON foods USING gin (lower(name) gin_trgm_ops)"
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("DROP INDEX IF EXISTS ix_foods_name_trgm")
