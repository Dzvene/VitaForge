"""Pydantic base schema with shared config."""

from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    """Base schema. ORM-friendly + populate by name."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )
