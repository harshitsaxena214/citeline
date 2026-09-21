FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so this layer is cached when only app code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir --default-timeout=300 --retries=5 -r requirements.txt

# Copy application code only.
COPY app ./app

# Create Chroma's persistent storage directory.
RUN mkdir -p /app/chroma_data

# Create and switch to a non-root user for container security.
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

USER appuser

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]