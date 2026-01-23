#!/bin/bash

# ARC-Hawk Monitoring Setup Script
set -e

echo "🔍 Setting up ARC-Hawk monitoring stack..."

# Check if Docker is running
if ! docker --version > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please install Docker first."
    exit 1
fi

# Create data directories
echo "📁 Creating data directories..."
mkdir -p infra/monitoring/data/prometheus
mkdir -p infra/monitoring/grafana/data
mkdir -p infra/monitoring/grafana/provisioning
mkdir -p infra/monitoring/grafana/dashboards

# Set permissions
echo "🔐 Setting permissions..."
chmod -R 777 infra/monitoring/data/
chmod -R 777 infra/monitoring/grafana/

# Create Grafana datasource configuration
echo "📊 Configuring Grafana datasource..."
cat > infra/monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Stop any existing services
echo "🛑 Stopping existing services..."
docker-compose -f infra/docker-compose.yml down --remove-orphans

# Start core services
echo "🚀 Starting core ARC-Hawk services..."
docker-compose -f infra/docker-compose.yml up -d

# Start monitoring services
echo "📈 Starting monitoring stack..."
cd infra/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
echo "Checking Backend (http://localhost:8080/health)..."
curl -f http://localhost:8080/health

echo "Checking Frontend (http://localhost:3000)..."
curl -f http://localhost:3000

echo "Checking Prometheus (http://localhost:9090)..."
curl -f http://localhost:9090

echo "Checking Grafana (http://localhost:3001)..."
curl -f http://localhost:3001/api/health

echo ""
echo "🎯 ARC-Hawk monitoring setup complete!"
echo "📊 Grafana Dashboard: http://localhost:3001 (admin/admin)"
echo "📈 Prometheus Metrics: http://localhost:9090"
echo "🏠 Backend API: http://localhost:8080"
echo "🎨 Frontend UI: http://localhost:3000"
echo ""
echo "💡 To add custom metrics, add them to infra/monitoring/arc-hawk-metrics.go"
echo "💡 To add custom dashboards, add them to infra/monitoring/grafana/dashboards/"