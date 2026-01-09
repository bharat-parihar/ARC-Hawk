package main

// ==================================================================================
// ⚠️  DEPRECATED TOOL - DO NOT USE IN PRODUCTION
// ==================================================================================
// This regression tool instantiates a Presidio client which violates the
// Intelligence-at-Edge architecture. The backend no longer calls Presidio.
//
// MIGRATION PATH:
// 1. Use scanner SDK to generate VerifiedFinding objects
// 2. Test against scanner SDK output, not backend classification
// 3. Verify findings match expected PII types from scanner
//
// This tool is kept ONLY for backward compatibility testing.
// It will be removed in a future release.
// ==================================================================================
// Presidio client has been removed from backend - validation now happens in scanner SDK ONLY
// This tool needs to be rewritten to align with Intelligence-at-Edge architecture.
// TODO: Rewrite to test scanner SDK output instead of backend classification
// ==================================================================================
import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/arc-platform/backend/internal/config"
	"github.com/arc-platform/backend/internal/service"
	"github.com/arc-platform/backend/pkg/normalization"
	"github.com/arc-platform/backend/pkg/validation"
)

// GroundTruthSample represents a labeled sample for testing
type GroundTruthSample struct {
	Value        string `json:"value"`
	ExpectedType string `json:"expected_type"` // "CREDIT_CARD", "EMAIL", "PAN", "SSN", "AADHAAR", "NON_PII"
	ShouldDetect bool   `json:"should_detect"` // true if PII, false if non-PII
	Description  string `json:"description"`   // Why this sample is included
}

// TestResult represents the result of testing a single sample
type TestResult struct {
	Sample     GroundTruthSample `json:"sample"`
	Detected   bool              `json:"detected"`
	DetectedAs string            `json:"detected_as"`
	Correct    bool              `json:"correct"`
	Error      string            `json:"error,omitempty"`
}

// MetricsResult contains precision, recall, F1 score
type MetricsResult struct {
	TotalSamples   int     `json:"total_samples"`
	TruePositives  int     `json:"true_positives"`
	FalsePositives int     `json:"false_positives"`
	TrueNegatives  int     `json:"true_negatives"`
	FalseNegatives int     `json:"false_negatives"`
	Precision      float64 `json:"precision"`
	Recall         float64 `json:"recall"`
	F1Score        float64 `json:"f1_score"`
	Accuracy       float64 `json:"accuracy"`
}

func main() {
	fmt.Println("🧪 ARC-Hawk Regression Testing Framework")
	fmt.Println("=========================================")
	fmt.Println()

	// Load ground truth samples
	samples, err := loadGroundTruthSamples("../../testdata/ground_truth")
	if err != nil {
		log.Fatalf("Failed to load ground truth samples: %v", err)
	}

	fmt.Printf("Loaded %d ground truth samples\n\n", len(samples))

	// Initialize classification service (without DB for validation testing)
	cfg := config.LoadConfig()

	// Create Presidio client (if available)
	presidioURL := os.Getenv("PRESIDIO_URL")
	if presidioURL == "" {
		presidioURL = "http://localhost:5001"
	}

	presidioClient := service.NewPresidioClient(presidioURL, true)

	// Test Presidio connectivity
	ctx := context.Background()
	if err := presidioClient.HealthCheck(ctx); err != nil {
		log.Printf("⚠️  WARNING: Presidio not available at %s - validator-only testing", presidioURL)
	} else {
		fmt.Printf("✅ Presidio connected at %s\n\n", presidioURL)
	}

	// Run tests
	results := make([]TestResult, 0, len(samples))
	for _, sample := range samples {
		result := testSample(ctx, sample, presidioClient, cfg)
		results = append(results, result)
	}

	// Calculate metrics
	metrics := calculateMetrics(results)

	// Print results
	printResults(results, metrics)

	// Quality gate: F1 score must be >= 0.90
	if metrics.F1Score < 0.90 {
		fmt.Printf("\n❌ QUALITY GATE FAILED: F1 Score (%.4f) < 0.90\n", metrics.F1Score)
		os.Exit(1)
	} else {
		fmt.Printf("\n✅ QUALITY GATE PASSED: F1 Score (%.4f) >= 0.90\n", metrics.F1Score)
	}
}

func loadGroundTruthSamples(dir string) ([]GroundTruthSample, error) {
	samples := make([]GroundTruthSample, 0)

	// Walk through ground truth directory
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Only process .json files
		if !info.IsDir() && filepath.Ext(path) == ".json" {
			data, err := ioutil.ReadFile(path)
			if err != nil {
				return fmt.Errorf("failed to read %s: %w", path, err)
			}

			var fileSamples []GroundTruthSample
			if err := json.Unmarshal(data, &fileSamples); err != nil {
				return fmt.Errorf("failed to parse %s: %w", path, err)
			}

			samples = append(samples, fileSamples...)
		}

		return nil
	})

	return samples, err
}

