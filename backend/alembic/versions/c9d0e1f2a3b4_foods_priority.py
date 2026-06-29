"""foods.priority — search-ranking tier

Adds a `priority` tier to foods so the worldwide Open Food Facts bulk can be
loaded for full barcode coverage without polluting name search: curated /
region-relevant rows are priority 1 (the default — every existing row), the
OFF bulk is inserted at priority 0 and ranks below them.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-29 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # server_default "1" backfills every existing row as curated/relevant.
    op.add_column(
        "foods",
        sa.Column(
            "priority",
            sa.SmallInteger(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("foods", "priority")
