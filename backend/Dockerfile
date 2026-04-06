FROM python:3.13-slim

# Prevent Python buffering
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps (important for many libs)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make script executable
RUN chmod +x start.sh

CMD ["./start.sh"]