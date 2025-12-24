package service

import (
	"fmt"
	"strings"
)

// ClassificationResult contains the multi-signal classification output
type ClassificationResult struct {
	ClassificationType string                 `json:"classification_type"`
	SubCategory        string                 `json:"sub_category"`
	Justification      string                 `json:"justification"`
	ConfidenceScore    float64                `json:"confidence_score"`
	Signals            map[string]interface{} `json:"signals"`
	DPDPACategory      string                 `json:"dpdpa_category"`
	RequiresConsent    bool                   `json:"requires_consent"`
}

// Classify performs multi-signal PII classification
func (s *ClassificationService) Classify(patternName, filePath, sampleText string, fileData map[string]interface{}) ClassificationResult {
	// Initialize signals
	signals := map[string]interface{}{
		"pattern_match": true,
		"context_score": 0.0,
		"column_signal": false,
	}

	result := ClassificationResult{
		ClassificationType: "Non-PII",
		SubCategory:        "Other",
		ConfidenceScore:    0.5, // Baseline
		Signals:            signals,
		RequiresConsent:    false,
	}

	lowerPattern := strings.ToLower(patternName)
	lowerPath := strings.ToLower(filePath)

	// Signal 1: Pattern Recognition (High Weight)
	if contains(lowerPattern, []string{"key", "token", "secret", "password", "api", "aws"}) {
		result.ClassificationType = "Secrets"
		result.SubCategory = "API Keys & Secrets"
		result.DPDPACategory = "N/A"
		result.ConfidenceScore = 0.95
		result.Justification = "Strong pattern match for credentials"
	} else if contains(lowerPattern, []string{"email"}) {
		result.ClassificationType = "Personal Data"
		result.SubCategory = "Email Address"
		result.DPDPACategory = "Personal Data"
		result.ConfidenceScore = 0.90
		result.RequiresConsent = true
		result.Justification = "Pattern indicates Email Address"
	} else if contains(lowerPattern, []string{"pan", "ssn", "passport", "aadhaar", "license"}) {
		result.ClassificationType = "Sensitive Personal Data"
		result.SubCategory = "Government ID"
		result.DPDPACategory = "Sensitive Personal Data"
		result.ConfidenceScore = 0.98
		result.RequiresConsent = true
		result.Justification = "Pattern indicates Government ID"
	} else if contains(lowerPattern, []string{"phone", "mobile"}) {
		result.ClassificationType = "Personal Data"
		result.SubCategory = "Phone Number"
		result.DPDPACategory = "Personal Data"
		result.ConfidenceScore = 0.85
		result.RequiresConsent = true
		result.Justification = "Pattern indicates Phone Number"
	}

	// Signal 2: Context / File Path (Medium Weight)
	// If path contains "user", "customer", "billing", boost confidence
	if contains(lowerPath, []string{"user", "customer", "billing", "auth", "login"}) {
		result.ConfidenceScore += 0.05
		signals["context_match"] = true
		signals["context_keyword"] = "user/customer/auth"
		result.Justification += " + Found in high-risk context (path)"
	}

	// Signal 3: Column Semantics (Postgres)
	// If scan provides field/column name in metadata
	if colName, ok := fileData["column_name"].(string); ok {
		lowerCol := strings.ToLower(colName)
		if contains(lowerCol, []string{"email", "phone", "pan", "ssn"}) {
			result.ConfidenceScore += 0.10
			signals["column_signal"] = true
			result.Justification += fmt.Sprintf(" + Column name '%s' matches PII", colName)
		}
	}

	// Signal 4: Test Data penalty
	if contains(lowerPath, []string{"test_data", "fixtures", "mock"}) {
		// Does NOT reduce confidence that it IS PII, but might affect "Severity" or "Risk"?
		// Requirements say "Actual PII classified as Non-PII" is the problem.
		// So we keep confidence high that it IS PII, even if it's fake.
		signals["is_test_data"] = true
	}

	// Cap confidence at 1.0
	if result.ConfidenceScore > 1.0 {
		result.ConfidenceScore = 1.0
	}

	result.Signals = signals
	return result
}

// Helper
func contains(str string, substrings []string) bool {
	for _, substr := range substrings {
		if strings.Contains(str, substr) {
			return true
		}
	}
	return false
}
