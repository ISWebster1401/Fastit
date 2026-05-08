#!/usr/bin/env bash
set -e
echo "==> Seed..."
python seed.py
echo "==> Admins..."
python add_admin.py
echo "==> Arrancando servidor..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
