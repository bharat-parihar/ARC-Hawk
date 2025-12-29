package service

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/arc-platform/backend/internal/infrastructure/persistence"
)

// ClassificationService handles PII classification with multi-signal intelligence
type ClassificationService struct {
	repo           *persistence.PostgresRepository
	presidioClient *PresidioClient
	engineVersion  string
}

// NewClassificationService creates a new classification service
func NewClassificationService(repo *persistence.PostgresRepository) *ClassificationService {
	return &ClassificationService{
		repo:          repo,
		engineVersion: "v2.0-multisignal",
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

// Signal weights (must sum to 1.0)
const (
	WeightRules    = 0.30 // Reduced from 0.45
	WeightPresidio = 0.50 // Increased from 0.25 - Primary signal
	WeightContext  = 0.15 // Reduced from 0.20
	WeightEntropy  = 0.05 // Reduced from 0.10
)

// Confidence thresholds
const (
	ThresholdConfirmed   = 0.85
	ThresholdHigh        = 0.65
	ThresholdNeedsReview = 0.45
)

// ClassifyMultiSignal performs multi-signal classification
func (s *ClassificationService) ClassifyMultiSignal(ctx context.Context, input MultiSignalInput) (*MultiSignalDecision, error) {
	decision := &MultiSignalDecision{
		EngineVersion:   s.engineVersion,
		SignalBreakdown: make(map[string]interface{}),
	}

	// Signal 1: Rule-Based Classification
	ruleSignal := s.classifyWithRules(input)
	decision.RuleSignal = ruleSignal

	// Signal 2: Presidio ML
	presidioSignal := s.classifyWithPresidio(ctx, input)
	decision.PresidioSignal = presidioSignal

	// Signal 3: Context/Enrichment
	contextSignal := s.classifyWithContext(input)
	decision.ContextSignal = contextSignal

	// Signal 4: Entropy/Statistics
	entropySignal := s.classifyWithEntropy(input)
	decision.EntropySignal = entropySignal

	// --- LOGIC ENHANCEMENT: Presidio Veto/Boost ---

	// If Presidio is active (Available) but detects NOTHING or has very low confidence,
	// and Rules detected something, we should apply a penalty to the Rule signal.
	// This dramatically reduces false positives from regex.
	if presidioSignal.RawScore < 0.2 && ruleSignal.RawScore > 0.5 {
		// Presidio says "No", Rules say "Yes".
		// We trust Presidio more for reducing false positives.
		// Reduce the effective rule contribution.
		ruleSignal.WeightedScore *= 0.5
		ruleSignal.Explanation += " (Penalized: Unconfirmed by Presidio)"
	}

	// Conversely, if Presidio is very confident, we boost the score
	if presidioSignal.RawScore > 0.85 {
		// Boost mechanism: ensure it crosses the confirmed threshold easily
		presidioSignal.WeightedScore *= 1.2
	}

	// -----------------------------------------------

	// Calculate final weighted score
	decision.FinalScore = (ruleSignal.WeightedScore +
		presidioSignal.WeightedScore +
		contextSignal.WeightedScore +
		entropySignal.WeightedScore)

	// Cap at 1.0
	if decision.FinalScore > 1.0 {
		decision.FinalScore = 1.0
	}

	// Determine confidence level and classification
	s.applyThresholds(decision, ruleSignal)

	// Build comprehensive justification
	decision.Justification = s.buildJustification(decision)

	// Store signal breakdown
	decision.SignalBreakdown = map[string]interface{}{
		"rule":     ruleSignal,
		"presidio": presidioSignal,
		"context":  contextSignal,
		"entropy":  entropySignal,
		"weights": map[string]float64{
			"rules":    WeightRules,
			"presidio": WeightPresidio,
			"context":  WeightContext,
			"entropy":  WeightEntropy,
		},
	}

	return decision, nil
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

	// Context boost
	if containsStrict(lowerPath, []string{"user", "users", "customer", "customers", "billing", "auth", "login", "account"}) {
		score += 0.05
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
		WeightedScore: score * WeightRules,
		Weight:        WeightRules,
		Confidence:    score,
		Explanation:   fmt.Sprintf("Rules: %s", explanation),
	}
}

// classifyWithPresidio performs ML-based classification using Presidio
func (s *ClassificationService) classifyWithPresidio(ctx context.Context, input MultiSignalInput) SignalScore {
	if s.presidioClient == nil || input.MatchValue == "" {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        WeightPresidio,
			Confidence:    0.0,
			Explanation:   "Presidio: Not available or empty value",
		}
	}

	result, err := s.presidioClient.Analyze(ctx, input.MatchValue)
	if err != nil || !result.Available {
		return SignalScore{
			RawScore:      0.0,
			WeightedScore: 0.0,
			Weight:        WeightPresidio,
			Confidence:    0.0,
			Explanation:   fmt.Sprintf("Presidio: %s", result.Explanation),
		}
	}

	return SignalScore{
		RawScore:      result.Confidence,
		WeightedScore: result.Confidence * WeightPresidio,
		Weight:        WeightPresidio,
		Confidence:    result.Confidence,
		Explanation:   result.Explanation,
	}
}

// classifyWithContext uses enrichment signals as context
func (s *ClassificationService) classifyWithContext(input MultiSignalInput) SignalScore {
	score := input.EnrichmentScore
	explanation := fmt.Sprintf("Context: Enrichment score %.2f (env: %s, semantics: %.2f)",
		score, input.EnrichmentSignals.Environment, input.EnrichmentSignals.AssetSemantics)

	return SignalScore{
		RawScore:      score,
		WeightedScore: score * WeightContext,
		Weight:        WeightContext,
		Confidence:    score,
		Explanation:   explanation,
	}
}

// classifyWithEntropy uses statistical analysis
func (s *ClassificationService) classifyWithEntropy(input MultiSignalInput) SignalScore {
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
		WeightedScore: score * WeightEntropy,
		Weight:        WeightEntropy,
		Confidence:    score,
		Explanation:   explanation,
	}
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

func (s *ClassificationService) classifyLegacy(patternName, filePath, sampleText string, fileData map[string]interface{}) ClassificationResult {
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
