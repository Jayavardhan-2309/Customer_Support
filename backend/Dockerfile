FROM python:3.13.0-slim

LABEL org.opencontainers.image.source="https://github.com/your-org/your-repo"

ENV PYTHONUNBUFFERED=1
ENV PATH="/home/appuser/.local/bin:$PATH"

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=root:root --chmod=0444 requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip==26.1 && pip install --no-cache-dir -r requirements.txt # NOSONAR

COPY --chown=root:root --chmod=0555 . ./

RUN mkdir -p /app/staticfiles /app/media \
    && chown appuser:appuser /app/staticfiles /app/media \
    && chmod 0755 /app/staticfiles /app/media

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)" || exit 1

CMD ["./start.sh"]
