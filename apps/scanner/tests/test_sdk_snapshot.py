"""
SDK Snapshot Tests - Lock Baseline Behavior
Tests mathematical validators with known inputs/outputs
"""
import pytest
from apps.scanner.sdk.validators.verhoeff import validate_aadhaar_verhoeff
from apps.scanner.sdk.validators.luhn import validate_luhn
from apps.scanner.sdk.validators.dummy_detector import is_dummy_data


class TestVerhoeffSnapshot:
    """Snapshot tests for Verhoeff algorithm"""
    
    # Known valid Aadhaar numbers (with correct checksums)
    VALID_AADHAAR = [
        "234123412346",  # Test case 1
        "999911112225",  # Test case 2  
        "123456789012",  # Test case 3
        "9999 1111 2225",  # Spaced format
        "2341-2341-2346",  # Dashed format
    ]
    
    # Known invalid Aadhaar numbers
    INVALID_AADHAAR = [
        "123456789013",  # Wrong checksum
        "000000000000",  # All zeros
        "111111111111",  # All ones
        "999911112226",  # Off by one
    ]
    
    def test_valid_aadhaar_numbers(self):
        """Verhoeff must accept these valid numbers"""
        for number in self.VALID_AADHAAR:
            # Remove formatting
            clean = number.replace(" ", "").replace("-", "")
            assert validate_aadhaar_verhoeff(clean), f"Failed for {number}"
    
    def test_invalid_aadhaar_numbers(self):
        """Verhoeff must reject these invalid numbers"""
        for number in self.INVALID_AADHAAR:
            clean = number.replace(" ", "").replace("-", "")
            assert not validate_aadhaar_verhoeff(clean), f"Should reject {number}"
    
    def test_length_validation(self):
        """Verhoeff must reject wrong-length inputs"""
        assert not validate_aadhaar_verhoeff("12345")  # Too short
        assert not validate_aadhaar_verhoeff("1234567890123")  # Too long


class TestLuhnSnapshot:
    """Snapshot tests for Luhn algorithm"""
    
    # Known valid credit card numbers (test cards)
    VALID_CARDS = [
        "4532015112830366",  # Visa
        "5425233430109903",  # Mastercard
        "374245455400126",   # Amex (15 digits)
        "6011000991300009",  # Discover
    ]
    
    # Known invalid card numbers
    INVALID_CARDS = [
        "4532015112830367",  # Wrong checksum
        "0000000000000000",  # All zeros
        "1234567890123456",  # Sequential
    ]
    
    def test_valid_card_numbers(self):
        """Luhn must accept these valid cards"""
        for card in self.VALID_CARDS:
            assert validate_luhn(card), f"Failed for {card}"
    
    def test_invalid_card_numbers(self):
        """Luhn must reject these invalid cards"""
        for card in self.INVALID_CARDS:
            assert not validate_luhn(card), f"Should reject {card}"
    
    def test_length_variations(self):
        """Luhn works with different card lengths"""
        assert validate_luhn("374245455400126")  # 15 digits (Amex)
        assert validate_luhn("4532015112830366")  # 16 digits (Visa)


class TestDummyDetectorSnapshot:
    """Snapshot tests for dummy data detection"""
    
    # Patterns that MUST be detected as dummy
    DUMMY_PATTERNS = [
        "123456789012",  # Sequential
        "111111111111",  # Repeating
        "000000000000",  # All zeros
        "999999999999",  # All nines
        "121212121212",  # Alternating
        "123412341234",  # Repeated block
    ]
    
    # Patterns that are NOT dummy (look random)
    REAL_PATTERNS = [
        "234123412346",  # Valid Aadhaar
        "9876 5432 1098",  # Non-sequential
        "4532015112830366",  # Valid card
        "8472 9364 1052",  # Random-looking
    ]
    
    def test_detects_dummy_patterns(self):
        """Must catch all dummy patterns"""
        for pattern in self.DUMMY_PATTERNS:
            clean = pattern.replace(" ", "")
            assert is_dummy_data(clean), f"Missed dummy: {pattern}"
    
    def test_allows_real_patterns(self):
        """Must NOT flag real data as dummy"""
        for pattern in self.REAL_PATTERNS:
            clean = pattern.replace(" ", "")
            assert not is_dummy_data(clean), f"False positive: {pattern}"


class TestCombinedValidation:
    """Test the full validation pipeline"""
    
    def test_valid_aadhaar_full_check(self):
        """Valid Aadhaar passes all checks"""
        number = "234123412346"
        
        # NOT dummy
        assert not is_dummy_data(number)
        
        # Passes Verhoeff
        assert validate_aadhaar_verhoeff(number)
    
    def test_dummy_aadhaar_rejected(self):
        """Dummy Aadhaar fails even if Verhoeff passes"""
        number = "123456789012"
        
        # IS dummy
        assert is_dummy_data(number)
        
        # Even if checksum valid, should be rejected by dummy detector
    
    def test_valid_card_full_check(self):
        """Valid card passes all checks"""
        card = "4532015112830366"
        
        # NOT dummy
        assert not is_dummy_data(card)
        
        # Passes Luhn
        assert validate_luhn(card)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
