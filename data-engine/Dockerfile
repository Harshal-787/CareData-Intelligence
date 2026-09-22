FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (build-essential for some ML libraries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/

# Expose FastAPI port
EXPOSE 8000

# Start both the Redis consumer daemon and the FastAPI server using a simple shell script
RUN echo '#!/bin/bash\npython src/workers/redis_consumer.py &\nuvicorn src.workers.api_server:app --host 0.0.0.0 --port 8000' > start.sh
RUN chmod +x start.sh

CMD ["./start.sh"]
