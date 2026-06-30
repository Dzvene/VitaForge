import uuid
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.photos.models import ProgressPhoto
from app.modules.photos.schemas import PhotoOut
from app.shared.exceptions import NotFoundError

UPLOAD_DIR = Path("/data/photos")


def _url(filename: str) -> str:
    base = settings.PUBLIC_API_BASE.rstrip("/")
    return f"{base}/photos/file/{filename}"


class PhotoService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self, user_id: int) -> list[PhotoOut]:
        rows = (
            await self.db.scalars(
                select(ProgressPhoto)
                .where(ProgressPhoto.user_id == user_id)
                .order_by(ProgressPhoto.taken_on.desc())
            )
        ).all()
        return [PhotoOut(id=r.id, taken_on=r.taken_on, url=_url(r.filename), weight_kg=r.weight_kg, note=r.note) for r in rows]

    async def save(
        self, user_id: int, taken_on: date, data: bytes, content_type: str, weight_kg: float | None, note: str | None
    ) -> PhotoOut:
        ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
        filename = f"{user_id}_{uuid.uuid4().hex}.{ext}"
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (UPLOAD_DIR / filename).write_bytes(data)

        photo = ProgressPhoto(user_id=user_id, taken_on=taken_on, filename=filename, weight_kg=weight_kg, note=note)
        self.db.add(photo)
        await self.db.commit()
        await self.db.refresh(photo)
        return PhotoOut(id=photo.id, taken_on=photo.taken_on, url=_url(photo.filename), weight_kg=photo.weight_kg, note=photo.note)

    async def remove(self, user_id: int, photo_id: int) -> None:
        row = await self.db.get(ProgressPhoto, photo_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Photo not found")
        path = UPLOAD_DIR / row.filename
        if path.exists():
            path.unlink()
        await self.db.delete(row)
        await self.db.commit()
