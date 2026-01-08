"""
Dummy Data Detector
===================
Detects patterns that are mathematically valid but semantically meaningless.
Examples: 111111111111, 123456789012, keyboard walks
"""

def is_dummy_data(text: str) -> bool:
    """
    Returns True if data appears to be dummy/test data.
    
    Args:
        text: String to check (should be digits only)
        
    Returns:
        True if data is likely dummy, False otherwise
    """
    if not text or len(text) < 3:
        return False
    
    # Check 1: All same digit (1111111...)
    if len(set(text)) == 1:
        return True
    
    # Check 2: Linear ascending sequence (1234567...)
    digits = [int(d) for d in text if d.isdigit()]
    if len(digits) >= 4:
        # Check ascending
        is_ascending = all(digits[i] + 1 == digits[i+1] for i in range(len(digits)-1))
        if is_ascending:
            return True
        
        # Check descending
        is_descending = all(digits[i] - 1 == digits[i+1] for i in range(len(digits)-1))
        if is_descending:
            return True
    
    # Check 3: Repeating pairs (121212..., 010101...)
    if len(text) >= 6:
        # Check if pattern repeats
        half = len(text) // 2
        if text[:half] == text[half:2*half]:
            return True
    
    # Check 4: Too simple (entropy check)
    unique_digits = len(set(text))
    if len(text) >= 8 and unique_digits <= 2:
        return True
    
    return False


if __name__ == "__main__":
    print("=== Dummy Data Detection Tests ===\n")
    
    test_cases = [
        ("111111111111", True, "All same"),
        ("123456789012", True, "Ascending sequence"),
        ("987654321000", True, "Descending sequence"),
        ("121212121212", True, "Repeating pairs"),
        ("999911112222", False, "Real-looking data"),
        ("234567890126", False, "Valid Aadhaar"),
    ]
    
    for data, expected, description in test_cases:
        result = is_dummy_data(data)
        status = "✓" if result == expected else "✗"
        print(f"{status} {description}: {data}")
        print(f"   Expected: {expected}, Got: {result}\n")
