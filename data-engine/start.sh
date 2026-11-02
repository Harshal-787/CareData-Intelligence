#!/bin/bash
set -e

echo "=========================================================="
echo "Starting CareData Python Data Engine & Asynchronous Workers"
echo "=========================================================="

export PYTHONPATH="${PYTHONPATH:-.}:."
PORT="${DATA_ENGINE_PORT:-8001}"

# Trap termination signals to shut down child processes gracefully
cleanup() {
    echo "Shutting down Data Engine processes..."
    kill -TERM "$CONSUMER_PID" "$ML_WORKER_PID" 2>/dev/null || true
    wait
    exit 0
}
trap cleanup SIGTERM SIGINT

echo "Starting Redis Pipeline Consumer daemon..."
python src/workers/redis_consumer.py &
CONSUMER_PID=$!

echo "Starting ML Inference & Drift Worker daemon..."
python src/workers/ml_worker.py &
ML_WORKER_PID=$!

echo "Starting FastAPI Data Engine on port ${PORT}..."
exec uvicorn src.workers.api_server:app --host 0.0.0.0 --port "${PORT}"
