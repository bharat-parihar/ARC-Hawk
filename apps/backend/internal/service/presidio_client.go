package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// PresidioClient handles communication with Presidio Analyzer service
type PresidioClient struct {
	baseURL    string
	httpClient *http.Client
	enabled    bool
}

// NewPresidioClient creates a new Presidio client
func NewPresidioClient(baseURL string, enabled bool) *PresidioClient {
	return &PresidioClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		enabled: enabled,
	}
}

// PresidioAnalyzeRequest represents the request to Presidio analyzer
type PresidioAnalyzeRequest struct {
	Text     string   `json:"text"`
	Language string   `json:"language"`
	Entities []string `json:"entities,omitempty"` // Optional: filter specific entities
}

// PresidioEntity represents a detected entity
type PresidioEntity struct {
	EntityType       string  `json:"entity_type"`
	Start            int     `json:"start"`
	End              int     `json:"end"`
	Score            float64 `json:"score"`
	RecognizerSource string  `json:"recognizer_source,omitempty"`
}

// PresidioAnalyzeResponse represents the response from Presidio
type PresidioAnalyzeResponse struct {
	Entities []PresidioEntity `json:"results"`
}

// PresidioResult contains the analysis result with aggregated score
type PresidioResult struct {
	Detected     bool                   `json:"detected"`
	Entities     []PresidioEntity       `json:"entities"`
	HighestScore float64                `json:"highest_score"`
	EntityTypes  []string               `json:"entity_types"`
	Confidence   float64                `json:"confidence"` // Normalized 0.0-1.0
	Explanation  string                 `json:"explanation"`
	Available    bool                   `json:"available"` // Was Presidio service available?
	Metadata     map[string]interface{} `json:"metadata"`
}

// Analyze performs PII analysis using Presidio
func (c *PresidioClient) Analyze(ctx context.Context, text string) (*PresidioResult, error) {
	// If Presidio is disabled or text is empty, return empty result
	if !c.enabled || text == "" {
		return &PresidioResult{
			Detected:    false,
			Confidence:  0.0,
			Available:   false,
			Explanation: "Presidio service disabled or empty text",
		}, nil
	}

	// Prepare request
	reqBody := PresidioAnalyzeRequest{
		Text:     text,
		Language: "en",
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return c.degradedResult("Failed to marshal request"), nil
	}

	// Make HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/analyze", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.degradedResult("Failed to create request"), nil
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Presidio unavailable - graceful degradation
		return c.degradedResult(fmt.Sprintf("Presidio unavailable: %v", err)), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return c.degradedResult(fmt.Sprintf("Presidio error %d: %s", resp.StatusCode, string(body))), nil
	}

	// Parse response
	var presidioResp PresidioAnalyzeResponse
	if err := json.NewDecoder(resp.Body).Decode(&presidioResp); err != nil {
		return c.degradedResult("Failed to decode response"), nil
	}

	// Aggregate results
	return c.aggregateResults(presidioResp), nil
}

// degradedResult returns a result indicating Presidio was unavailable
func (c *PresidioClient) degradedResult(reason string) *PresidioResult {
	return &PresidioResult{
		Detected:    false,
		Confidence:  0.0,
		Available:   false,
		Explanation: fmt.Sprintf("Degraded: %s", reason),
		Entities:    []PresidioEntity{},
		Metadata: map[string]interface{}{
			"degraded": true,
			"reason":   reason,
		},
	}
}

// aggregateResults processes Presidio entities into a single result
func (c *PresidioClient) aggregateResults(resp PresidioAnalyzeResponse) *PresidioResult {
	if len(resp.Entities) == 0 {
		return &PresidioResult{
			Detected:    false,
			Entities:    []PresidioEntity{},
			Confidence:  0.0,
			Available:   true,
			Explanation: "No PII entities detected by Presidio",
			Metadata:    map[string]interface{}{"entity_count": 0},
		}
	}

	// Find highest score
	highestScore := 0.0
	entityTypes := make(map[string]bool)

	for _, entity := range resp.Entities {
		if entity.Score > highestScore {
			highestScore = entity.Score
		}
		entityTypes[entity.EntityType] = true
	}

	// Convert to list
	entityTypeList := make([]string, 0, len(entityTypes))
	for entityType := range entityTypes {
		entityTypeList = append(entityTypeList, entityType)
	}

	// Build explanation
	explanation := fmt.Sprintf("Presidio detected %d PII entities: %v (max confidence: %.2f)",
		len(resp.Entities), entityTypeList, highestScore)

	return &PresidioResult{
		Detected:     true,
		Entities:     resp.Entities,
		HighestScore: highestScore,
		EntityTypes:  entityTypeList,
		Confidence:   highestScore, // Presidio scores are already 0.0-1.0
		Available:    true,
		Explanation:  explanation,
		Metadata: map[string]interface{}{
			"entity_count": len(resp.Entities),
			"entity_types": entityTypeList,
		},
	}
}

// HealthCheck checks if Presidio service is available
func (c *PresidioClient) HealthCheck(ctx context.Context) error {
	if !c.enabled {
		return fmt.Errorf("Presidio service is disabled")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/health", nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Presidio health check failed with status %d", resp.StatusCode)
	}

	return nil
}
