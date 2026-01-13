package api

import (
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
)

// ScanTriggerHandler handles scan trigger requests
type ScanTriggerHandler struct{}

func NewScanTriggerHandler() *ScanTriggerHandler {
	return &ScanTriggerHandler{}
}

// TriggerScan handles POST /api/v1/scans/trigger
// Triggers the unified-scan.py script in the background
func (h *ScanTriggerHandler) TriggerScan(c *gin.Context) {
	// Launch scan in background
	go func() {
		cmd := exec.Command("python3", "scripts/automation/unified-scan.py")
		cmd.Dir = "/Users/prathameshyadav/ARC-Hawk" // TODO: Make this configurable

		if err := cmd.Run(); err != nil {
			// Log error but don't fail the request since it's async
			println("Scan execution error:", err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Scan triggered successfully. Results will be available shortly.",
	})
}
