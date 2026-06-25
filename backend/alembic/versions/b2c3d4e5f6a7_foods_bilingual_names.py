"""foods bilingual names + aliases (RU/DE search)

Adds `name_ru`, `name_de` and a free-text `aliases` bag so the curated staple
catalog is searchable in Russian and German ("творог"/"Quark" → the same row).
The columns are NULL for the USDA bulk rows. On Postgres we add trigram GIN
indexes mirroring `ix_foods_name_trgm` so the extra ILIKE clauses stay indexed;
SQLite (tests) skips the index step.

Revision ID: b2c3d4e5f6a7
Revises: a1f2c3d4e5b6
Create Date: 2026-06-25 08:30:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1f2c3d4e5b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("foods", sa.Column("name_ru", sa.String(length=512), nullable=True))
    op.add_column("foods", sa.Column("name_de", sa.String(length=512), nullable=True))
    op.add_column("foods", sa.Column("aliases", sa.Text(), nullable=True))

    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    for col in ("name_ru", "name_de", "aliases"):
        op.execute(
            f"CREATE INDEX IF NOT EXISTS ix_foods_{col}_trgm "
            f"ON foods USING gin (lower({col}) gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for col in ("name_ru", "name_de", "aliases"):
            op.execute(f"DROP INDEX IF EXISTS ix_foods_{col}_trgm")
    op.drop_column("foods", "aliases")
    op.drop_column("foods", "name_de")
    op.drop_column("foods", "name_ru")
