"""Open the baseline calibration window as soon as a profile exists (§4.4)."""

from app.core.database import AsyncSessionLocal
from app.core.event_topics import PROFILE_UPDATED
from app.core.events import subscribe
from app.modules.calibration.service import CalibrationService


async def _on_profile_updated(user_id: int) -> None:
    async with AsyncSessionLocal() as db:
        await CalibrationService(db).ensure_started(user_id)


subscribe(PROFILE_UPDATED, _on_profile_updated)
