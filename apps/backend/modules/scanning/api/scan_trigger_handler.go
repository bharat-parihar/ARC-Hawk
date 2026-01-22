package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/arc-platform/backend/modules/scanning/service"
	"github.com/arc-platform/backend/modules/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ScanTriggerHandler handles scan trigger requests
type ScanTriggerHandler struct {
	scanService      *service.ScanService
	websocketService interface{} // WebSocket service for broadcasting
}

func NewScanTriggerHandler(scanService *service.ScanService, websocketService interface{}) *ScanTriggerHandler {
	return &ScanTriggerHandler{
		scanService:      scanService,
		websocketService: websocketService,
	}
}

// TriggerScan handles POST /api/v1/scans/trigger
// Accepts scan configuration, creates scan entity, and triggers scanner
func (h *ScanTriggerHandler) TriggerScan(c *gin.Context) {
	var req service.TriggerScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get user from context (default to "system" if not authenticated)
	triggeredBy := "system"
	if user, exists := c.Get("user_id"); exists {
		if userStr, ok := user.(string); ok {
			triggeredBy = userStr
		}
	}

	// Create scan run entity
	ctx := c.Request.Context()
	scanRun, err := h.scanService.CreateScanRun(ctx, &req, triggeredBy)
	if err != nil {
		log.Printf("ERROR: Failed to create scan run: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create scan",
		})
		return
	}

	log.Printf("INFO: Created scan run %s with configuration: %+v", scanRun.ID, req)

	// Return scan ID immediately
	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanRun.ID,
		"status":  "pending",
		"message": "Scan triggered successfully",
	})

	// Launch scan in background
	go h.executeScan(scanRun.ID, &req)

	// Broadcast scan started event
	if wsService, ok := h.websocketService.(*websocket.WebSocketService); ok {
		wsService.BroadcastScanStarted(scanRun.ID.String(), req.Sources[0], 100) // Estimate file count
	}
}

// executeScan executes the scanner with the provided configuration
func (h *ScanTriggerHandler) executeScan(scanID uuid.UUID, req *service.TriggerScanRequest) {
	ctx := context.Background()

	// Update status to running
	if err := h.scanService.UpdateScanStatus(ctx, scanID, "running"); err != nil {
		log.Printf("ERROR: Failed to update scan status to running: %v", err)
		return
	}

	log.Printf("INFO: Starting scan execution for scan %s", scanID)

	// Broadcast scan progress
	if wsService, ok := h.websocketService.(*websocket.WebSocketService); ok {
		wsService.BroadcastScanProgress(scanID.String(), 10, "running", "Initializing scanner...")
	}

	// Generate scanner configuration file
	configPath, err := h.generateScannerConfig(scanID, req)
	if err != nil {
		log.Printf("ERROR: Failed to generate scanner config: %v", err)
		h.scanService.UpdateScanStatus(ctx, scanID, "failed")
		return
	}
	defer os.Remove(configPath) // Clean up config file after scan

	// Execute scanner with configuration
	workDir := os.Getenv("ARC_HAWK_ROOT")
	if workDir == "" {
		// Try to determine the project root dynamically
		execPath, err := os.Executable()
		if err == nil {
			// Get the directory containing the executable
			workDir = filepath.Dir(execPath)
			// Try to find ARC-Hawk root by looking for known files
			for workDir != "/" && workDir != "." {
				checkPath := filepath.Join(workDir, "apps", "scanner")
				if _, err := os.Stat(checkPath); err == nil {
					break
				}
				workDir = filepath.Dir(workDir)
			}
		}
	}
	// Final fallback - use current working directory
	if workDir == "" || workDir == "." {
		workDir, _ = os.Getwd()
	}

	// Validate scanner script exists before execution
	scriptPath := filepath.Join(workDir, "apps/scanner/hawk_scanner/main.py")
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		log.Printf("ERROR: Scanner script not found at: %s", scriptPath)
		// Update scan status to failed
		_ = h.scanService.UpdateScanStatus(context.Background(), scanID, "failed")
		return
	}

	cmd := exec.Command("python3", scriptPath, "--config", configPath)
	cmd.Dir = workDir
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("SCAN_ID=%s", scanID),
		fmt.Sprintf("SCAN_NAME=%s", req.Name),
	)

	// Broadcast progress update
	if wsService, ok := h.websocketService.(*websocket.WebSocketService); ok {
		wsService.BroadcastScanProgress(scanID.String(), 50, "running", "Executing scanner...")
	}

	// Capture output
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERROR: Scan execution failed for %s: %v\nOutput: %s", scanID, err, string(output))

		// Update status to failed
		h.scanService.UpdateScanStatus(ctx, scanID, "failed")

		// Broadcast scan failure
		if wsService, ok := h.websocketService.(*websocket.WebSocketService); ok {
			wsService.BroadcastScanProgress(scanID.String(), 0, "failed", "Scan execution failed")
		}
		return
	}

	log.Printf("INFO: Scan %s completed successfully\nOutput: %s", scanID, string(output))

	// Update status to completed
	if err := h.scanService.UpdateScanStatus(ctx, scanID, "completed"); err != nil {
		log.Printf("ERROR: Failed to update scan status to completed: %v", err)
	}

	// Broadcast scan completion
	if wsService, ok := h.websocketService.(*websocket.WebSocketService); ok {
		wsService.BroadcastScanProgress(scanID.String(), 100, "completed", "Scan completed successfully")

		// Extract finding count from output (simple parsing)
		findingsCount := 0
		// TODO: Parse actual findings count from scanner output
		duration := time.Since(time.Now().Add(-5 * time.Minute)) // Rough estimate
		wsService.BroadcastScanComplete(scanID.String(), findingsCount, duration)
	}
}

// generateScannerConfig creates a temporary configuration file for the scanner
func (h *ScanTriggerHandler) generateScannerConfig(scanID uuid.UUID, req *service.TriggerScanRequest) (string, error) {
	config := map[string]interface{}{
		"scan_id":        scanID.String(),
		"scan_name":      req.Name,
		"sources":        req.Sources,
		"pii_types":      req.PIITypes,
		"execution_mode": req.ExecutionMode,
		"ingest_url":     "http://localhost:8080/api/v1/scans/ingest-verified",
		"timestamp":      time.Now().Format(time.RFC3339),
	}

	configJSON, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal config: %w", err)
	}

	// Create temporary config file
	tmpDir := os.TempDir()
	configPath := filepath.Join(tmpDir, fmt.Sprintf("scan_config_%s.json", scanID))

	if err := ioutil.WriteFile(configPath, configJSON, 0600); err != nil {
		return "", fmt.Errorf("failed to write config file: %w", err)
	}

	log.Printf("INFO: Generated scanner config at %s", configPath)
	return configPath, nil
}
