package service

import (
	"context"
	"fmt"
	"math"
	"os"
	"strings"

	"github.com/arc-platform/backend/internal/config"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
)

// ClassificationService handles PII classification with multi-signal intelligence
type ClassificationService struct {
	repo           *persistence.PostgresRepository
	config         *config.Config
	presidioClient *PresidioClient
	engineVersion  string
}

// NewClassificationService creates a new classification service
func NewClassificationService(repo *persistence.PostgresRepository, cfg *config.Config) *ClassificationService {
	// MEDIUM FIX #12: Load version from environment
	version := os.Getenv("CLASSIFIER_VERSION")
	if version == "" {
		version = "v2.0-multisignal"
	}

	return &ClassificationService{
		repo:          repo,
		config:        cfg,
		engineVersion: version,
	}
}

// SetPresidioClient sets the Presidio client (optional, enables ML signal)
func (s *ClassificationService) SetPresidioClient(client *PresidioClient) {
	s.presidioClient = client
}

// ClassificationResult is the legacy result format for backward compatibility
type ClassificationResult struct {
	ClassificationType string                 `json:"classification_type"`
	SubCategory        string                 `json:"sub_category"`
	Justification      string                 `json:"justification"`
	ConfidenceScore    float64                `json:"confidence_score"`
	Signals            map[string]interface{} `json:"signals"`
	DPDPACategory      string                 `json:"dpdpa_category"`
	RequiresConsent    bool                   `json:"requires_consent"`
}

// MultiSignalInput contains all inputs for multi-signal classification
type MultiSignalInput struct {
	PatternName       string
	FilePath          string
	MatchValue        string
	ColumnName        string
	FileData          map[string]interface{}
	EnrichmentScore   float64 // From enrichment layer
	EnrichmentSignals EnrichmentSignals
}

// SignalScore represents a single signal's contribution
type SignalScore struct {
	RawScore      float64 `json:"raw_score"`
	WeightedScore float64 `json:"weighted_score"`
	Weight        float64 `json:"weight"`
	Confidence    float64 `json:"confidence"`
	Explanation   string  `json:"explanation"`
}

// MultiSignalDecision contains the final classification with full explainability
type MultiSignalDecision struct {
	// Final Decision
	Classification  string  `json:"classification"`
	SubCategory     string  `json:"sub_category"`
	FinalScore      float64 `json:"final_score"`
	ConfidenceLevel string  `json:"confidence_level"` // Confirmed, High, NeedsReview, Discard
	Justification   string  `json:"justification"`

	// Signal Breakdown
	RuleSignal     SignalScore `json:"rule_signal"`
	PresidioSignal SignalScore `json:"presidio_signal"`
	ContextSignal  SignalScore `json:"context_signal"`
	EntropySignal  SignalScore `json:"entropy_signal"`

	// Metadata
	EngineVersion   string                 `json:"engine_version"`
	DPDPACategory   string                 `json:"dpdpa_category"`
	RequiresConsent bool                   `json:"requires_consent"`
	SignalBreakdown map[string]interface{} `json:"signal_breakdown"`
}

// Confidence thresholds (Use config where possible, but mapping strings to levels can remain for now)
const (
	ThresholdConfirmed   = 0.85
	ThresholdHigh        = 0.65
	ThresholdNeedsReview = 0.45
)

