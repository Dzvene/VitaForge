"""Legal document schemas."""

from pydantic import Field

from app.shared.base_schema import APIModel


class LegalSectionSchema(APIModel):
    heading: str = Field(min_length=1, max_length=255)
    body: list[str] = Field(default_factory=list)


class LegalContentOut(APIModel):
    doc: str
    locale: str
    title: str
    intro: str | None = None
    updated: str
    sections: list[LegalSectionSchema]
    customized: bool = False  # True when a DB override exists (admin info)


class LegalContentUpdate(APIModel):
    title: str = Field(min_length=1, max_length=255)
    intro: str | None = Field(default=None, max_length=2000)
    updated: str = Field(min_length=1, max_length=32)
    sections: list[LegalSectionSchema]
