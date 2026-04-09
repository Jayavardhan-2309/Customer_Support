#!/bin/bash

echo "Applying migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Celery worker in background..."
celery -A custSupport worker \
  --loglevel=info \
  --pool=solo \
  --concurrency=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat &

echo "Starting Django server..."
gunicorn custSupport.wsgi:application --bind 0.0.0.0:8000