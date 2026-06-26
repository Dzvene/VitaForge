"""Weight endpoints."""

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.profile.service import ProfileService
from app.modules.weight.schemas import WeightLogIn, WeightSeries
from app.modules.weight.service import WeightService

router = APIRouter(prefix="/weight", tags=["weight"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def log_weight(payload: WeightLogIn, user: CurrentUser, db: DbSession) -> None:
    await WeightService(db).log(user.id, payload)


@router.get("/series", response_model=WeightSeries)
async def weight_series(user: CurrentUser, db: DbSession) -> WeightSeries:
    """Raw points + smoothed trend line (§4.3). Plot both; judge progress by trend."""
    params = await ProfileService(db).effective_params(user.id)
    return await WeightService(db).series(user.id, params)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weight(log_id: int, user: CurrentUser, db: DbSession) -> None:
    await WeightService(db).delete(user.id, log_id)