// ClassifyMultiSignal performs gate-based classification with deterministic validation
// ARCHITECTURE: Detection → Validation (GATE) → Enrichment → Classification
func (s *ClassificationService) ClassifyMultiSignal(ctx context.Context, input MultiSignalInput) (*MultiSignalDecision, error) {
	decision := &MultiSignalDecision{
		EngineVersion:   s.engineVersion,
		SignalBreakdown: make(map[string]interface{}),
	}

	// STAGE 1: Rule-Based Entity Type Detection
	ruleSignal := s.classifyWithRules(input)
	decision.RuleSignal = ruleSignal

	// STAGE 2: Presidio ML Entity Proposal (if available)
	presidioSignal := s.classifyWithPresidio(ctx, input)
	decision.PresidioSignal = presidioSignal

	// STAGE 3: HARD VALIDATION GATE (ABSOLUTE VETO)
	// Determine entity type from rule + Presidio signals
	entityType := s.determineEntityType(ruleSignal, presidioSignal, input.PatternName)

	// Normalize value for validation
	normalized := strings.TrimSpace(input.MatchValue)
	digitsOnly := extractDigitsOnly(normalized)

	// Run appropriate validator based on entity type
	validationPassed := s.runValidator(entityType, normalized, digitsOnly)

	if !validationPassed {
		// VALIDATOR VETO - Discard immediately
		// Context and entropy CANNOT resurrect this finding
		decision.FinalScore = 0.0
		decision.ConfidenceLevel = "DISCARD"
		decision.Classification = "Non-PII"
		decision.SubCategory = "Validation Failed"
		decision.Justification = fmt.Sprintf("Failed %s validation - HARD VETO", entityType)

		// Store zero signals for transparency
		decision.ContextSignal = SignalScore{RawScore: 0.0, Explanation: "Skipped (validation failed)"}
		decision.EntropySignal = SignalScore{RawScore: 0.0, Explanation: "Skipped (validation failed)"}

		return decision, nil
	}

	// STAGE 4: Enrichment (ONLY for validated findings)
	contextSignal := s.classifyWithContext(input)
	decision.ContextSignal = contextSignal

	entropySignal := s.classifyWithEntropy(input)
	decision.EntropySignal = entropySignal

	// STAGE 5: Confidence Tier Assignment (NOT probabilistic scoring)
	// All validated findings have FinalScore = 1.0 (binary: validated or not)
	// Confidence tier is based on enrichment, not validation
	decision.FinalScore = 1.0
	decision.ConfidenceLevel = s.assignConfidenceTier(
		presidioSignal.Confidence,
		contextSignal.RawScore,
	)

	// STAGE 6: Classification Type Assignment
	decision.Classification = s.extractClassificationFromEntity(entityType)
	decision.SubCategory = s.extractSubCategory(decision.Classification)

	// Set DPDPA metadata
	s.setDPDPAMetadata(decision)

	// Build comprehensive justification
	decision.Justification = s.buildJustification(decision)

	// Store signal breakdown (for transparency, not scoring)
	decision.SignalBreakdown = map[string]interface{}{
		"rule":     ruleSignal,
		"presidio": presidioSignal,
		"context":  contextSignal,
		"entropy":  entropySignal,
		"validation": map[string]interface{}{
			"entity_type": entityType,
			"passed":      validationPassed,
			"method":      s.getValidatorName(entityType),
		},
	}

	return decision, nil
}

// determineEntityType selects the most appropriate entity type from available signals
func (s *ClassificationService) determineEntityType(ruleSignal SignalScore, presidioSignal SignalScore, patternName string) string {
	// Prefer Presidio's ML proposal if available and confident
	if presidioSignal.Confidence > 0.50 && len(presidioSignal.Explanation) > 0 {
		// Extract entity type from Presidio explanation
		// Format: "Presidio detected X PII entities: [TYPE1, TYPE2]"
		if strings.Contains(presidioSignal.Explanation, "CREDIT_CARD") {
			return "CREDIT_CARD"
		}
		if strings.Contains(presidioSignal.Explanation, "IN_AADHAAR") {
			return "IN_AADHAAR"
		}
		if strings.Contains(presidioSignal.Explanation, "IN_PAN") {
			return "IN_PAN"
		}
		if strings.Contains(presidioSignal.Explanation, "US_SSN") {
			return "US_SSN"
		}
		if strings.Contains(presidioSignal.Explanation, "EMAIL") {
			return "EMAIL_ADDRESS"
		}
		if strings.Contains(presidioSignal.Explanation, "PHONE") {
			return "PHONE_NUMBER"
		}
	}

	// Fallback to rule-based inference from pattern name
	return inferEntityTypeFromPattern(patternName)
}

