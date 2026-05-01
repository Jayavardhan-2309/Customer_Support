#!/bin/bash

echo "Applying migrations..."
PYTHONPATH=$PWD python manage.py migrate

echo "Collecting static files..."
PYTHONPATH=$PWD python manage.py collectstatic --noinput

echo "Starting Celery worker in background..."
PYTHONPATH=$PWD celery -A custSupport worker \
  --loglevel=info \
  --pool=solo \
  --concurrency=1 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat &

echo "Starting Django server..."
PYTHONPATH=$PWD gunicorn custSupport.wsgi:application --bind 0.0.0.0:8000