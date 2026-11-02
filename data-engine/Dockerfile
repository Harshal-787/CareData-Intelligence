FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (build-essential for C-extensions, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/
COPY start.sh .
RUN chmod +x start.sh

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DATA_ENGINE_PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["./start.sh"]
