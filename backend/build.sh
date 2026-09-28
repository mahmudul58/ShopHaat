#!/usr/bin/env bash
# Render build command. Idempotent and safe to re-run.
set -o errexit

echo "==> Installing Python dependencies"
pip install -r requirements.txt

echo "==> Collecting static files (whitenoise will serve them at /static/)"
python manage.py collectstatic --noinput

echo "==> Applying database migrations"
python manage.py migrate --noinput

echo "==> Build complete"
