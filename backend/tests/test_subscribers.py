"""The cross-slice event subscribers (driven directly, not via the loop).

conftest silences the fire-and-forget dispatch for the HTTP tests; here we call
the handler coroutines straight so their effect — opening calibration and
computing the norm when a profile appears — is covered deterministically.
"""

from app.core.database import AsyncSessionLocal
from app.modules.calibration.subscribers import _on_profile_updated as cal_handler
from app.modules.nutrition.service import NutritionService
from app.modules.nutrition.subscribers import _on_profile_updated as nut_handler
from app.modules.profile.models import Profile
from app.modules.profile.schemas import ProfileUpsert
from app.modules.profile.service import ProfileService
from tests.conftest import PROFILE_BODY


async def _register(client):
    await client.post("/auth/register", json={"email": "sub@x.io", "password": "Sup3rSecret!"})
    # The user id is 1 (fresh schema per test).
    return 1


async def test_profile_updated_opens_calibration_and_norm(client):
    uid = await _register(client)
    async with AsyncSessionLocal() as db:
        await ProfileService(db).upsert(uid, ProfileUpsert(**PROFILE_BODY))

    # Calibration subscriber → a baseline window now exists.
    await cal_handler(uid)
    # Nutrition subscriber → a target row now exists.
    await nut_handler(uid)

    async with AsyncSessionLocal() as db:
        row, _ = await NutritionService(db)._row(uid), None
        assert row is not None
        assert row.target_calories > 0

    status = await client.get(
        "/calibration/status",
        headers={"Authorization": await _token(client)},
    )
    assert status.status_code == 200
    assert status.json()["phase"] == "calibrating"


async def _token(client):
    r = await client.post("/auth/login", json={"email": "sub@x.io", "password": "Sup3rSecret!"})
    return f"Bearer {r.json()['access_token']}"


async def test_profile_exists_after_upsert(client):
    uid = await _register(client)
    async with AsyncSessionLocal() as db:
        await ProfileService(db).upsert(uid, ProfileUpsert(**PROFILE_BODY))
        prof = (await ProfileService(db).get(uid))
        assert isinstance(prof, Profile)
        assert prof.current_weight_kg == 80
