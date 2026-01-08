"""
Regression Test Suite for SDK Validators
==========================================
Tests all validators against ground truth data to ensure accuracy.

Target: 95%+ precision on Phase 1 PII types
"""

import sys
import os
import yaml
from pathlib import Path

# Add scanner to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sdk.validators import Verhoeff, Luhn, is_dummy_data
from sdk.engine import SharedAnalyzerEngine
from sdk.recognizers import AadhaarRecognizer, PANRecognizer, CreditCardRecognizer


class TestResults:
    """Track test results."""
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.failures = []
    
    def add_pass(self):
        self.total += 1
        self.passed += 1
    
    def add_fail(self, test_name, expected, actual, reason=""):
        self.total += 1
        self.failed += 1
        self.failures.append({
            'test': test_name,
            'expected': expected,
            'actual': actual,
            'reason': reason
        })
    
    def precision(self):
        return (self.passed / self.total * 100) if self.total > 0 else 0
    
    def report(self):
        print(f"\n{'='*70}")
        print(f"TEST RESULTS")
        print(f"{'='*70}")
        print(f"Total Tests:  {self.total}")
        print(f"Passed:       {self.passed} ✓")
        print(f"Failed:       {self.failed} ✗")
        print(f"Precision:    {self.precision():.1f}%")
        print(f"{'='*70}\n")
        
        if self.failures:
            print("FAILURES:")
            for f in self.failures:
                print(f"  ✗ {f['test']}")
                print(f"    Expected: {f['expected']}, Got: {f['actual']}")
                if f['reason']:
                    print(f"    Reason: {f['reason']}")
                print()


def test_verhoeff_algorithm():
    """Test Verhoeff implementation against known values."""
    print("\n[TEST] Verhoeff Algorithm")
    results = TestResults()
    
    # Valid Aadhaar numbers
    valid_cases = [
        "234567890126",
        "999911112226",
        "345678901234",
    ]
    
    for number in valid_cases:
        result = Verhoeff.validate(number)
        if result:
            results.add_pass()
            print(f"  ✓ Valid: {number}")
        else:
            results.add_fail(f"Verhoeff({number})", True, False, "Should validate")
            print(f"  ✗ Failed: {number}")
    
    # Invalid Aadhaar numbers
    invalid_cases = [
        ("111111111111", "Repeating"),
        ("123456789012", "Sequential"),
        ("999911112222", "Bad checksum"),
    ]
    
    for number, reason in invalid_cases:
        result = Verhoeff.validate(number)
        if not result:
            results.add_pass()
            print(f"  ✓ Rejected: {number} ({reason})")
        else:
            results.add_fail(f"Verhoeff({number})", False, True, f"Should reject {reason}")
            print(f"  ✗ Failed: {number} ({reason})")
    
    return results


def test_luhn_algorithm():
    """Test Luhn implementation."""
    print("\n[TEST] Luhn Algorithm")
    results = TestResults()
    
    valid_cards = [
        "4532015112830366",  # Visa
        "6011514433546201",  # Discover
    ]
    
    for card in valid_cards:
        result = Luhn.validate(card)
        if result:
            results.add_pass()
            print(f"  ✓ Valid: {card}")
        else:
            results.add_fail(f"Luhn({card})", True, False)
            print(f"  ✗ Failed: {card}")
    
    invalid_cards = [
        "4532015112830367",  # Bad checksum
        "1111111111111111",  # Repeating
    ]
    
    for card in invalid_cards:
        result = Luhn.validate(card)
        if not result:
            results.add_pass()
            print(f"  ✓ Rejected: {card}")
        else:
            results.add_fail(f"Luhn({card})", False, True)
            print(f"  ✗ Failed: {card}")
    
    return results


def test_dummy_detector():
    """Test dummy data detection."""
    print("\n[TEST] Dummy Data Detector")
    results = TestResults()
    
    dummy_cases = [
        "111111111111",
        "123456789012",
        "987654321000",
        "121212121212",
    ]
    
    for data in dummy_cases:
        result = is_dummy_data(data)
        if result:
            results.add_pass()
            print(f"  ✓ Detected dummy: {data}")
        else:
            results.add_fail(f"Dummy({data})", True, False)
            print(f"  ✗ Failed: {data}")
    
    real_data = [
        "999911112226",
        "234567890126",
    ]
    
    for data in real_data:
        result = is_dummy_data(data)
        if not result:
            results.add_pass()
            print(f"  ✓ Accepted real: {data}")
        else:
            results.add_fail(f"Dummy({data})", False, True)
            print(f"  ✗ Failed: {data}")
    
    return results


def test_ground_truth_data():
    """Test against ground truth YAML."""
    print("\n[TEST] Ground Truth Dataset")
    results = TestResults()
    
    ground_truth_path = Path(__file__).parent / "ground_truth" / "phase1_test_data.yml"
    
    if not ground_truth_path.exists():
        print(f"  ⚠️ Ground truth file not found: {ground_truth_path}")
        return results
    
    with open(ground_truth_path, 'r') as f:
        data = yaml.safe_load(f)
    
    # Test valid Aadhaar
    for case in data.get('valid_aadhaar', []):
        number = case['number']
        clean = ''.join(c for c in number if c.isdigit())
        
        # Should pass dummy check and Verhoeff
        is_dummy = is_dummy_data(clean)
        is_valid = Verhoeff.validate(clean)
        
        if not is_dummy and is_valid:
            results.add_pass()
            print(f"  ✓ {case['description']}: {number}")
        else:
            results.add_fail(case['description'], "DETECT", "IGNORE")
            print(f"  ✗ {case['description']}: {number}")
    
    # Test invalid Aadhaar
    for case in data.get('invalid_aadhaar', []):
        number = case['number']
        clean = ''.join(c for c in number if c.isdigit())
        
        is_dummy = is_dummy_data(clean)
        is_valid = Verhoeff.validate(clean) if len(clean) == 12 else False
        
        if is_dummy or not is_valid:
            results.add_pass()
            print(f"  ✓ {case['description']}: {number}")
        else:
            results.add_fail(case['description'], "IGNORE", "DETECT")
            print(f"  ✗ {case['description']}: {number}")
    
    return results


def run_all_tests():
    """Run complete test suite."""
    print("="*70)
    print("ARC-HAWK SDK REGRESSION TEST SUITE")
    print("Target: 95%+ Precision")
    print("="*70)
    
    all_results = TestResults()
    
    # Run individual test suites
    test_suites = [
        test_verhoeff_algorithm,
        test_luhn_algorithm,
        test_dummy_detector,
        test_ground_truth_data,
    ]
    
    for test_func in test_suites:
        suite_results = test_func()
        
        # Merge results
        all_results.total += suite_results.total
        all_results.passed += suite_results.passed
        all_results.failed += suite_results.failed
        all_results.failures.extend(suite_results.failures)
    
    # Final report
    all_results.report()
    
    # Pass/Fail
    precision = all_results.precision()
    if precision >= 95.0:
        print("✅ TEST SUITE PASSED (Precision >= 95%)")
        return 0
    else:
        print(f"❌ TEST SUITE FAILED (Precision {precision:.1f}% < 95%)")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