func testSample(ctx context.Context, sample GroundTruthSample, presidioClient *service.PresidioClient, cfg *config.Config) TestResult {
	result := TestResult{
		Sample:   sample,
		Detected: false,
	}

	// Normalize value
	normalized := normalization.Normalize(sample.Value)
	digitsOnly := normalization.ExtractDigits(normalized)

	// Step 1: Try Presidio (if available)
	if presidioClient != nil {
		presidioResult, err := presidioClient.Analyze(ctx, normalized)
		if err == nil && presidioResult.Available && presidioResult.Confidence > 0 {
			entityType := presidioResult.EntityTypes[0]

			// Step 2: Validate with hard validators
			validatorPassed := validateEntity(entityType, normalized, digitsOnly)

			if validatorPassed {
				result.Detected = true
				result.DetectedAs = entityType
			}
		}
	} else {
		// Fallback: Validator-only mode
		// Try each validator type
		if validation.ValidateLuhn(digitsOnly) && len(digitsOnly) >= 13 && len(digitsOnly) <= 19 {
			result.Detected = true
			result.DetectedAs = "CREDIT_CARD"
		} else if validation.ValidatePAN(normalized) {
			result.Detected = true
			result.DetectedAs = "IN_PAN"
		} else if len(digitsOnly) == 12 {
			// Note: Simplified Verhoeff check - full implementation in pkg/validation
			result.Detected = true
			result.DetectedAs = "IN_AADHAAR"
		} else if len(digitsOnly) == 9 {
			// SSN validation (simplified)
			result.Detected = true
			result.DetectedAs = "US_SSN"
		} else if strings.Contains(normalized, "@") && strings.Contains(normalized, ".") {
			result.Detected = true
			result.DetectedAs = "EMAIL_ADDRESS"
		}
	}

	// Evaluate correctness
	result.Correct = (result.Detected == sample.ShouldDetect)
	if sample.ShouldDetect && result.Detected {
		// For positive samples, also check the type matches
		result.Correct = result.Correct && (result.DetectedAs == sample.ExpectedType || sample.ExpectedType == "")
	}

	return result
}

func validateEntity(entityType, normalized, digitsOnly string) bool {
	switch entityType {
	case "CREDIT_CARD":
		return validation.ValidateLuhn(digitsOnly)
	case "IN_AADHAAR":
		return len(digitsOnly) == 12 // Simplified - use full Verhoeff in production
	case "IN_PAN":
		return validation.ValidatePAN(normalized)
	case "US_SSN":
		return len(digitsOnly) == 9 // Simplified - use full SSN validation in production
	case "EMAIL_ADDRESS":
		return strings.Contains(normalized, "@")
	default:
		return true // Other types pass through
	}
}

func calculateMetrics(results []TestResult) MetricsResult {
	metrics := MetricsResult{
		TotalSamples: len(results),
	}

	for _, result := range results {
		if result.Sample.ShouldDetect && result.Detected {
			metrics.TruePositives++
		} else if !result.Sample.ShouldDetect && result.Detected {
			metrics.FalsePositives++
		} else if result.Sample.ShouldDetect && !result.Detected {
			metrics.FalseNegatives++
		} else if !result.Sample.ShouldDetect && !result.Detected {
			metrics.TrueNegatives++
		}
	}

	// Calculate precision: TP / (TP + FP)
	if metrics.TruePositives+metrics.FalsePositives > 0 {
		metrics.Precision = float64(metrics.TruePositives) / float64(metrics.TruePositives+metrics.FalsePositives)
	}

	// Calculate recall: TP / (TP + FN)
	if metrics.TruePositives+metrics.FalseNegatives > 0 {
		metrics.Recall = float64(metrics.TruePositives) / float64(metrics.TruePositives+metrics.FalseNegatives)
	}

	// Calculate F1 score: 2 * (Precision * Recall) / (Precision + Recall)
	if metrics.Precision+metrics.Recall > 0 {
		metrics.F1Score = 2 * (metrics.Precision * metrics.Recall) / (metrics.Precision + metrics.Recall)
	}

	// Calculate accuracy: (TP + TN) / Total
	metrics.Accuracy = float64(metrics.TruePositives+metrics.TrueNegatives) / float64(metrics.TotalSamples)

	return metrics
}

func printResults(results []TestResult, metrics MetricsResult) {
	fmt.Println("📊 Test Results")
	fmt.Println("===============")
	fmt.Println()

	// Print failures
	failures := 0
	for _, result := range results {
		if !result.Correct {
			failures++
			status := "❌"
			fmt.Printf("%s %s: Expected=%v (type=%s), Got=%v (type=%s) - %s\n",
				status,
				result.Sample.Value,
				result.Sample.ShouldDetect,
				result.Sample.ExpectedType,
				result.Detected,
				result.DetectedAs,
				result.Sample.Description,
			)
		}
	}

	if failures == 0 {
		fmt.Println("✅ All tests passed!")
	} else {
		fmt.Printf("❌ %d tests failed\n", failures)
	}

	fmt.Println()
	fmt.Println("📈 Metrics")
	fmt.Println("==========")
	fmt.Printf("Total Samples:     %d\n", metrics.TotalSamples)
	fmt.Printf("True Positives:    %d\n", metrics.TruePositives)
	fmt.Printf("False Positives:   %d\n", metrics.FalsePositives)
	fmt.Printf("True Negatives:    %d\n", metrics.TrueNegatives)
	fmt.Printf("False Negatives:   %d\n", metrics.FalseNegatives)
	fmt.Println()
	fmt.Printf("Precision:         %.4f (%.2f%%)\n", metrics.Precision, metrics.Precision*100)
	fmt.Printf("Recall:            %.4f (%.2f%%)\n", metrics.Recall, metrics.Recall*100)
	fmt.Printf("F1 Score:          %.4f (%.2f%%)\n", metrics.F1Score, metrics.F1Score*100)
	fmt.Printf("Accuracy:          %.4f (%.2f%%)\n", metrics.Accuracy, metrics.Accuracy*100)
}
