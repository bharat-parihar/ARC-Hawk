"""
PAN Recognizer - Permanent Account Number (India)
==================================================
Detects Indian PAN numbers with format validation.

Format: AAAAA9999A (5 letters, 4 digits, 1 letter)
"""

import re
from typing import Optional, List
from presidio_analyzer import Pattern, PatternRecognizer


class PANRecognizer(PatternRecognizer):
    """Custom recognizer for Indian PAN numbers."""
    
    PATTERNS = [
        Pattern(
            name="PAN (AAAAA9999A)",
            regex=r"(?i)\b[A-Z]{5}[0-9]{4}[A-Z]\b",
            score=0.4
        ),
    ]
    
    CONTEXT = [
        "pan",
        "pancard",
        "pan card",
        "permanent account",
        "income tax",
        "tax id",
    ]
    
    def __init__(self):
        super().__init__(
            supported_entity="IN_PAN",
            name="PAN Recognizer",
            supported_language="en",
            patterns=self.PATTERNS,
            context=self.CONTEXT
        )
    
    def validate_result(self, pattern_text: str) -> Optional[bool]:
        """Validate PAN format."""
        upper = pattern_text.upper().strip()
        
        if len(upper) != 10:
            return False
        
        # Check format: AAAAA9999A
        if not (upper[:5].isalpha() and 
                upper[5:9].isdigit() and 
                upper[9].isalpha()):
            return False
        
        # Fourth character should be 'P' for individuals (common case)
        # But we'll allow all valid patterns
        return True


if __name__ == "__main__":
    recognizer = PANRecognizer()
    print(f"PAN Recognizer created: {recognizer.name}")
