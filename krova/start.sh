#!/usr/bin/env bash
set -e

# Find uvicorn — Poetry installs it into /app/.venv on Railway
VENV_BIN="/app/.venv/bin"

if [ -x "$VENV_BIN/uvicorn" ]; then
    UVICORN="$VENV_BIN/uvicorn"
elif command -v uvicorn > /dev/null 2>&1; then
    UVICORN="uvicorn"
else
    # Last resort — run via the venv's python module
    UVICORN="$VENV_BIN/python -m uvicorn"
fi

# Default port for local; Railway injects $PORT at runtime
PORT="${PORT:-8000}"

echo "Starting KROVA backend on port $PORT using: $UVICORN"
exec $UVICORN services.api.main:app --host 0.0.0.0 --port "$PORT"