// runValidator executes the appropriate validator for the entity type
func (s *ClassificationService) runValidator(entityType, normalized, digitsOnly string) bool {
	switch entityType {
	case "CREDIT_CARD":
		return luhnValidate(digitsOnly)
	case "IN_AADHAAR":
		return len(digitsOnly) == 12 && verhoeffValidate(digitsOnly)
	case "IN_PAN":
		return panValidate(normalized)
	case "US_SSN":
		return len(digitsOnly) == 9 && ssnValidate(digitsOnly)
	case "EMAIL_ADDRESS":
		return strings.Contains(normalized, "@") && strings.Contains(normalized, ".")
	case "PHONE_NUMBER":
		return len(digitsOnly) >= 8 && len(digitsOnly) <= 15
	default:
		// Unknown entity types pass through (no validator available)
		return true
	}
}

// assignConfidenceTier determines confidence tier based on enrichment signals
// Decision table from Phase 2 architecture
func (s *ClassificationService) assignConfidenceTier(presidioMLConf float64, contextScore float64) string {
	// TIER 1: CONFIRMED - High ML confidence + High-risk context
	if presidioMLConf > 0.80 && contextScore > 0.7 {
		return "CONFIRMED"
	}

	// TIER 2: HIGH_CONFIDENCE - Medium ML OR high context
	if presidioMLConf >= 0.60 || contextScore > 0.7 {
		return "HIGH_CONFIDENCE"
	}

	// TIER 3: VALIDATED - All validated findings that don't meet higher tiers
	return "VALIDATED"
}

// extractClassificationFromEntity maps entity type to classification category
func (s *ClassificationService) extractClassificationFromEntity(entityType string) string {
	switch entityType {
	case "CREDIT_CARD", "IN_AADHAAR", "IN_PAN", "US_SSN":
		return "Sensitive Personal Data"
	case "EMAIL_ADDRESS", "PHONE_NUMBER":
		return "Personal Data"
	default:
		// Check if it's a secret/credential pattern
		if isSecretPattern(entityType) {
			return "Secrets"
		}
		return "Non-PII"
	}
}

// setDPDPAMetadata assigns DPDPA compliance metadata
func (s *ClassificationService) setDPDPAMetadata(decision *MultiSignalDecision) {
	switch decision.Classification {
	case "Sensitive Personal Data":
		decision.DPDPACategory = "Sensitive Personal Data"
		decision.RequiresConsent = true
	case "Personal Data":
		decision.DPDPACategory = "Personal Data"
		decision.RequiresConsent = true
	case "Secrets":
		decision.DPDPACategory = "N/A"
		decision.RequiresConsent = false
	default:
		decision.DPDPACategory = "N/A"
		decision.RequiresConsent = false
	}
}

// getValidatorName returns human-readable validator name for documentation
func (s *ClassificationService) getValidatorName(entityType string) string {
	switch entityType {
	case "CREDIT_CARD":
		return "Luhn Algorithm"
	case "IN_AADHAAR":
		return "Verhoeff Checksum"
	case "IN_PAN":
		return "PAN Format Validator"
	case "US_SSN":
		return "SSA Rules"
	case "EMAIL_ADDRESS":
		return "RFC 5322 Format"
	case "PHONE_NUMBER":
		return "E.164 Length Check"
	default:
		return "None"
	}
}

