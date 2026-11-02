#!/usr/bin/env bash
# =============================================================================
# CareData Intelligence — Enterprise Production Container Management CLI
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_banner() {
  echo -e "${CYAN}"
  echo "=================================================================="
  echo "       CareData Intelligence — Production Container CLI           "
  echo "=================================================================="
  echo -e "${NC}"
}

check_env() {
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
      cp .env.example .env
      echo -e "${GREEN}✓ Created .env file. Please review and update credentials.${NC}"
    else
      echo -e "${RED}❌ Error: Neither .env nor .env.example found!${NC}"
      exit 1
    fi
  fi
}

cmd_build() {
  print_banner
  check_env
  echo -e "${BLUE}🔨 Building all production container images...${NC}"
  docker compose build "$@"
  echo -e "${GREEN}✓ All container images built successfully!${NC}"
}

cmd_up() {
  print_banner
  check_env
  echo -e "${BLUE}🚀 Starting CareData Intelligence production stack...${NC}"
  docker compose up -d "$@"
  echo ""
  echo -e "${GREEN}✓ Containers launched in background.${NC}"
  echo ""
  echo -e "${CYAN}Available Service Endpoints:${NC}"
  echo -e "  🌐 Frontend SPA & Reverse Proxy: ${GREEN}http://localhost:${FRONTEND_PORT:-80}${NC}"
  echo -e "  ⚙️  Core Go REST API:            ${GREEN}http://localhost:${BACKEND_PORT:-8080}${NC}"
  echo -e "  📖 Swagger Documentation:       ${GREEN}http://localhost:${BACKEND_PORT:-8080}/swagger/index.html${NC}"
  echo -e "  🐍 Python Data Engine:          ${GREEN}http://localhost:${DATA_ENGINE_PORT:-8001}${NC}"
  echo -e "  🪣 MinIO S3 Object Storage:      ${GREEN}http://localhost:${MINIO_PORT:-9000}${NC}"
  echo -e "  🖥️  MinIO Console UI:            ${GREEN}http://localhost:${MINIO_CONSOLE_PORT:-9001}${NC}"
  echo -e "  ⚡ Redis Cache:                 ${GREEN}localhost:${REDIS_PORT:-6379}${NC}"
  echo -e "  🐘 PostgreSQL DB:               ${GREEN}localhost:${POSTGRES_PORT:-5432}${NC}"
  echo -e "  🏥 Real-time MLLP TCP Stream:    ${GREEN}localhost:${MLLP_PORT:-2575}${NC}"
  echo ""
  echo -e "${YELLOW}Default Demo Credentials:${NC}"
  echo "  SuperAdmin: superadmin@caredata.ai / Password123!"
  echo "  Hospital Admin: admin@caredata.ai / Password123!"
}

cmd_down() {
  print_banner
  echo -e "${YELLOW}🛑 Stopping CareData Intelligence production stack...${NC}"
  docker compose down "$@"
  echo -e "${GREEN}✓ Stack stopped cleanly.${NC}"
}

cmd_restart() {
  print_banner
  echo -e "${BLUE}🔄 Restarting CareData Intelligence production stack...${NC}"
  docker compose restart "$@"
  echo -e "${GREEN}✓ Stack restarted.${NC}"
}

cmd_status() {
  print_banner
  echo -e "${BLUE}📊 Service Status & Healthchecks:${NC}"
  docker compose ps
}

cmd_logs() {
  docker compose logs -f "$@"
}

cmd_clean() {
  print_banner
  echo -e "${RED}⚠️  WARNING: This will destroy all containers, networks, and persistent data volumes!${NC}"
  read -p "Are you sure you want to proceed? (y/N): " -r confirm
  if [[ $confirm =~ ^[Yy]$ ]]; then
    docker compose down -v --remove-orphans
    echo -e "${GREEN}✓ All resources and volumes removed.${NC}"
  else
    echo "Operation canceled."
  fi
}

usage() {
  print_banner
  echo "Usage: ./scripts/deploy.sh [COMMAND] [OPTIONS]"
  echo ""
  echo "Commands:"
  echo "  up              Launch all services in background (docker compose up -d)"
  echo "  down            Stop all running services"
  echo "  restart         Restart services"
  echo "  build           Build/rebuild all multi-stage Docker images"
  echo "  status          Show status of containers and healthcheck states"
  echo "  logs [service]  Stream logs for all or a specific service"
  echo "  clean           Stop and remove all containers, networks, and persistent volumes"
  echo "  help            Display this help message"
  echo ""
  echo "Examples:"
  echo "  ./scripts/deploy.sh up"
  echo "  ./scripts/deploy.sh build --no-cache"
  echo "  ./scripts/deploy.sh logs backend"
  echo "  ./scripts/deploy.sh status"
}

case "$1" in
  up)
    shift
    cmd_up "$@"
    ;;
  down)
    shift
    cmd_down "$@"
    ;;
  restart)
    shift
    cmd_restart "$@"
    ;;
  build)
    shift
    cmd_build "$@"
    ;;
  status)
    shift
    cmd_status "$@"
    ;;
  logs)
    shift
    cmd_logs "$@"
    ;;
  clean)
    shift
    cmd_clean "$@"
    ;;
  help|--help|-h|"")
    usage
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    usage
    exit 1
    ;;
esac
