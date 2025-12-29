package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const (
	BaseURL = "http://localhost:8080/api/v1"
)

type GoldenEntry struct {
	Text           string `json:"text"`
	Label          string `json:"label"`
	IsPIIConfirmed bool   `json:"is_pii_confirmed"`
	FeedbackType   string `json:"feedback_type"`
}

type ClassificationResult struct {
	ClassificationType string  `json:"classification_type"`
	ConfidenceScore    float64 `json:"confidence_score"`
}

type PredictResponse struct {
	Classification ClassificationResult `json:"classification"`
}

func main() {
	fmt.Println("🔎 Starting Regression Test...")

	// 1. Fetch Golden Dataset
	dataset, err := fetchGoldenDataset()
	if err != nil {
		fmt.Printf("❌ Failed to fetch dataset: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("✅ Loaded %d verified samples.\n", len(dataset))

	// 2. Run Classification
	tp, fp, tn, fn := 0, 0, 0, 0

	for _, entry := range dataset {
		isDetected, score, err := predict(entry.Text, entry.Label)
		if err != nil {
			fmt.Printf("⚠️ Error predicting '%s': %v\n", entry.Text[:10]+"...", err)
			continue
		}

		// Confusion Matrix Logic
		// We treat "IsPIIConfirmed" as the ground truth.
		// If IsPIIConfirmed == true (Effective Positive)
		//    Detected -> TP
		//    Not Detected -> FN
		// If IsPIIConfirmed == false (Effective Negative / False Positive in past)
		//    Detected -> FP (We failed to suppress it)
		//    Not Detected -> TN (We correctly suppressed it)

		// Note: The dataset contains "FeedbackType".
		// CONFIRMED -> Ground Truth = PII
		// FALSE_POSITIVE -> Ground Truth = Not PII

		isGroundTruthPII := entry.FeedbackType == "CONFIRMED"

		if isGroundTruthPII {
			if isDetected {
				tp++
			} else {
				fn++
				fmt.Printf("🔴 FN: Expected PII, but got score %.2f. Text: %s\n", score, entry.Text)
			}
		} else { // Ground Truth = Not PII
			if isDetected {
				fp++
				fmt.Printf("🔴 FP: Expected Non-PII, but detected with score %.2f. Text: %s\n", score, entry.Text)
			} else {
				tn++
			}
		}
	}

	// 3. metrics
	precision := 0.0
	if tp+fp > 0 {
		precision = float64(tp) / float64(tp+fp)
	}

	recall := 0.0
	if tp+fn > 0 {
		recall = float64(tp) / float64(tp+fn)
	}

	f1 := 0.0
	if precision+recall > 0 {
		f1 = 2 * (precision * recall) / (precision + recall)
	}

	fmt.Println("\n==================================")
	fmt.Println("📊 REGRESSION RESULTS")
	fmt.Println("==================================")
	fmt.Printf("Samples:   %d\n", len(dataset))
	fmt.Printf("TP: %d | FP: %d | TN: %d | FN: %d\n", tp, fp, tn, fn)
	fmt.Println("----------------------------------")
	fmt.Printf("Precision: %.2f%%\n", precision*100)
	fmt.Printf("Recall:    %.2f%%\n", recall*100)
	fmt.Printf("F1 Score:  %.2f%%\n", f1*100)
	fmt.Println("==================================")

	if f1 < 0.9 {
		fmt.Println("❌ F1 Score below 90%. Tuning required.")
		suggestTuning(fp, fn)
		os.Exit(1)
	} else {
		fmt.Println("✅ System healthy.")
	}
}

func fetchGoldenDataset() ([]GoldenEntry, error) {
	resp, err := http.Get(BaseURL + "/dataset/golden")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var entries []GoldenEntry
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		var entry GoldenEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, scanner.Err()
}

func predict(text, patternName string) (bool, float64, error) {
	payload := map[string]interface{}{
		"text":         text,
		"pattern_name": patternName,
		"file_path":    "regression_test.txt", // Context simulation
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(BaseURL+"/classification/predict", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return false, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return false, 0, fmt.Errorf("status %d", resp.StatusCode)
	}

	var res PredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return false, 0, err
	}

	// Threshold for detection
	isDetected := res.Classification.ConfidenceScore > 0.6
	return isDetected, res.Classification.ConfidenceScore, nil
}

func suggestTuning(fp, fn int) {
	fmt.Println("\n🔧 SUGGESTIONS:")
	if fp > fn {
		fmt.Println(" - High False Positive rate. Suggest INCREASING 'Threshold' or DECREASING 'WeightRules'.")
		fmt.Println(" - Consider adding 'Context' words to DENY list in 'classification_service.go'.")
	} else if fn > fp {
		fmt.Println(" - High False Negative rate. Suggest DECREASING 'Threshold' or INCREASING 'WeightPresidio'.")
	}
}
