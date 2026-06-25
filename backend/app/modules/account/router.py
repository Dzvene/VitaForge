"""Account self-service endpoints — GDPR export + account deletion."""

from fastapi import APIRouter, Response, status

from app.core.deps import CurrentUser, DbSession
from app.modules.account.schemas import DeleteAccountRequest
from app.modules.account.service import AccountService

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/export")
async def export_data(user: CurrentUser, db: DbSession) -> dict:
    """Download everything we hold about the account (GDPR Art. 20)."""
    return await AccountService(db).export(user.id)


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession) -> Response:
    """Permanently erase the account and all owned data (GDPR Art. 17)."""
    await AccountService(db).delete(user.id, payload.password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
