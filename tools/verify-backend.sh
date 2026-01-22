#!/bin/bash
# verify-backend.sh - Verify Backend API connectivity
# Usage: ./verify-backend.sh [host] [port]

set -e

# Configuration
HOST="${1:-localhost}"
PORT="${2:-8080}"
BASE_URL="http://$HOST:$PORT/api/v1"

echo "============================================"
echo "Backend API Connectivity Verification"
echo "============================================"
echo "Base URL: $BASE_URL"
echo "============================================"

# Function to test endpoint
test_endpoint() {
    local METHOD="$1"
    local PATH="$2"
    local DESCRIPTION="$3"

    echo ""
    echo "🔄 Testing: $METHOD $PATH"

    START_TIME=$(date +%s%N)

    if [ "$METHOD" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$BASE_URL$PATH" 2>&1)
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' \
            "$BASE_URL$PATH" 2>&1)
    fi

    END_TIME=$(date +%s%N)
    LATENCY=$(( (END_TIME - START_TIME) / 1000000 ))

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
        # Any response (even 404) means server is running
        echo "✅ $DESCRIPTION - HTTP $HTTP_CODE"
        echo "   Latency: ${LATENCY}ms"
        return 0
    else
        echo "❌ $DESCRIPTION - HTTP $HTTP_CODE"
        echo "   Response: $BODY"
        return 1
    fi
}

# Test 1: Health endpoint
echo ""
echo "============================================"
echo "Test 1: Health Check"
echo "============================================"
test_endpoint "GET" "/health" "Health Endpoint" || true

# Test 2: Scans endpoint (ingest)
echo ""
echo "============================================"
echo "Test 2: Scan Ingestion"
echo "============================================"
test_endpoint "POST" "/scans/ingest-verified" "Scan Ingestion Endpoint" || true

# Test 3: Classification summary
echo ""
echo "============================================"
echo "Test 3: Classification Summary"
echo "============================================"
test_endpoint "GET" "/classification/summary" "Classification Summary Endpoint" || true

# Test 4: Findings
echo ""
echo "============================================"
echo "Test 4: Findings"
echo "============================================"
test_endpoint "GET" "/findings" "Findings Endpoint" || true

# Test 5: Lineage graph
echo ""
echo "============================================"
echo "Test 5: Lineage Graph"
echo "============================================"
test_endpoint "GET" "/lineage/graph" "Lineage Graph Endpoint" || true

echo ""
echo "============================================"
echo "Backend API Verification Complete"
echo "============================================"
echo ""
echo "🔧 If endpoints are not responding:"
echo "   1. Start backend: cd apps/backend && go run cmd/server/main.go"
echo "   2. Ensure port $PORT is not blocked"
echo "   3. Check backend logs for errors"
echo ""
echo "💡 Note: 400/404 responses indicate server is running"
echo "         but request was malformed or endpoint doesn't exist"
