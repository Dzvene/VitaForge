"""Account-management schemas (self-service delete + data export)."""

from pydantic import Field

from app.shared.base_schema import APIModel


class DeleteAccountRequest(APIModel):
    # Re-authenticate before an irreversible delete.
    password: str = Field(min_length=1, max_length=128)
