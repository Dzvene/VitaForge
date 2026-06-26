"""Account self-service endpoints — GDPR export + account deletion."""

from typing import Literal

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession
from app.modules.account.schemas import DeleteAccountRequest
from app.modules.account.service import AccountService

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/export")
async def export_data(user: CurrentUser, db: DbSession) -> dict:
    """Download everything we hold about the account (GDPR Art. 20)."""
    return await AccountService(db).export(user.id)


@router.get("/export.csv")
async def export_csv(
    user: CurrentUser,
    db: DbSession,
    dataset: Literal["diary", "weight"] = Query(default="diary"),
) -> Response:
    """A spreadsheet-friendly CSV of the diary or the weight log."""
    csv_text = await AccountService(db).export_csv(user.id, dataset)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="vitaforge-{dataset}.csv"'},
    )


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession) -> Response:
    """Permanently erase the account and all owned data (GDPR Art. 17)."""
    await AccountService(db).delete(user.id, payload.password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
