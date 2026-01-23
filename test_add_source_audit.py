#!/usr/bin/env python3
"""
Comprehensive End-to-End Audit of Add Source Flow in ARC-Hawk
"""

import requests
import json
import time
import os
import sys
from typing import Dict, List, Any, Optional

class AddSourceAuditor:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.test_results = []
        
    def log_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
    
    def test_connection(self, source_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test connection to source"""
        try:
            response = self.session.post(
                f"{self.api_base}/connections/test",
                json={
                    "source_type": source_type,
                    "config": config
                },
                timeout=30
            )
            return {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                "headers": dict(response.headers)
            }
        except Exception as e:
            return {
                "status_code": 0,
                "success": False,
                "data": str(e),
                "headers": {}
            }
    
    def run_all_tests(self):
        """Run all audit tests"""
        print("Starting ARC-Hawk Add Source Flow Audit")
        print("=" * 50)
        
        # Test 1: Source Type Schemas
        print("\n=== Testing Source Type Schemas ===")
        
        # Test missing source types mentioned in requirements
        missing_types = ["firebase", "couchdb", "gdrive"]
        
        for missing_type in missing_types:
            response = self.test_connection(missing_type, {})
            if response["status_code"] == 400:
                self.log_result(f"Missing source type handling - {missing_type}", True, 
                              "Correctly rejects unsupported source type")
            else:
                self.log_result(f"Missing source type handling - {missing_type}", False, 
                              f"Should reject {missing_type} but got {response['status_code']}")
        
        # Summary
        passed = sum(1 for result in self.test_results if result["passed"])
        total = len(self.test_results)
        
        print(f"\n=== AUDIT SUMMARY ===")
        print(f"Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        return passed == total

if __name__ == "__main__":
    auditor = AddSourceAuditor()
    success = auditor.run_all_tests()
    sys.exit(0 if success else 1)
