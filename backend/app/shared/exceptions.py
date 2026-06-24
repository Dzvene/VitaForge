"""Custom exception hierarchy."""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, detail)


class ConflictError(HTTPException):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(status.HTTP_409_CONFLICT, detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str = "Invalid input"):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status.HTTP_403_FORBIDDEN, detail)
