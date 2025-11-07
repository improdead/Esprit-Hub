#!/bin/bash

# Esprit-Hub + Sim.ai Stack Startup Script
# ==========================================

set -e

echo "🚀 Starting Esprit-Hub + Sim.ai Stack..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please review and update it if needed."
        echo ""
    else
        echo "⚠️  No .env.example found, using defaults..."
        echo ""
    fi
fi

echo "🐳 Building and starting all services..."
echo "   This may take 5-10 minutes on first run..."
echo "   - Building Sim.ai Docker images"
echo "   - Initializing PostgreSQL with pgvector"
echo "   - Running database migrations"
echo ""

cd infra
docker compose --env-file ../.env up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for services to be ready
MAX_WAIT=300
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    # Count healthy services
    HEALTHY_COUNT=$(docker compose ps --format json 2>/dev/null | jq -c '.[] | select(.Health=="healthy")' | wc -l)

    # Check if migrations completed
    MIGRATIONS_STATUS=$(docker compose ps sim-migrations --format json 2>/dev/null | jq -r '.[0].State // "unknown"')

    if [ "$HEALTHY_COUNT" -ge 2 ] && [ "$MIGRATIONS_STATUS" = "exited" ]; then
        echo "   ✅ Core services are healthy and migrations completed!"
        break
    fi

    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
    echo "   Still waiting... (${WAIT_TIME}s / ${MAX_WAIT}s) - Healthy: ${HEALTHY_COUNT}, Migrations: ${MIGRATIONS_STATUS}"
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    echo ""
    echo "   ⚠️  Timeout waiting for services. They may still be starting."
    echo "   Check status with: cd esprit/infra && docker compose ps"
    echo "   Check logs with: cd esprit/infra && docker compose logs"
    echo ""
fi

echo ""
echo "✅ Esprit-Hub is running!"
echo ""
echo "📍 Access points:"
echo "   • Main Application: http://localhost:8080"
echo "   • Sim.ai Studio:    http://localhost:8080/studio/"
echo "   • Gateway API:      http://localhost:8080/api/"
echo ""
echo "📊 View logs:"
echo "   cd esprit/infra && docker compose logs -f"
echo ""
echo "🛑 Stop all services:"
echo "   cd esprit/infra && docker compose down"
echo ""
echo "🔄 Restart a specific service:"
echo "   cd esprit/infra && docker compose restart <service-name>"
echo ""
echo "🔍 Check service status:"
echo "   cd esprit/infra && docker compose ps"
echo ""
echo "💡 Note: The .env file is in esprit/ directory"
echo "   Run docker compose commands from esprit/infra/ directory"
echo ""
