#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head -c migrations/alembic.ini

echo "Starting bot..."
exec "$@"
