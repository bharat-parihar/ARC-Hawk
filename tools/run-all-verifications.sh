#!/bin/bash
# run-all-verifications.sh - Run all connectivity verifications
# Usage: ./run-all-verifications.sh

set -e

echo "============================================"
echo "ARC-Hawk Connectivity Verification Suite"
echo "============================================"
echo "Date: $(date)"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
RESULTS=()

# Function to run verification
run_verification() {
    local SCRIPT="$1"
    local DESCRIPTION="$2"

    echo ""
    echo "============================================"
    echo "Running: $DESCRIPTION"
    echo "============================================"

    if [ -f "$SCRIPT" ]; then
        chmod +x "$SCRIPT"
        if bash "$SCRIPT"; then
            echo -e "${GREEN}✅ $DESCRIPTION PASSED${NC}"
            RESULTS+=("$DESCRIPTION: PASSED")
            return 0
        else
            echo -e "${RED}❌ $DESCRIPTION FAILED${NC}"
            RESULTS+=("$DESCRIPTION: FAILED")
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  $DESCRIPTION script not found: $SCRIPT${NC}"
        RESULTS+=("$DESCRIPTION: NOT FOUND")
        return 1
    fi
}

# Run all verifications
FAILED=0

# 1. PostgreSQL
if run_verification "verify-postgres.sh" "PostgreSQL Connectivity"; then
    :
else
    FAILED=$((FAILED + 1))
fi

# 2. Neo4j
if run_verification "verify-neo4j.sh" "Neo4j Connectivity"; then
    :
else
    FAILED=$((FAILED + 1))
fi

# 3. Backend API
if run_verification "verify-backend.sh" "Backend API Connectivity"; then
    :
else
    FAILED=$((FAILED + 1))
fi

# 4. Scanner Integration
if run_verification "verify-scanner.sh" "Scanner-Backend Integration"; then
    :
else
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "============================================"
echo "VERIFICATION SUMMARY"
echo "============================================"

for result in "${RESULTS[@]}"; do
    if echo "$result" | grep -q "PASSED"; then
        echo -e "✅ $result"
    elif echo "$result" | grep -q "FAILED"; then
        echo -e "❌ $result"
        FAILED=$((FAILED + 1))
    else
        echo -e "⚠️  $result"
    fi
done

echo ""
echo "============================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL VERIFICATIONS PASSED${NC}"
    exit 0
else
    echo -e "${RED}🚨 $FAILED VERIFICATION(S) FAILED${NC}"
    echo ""
    echo "🔧 Next Steps:"
    echo "   1. Start Docker: docker-compose up -d"
    echo "   2. Start backend: cd apps/backend && go run cmd/server/main.go"
    echo "   3. Install scanner: cd apps/scanner && pip install -r requirements.txt"
    echo "   4. Re-run this script"
    exit 1
fi
