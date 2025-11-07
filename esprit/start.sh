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
    else
        echo "⚠️  No .env.example found, using defaults..."
    fi
fi

echo "🐳 Building and starting all services..."
echo "   This may take several minutes on first run..."
echo ""

cd infra
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for services to be ready
MAX_WAIT=180
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if docker compose ps | grep -q "healthy"; then
        break
    fi
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
    echo "   Still waiting... (${WAIT_TIME}s / ${MAX_WAIT}s)"
done

echo ""
echo "✅ Esprit-Hub is running!"
echo ""
echo "📍 Access points:"
echo "   • Main Application: http://localhost:8080"
echo "   • Sim.ai Studio:    http://localhost:8080/studio/"
echo "   • Gateway API:      http://localhost:8080/api/"
echo ""
echo "📊 View logs:"
echo "   docker compose -f infra/docker-compose.yml logs -f"
echo ""
echo "🛑 Stop all services:"
echo "   docker compose -f infra/docker-compose.yml down"
echo ""
echo "🔄 Restart a specific service:"
echo "   docker compose -f infra/docker-compose.yml restart <service-name>"
echo ""
