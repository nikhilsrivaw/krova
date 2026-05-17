#!/usr/bin/env bash
set -e

# Default port for local; Railway injects $PORT at runtime
PORT="${PORT:-8000}"

echo "=== KROVA startup diagnostics ==="
echo "PWD: $(pwd)"
echo "USER: $(whoami)"
echo "PATH: $PATH"
echo "Looking for uvicorn..."
which uvicorn 2>&1 || echo "  not on PATH"
echo "Looking for python..."
which python python3 2>&1 || echo "  not on PATH"

# Search likely venv locations (Poetry + Railpack put it in different places)
for VENV in /app/.venv /opt/venv /root/.cache/pypoetry/virtualenvs/* /app/.cache/pypoetry/virtualenvs/*; do
    if [ -x "$VENV/bin/uvicorn" ]; then
        echo "Found uvicorn at $VENV/bin/uvicorn"
        exec "$VENV/bin/uvicorn" services.api.main:app --host 0.0.0.0 --port "$PORT"
    fi
done

# Fall back to PATH lookup
if command -v uvicorn > /dev/null 2>&1; then
    echo "Using uvicorn from PATH"
    exec uvicorn services.api.main:app --host 0.0.0.0 --port "$PORT"
fi

# Last resort — find any python and run uvicorn as a module
for PY in /app/.venv/bin/python /opt/venv/bin/python /usr/bin/python3 /usr/bin/python /usr/local/bin/python3 /usr/local/bin/python; do
    if [ -x "$PY" ]; then
        echo "Using $PY to run uvicorn module"
        exec "$PY" -m uvicorn services.api.main:app --host 0.0.0.0 --port "$PORT"
    fi
done

# If we got here, something is seriously wrong — dump diagnostics
echo "=== FAILED to find uvicorn or python ==="
echo "Contents of /app:"
ls -la /app 2>&1 || true
echo "Contents of /app/.venv (if exists):"
ls -la /app/.venv 2>&1 || true
echo "Contents of /opt:"
ls -la /opt 2>&1 || true
echo "Searching for uvicorn binary..."
find / -name "uvicorn" -type f 2>/dev/null | head -5
echo "Searching for python binaries..."
find / -name "python*" -type f 2>/dev/null | head -10
exit 1
