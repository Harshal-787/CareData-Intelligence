#!/bin/bash
cd "$(dirname "$0")/.."
echo "Starting Databases in Docker..."
echo "Welcome12" | sudo -S docker compose -f docker/docker-compose.yml up -d

echo "Starting Data Engine (Port 8001)..."
cd data-engine
PYTHONPATH=. PORT=8001 nohup venv/bin/python src/workers/api_server.py > data-engine.log 2>&1 &
cd ..

echo "Starting Go Backend (Port 8080)..."
cd backend
nohup make run > backend.log 2>&1 &
cd ..

echo "Starting React Frontend (Port 3000/5173)..."
cd frontend
nohup npm run dev > frontend.log 2>&1 &
cd ..

echo "========================================================"
echo "All services are now running in the background!"
echo "Data Engine logs: data-engine/data-engine.log"
echo "Backend logs:     backend/backend.log"
echo "Frontend logs:    frontend/frontend.log"
echo "========================================================"
