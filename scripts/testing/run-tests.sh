#!/bin/bash
set -e

echo "🧪 Running all tests..."

# Backend Tests
echo "Testing Backend..."
cd ../../apps/backend
go test ./...

# Frontend Tests
echo "Testing Frontend..."
cd ../frontend
npm test -- --passWithNoTests

echo "✅ All tests passed!"
