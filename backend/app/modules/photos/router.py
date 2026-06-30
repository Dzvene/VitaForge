from datetime import date
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.deps import CurrentUser, DbSession
from app.modules.photos.schemas import PhotoOut
from app.modules.photos.service import PhotoService, UPLOAD_DIR

# Photos are served without auth but filenames contain a 128-bit UUID,
# making them unguessable (same model as S3 presigned URLs, Dropbox, Notion).

router = APIRouter(prefix="/photos", tags=["photos"])

_ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic"}
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB


@router.get("", response_model=list[PhotoOut])
async def list_photos(user: CurrentUser, db: DbSession) -> list[PhotoOut]:
    return await PhotoService(db).list(user.id)


@router.post("", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile,
    user: CurrentUser,
    db: DbSession,
    taken_on: date = Form(...),
    weight_kg: float | None = Form(None),
    note: str | None = Form(None),
) -> PhotoOut:
    if file.content_type not in _ALLOWED:
        raise HTTPException(status_code=415, detail="Unsupported image type")
    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
    return await PhotoService(db).save(user.id, taken_on, data, file.content_type or "image/jpeg", weight_kg, note)


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: int, user: CurrentUser, db: DbSession) -> None:
    await PhotoService(db).remove(user.id, photo_id)


@router.get("/file/{filename}")
async def serve_file(filename: str) -> FileResponse:
    # Path traversal guard — UUID filenames never contain / or ..
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400)
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(path)
