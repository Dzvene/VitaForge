# VitaForge backend — FastAPI + uvicorn
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for asyncpg / psycopg2 build are not needed (binary wheels),
# but keep a minimal toolchain for argon2/cffi just in case.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Migrations run automatically on startup via the FastAPI lifespan.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
