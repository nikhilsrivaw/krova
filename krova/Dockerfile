# KROVA backend — production Docker image
# Uses pip+requirements (not Poetry) for predictable Railway builds.

FROM python:3.13-slim

# System deps for asyncpg, cryptography, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so Docker can cache the layer
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the source
COPY . .

# Railway injects $PORT
ENV PORT=8000
EXPOSE 8000

# Start command — uvicorn is on PATH because pip installed it system-wide
CMD ["sh", "-c", "uvicorn services.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