// classifyWithRules performs rule-based classification (Primary signal)
func (s *ClassificationService) classifyWithRules(input MultiSignalInput) SignalScore {
	lowerPattern := strings.ToLower(input.PatternName)
	lowerPath := strings.ToLower(input.FilePath)
	lowerCol := strings.ToLower(input.ColumnName)

	score := 0.0
	explanation := ""

	// Secrets detection
	if containsStrict(lowerPattern, []string{"aws_key", "aws_secret", "api_key", "auth_token", "private_key", "secret_key", "password", "aws access key", "access key"}) ||
		containsStrict(lowerCol, []string{"password", "secret", "apikey", "token"}) {
		score = 0.95
		explanation = "Strong pattern match for credentials/secrets"
	} else if containsStrict(lowerPattern, []string{"email", "e-mail", "mail"}) || containsStrict(lowerCol, []string{"email", "e-mail"}) {
		score = 0.95
		explanation = "Email address pattern detected"
	} else if containsStrict(lowerPattern, []string{"pan", "pancard", "permanent_account_number"}) || containsStrict(lowerCol, []string{"pan", "pancard"}) {
		score = 0.99
		explanation = "PAN Card pattern detected"
	} else if containsStrict(lowerPattern, []string{"ssn", "social_security"}) {
		score = 0.98
		explanation = "SSN pattern detected"
	} else if containsStrict(lowerPattern, []string{"aadhaar", "uidai", "adhaar"}) {
		score = 0.99
		explanation = "Aadhaar pattern detected"
	} else if containsStrict(lowerPattern, []string{"phone", "mobile", "cellphone"}) || containsStrict(lowerCol, []string{"phone", "mobile"}) {
		score = 0.90
		explanation = "Phone number pattern detected"
	} else if containsStrict(lowerPattern, []string{"credit_card", "debit_card", "cvv", "card_number", "credit card", "card"}) {
		score = 0.95
		explanation = "Financial data pattern detected"
	} else {
		score = 0.30
		explanation = "No strong PII pattern matched"
	}

	// Context boost - HIGH FIX #8: Multiplicative instead of additive
	if containsStrict(lowerPath, []string{"user", "users", "customer", "customers", "billing", "auth", "login", "account"}) {
		score *= 1.05 // 5% multiplicative boost (naturally bounded)
		explanation += " + high-risk path context"
	}

	// Test data penalty
	if containsStrict(lowerPath, []string{"test", "tests", "fixture", "mock", "example", "spec"}) {
		score *= 0.8
		explanation += " (reduced: test data)"
	}

	// Clamp
	if score > 1.0 {
		score = 1.0
	}

	return SignalScore{
		RawScore:      score,
		WeightedScore: score * s.config.Classification.WeightRules,
		Weight:        s.config.Classification.WeightRules,
		Confidence:    score,
		Explanation:   fmt.Sprintf("Rules: %s", explanation),
	}
}

// classifyWithPresidio performs ML-based entity type proposal using Presidio
// ROLE: Entity proposer ONLY - does NOT validate
// VALIDATION: Happens at gate in ClassifyMultiSignal()
func (s *ClassificationService) classifyWithPresidio(ctx context.Context, input MultiSignalInput) SignalScore {
	// If Presidio unavailable, return zero signal
	// Main gate will use rule-based entity type inference
	if s.presidioClient == nil {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        s.config.Classification.WeightPresidio,
			Confidence:    0.0,
			Explanation:   "Presidio unavailable",
		}
	}

	if input.MatchValue == "" {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        s.config.Classification.WeightPresidio,
			Confidence:    0.0,
			Explanation:   "Presidio: Empty value",
		}
	}

	// Normalize value before sending to Presidio
	normalized := strings.TrimSpace(input.MatchValue)

	// Call Presidio for ML-based entity type proposal
	result, err := s.presidioClient.Analyze(ctx, normalized)
	if err != nil {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        s.config.Classification.WeightPresidio,
			Confidence:    0.0,
			Explanation:   fmt.Sprintf("Presidio error: %v", err),
		}
	}

	// If Presidio didn't detect anything
	if !result.Available || result.Confidence == 0.0 {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        s.config.Classification.WeightPresidio,
			Confidence:    0.0,
			Explanation:   result.Explanation,
		}
	}

	// REMOVED: All validation logic
	// Presidio ONLY proposes entity types and provides ML confidence
	// Validation happens at the single gate in ClassifyMultiSignal()

	// Return Presidio's ML confidence for enrichment
	return SignalScore{
		RawScore:      result.Confidence,
		WeightedScore: result.Confidence * s.config.Classification.WeightPresidio,
		Weight:        s.config.Classification.WeightPresidio,
		Confidence:    result.Confidence,
		Explanation:   result.Explanation,
	}
}

