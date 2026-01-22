#!/bin/bash
# verify-neo4j.sh - Verify Neo4j connectivity
# Usage: ./verify-neo4j.sh [host] [port] [user] [password]

set -e

# Configuration
HOST="${1:-localhost}"
PORT="${2:-7687}"
USER="${3:-neo4j}"
PASSWORD="${4:-password123}"

echo "============================================"
echo "Neo4j Connectivity Verification"
echo "============================================"
echo "Host: $HOST"
echo "Port: $PORT"
echo "User: $USER"
echo "============================================"

# Check if cypher-shell is available
if ! command -v cypher-shell &> /dev/null; then
    echo "⚠️  cypher-shell command not found."
    echo "   Alternative: Use curl to check HTTP port 7474"
fi

# Test HTTP connection first (always available)
echo ""
echo "🔄 Testing Neo4j HTTP connection (port 7474)..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$USER:$PASSWORD" "http://$HOST:7474" 2>&1 || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Neo4j HTTP interface accessible"
    echo "   HTTP Status: $HTTP_CODE"

    # Get Neo4j version
    VERSION=$(curl -s -u "$USER:$PASSWORD" "http://$HOST:7474/dbms/cluster/overview" 2>&1 | grep -oP '"neo4j_version":"\K[^"]+' | head -1 || echo "Unknown")
    echo "   Version: $VERSION"
else
    echo "⚠️  Neo4j HTTP interface returned status: $HTTP_CODE"
fi

# Test Bolt connection if cypher-shell available
if command -v cypher-shell &> /dev/null; then
    echo ""
    echo "🔄 Testing Neo4j Bolt connection (port $PORT)..."

    START_TIME=$(date +%s%N)

    BOLT_RESULT=$(echo "RETURN 1 as test;" | cypher-shell -a "bolt://$HOST:$PORT" -u "$USER" -p "$PASSWORD" 2>&1)

    END_TIME=$(date +%s%N)
    LATENCY=$(( (END_TIME - START_TIME) / 1000000 ))

    if echo "$BOLT_RESULT" | grep -q "1 row"; then
        echo "✅ Neo4j Bolt connection SUCCESSFUL"
        echo "   Latency: ${LATENCY}ms"
    else
        echo "❌ Neo4j Bolt connection FAILED"
        echo "   Error: $BOLT_RESULT"
    fi
else
    echo ""
    echo "ℹ️  Bolt connection test skipped (cypher-shell not installed)"
    echo "   Bolt port status: $(nc -z -v -w5 $HOST $PORT 2>&1 | grep -q "succeeded" && echo "OPEN" || echo "CLOSED")"
fi

echo ""
echo "============================================"
echo "Neo4j Verification Complete"
echo "============================================"
echo ""
echo "🔧 If connection failed:"
echo "   1. Ensure Docker is running: docker-compose up -d neo4j"
echo "   2. Check credentials: user=$USER, password=$PASSWORD"
echo "   3. Default credentials: neo4j/password123"