// validateEntity performs hard validation based on entity type
func validateEntity(entityType, normalized, digitsOnly string) bool {
	switch entityType {
	case "CREDIT_CARD":
		return luhnValidate(digitsOnly)
	case "IN_AADHAAR":
		return len(digitsOnly) == 12 && verhoeffValidate(digitsOnly)
	case "IN_PAN":
		return panValidate(normalized)
	case "US_SSN":
		return len(digitsOnly) == 9 && ssnValidate(digitsOnly)
	case "EMAIL_ADDRESS":
		return strings.Contains(normalized, "@") && strings.Contains(normalized, ".")
	case "PHONE_NUMBER":
		return len(digitsOnly) >= 8 && len(digitsOnly) <= 15
	default:
		return true // Unknown types pass through
	}
}

// inferEntityTypeFromPattern maps pattern names to entity types for validator selection
func inferEntityTypeFromPattern(patternName string) string {
	lower := strings.ToLower(patternName)
	if containsStrict(lower, []string{"credit_card", "card", "cvv"}) {
		return "CREDIT_CARD"
	}
	if containsStrict(lower, []string{"aadhaar", "uidai"}) {
		return "IN_AADHAAR"
	}
	if containsStrict(lower, []string{"pan", "pancard"}) {
		return "IN_PAN"
	}
	if containsStrict(lower, []string{"ssn", "social_security"}) {
		return "US_SSN"
	}
	if containsStrict(lower, []string{"email", "e-mail"}) {
		return "EMAIL_ADDRESS"
	}
	if containsStrict(lower, []string{"phone", "mobile"}) {
		return "PHONE_NUMBER"
	}
	return ""
}

// Helper function to extract only digits (inline implementation)
func extractDigitsOnly(value string) string {
	digits := ""
	for _, c := range value {
		if c >= '0' && c <= '9' {
			digits += string(c)
		}
	}
	return digits
}

// Inline Luhn validator (should use pkg/validation in production)
func luhnValidate(number string) bool {
	if len(number) == 0 {
		return false
	}
	var sum int
	parity := len(number) % 2
	for i, digit := range number {
		if digit < '0' || digit > '9' {
			return false
		}
		d := int(digit - '0')
		if i%2 == parity {
			d *= 2
			if d > 9 {
				d -= 9
			}
		}
		sum += d
	}
	return sum%10 == 0
}

// Verhoeff Algorithm Tables
var (
	// Multiplication table (dihedral group D5)
	verhoeffMultiplication = [10][10]int{
		{0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
		{1, 2, 3, 4, 0, 6, 7, 8, 9, 5},
		{2, 3, 4, 0, 1, 7, 8, 9, 5, 6},
		{3, 4, 0, 1, 2, 8, 9, 5, 6, 7},
		{4, 0, 1, 2, 3, 9, 5, 6, 7, 8},
		{5, 9, 8, 7, 6, 0, 4, 3, 2, 1},
		{6, 5, 9, 8, 7, 1, 0, 4, 3, 2},
		{7, 6, 5, 9, 8, 2, 1, 0, 4, 3},
		{8, 7, 6, 5, 9, 3, 2, 1, 0, 4},
		{9, 8, 7, 6, 5, 4, 3, 2, 1, 0},
	}

	// Permutation table
	verhoeffPermutation = [8][10]int{
		{0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
		{1, 5, 7, 6, 2, 8, 3, 0, 9, 4},
		{5, 8, 0, 3, 7, 9, 6, 1, 4, 2},
		{8, 9, 1, 6, 0, 4, 3, 5, 2, 7},
		{9, 4, 5, 3, 1, 2, 6, 8, 7, 0},
		{4, 2, 8, 6, 5, 7, 3, 9, 0, 1},
		{2, 7, 9, 3, 8, 0, 6, 4, 1, 5},
		{7, 0, 4, 6, 9, 1, 3, 2, 5, 8},
	}

	// Inverse table
	verhoeffInverse = [10]int{0, 4, 3, 2, 1, 5, 6, 7, 8, 9}
)

// verhoeffValidate performs full Verhoeff checksum validation for Aadhaar numbers
func verhoeffValidate(number string) bool {
	if len(number) != 12 {
		return false
	}

	// Validate all characters are digits
	for _, c := range number {
		if c < '0' || c > '9' {
			return false
		}
	}

	// Calculate Verhoeff checksum
	checksum := 0

	// Process digits from right to left
	for i, digit := range reverseString(number) {
		digitValue := int(digit - '0')

		// Get permutation based on position (modulo 8)
		permutationRow := i % 8
		permutedDigit := verhoeffPermutation[permutationRow][digitValue]

		// Apply multiplication table
		checksum = verhoeffMultiplication[checksum][permutedDigit]
	}

	// Valid if checksum is 0
	return checksum == 0
}

// reverseString helper for Verhoeff algorithm
func reverseString(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// Inline PAN validator
func panValidate(pan string) bool {
	if len(pan) != 10 {
		return false
	}
	// Format: AAAAA9999A
	for i := 0; i < 5; i++ {
		if pan[i] < 'A' || pan[i] > 'Z' {
			return false
		}
	}
	for i := 5; i < 9; i++ {
		if pan[i] < '0' || pan[i] > '9' {
			return false
		}
	}
	if pan[9] < 'A' || pan[9] > 'Z' {
		return false
	}
	return true
}

// Inline SSN validator
func ssnValidate(ssn string) bool {
	if len(ssn) != 9 {
		return false
	}
	// Check blacklist
	blacklist := map[string]bool{
		"000000000": true,
		"111111111": true,
		"222222222": true,
		"123456789": true,
	}
	if blacklist[ssn] {
		return false
	}
	// Check SSA rules
	if ssn[0:3] == "000" || ssn[0:3] == "666" {
		return false
	}
	if ssn[3:5] == "00" {
		return false
	}
	if ssn[5:9] == "0000" {
		return false
	}
	return true
}

// classifyWithContext uses enrichment signals as context
func (s *ClassificationService) classifyWithContext(input MultiSignalInput) SignalScore {
	score := input.EnrichmentScore
	explanation := fmt.Sprintf("Context: Enrichment score %.2f (env: %s, semantics: %.2f)",
		score, input.EnrichmentSignals.Environment, input.EnrichmentSignals.AssetSemantics)

	return SignalScore{
		RawScore:      score,
		WeightedScore: score * s.config.Classification.WeightContext,
		Weight:        s.config.Classification.WeightContext,
		Confidence:    score,
		Explanation:   explanation,
	}
}

// classifyWithEntropy uses statistical analysis
// HIGH FIX #7: Entropy only applies to secrets/tokens/API keys
func (s *ClassificationService) classifyWithEntropy(input MultiSignalInput) SignalScore {
	// Only apply entropy to secrets/tokens
	if !isSecretPattern(input.PatternName) {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        s.config.Classification.WeightEntropy,
			Confidence:    0.0,
			Explanation:   "Entropy N/A for non-secrets",
		}
	}

	entropy := input.EnrichmentSignals.Entropy
	diversity := input.EnrichmentSignals.CharsetDiversity

	// Normalize entropy (typical range 0-5)
	normEntropy := math.Min(entropy/5.0, 1.0)

	// Combine entropy and diversity
	score := (normEntropy * 0.7) + (diversity * 0.3)

	explanation := fmt.Sprintf("Stats: Entropy %.2f, Diversity %.2f → Score %.2f",
		entropy, diversity, score)

	return SignalScore{
		RawScore:      score,
		WeightedScore: score * s.config.Classification.WeightEntropy,
		Weight:        s.config.Classification.WeightEntropy,
		Confidence:    score,
		Explanation:   explanation,
	}
}

// isSecretPattern determines if a pattern represents a secret/token
func isSecretPattern(patternName string) bool {
	secretKeywords := []string{"aws_key", "api_key", "auth_token", "private_key", "secret_key", "password", "token", "access_key"}
	lower := strings.ToLower(patternName)
	for _, kw := range secretKeywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

// applyThresholds determines confidence level and sets metadata
func (s *ClassificationService) applyThresholds(decision *MultiSignalDecision, ruleSignal SignalScore) {
	score := decision.FinalScore

	// Determine classification type from rules (primary)
	if score >= ThresholdConfirmed {
		decision.ConfidenceLevel = "Confirmed"
	} else if score >= ThresholdHigh {
		decision.ConfidenceLevel = "High Confidence"
	} else if score >= ThresholdNeedsReview {
		decision.ConfidenceLevel = "Needs Review"
	} else {
		decision.ConfidenceLevel = "Discard"
		decision.Classification = "Non-PII"
		decision.SubCategory = "Below Threshold"
		return
	}

	// Use rule-based classification as primary type
	decision.Classification = s.extractClassificationFromRules(ruleSignal.Explanation)
	decision.SubCategory = s.extractSubCategory(decision.Classification)

	// Set DPDPA metadata
	switch decision.Classification {
	case "Sensitive Personal Data":
		decision.DPDPACategory = "Sensitive Personal Data"
		decision.RequiresConsent = true
	case "Personal Data":
		decision.DPDPACategory = "Personal Data"
		decision.RequiresConsent = true
	case "Secrets":
		decision.DPDPACategory = "N/A"
		decision.RequiresConsent = false
	default:
		decision.DPDPACategory = "N/A"
		decision.RequiresConsent = false
	}
}

// extractClassificationFromRules parses the rule explanation
func (s *ClassificationService) extractClassificationFromRules(explanation string) string {
	if strings.Contains(explanation, "credentials") || strings.Contains(explanation, "secrets") {
		return "Secrets"
	}
	if strings.Contains(explanation, "PAN") || strings.Contains(explanation, "Aadhaar") ||
		strings.Contains(explanation, "SSN") || strings.Contains(explanation, "Financial") {
		return "Sensitive Personal Data"
	}
	if strings.Contains(explanation, "Email") || strings.Contains(explanation, "Phone") {
		return "Personal Data"
	}
	return "Non-PII"
}

// extractSubCategory determines sub-category
func (s *ClassificationService) extractSubCategory(classification string) string {
	switch classification {
	case "Secrets":
		return "API Keys & Secrets"
	case "Sensitive Personal Data":
		return "Government ID / Financial Data"
	case "Personal Data":
		return "Contact Information"
	default:
		return "Other"
	}
}

// buildJustification creates human-readable explanation
func (s *ClassificationService) buildJustification(decision *MultiSignalDecision) string {
	return fmt.Sprintf("%s (Score: %.2f, Level: %s). Signals: %s | %s | %s | %s",
		decision.Classification,
		decision.FinalScore,
		decision.ConfidenceLevel,
		decision.RuleSignal.Explanation,
		decision.PresidioSignal.Explanation,
		decision.ContextSignal.Explanation,
		decision.EntropySignal.Explanation,
	)
}

// containsStrict checks word boundaries
func containsStrict(text string, keywords []string) bool {
	for _, kw := range keywords {
		idx := strings.Index(text, kw)
		if idx == -1 {
			continue
		}

		// Check preceding char
		if idx > 0 {
			prev := text[idx-1]
			if (prev >= 'a' && prev <= 'z') || (prev >= 'A' && prev <= 'Z') {
				continue
			}
		}

		// Check succeeding char
		end := idx + len(kw)
		if end < len(text) {
			next := text[end]
			if (next >= 'a' && next <= 'z') || (next >= 'A' && next <= 'Z') {
				continue
			}
		}
		return true
	}
	return false
}

// Legacy Classify method for backward compatibility
func (s *ClassificationService) Classify(patternName, filePath, sampleText string, fileData map[string]interface{}) ClassificationResult {
	// For backward compatibility, use rule-based only
	// This will be phased out once multi-signal is fully integrated
	return s.classifyLegacy(patternName, filePath, sampleText, fileData)
}

func (s *ClassificationService) classifyLegacy(patternName, filePath, _ string, fileData map[string]interface{}) ClassificationResult {
	signals := map[string]interface{}{
		"pattern_match": true,
		"context_score": 0.0,
	}

	result := ClassificationResult{
		ClassificationType: "Non-PII",
		SubCategory:        "Other",
		ConfidenceScore:    0.5,
		Signals:            signals,
		RequiresConsent:    false,
	}

	lowerPattern := strings.ToLower(patternName)
	lowerPath := strings.ToLower(filePath)
	lowerCol := ""
	if colName, ok := fileData["column_name"].(string); ok {
		lowerCol = strings.ToLower(colName)
	}

	// Use same logic as rule-based signal
	if containsStrict(lowerPattern, []string{"aws_key", "aws_secret", "api_key", "auth_token", "private_key", "secret_key", "password"}) ||
		containsStrict(lowerCol, []string{"password", "secret", "apikey", "token"}) {
		result.ClassificationType = "Secrets"
		result.SubCategory = "API Keys & Secrets"
		result.DPDPACategory = "N/A"
		result.ConfidenceScore = 0.95
		result.Justification = "Strong pattern match for credentials"
	} else if containsStrict(lowerPattern, []string{"email", "e-mail", "mail"}) || containsStrict(lowerCol, []string{"email", "e-mail"}) {
		result.ClassificationType = "Personal Data"
		result.SubCategory = "Email Address"
		result.DPDPACategory = "Personal Data"
		result.ConfidenceScore = 0.95
		result.RequiresConsent = true
		result.Justification = "Pattern/Column indicates Email Address"
	} else if containsStrict(lowerPattern, []string{"pan", "pancard", "permanent_account_number"}) || containsStrict(lowerCol, []string{"pan", "pancard"}) {
		result.ClassificationType = "Sensitive Personal Data"
		result.SubCategory = "Government ID"
		result.DPDPACategory = "Sensitive Personal Data"
		result.ConfidenceScore = 0.99
		result.RequiresConsent = true
		result.Justification = "Pattern/Column indicates PAN Card"
	} else if containsStrict(lowerPattern, []string{"ssn", "social_security"}) {
		result.ClassificationType = "Sensitive Personal Data"
		result.SubCategory = "Government ID"
		result.DPDPACategory = "Sensitive Personal Data"
		result.ConfidenceScore = 0.98
		result.RequiresConsent = true
		result.Justification = "Pattern indicates SSN"
	} else if containsStrict(lowerPattern, []string{"aadhaar", "uidai", "adhaar"}) {
		result.ClassificationType = "Sensitive Personal Data"
		result.SubCategory = "Government ID"
		result.DPDPACategory = "Sensitive Personal Data"
		result.ConfidenceScore = 0.99
		result.Justification = "Pattern indicates Aadhaar"
	} else if containsStrict(lowerPattern, []string{"phone", "mobile", "cellphone"}) || containsStrict(lowerCol, []string{"phone", "mobile"}) {
		result.ClassificationType = "Personal Data"
		result.SubCategory = "Phone Number"
		result.DPDPACategory = "Personal Data"
		result.ConfidenceScore = 0.90
		result.RequiresConsent = true
		result.Justification = "Pattern/Column indicates Phone Number"
	} else if containsStrict(lowerPattern, []string{"credit_card", "debit_card", "cvv", "card_number"}) {
		result.ClassificationType = "Sensitive Personal Data"
		result.SubCategory = "Financial Data"
		result.DPDPACategory = "Sensitive Personal Data"
		result.ConfidenceScore = 0.95
		result.RequiresConsent = true
		result.Justification = "Pattern indicates Financial Data"
	}

	// Context boost
	if containsStrict(lowerPath, []string{"user", "users", "customer", "customers", "billing", "auth", "login", "account"}) {
		result.ConfidenceScore += 0.05
		signals["context_match"] = true
		result.Justification += " + Found in high-risk context"
	}

	// Test data penalty
	if containsStrict(lowerPath, []string{"test", "tests", "fixture", "mock", "example", "spec"}) {
		result.ConfidenceScore *= 0.9
		signals["is_test_data"] = true
		result.Justification += " (Reduced: Test Data)"
	}

	if result.ConfidenceScore > 1.0 {
		result.ConfidenceScore = 1.0
	}

	result.Signals = signals
	return result
}
